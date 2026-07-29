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
)

const annualLeaveQuotaType = models.LeaveTypeCuti

func consumesAnnualLeaveQuota(jenisIzin string) bool {
	// "Izin" is the value submitted by the employee form for
	// "Izin (Keperluan Pribadi)". Keep the long label supported as well so
	// older clients follow the same quota rule.
	return jenisIzin == annualLeaveQuotaType
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
		policy = append([]string{models.LeaveTypeCuti}, policy...)
		eligible = isEligibleForCuti(employee, attendanceNow(), setting.MinimumMasaKerjaCutiBulan)
	}
	return c.JSON(fiber.Map{
		"leave_types":                   policy,
		"can_request_cuti":              eligible,
		"minimum_masa_kerja_cuti_bulan": setting.MinimumMasaKerjaCutiBulan,
		"tanggal_bergabung":             employee.TanggalBergabung,
	})
}

func GetLeaveRequestDetail(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan && role != models.RoleManajer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var request models.LeaveRequest
	if err := config.DB.Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").First(&request, c.Params("id")).Error; err != nil {
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

	tglSelesai, err := time.Parse("2006-01-02", tanggalSelesaiStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tanggal_selesai format"})
	}
	if tglSelesai.Before(tglMulai) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal selesai tidak boleh lebih awal dari tanggal mulai"})
	}

	var lampiranURL string
	file, err := c.FormFile("lampiran")
	if err == nil && file != nil {
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
	}

	leaveReq := models.LeaveRequest{
		EmployeeID:     employee.ID,
		JenisIzin:      jenisIzin,
		TanggalMulai:   tglMulai,
		TanggalSelesai: tglSelesai,
		Alasan:         alasan,
		LampiranURL:    lampiranURL,
		Status:         models.LeaveStatusPending,
	}

	if err := config.DB.Create(&leaveReq).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save leave request"})
	}
	utils.LogAction(userID, "CREATE", "LeaveRequest", leaveReq.ID, fmt.Sprintf("Pengajuan %s oleh %s", jenisIzin, employee.NIK))

	var recipients []models.User
	config.DB.Where("role = ?", models.RoleHRD).Find(&recipients)
	if role == models.RoleMagang || role == models.RoleKaryawan {
		var owner models.User
		if config.DB.First(&owner, userID).Error == nil && owner.ManagerID != nil {
			var manager models.User
			if config.DB.First(&manager, *owner.ManagerID).Error == nil {
				recipients = append(recipients, manager)
			}
		}
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
	if role != models.RoleHRD && role != models.RolePimpinan && role != models.RoleManajer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var requests []models.LeaveRequest
	query := config.DB.Preload("Employee.User").Order("created_at desc")
	if role == models.RoleManajer {
		ids, _ := managerTeamIDs(c.Locals("user_id").(uint))
		if len(ids) == 0 {
			return c.JSON([]models.LeaveRequest{})
		}
		query = query.Where("employee_id IN ?", ids)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("leave_requests.status = ?", status)
	}
	if leaveType := normalizeLeaveType(c.Query("jenis_izin")); leaveType != "" {
		query = query.Where("leave_requests.jenis_izin = ?", leaveType)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		query = query.Joins("JOIN employees ON employees.id = leave_requests.employee_id").Joins("JOIN users ON users.id = employees.user_id").Where("LOWER(users.nama) LIKE ? OR LOWER(employees.nik) LIKE ?", "%"+strings.ToLower(search)+"%", "%"+strings.ToLower(search)+"%")
	}
	if err := query.Find(&requests).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leave requests"})
	}

	return c.JSON(requests)
}

func ApproveRejectLeaveRequest(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan && role != models.RoleManajer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	adminID := c.Locals("user_id").(uint)

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var req struct {
		Status string `json:"status"` // "Approved" or "Rejected"
		Notes  string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	var leaveReq models.LeaveRequest
	if err := config.DB.Preload("Employee.User").First(&leaveReq, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Leave request not found"})
	}

	if leaveReq.Status != models.LeaveStatusPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Request already processed"})
	}
	if role == models.RoleManajer {
		ids, _ := managerTeamIDs(adminID)
		if !containsUint(ids, leaveReq.EmployeeID) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Leave request is outside your team"})
		}
	}

	newStatus := models.LeaveStatus(req.Status)
	if newStatus != models.LeaveStatusApproved && newStatus != models.LeaveStatusRejected {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	leaveReq.Status = newStatus
	leaveReq.ApprovedBy = &adminID
	approvedAt := time.Now()
	leaveReq.ApprovedAt = &approvedAt
	leaveReq.Notes = req.Notes

	tx := config.DB.Begin()

	if err := tx.Save(&leaveReq).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update leave request"})
	}

	if newStatus == models.LeaveStatusApproved {
		// Update leave quota
		if consumesAnnualLeaveQuota(leaveReq.JenisIzin) {
			days := int(leaveReq.TanggalSelesai.Sub(leaveReq.TanggalMulai).Hours()/24) + 1

			var quota models.LeaveQuota
			if err := tx.Where("employee_id = ? AND jenis_cuti = ? AND tahun = ?", leaveReq.EmployeeID, annualLeaveQuotaType, leaveReq.TanggalMulai.Year()).First(&quota).Error; err == nil {
				quota.SisaKuota -= days
				if err := tx.Save(&quota).Error; err != nil {
					tx.Rollback()
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update leave quota"})
				}
			} else {
				quota = models.LeaveQuota{
					EmployeeID: leaveReq.EmployeeID,
					JenisCuti:  annualLeaveQuotaType,
					Tahun:      leaveReq.TanggalMulai.Year(),
					SisaKuota:  12 - days,
				}
				if err := tx.Create(&quota).Error; err != nil {
					tx.Rollback()
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create leave quota"})
				}
			}
		}

		// Sync Attendance Records for the leave period
		var attStatus models.AttendanceStatus
		if leaveReq.JenisIzin == models.LeaveTypeCuti {
			attStatus = models.StatusCuti
		} else {
			attStatus = models.StatusIzin
		}

		for curr := leaveReq.TanggalMulai; !curr.After(leaveReq.TanggalSelesai); curr = curr.AddDate(0, 0, 1) {
			var attRecord models.AttendanceRecord
			err := tx.Where("employee_id = ? AND tanggal = ?", leaveReq.EmployeeID, curr).First(&attRecord).Error
			if err == nil {
				attRecord.Status = attStatus
				tx.Save(&attRecord)
			} else {
				attRecord = models.AttendanceRecord{
					EmployeeID: leaveReq.EmployeeID,
					Tanggal:    curr,
					Status:     attStatus,
				}
				tx.Create(&attRecord)
			}
		}
	}

	userRole := leaveReq.Employee.User.Role
	if userRole == "" {
		userRole = models.RoleKaryawan
	}
	if err := utils.CreateNotification(tx, leaveReq.Employee.UserID, userRole, "Status Pengajuan", "Status Pengajuan Izin", fmt.Sprintf("Pengajuan %s Anda telah %s", leaveReq.JenisIzin, string(newStatus))); err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create notification"})
	}

	tx.Commit()
	WsHub.Broadcast <- fiber.Map{"event": "leave_status_updated"}

	utils.LogAction(adminID, "UPDATE", "LeaveRequest", leaveReq.ID, fmt.Sprintf("Admin %s leave request for %s", newStatus, leaveReq.Employee.NIK))

	return c.JSON(fiber.Map{"message": "Leave request processed successfully", "status": newStatus})
}
