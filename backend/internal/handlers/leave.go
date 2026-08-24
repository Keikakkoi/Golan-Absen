package handlers

import (
	"context"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"absensi-golan-backend/pkg/minio"

	"github.com/gofiber/fiber/v2"
	miniogo "github.com/minio/minio-go/v7"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const annualLeaveQuotaType = models.LeaveTypeCuti

var annualLeaveQuotaTypes = []string{models.LeaveTypeCuti, "Cuti Tahunan"}

func consumesAnnualLeaveQuota(jenisIzin string) bool {
	// "Izin" is the value submitted by the employee form for
	// "Izin (Keperluan Pribadi)". Keep the long label supported as well so
	// older clients follow the same quota rule.
	return normalizeLeaveType(jenisIzin) == models.LeaveTypeCuti || normalizeLeaveType(jenisIzin) == models.LeaveTypeLainnya
}

func initialLeaveStatus(role models.Role) models.LeaveStatus {
	if role == models.RoleManajer {
		return models.LeaveStatusPendingHRD
	}
	return models.LeaveStatusPendingManager
}

func managerCanProcessLeaveStatus(status models.LeaveStatus) bool {
	return status == models.LeaveStatusPendingManager || status == models.LeaveStatusPending
}

// HRD must be able to see the complete workflow for employee and intern
// requests.  The current approval step is represented by Status and must not
// determine whether the request is visible in the admin list.
func isAdminLeaveWorkflowRole(role models.Role) bool {
	return role == models.RoleKaryawan || role == models.RoleMagang || role == models.RoleManajer
}

func calendarLeaveDays(start, end time.Time) int {
	startDate := time.Date(start.In(jakartaLocation).Year(), start.In(jakartaLocation).Month(), start.In(jakartaLocation).Day(), 0, 0, 0, 0, jakartaLocation)
	endDate := time.Date(end.In(jakartaLocation).Year(), end.In(jakartaLocation).Month(), end.In(jakartaLocation).Day(), 0, 0, 0, 0, jakartaLocation)
	return int(endDate.Sub(startDate).Hours()/24) + 1
}

func SetupLeaveRoutes(router fiber.Router) {
	leave := router.Group("/leave", middleware.Protected())
	leave.Post("/", SubmitLeaveRequest)
	leave.Get("/", GetMyLeaveRequests)
	leave.Get("/policy", GetLeavePolicy)

	admin := router.Group("/admin/leave", middleware.Protected())
	admin.Get("/", GetAllLeaveRequests)
	admin.Get("/:id", GetLeaveRequestDetail)
	admin.Put("/:id/approve", ApproveRejectLeaveRequest)
	leave.Delete("/:id/cancel", CancelLeaveRequest)
}

// workingLeaveDays follows the application's attendance calendar: Monday to
// Friday, excluding configured holidays. The backend remains authoritative
// for this calculation when a request is submitted.
func workingLeaveDays(start, end time.Time) (int, error) {
	start = normalizeAttendanceDate(start)
	end = normalizeAttendanceDate(end)
	var holidays []models.Holiday
	if err := config.DB.Where("tanggal BETWEEN ? AND ?", start.Format("2006-01-02"), end.Format("2006-01-02")).Find(&holidays).Error; err != nil {
		return 0, err
	}
	holidayDates := make(map[string]bool, len(holidays))
	for _, holiday := range holidays {
		holidayDates[normalizeAttendanceDate(holiday.Tanggal).Format("2006-01-02")] = true
	}
	days := 0
	for day := start; !day.After(end); day = day.AddDate(0, 0, 1) {
		if day.Weekday() >= time.Monday && day.Weekday() <= time.Friday && !holidayDates[day.Format("2006-01-02")] {
			days++
		}
	}
	return days, nil
}

func leaveQuotaSummary(employeeID uint, year int) (fiber.Map, error) {
	var quota models.LeaveQuota
	if err := config.DB.Where("employee_id = ? AND tahun = ? AND jenis_cuti IN ?", employeeID, year, annualLeaveQuotaTypes).Order("id asc").First(&quota).Error; err != nil {
		return nil, err
	}
	var reserved int64
	if err := config.DB.Model(&models.LeaveRequest{}).
		Where("employee_id = ? AND jenis_izin IN ? AND EXTRACT(YEAR FROM tanggal_mulai) = ? AND quota_reserved = ?", employeeID, annualLeaveQuotaTypes, year, true).
		Select("COALESCE(SUM(quota_days), 0)").Scan(&reserved).Error; err != nil {
		return nil, err
	}
	var pending int64
	if err := config.DB.Model(&models.LeaveRequest{}).
		Where("employee_id = ? AND jenis_izin IN ? AND EXTRACT(YEAR FROM tanggal_mulai) = ? AND status IN ?", employeeID, annualLeaveQuotaTypes, year, []models.LeaveStatus{models.LeaveStatusPending, models.LeaveStatusPendingManager, models.LeaveStatusManagerApproved, models.LeaveStatusPendingHRD}).
		Select("COALESCE(SUM(quota_days), 0)").Scan(&pending).Error; err != nil {
		return nil, err
	}
	total := quota.SisaKuota + int(reserved)
	return fiber.Map{
		"tahun":           year,
		"total_kuota":     total,
		"terpakai":        total - quota.SisaKuota,
		"sedang_diproses": int(pending),
		"sisa_kuota":      quota.SisaKuota,
	}, nil
}

func normalizeLeaveType(value string) string {
	switch strings.TrimSpace(value) {
	case "Cuti", "Cuti Tahunan":
		return models.LeaveTypeCuti
	case "Sakit":
		return models.LeaveTypeSakit
	case "Lainnya", "Izin", "Izin Darurat", "Izin (Keperluan Pribadi)":
		return models.LeaveTypeLainnya
	default:
		return ""
	}
}

func GetLeavePolicy(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}
	role := c.Locals("role").(models.Role)
	setting := getGeneralSetting()
	policy := []string{models.LeaveTypeSakit, models.LeaveTypeLainnya}
	eligible := false
	if role != models.RoleMagang {
		eligible = isEligibleForCuti(employee, attendanceNow(), setting.MinimumMasaKerjaCutiBulan)
		if eligible {
			_ = ensureCutiQuota(config.DB, employee, attendanceNow().In(jakartaLocation).Year(), attendanceNow(), setting.MinimumMasaKerjaCutiBulan)
		}
		if eligible {
			policy = append([]string{models.LeaveTypeCuti}, policy...)
		}
	}
	availableDate, hasAvailableDate := cutiAvailabilityDate(employee, setting.MinimumMasaKerjaCutiBulan)
	var availableDateValue any
	if hasAvailableDate {
		availableDateValue = availableDate.Format("2006-01-02")
	}
	var quota any
	if eligible {
		quota, _ = leaveQuotaSummary(employee.ID, attendanceNow().In(jakartaLocation).Year())
	}
	return c.JSON(fiber.Map{
		"leave_types":                   policy,
		"can_request_cuti":              eligible,
		"minimum_masa_kerja_cuti_bulan": setting.MinimumMasaKerjaCutiBulan,
		"tanggal_bergabung":             employee.TanggalBergabung,
		"tanggal_cuti_tersedia":         availableDateValue,
		"kuota_cuti":                    quota,
	})
}

func GetLeaveRequestDetail(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RoleManajer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var request models.LeaveRequest
	if err := config.DB.Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("ApprovalHistory.DecidedByUser").First(&request, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Leave request not found"})
	}
	if role == models.RoleManajer {
		ids, _ := managerTeamIDs(c.Locals("user_id").(uint))
		if !containsUint(ids, request.EmployeeID) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Leave request is outside your team"})
		}
	}
	return c.JSON(request)
}

func SubmitLeaveRequest(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	jenisIzin := normalizeLeaveType(c.FormValue("jenis_izin"))
	role := c.Locals("role").(models.Role)
	if jenisIzin == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Jenis izin harus Cuti, Sakit, atau Lainnya"})
	}
	if role == models.RoleMagang && jenisIzin == models.LeaveTypeCuti {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Role MAGANG tidak diperbolehkan mengajukan Cuti"})
	}
	if jenisIzin == models.LeaveTypeCuti && role != models.RoleMagang {
		setting := getGeneralSetting()
		if !isEligibleForCuti(employee, attendanceNow(), setting.MinimumMasaKerjaCutiBulan) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fmt.Sprintf("Cuti hanya dapat diajukan setelah masa kerja minimal %d bulan", setting.MinimumMasaKerjaCutiBulan)})
		}
	}
	tanggalMulaiStr := c.FormValue("tanggal_mulai")
	tanggalSelesaiStr := c.FormValue("tanggal_selesai")
	alasan := c.FormValue("alasan")
	if alasan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Jenis izin dan alasan wajib diisi"})
	}

	tglMulai, err := time.Parse("2006-01-02", tanggalMulaiStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tanggal_mulai format"})
	}
	now := attendanceNow()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jakartaLocation)
	if tglMulai.Before(today) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal mulai tidak boleh kurang dari hari ini"})
	}

	tglSelesai, err := time.Parse("2006-01-02", tanggalSelesaiStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tanggal_selesai format"})
	}
	if tglSelesai.Before(tglMulai) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal selesai tidak boleh lebih awal dari tanggal mulai"})
	}
	if tglMulai.Year() != tglSelesai.Year() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Periode pengajuan harus berada dalam tahun yang sama"})
	}

	var lampiranURL string
	file, err := c.FormFile("lampiran")
	if err != nil || file == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lampiran dokumen (file) wajib diunggah untuk pengajuan izin"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process file"})
	}
	defer src.Close()

	fileName := fmt.Sprintf("leave-%s-%d%s", employee.NIK, time.Now().Unix(), filepath.Ext(file.Filename))
	ctx := context.Background()
	_, err = minio.Client.PutObject(ctx, minio.BucketName, fileName, src, file.Size, miniogo.PutObjectOptions{
		ContentType: file.Header.Get("Content-Type"),
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to upload file"})
	}

	cfg := config.LoadConfig()
	lampiranURL = fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, minio.BucketName, fileName)

	days, err := workingLeaveDays(tglMulai, tglSelesai)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memvalidasi hari kerja"})
	}
	if days <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Periode pengajuan tidak memiliki hari kerja"})
	}
	initialStatus := initialLeaveStatus(role)
	leaveReq := models.LeaveRequest{
		EmployeeID:     employee.ID,
		JenisIzin:      jenisIzin,
		TanggalMulai:   tglMulai,
		TanggalSelesai: tglSelesai,
		Alasan:         alasan,
		LampiranURL:    lampiranURL,
		Status:         initialStatus,
		QuotaDays:      days,
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start leave transaction"})
	}
	if consumesAnnualLeaveQuota(jenisIzin) {
		if err := reserveLeaveQuota(tx, &leaveReq); err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
	}
	if err := tx.Create(&leaveReq).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save leave request"})
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit leave request"})
	}
	utils.LogAction(userID, "CREATE", "LeaveRequest", leaveReq.ID, fmt.Sprintf("Pengajuan %s oleh %s", jenisIzin, employee.NIK))

	var recipients []models.User
	if role == models.RoleMagang || role == models.RoleKaryawan {
		var owner models.User
		if config.DB.First(&owner, userID).Error == nil && owner.ManagerID != nil {
			var manager models.User
			if config.DB.First(&manager, *owner.ManagerID).Error == nil {
				recipients = append(recipients, manager)
			}
		}
	} else if role == models.RoleManajer {
		config.DB.Where("role = ?", models.RoleHRD).Find(&recipients)
	}
	for _, recipient := range recipients {
		_ = utils.CreateNotification(config.DB, recipient.ID, recipient.Role, "Pengajuan Izin", "Pengajuan Izin Baru", fmt.Sprintf("Ada pengajuan %s baru dari %s", jenisIzin, employee.NIK))
	}
	WsHub.Broadcast <- fiber.Map{"event": "leave_request_created"}

	return c.JSON(fiber.Map{
		"message": "Leave request submitted successfully",
		"data":    leaveReq,
	})
}

func GetMyLeaveRequests(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	var requests []models.LeaveRequest
	if err := config.DB.Where("employee_id = ?", employee.ID).Order("created_at desc").Find(&requests).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leave requests"})
	}

	return c.JSON(requests)
}

func GetAllLeaveRequests(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RoleManajer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var requests []models.LeaveRequest
	query := config.DB.Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("ApprovalHistory.DecidedByUser").Order("created_at desc")
	if role == models.RoleManajer {
		ids, _ := managerTeamIDs(c.Locals("user_id").(uint))
		if len(ids) == 0 {
			return c.JSON([]models.LeaveRequest{})
		}
		query = query.Where("employee_id IN ?", ids)
	} else {
		// Keep all workflow states visible to HRD, including requests that are
		// still waiting for the manager.  EXISTS avoids multiplying rows when
		// optional search/filter joins are added later.
		query = query.Where("EXISTS (SELECT 1 FROM employees workflow_employees JOIN users workflow_users ON workflow_users.id = workflow_employees.user_id WHERE workflow_employees.id = leave_requests.employee_id AND workflow_users.role IN ?)", []models.Role{models.RoleKaryawan, models.RoleMagang, models.RoleManajer})
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("leave_requests.status = ?", status)
	}
	if leaveType := normalizeLeaveType(c.Query("jenis_izin")); leaveType != "" {
		query = query.Where("leave_requests.jenis_izin = ?", leaveType)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("EXISTS (SELECT 1 FROM employees search_employees JOIN users search_users ON search_users.id = search_employees.user_id WHERE search_employees.id = leave_requests.employee_id AND (LOWER(search_users.nama) LIKE ? OR LOWER(search_employees.nik) LIKE ?))", pattern, pattern)
	}
	if err := query.Find(&requests).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leave requests"})
	}

	return c.JSON(requests)
}

func ApproveRejectLeaveRequest(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RoleManajer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	decisionUserID := c.Locals("user_id").(uint)

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var req struct {
		Status          string `json:"status"` // "Approved" or "Rejected"
		Notes           string `json:"notes"`
		RejectionReason string `json:"rejection_reason"`
		AlasanPenolakan string `json:"alasan_penolakan"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	var leaveReq models.LeaveRequest
	if err := config.DB.Preload("Employee.User").First(&leaveReq, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Leave request not found"})
	}

	employeeRole := models.RoleKaryawan
	if leaveReq.Employee.User != nil {
		employeeRole = leaveReq.Employee.User.Role
	}
	if role == models.RoleManajer {
		if employeeRole == models.RoleManajer || leaveReq.Employee.UserID == decisionUserID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Manajer tidak dapat memproses pengajuan manajer atau pengajuannya sendiri"})
		}
		if !managerCanProcessLeaveStatus(leaveReq.Status) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pengajuan tidak sedang menunggu persetujuan manajer"})
		}
		ids, _ := managerTeamIDs(decisionUserID)
		if !containsUint(ids, leaveReq.EmployeeID) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Leave request is outside your team"})
		}
	} else {
		if employeeRole != models.RoleManajer {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "HRD hanya dapat memproses pengajuan izin manajer"})
		}
		if leaveReq.Status != models.LeaveStatusPendingHRD {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pengajuan manajer belum menunggu persetujuan HRD"})
		}
	}

	newStatus := models.LeaveStatus(req.Status)
	if newStatus != models.LeaveStatusApproved && newStatus != models.LeaveStatusRejected {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}
	rejectionReason := strings.TrimSpace(req.RejectionReason)
	if rejectionReason == "" {
		rejectionReason = strings.TrimSpace(req.AlasanPenolakan)
	}
	if newStatus == models.LeaveStatusRejected && rejectionReason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Alasan penolakan wajib diisi"})
	}

	days := 0
	if newStatus == models.LeaveStatusApproved && consumesAnnualLeaveQuota(leaveReq.JenisIzin) {
		if employeeRole == models.RoleMagang && normalizeLeaveType(leaveReq.JenisIzin) == models.LeaveTypeCuti {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Role MAGANG tidak diperbolehkan mengajukan Cuti"})
		}
		if normalizeLeaveType(leaveReq.JenisIzin) == models.LeaveTypeCuti {
			setting := getGeneralSetting()
			if !isEligibleForCuti(leaveReq.Employee, attendanceNow(), setting.MinimumMasaKerjaCutiBulan) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fmt.Sprintf("Pengajuan cuti tidak dapat disetujui karena masa kerja karyawan belum mencapai minimal %d bulan", setting.MinimumMasaKerjaCutiBulan)})
			}
		}
		var daysErr error
		days, daysErr = workingLeaveDays(leaveReq.TanggalMulai, leaveReq.TanggalSelesai)
		if daysErr != nil || days <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Periode pengajuan tidak memiliki hari kerja yang valid"})
		}
	}

	finalStatus := newStatus
	if role == models.RoleManajer {
		if newStatus == models.LeaveStatusApproved {
			finalStatus = models.LeaveStatusManagerApproved
		} else {
			finalStatus = models.LeaveStatusManagerRejected
		}
		leaveReq.ManagerApprovedBy = &decisionUserID
		decisionAt := time.Now()
		leaveReq.ManagerApprovedAt = &decisionAt
		leaveReq.ManagerNotes = req.Notes
	} else {
		if newStatus == models.LeaveStatusApproved {
			finalStatus = models.LeaveStatusHRDApproved
		} else {
			finalStatus = models.LeaveStatusHRDRejected
		}
		leaveReq.ApprovedBy = &decisionUserID
	}
	leaveReq.Status = finalStatus
	approvedAt := time.Now()
	leaveReq.ApprovedAt = &approvedAt
	leaveReq.Notes = req.Notes
	if newStatus == models.LeaveStatusRejected {
		rejectedAt := time.Now()
		leaveReq.RejectionReason = rejectionReason
		leaveReq.RejectedBy = &decisionUserID
		leaveReq.RejectedAt = &rejectedAt
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start leave transaction"})
	}
	if role == models.RoleHRD && newStatus == models.LeaveStatusApproved && consumesAnnualLeaveQuota(leaveReq.JenisIzin) && !leaveReq.QuotaReserved {
		leaveReq.QuotaDays = days
		if err := reserveLeaveQuota(tx, &leaveReq); err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
	}
	if newStatus == models.LeaveStatusRejected && leaveReq.QuotaReserved {
		if err := releaseLeaveQuota(tx, leaveReq); err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		leaveReq.QuotaReserved = false
	}

	if err := tx.Save(&leaveReq).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update leave request"})
	}
	historyNotes := req.Notes
	if newStatus == models.LeaveStatusRejected {
		historyNotes = rejectionReason
	}
	if err := tx.Create(&models.LeaveApprovalHistory{LeaveRequestID: leaveReq.ID, DecidedBy: decisionUserID, Role: role, Status: finalStatus, Notes: historyNotes}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save approval history"})
	}
	if role == models.RoleManajer && newStatus == models.LeaveStatusApproved {
		var hrdUsers []models.User
		if err := tx.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to find HRD recipients"})
		}
		for _, hrd := range hrdUsers {
			if err := utils.CreateNotification(tx, hrd.ID, hrd.Role, "Pengajuan Izin", "Pengajuan Disetujui Manajer", fmt.Sprintf("Pengajuan %s dari %s telah disetujui manajer dan masuk ke pencatatan HRD", leaveReq.JenisIzin, leaveReq.Employee.NIK)); err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to notify HRD"})
			}
		}
	}

	if role == models.RoleHRD && newStatus == models.LeaveStatusApproved {
		// Sync Attendance Records for the leave period
		var attStatus models.AttendanceStatus
		if consumesAnnualLeaveQuota(leaveReq.JenisIzin) {
			attStatus = models.StatusCuti
		} else {
			attStatus = models.StatusIzin
		}

		// Only synchronize dates that have actually started. Future leave is
		// kept in leave_requests and is evaluated by CheckIn on that day; it
		// must not create future attendance rows in the employee history.
		leaveStart := normalizeAttendanceDate(leaveReq.TanggalMulai)
		leaveEnd := normalizeAttendanceDate(leaveReq.TanggalSelesai)
		currentDate := attendanceBusinessDate(attendanceNow())
		if leaveEnd.After(currentDate) {
			leaveEnd = currentDate
		}
		for curr := leaveStart; !curr.After(leaveEnd); curr = curr.AddDate(0, 0, 1) {
			var attRecord models.AttendanceRecord
			err := tx.Where("employee_id = ? AND tanggal = ?", leaveReq.EmployeeID, curr).First(&attRecord).Error
			if err == nil {
				// A punched record always wins over a leave request. This avoids
				// turning a real Hadir/Terlambat record into Izin.
				if attRecord.JamMasuk == nil {
					attRecord.Status = attStatus
					if err := tx.Save(&attRecord).Error; err != nil {
						tx.Rollback()
						return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to sync attendance record"})
					}
				}
			} else {
				attRecord = models.AttendanceRecord{
					EmployeeID: leaveReq.EmployeeID,
					Tanggal:    curr,
					Status:     attStatus,
				}
				tx.Create(&attRecord)
			}
		}
	} else if newStatus == models.LeaveStatusRejected {
		// A rejected leave must not leave an empty Izin/Cuti row behind,
		// otherwise the old row can keep blocking a later check-in.
		if err := tx.Where(
			"employee_id = ? AND tanggal BETWEEN ? AND ? AND jam_masuk IS NULL AND status IN ?",
			leaveReq.EmployeeID,
			normalizeAttendanceDate(leaveReq.TanggalMulai).Format("2006-01-02"),
			normalizeAttendanceDate(leaveReq.TanggalSelesai).Format("2006-01-02"),
			[]models.AttendanceStatus{models.StatusIzin, models.StatusCuti},
		).Delete(&models.AttendanceRecord{}).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to clear rejected leave attendance"})
		}
	}

	userRole := leaveReq.Employee.User.Role
	if userRole == "" {
		userRole = models.RoleKaryawan
	}
	notificationMessage := fmt.Sprintf("Pengajuan %s Anda (%s s/d %s) telah %s", leaveReq.JenisIzin, leaveReq.TanggalMulai.Format("02 Jan 2006"), leaveReq.TanggalSelesai.Format("02 Jan 2006"), statusLabel(finalStatus))
	if newStatus == models.LeaveStatusRejected {
		notificationMessage += fmt.Sprintf(". Alasan penolakan: %s", rejectionReason)
	}
	if err := utils.CreateNotification(tx, leaveReq.Employee.UserID, userRole, "Status Pengajuan", "Status Pengajuan Izin", notificationMessage); err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create notification"})
	}

	tx.Commit()
	WsHub.Broadcast <- fiber.Map{"event": "leave_status_updated"}

	utils.LogAction(decisionUserID, "UPDATE", "LeaveRequest", leaveReq.ID, fmt.Sprintf("%s %s leave request for %s", role, finalStatus, leaveReq.Employee.NIK))

	return c.JSON(fiber.Map{
		"message":          "Leave request processed successfully",
		"status":           finalStatus,
		"rejection_reason": leaveReq.RejectionReason,
		"rejected_by":      leaveReq.RejectedBy,
		"rejected_at":      leaveReq.RejectedAt,
	})
}

func statusLabel(status models.LeaveStatus) string {
	switch status {
	case models.LeaveStatusManagerApproved:
		return "Disetujui Manajer"
	case models.LeaveStatusManagerRejected:
		return "Ditolak Manajer"
	case models.LeaveStatusHRDApproved:
		return "Disetujui HRD"
	case models.LeaveStatusHRDRejected:
		return "Ditolak HRD"
	default:
		return string(status)
	}
}

func reserveLeaveQuota(tx *gorm.DB, request *models.LeaveRequest) error {
	quota := models.LeaveQuota{}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("employee_id = ? AND jenis_cuti IN ? AND tahun = ?", request.EmployeeID, annualLeaveQuotaTypes, request.TanggalMulai.Year()).First(&quota).Error; err != nil {
		return fmt.Errorf("kuota cuti tidak ditemukan")
	}
	if quota.SisaKuota < request.QuotaDays {
		return fmt.Errorf("sisa kuota tidak mencukupi untuk %d hari", request.QuotaDays)
	}
	quota.SisaKuota -= request.QuotaDays
	if err := tx.Save(&quota).Error; err != nil {
		return fmt.Errorf("gagal memperbarui kuota")
	}
	request.QuotaReserved = true
	return nil
}

func releaseLeaveQuota(tx *gorm.DB, request models.LeaveRequest) error {
	quota := models.LeaveQuota{}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("employee_id = ? AND jenis_cuti IN ? AND tahun = ?", request.EmployeeID, annualLeaveQuotaTypes, request.TanggalMulai.Year()).First(&quota).Error; err != nil {
		return fmt.Errorf("kuota cuti tidak ditemukan untuk pengembalian")
	}
	quota.SisaKuota += request.QuotaDays
	return tx.Save(&quota).Error
}

// CancelLeaveRequest releases a reservation exactly once. Users can cancel
// their own pending or approved request; rejected/cancelled requests are
// already settled and cannot be processed again.
func CancelLeaveRequest(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var request models.LeaveRequest
	if err := config.DB.Preload("Employee").Where("id = ?", c.Params("id")).First(&request).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Leave request not found"})
	}
	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil || employee.ID != request.EmployeeID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	if request.Status != models.LeaveStatusPending && request.Status != models.LeaveStatusApproved && request.Status != models.LeaveStatusPendingManager && request.Status != models.LeaveStatusManagerApproved {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pengajuan sudah tidak dapat dibatalkan"})
	}
	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start leave transaction"})
	}
	if request.QuotaReserved {
		if err := releaseLeaveQuota(tx, request); err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		request.QuotaReserved = false
	}
	request.Status = models.LeaveStatusCancelled
	if err := tx.Save(&request).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to cancel leave request"})
	}
	if err := tx.Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND jam_masuk IS NULL AND status IN ?", request.EmployeeID, normalizeAttendanceDate(request.TanggalMulai).Format("2006-01-02"), normalizeAttendanceDate(request.TanggalSelesai).Format("2006-01-02"), []models.AttendanceStatus{models.StatusIzin, models.StatusCuti}).Delete(&models.AttendanceRecord{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to clear cancelled leave attendance"})
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit cancellation"})
	}
	WsHub.Broadcast <- fiber.Map{"event": "leave_status_updated"}
	return c.JSON(fiber.Map{"message": "Leave request cancelled successfully", "status": request.Status})
}
