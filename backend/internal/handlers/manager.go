package handlers

import (
	"encoding/csv"
	"log"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

func SetupManagerRoutes(api fiber.Router) {
	manager := api.Group("/manager", middleware.Protected(), middleware.RequireRoles(models.RoleManajer, models.RoleHRD))
	manager.Get("/dashboard", GetManagerDashboard)
	manager.Get("/team/attendance", GetManagerTeamAttendance)
	manager.Get("/team/reports", GetManagerTeamReports)
	manager.Get("/team/statistics", GetManagerTeamStatistics)
	manager.Get("/leaves", GetManagerLeaveRequests)
	manager.Put("/leaves/:id/approve", ApproveManagerLeaveRequest)
	manager.Put("/leaves/:id/note", SaveManagerLeaveNote)
	manager.Put("/team/logbooks/:id/review", ReviewManagerLogbook)
}

// hasManagerOperationsAccess is the backend authorization rule for the
// operational team dashboard and its leave approval actions.  In this
// application an "Admin" account is stored with RoleHRD, so RoleHRD covers
// both the HRD and HRD/Admin labels shown in the UI.
func hasManagerOperationsAccess(role models.Role) bool {
	return role == models.RoleManajer || role == models.RoleHRD
}

func managerTeamEmployees(managerID uint) ([]models.Employee, error) {
	var manager models.User
	if err := config.DB.Where("id = ? AND status = ? AND role IN ?", managerID, "aktif", []models.Role{models.RoleManajer, models.RoleHRD}).First(&manager).Error; err != nil {
		log.Printf("manager routing: manager_id=%d is not an active manager/HRD configuration: %v", managerID, err)
		return nil, err
	}
	if manager.Role == models.RoleHRD {
		var employees []models.Employee
		err := config.DB.Preload("User").Preload("User.Manager").Preload("Division").Preload("Position").Find(&employees).Error
		return employees, err
	}
	condition := "users.manager_id = ?"
	args := []interface{}{managerID}
	if manager.TeamID != "" {
		condition += " OR (users.team_id = ? AND users.id <> ?)"
		args = append(args, manager.TeamID, managerID)
	}
	var employees []models.Employee
	err := config.DB.Preload("User").Preload("User.Manager").Preload("Division").Preload("Position").Joins("JOIN users ON users.id = employees.user_id").Where("("+condition+")", args...).Find(&employees).Error
	log.Printf("manager routing: manager_id=%d team_members_found=%d err=%v", managerID, len(employees), err)
	return employees, err
}

func managerTeamIDs(managerID uint) ([]uint, error) {
	employees, err := managerTeamEmployees(managerID)
	if err != nil {
		return nil, err
	}
	ids := make([]uint, 0, len(employees))
	for _, employee := range employees {
		ids = append(ids, employee.ID)
	}
	return ids, nil
}

func GetManagerDashboard(c *fiber.Ctx) error {
	managerID := c.Locals("user_id").(uint)
	team, err := managerTeamEmployees(managerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team"})
	}
	ids := make([]uint, 0, len(team))
	for _, item := range team {
		ids = append(ids, item.ID)
	}
	var present, pending, belumAbsen int64
	if len(ids) > 0 {
		todayDate := attendanceBusinessDate(attendanceNow())
		statsInput := loadAttendanceStatisticsInput(todayDate, todayDate, team)
		todayStats := attendanceDaySummary(team, todayDate, attendanceNow(), statsInput)
		present = todayStats.Hadir + todayStats.Terlambat
		config.DB.Model(&models.LeaveRequest{}).Where("employee_id IN ? AND status = ?", ids, models.LeaveStatusPending).Count(&pending)
		belumAbsen = todayStats.BelumAbsen
	}
	weekly := managerWeeklyAttendance(ids)
	// The manager dashboard warning is personal. Team attendance and report
	// monitoring remain available through the team reports screens.
	var managerEmployee models.Employee
	managerWarnings := []fiber.Map{}
	if config.DB.Where("user_id = ?", managerID).First(&managerEmployee).Error == nil {
		managerWarnings = missingWorkReportRowsForEmployee(managerEmployee.ID, attendanceNow())
	}
	return c.JSON(fiber.Map{"team_members": len(team), "hadir_hari_ini": present, "belum_absen_hari_ini": belumAbsen, "izin_pending": pending, "weekly": weekly, "missing_work_reports": managerWarnings})
}

func managerWeeklyAttendance(ids []uint) []fiber.Map {
	result := []fiber.Map{}
	for offset := 6; offset >= 0; offset-- {
		date := attendanceBusinessDate(attendanceNow()).AddDate(0, 0, -offset).Format("2006-01-02")
		var hadir int64
		if len(ids) > 0 {
			config.DB.Model(&models.AttendanceRecord{}).Where("employee_id IN ? AND tanggal = ? AND status IN ?", ids, date, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Distinct("employee_id").Count(&hadir)
		}
		result = append(result, fiber.Map{"tanggal": date, "hadir": hadir})
	}
	return result
}

func GetManagerTeamAttendance(c *fiber.Ctx) error {
	managerID := c.Locals("user_id").(uint)
	team, err := managerTeamEmployees(managerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team"})
	}
	start := strings.TrimSpace(c.Query("start_date"))
	end := strings.TrimSpace(c.Query("end_date"))
	// Keep accepting the legacy single-date parameter for existing API clients.
	if start == "" && end == "" {
		start = strings.TrimSpace(c.Query("date"))
		end = start
	}
	if start == "" && end == "" {
		start = attendanceBusinessDate(attendanceNow()).Format("2006-01-02")
		end = start
	}
	var startDate, endDate time.Time
	var startErr, endErr error
	if start != "" {
		startDate, startErr = time.ParseInLocation("2006-01-02", start, jakartaLocation)
	}
	if end != "" {
		endDate, endErr = time.ParseInLocation("2006-01-02", end, jakartaLocation)
	}
	if startErr != nil || endErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format tanggal harus YYYY-MM-DD"})
	}
	// A one-sided range remains useful for the generated Alpha rows: an open
	// start reaches the earliest team record, while an open end reaches today.
	ids := make([]uint, 0, len(team))
	for _, item := range team {
		ids = append(ids, item.ID)
	}
	if start == "" {
		startDate = endDate
		if len(ids) > 0 {
			var first models.AttendanceRecord
			if config.DB.Where("employee_id IN ?", ids).Order("tanggal asc").First(&first).Error == nil {
				startDate = first.Tanggal
			}
		}
		start = startDate.Format("2006-01-02")
	}
	if end == "" {
		endDate = attendanceBusinessDate(attendanceNow())
		end = endDate.Format("2006-01-02")
	}
	if endDate.Before(startDate) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Sampai tanggal tidak boleh lebih kecil dari Dari tanggal"})
	}
	var records []models.AttendanceRecord
	if len(ids) > 0 {
		config.DB.Where("employee_id IN ? AND tanggal BETWEEN ? AND ?", ids, start, end).Find(&records)
	}
	byEmployee := map[string]models.AttendanceRecord{}
	for _, record := range records {
		if record.EmployeeID == nil {
			continue
		}
		byEmployee[recordKey(*record.EmployeeID, record.Tanggal)] = record
	}
	rows := []fiber.Map{}
	for date := startDate; !date.After(endDate); date = date.AddDate(0, 0, 1) {
		dateString := date.Format("2006-01-02")
		for _, employee := range team {
			status := string(models.StatusAlpha)
			masuk := ""
			pulang := ""
			record, hasRecord := byEmployee[recordKey(employee.ID, date)]
			if hasRecord {
				status = string(record.Status)
				if status == string(models.StatusTerlambat) {
					status = string(models.StatusHadir)
				}
				if record.JamMasuk != nil {
					masuk = record.JamMasuk.Format("15:04")
				}
				if record.JamPulang != nil {
					pulang = record.JamPulang.Format("15:04")
				}
			}
			if search := strings.TrimSpace(c.Query("search")); search != "" && !strings.Contains(strings.ToLower(employee.User.Nama), strings.ToLower(search)) && !strings.Contains(strings.ToLower(employee.NIK), strings.ToLower(search)) {
				continue
			}
			selectedStatus := c.Query("status")
			if selectedStatus == "Tidak hadir" || strings.EqualFold(selectedStatus, "alfa") {
				selectedStatus = string(models.StatusAlpha)
			}
			if selectedStatus != "" && status != selectedStatus {
				continue
			}
			checkoutMissing := false
			if hasRecord {
				checkoutMissing = record.IsCheckoutMissing
			}
			rows = append(rows, fiber.Map{"employee_id": employee.ID, "user_id": employee.UserID, "nama": employee.User.Nama, "tanggal": dateString, "status": status, "jam_masuk": masuk, "jam_pulang": pulang, "checkout_missing": checkoutMissing})
		}
	}
	if hasPaginationQuery(c) {
		p := readPagination(c)
		total := len(rows)
		totalPages := 0
		if total > 0 {
			totalPages = (total + p.Limit - 1) / p.Limit
			if p.Page > totalPages {
				p.Page = totalPages
				p.Offset = (p.Page - 1) * p.Limit
			}
		}
		startIndex := p.Offset
		if startIndex > total {
			startIndex = total
		}
		endIndex := startIndex + p.Limit
		if endIndex > total {
			endIndex = total
		}
		return c.JSON(fiber.Map{"data": rows[startIndex:endIndex], "total": total, "page": p.Page, "limit": p.Limit, "per_page": p.Limit, "total_pages": totalPages})
	}
	return c.JSON(rows)
}

func recordKey(employeeID uint, date time.Time) string {
	return strconv.FormatUint(uint64(employeeID), 10) + ":" + date.Format("2006-01-02")
}

func GetManagerTeamReports(c *fiber.Ctx) error {
	// Reports are refreshed on demand by the manager dashboard. Explicitly
	// disable intermediary caching so a refresh always reflects server state.
	c.Set(fiber.HeaderCacheControl, "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	EnsureDailyWorkReportsAutoCreated(config.DB, attendanceNow())
	managerID := c.Locals("user_id").(uint)
	team, err := managerTeamEmployees(managerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team"})
	}
	ids := make([]uint, 0, len(team))
	for _, employee := range team {
		ids = append(ids, employee.ID)
	}
	if len(ids) == 0 {
		if hasPaginationQuery(c) {
			return c.JSON(fiber.Map{"data": []models.WorkReport{}, "total": 0, "page": 1, "limit": readPagination(c).Limit, "per_page": readPagination(c).Limit, "total_pages": 0})
		}
		return c.JSON([]models.WorkReport{})
	}
	// Set the model explicitly. Find can infer it from the destination slice,
	// but pagination calls Count before Find and GORM cannot infer a model there.
	query := config.DB.Model(&models.WorkReport{}).Preload("Employee.User").Preload("Employee.Division").Preload("Attachments").Where("employee_id IN ?", ids).Order("tanggal desc").Order("work_reports.id desc")
	if employeeID := c.Query("employee_id"); employeeID != "" {
		id, parseErr := strconv.Atoi(employeeID)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid employee_id"})
		}
		if !containsUint(ids, uint(id)) {
			return c.Status(403).JSON(fiber.Map{"error": "Employee is outside your team"})
		}
		query = query.Where("employee_id = ?", id)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		matchingIDs := make([]uint, 0)
		for _, employee := range team {
			if strings.Contains(strings.ToLower(employee.User.Nama), strings.ToLower(search)) || strings.Contains(strings.ToLower(employee.NIK), strings.ToLower(search)) {
				matchingIDs = append(matchingIDs, employee.ID)
			}
		}
		if len(matchingIDs) == 0 {
			if hasPaginationQuery(c) {
				return c.JSON(fiber.Map{"data": []models.WorkReport{}, "total": 0, "page": 1, "limit": readPagination(c).Limit, "per_page": readPagination(c).Limit, "total_pages": 0})
			}
			return c.JSON([]models.WorkReport{})
		}
		query = query.Where("employee_id IN ?", matchingIDs)
	}
	start, end := strings.TrimSpace(c.Query("start_date")), strings.TrimSpace(c.Query("end_date"))
	var startDate, endDate time.Time
	if start != "" {
		var parseErr error
		startDate, parseErr = time.Parse("2006-01-02", start)
		if parseErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start_date; expected YYYY-MM-DD"})
		}
		query = query.Where("tanggal >= ?", start)
	}
	if end != "" {
		var parseErr error
		endDate, parseErr = time.Parse("2006-01-02", end)
		if parseErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end_date; expected YYYY-MM-DD"})
		}
		query = query.Where("tanggal <= ?", end)
	}
	if start != "" && end != "" && startDate.After(endDate) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "start_date must be on or before end_date"})
	}
	reports := make([]models.WorkReport, 0)
	if hasPaginationQuery(c) {
		if err := paginatedQuery(c, query, &reports); err != nil {
			log.Printf("manager team reports pagination failed: manager_id=%d start_date=%q end_date=%q search=%q: %v", managerID, start, end, c.Query("search"), err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to paginate team reports"})
		}
		return nil
	}
	if err := query.Find(&reports).Error; err != nil {
		log.Printf("manager team reports query failed: manager_id=%d start_date=%q end_date=%q search=%q: %v", managerID, start, end, c.Query("search"), err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team reports"})
	}
	return c.JSON(reports)
}

func GetManagerTeamStatistics(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	managerID := c.Locals("user_id").(uint)
	team, err := managerTeamEmployees(managerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team"})
	}
	now := attendanceNow()
	startDate, endDate, rangeErr := parseStatisticsDateRange(c.Query("start_date"), c.Query("end_date"), now)
	if rangeErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": rangeErr.Error()})
	}
	start, end := startDate.Format("2006-01-02"), endDate.Format("2006-01-02")
	in := loadAttendanceStatisticsInput(startDate, endDate, team)
	type row struct {
		Name                string `json:"Name"`
		ManagerID           *uint  `json:"manager_id"`
		ManagerName         string `json:"manager_name"`
		Hadir               int64  `json:"Hadir"`
		Terlambat           int64  `json:"Terlambat"`
		IzinCuti            int64  `json:"IzinCuti"`
		Alpha               int64  `json:"Alpha"`
		BelumAbsen          int64  `json:"BelumAbsen"`
		TotalHariKerja      int64  `json:"TotalHariKerja"`
		TotalHariWajib      int64  `json:"TotalHariWajib"`
		PersentaseKehadiran int64  `json:"PersentaseKehadiran"`
		Total               int64  `json:"Total"`
	}
	rows := []row{}
	for _, employee := range team {
		stats := calculateAttendanceStatistics(employee, startDate, endDate, now, in)
		managerName := "Belum Ada Manajer"
		var managerID *uint
		if employee.User != nil && employee.User.ManagerID != nil {
			managerID = employee.User.ManagerID
			if employee.User.Manager != nil && strings.TrimSpace(employee.User.Manager.Nama) != "" {
				managerName = employee.User.Manager.Nama
			}
		}
		rows = append(rows, row{Name: employee.User.Nama, ManagerID: managerID, ManagerName: managerName, Hadir: stats.Hadir, Terlambat: stats.Terlambat, IzinCuti: stats.IzinCuti, Alpha: stats.Alpha, BelumAbsen: stats.BelumAbsen, TotalHariKerja: stats.TotalHariKerja, TotalHariWajib: stats.TotalHariKerja, PersentaseKehadiran: attendancePercentage(stats), Total: stats.TotalHariKerja})
	}
	if c.Query("format") == "csv" {
		c.Set("Content-Type", "text/csv")
		c.Set("Content-Disposition", "attachment; filename=statistik-kehadiran-tim.csv")
		var output string
		writer := csv.NewWriter(&stringWriter{value: &output})
		_ = writer.Write([]string{"Manajer", "Anggota", "Hadir", "Terlambat", "Izin/Cuti", "Alpha", "Belum Absen", "Total Hari Kerja", "Persentase Kehadiran"})
		for _, item := range rows {
			_ = writer.Write([]string{item.ManagerName, item.Name, strconv.FormatInt(item.Hadir, 10), strconv.FormatInt(item.Terlambat, 10), strconv.FormatInt(item.IzinCuti, 10), strconv.FormatInt(item.Alpha, 10), strconv.FormatInt(item.BelumAbsen, 10), strconv.FormatInt(item.TotalHariKerja, 10), strconv.FormatInt(item.PersentaseKehadiran, 10)})
		}
		writer.Flush()
		return c.SendString(output)
	}
	return c.JSON(fiber.Map{"start_date": start, "end_date": end, "members": rows})
}

type stringWriter struct{ value *string }

func (w *stringWriter) Write(p []byte) (int, error) { *w.value += string(p); return len(p), nil }

func containsUint(values []uint, target uint) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func GetManagerLeaveRequests(c *fiber.Ctx) error {
	if !hasManagerOperationsAccess(c.Locals("role").(models.Role)) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only managers or HRD/Admin can access team leave approvals"})
	}
	log.Printf("manager approval inbox: manager_id=%d", c.Locals("user_id").(uint))
	return GetAllLeaveRequests(c)
}
func ApproveManagerLeaveRequest(c *fiber.Ctx) error {
	if !hasManagerOperationsAccess(c.Locals("role").(models.Role)) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only managers or HRD/Admin can approve team leave requests"})
	}
	return ApproveRejectLeaveRequest(c)
}

func SaveManagerLeaveNote(c *fiber.Ctx) error {
	if c.Locals("role").(models.Role) != models.RoleManajer {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Hanya manajer yang dapat menambahkan catatan"})
	}
	var input struct {
		Catatan string `json:"catatan"`
		Notes   string `json:"notes"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	note, noteErr := normalizeLeaveNote(input.Catatan, input.Notes)
	if noteErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": noteErr.Error()})
	}
	var request models.LeaveRequest
	if err := config.DB.Preload("Employee.User").First(&request, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Leave request not found"})
	}
	if request.EmployeeID == nil || request.Employee.User == nil || request.Employee.User.Role == models.RoleManajer {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pengajuan tidak valid untuk catatan manajer"})
	}
	ids, _ := managerTeamIDs(c.Locals("user_id").(uint))
	if request.AssignedApproverID == nil && !containsUint(ids, *request.EmployeeID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Leave request is outside your team"})
	}
	// Keep the manager-owned field isolated. The legacy shared `catatan` field
	// must never be changed here because it can contain an admin note.
	updates := map[string]any{"manager_notes": note}
	if err := config.DB.Model(&request).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan catatan manajer"})
	}
	request.ManagerNotes = note
	WsHub.Broadcast <- fiber.Map{"event": "leave_note_updated"}
	return c.JSON(request)
}

func ReviewManagerLogbook(c *fiber.Ctx) error {
	managerID := c.Locals("user_id").(uint)
	ids, err := managerTeamIDs(managerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team"})
	}
	var report models.WorkReport
	if err := config.DB.Preload("Employee.User").Where("id = ?", c.Params("id")).First(&report).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Logbook not found"})
	}
	if report.EmployeeID == nil || !containsUint(ids, *report.EmployeeID) {
		return c.Status(403).JSON(fiber.Map{"error": "Logbook is outside your team"})
	}
	var input struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	if input.Status != "approved" && input.Status != "rejected" {
		return c.Status(400).JSON(fiber.Map{"error": "Status harus approved atau rejected"})
	}
	now := time.Now()
	updates := map[string]interface{}{"status_logbook": input.Status, "reviewed_by": managerID, "reviewed_at": now, "review_notes": input.Notes}
	result := config.DB.Model(&models.WorkReport{}).Where("id = ? AND employee_id = ? AND status_logbook = ?", report.ID, report.EmployeeID, "submitted").Updates(updates)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to review logbook"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Logbook sudah diproses atau tidak lagi berstatus Submitted"})
	}
	WsHub.Broadcast <- fiber.Map{"event": "logbook_status_updated"}
	if report.Employee.User != nil {
		_ = utils.CreateNotification(config.DB, report.Employee.UserID, report.Employee.User.Role, "Logbook Magang", "Status Logbook Diperbarui", "Logbook harian Anda telah diperbarui menjadi "+input.Status)
	}
	return c.JSON(fiber.Map{"message": "Logbook reviewed", "status": input.Status, "status_logbook": input.Status, "review_notes": input.Notes})
}
