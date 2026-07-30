package handlers

import (
	"encoding/csv"
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
	manager.Put("/team/logbooks/:id/review", ReviewManagerLogbook)
}

func managerTeamEmployees(managerID uint) ([]models.Employee, error) {
	var manager models.User
	if err := config.DB.First(&manager, managerID).Error; err != nil {
		return nil, err
	}
	if manager.Role == models.RoleHRD {
		var employees []models.Employee
		err := config.DB.Preload("User").Preload("Division").Preload("Position").Find(&employees).Error
		return employees, err
	}
	condition := "users.manager_id = ?"
	args := []interface{}{managerID}
	if manager.TeamID != "" {
		condition += " OR (users.team_id = ? AND users.id <> ?)"
		args = append(args, manager.TeamID, managerID)
	}
	var employees []models.Employee
	err := config.DB.Preload("User").Preload("Division").Preload("Position").Joins("JOIN users ON users.id = employees.user_id").Where("("+condition+")", args...).Find(&employees).Error
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
	today := attendanceBusinessDate(attendanceNow()).Format("2006-01-02")
	var present, pending int64
	if len(ids) > 0 {
		config.DB.Model(&models.AttendanceRecord{}).Where("employee_id IN ? AND tanggal = ? AND status IN ?", ids, today, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Count(&present)
		config.DB.Model(&models.LeaveRequest{}).Where("employee_id IN ? AND status = ?", ids, models.LeaveStatusPending).Count(&pending)
	}
	weekly := managerWeeklyAttendance(ids)
	return c.JSON(fiber.Map{"team_members": len(team), "hadir_hari_ini": present, "izin_pending": pending, "weekly": weekly, "missing_work_reports": missingWorkReportRows(ids, attendanceNow())})
}

func managerWeeklyAttendance(ids []uint) []fiber.Map {
	result := []fiber.Map{}
	for offset := 6; offset >= 0; offset-- {
		date := attendanceBusinessDate(attendanceNow()).AddDate(0, 0, -offset).Format("2006-01-02")
		var hadir int64
		if len(ids) > 0 {
			config.DB.Model(&models.AttendanceRecord{}).Where("employee_id IN ? AND tanggal = ? AND status IN ?", ids, date, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Count(&hadir)
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
	date := c.Query("date")
	if date == "" {
		date = attendanceBusinessDate(attendanceNow()).Format("2006-01-02")
	}
	ids := make([]uint, 0, len(team))
	for _, item := range team {
		ids = append(ids, item.ID)
	}
	var records []models.AttendanceRecord
	if len(ids) > 0 {
		config.DB.Where("employee_id IN ? AND tanggal = ?", ids, date).Find(&records)
	}
	byEmployee := map[uint]models.AttendanceRecord{}
	for _, record := range records {
		byEmployee[record.EmployeeID] = record
	}
	rows := []fiber.Map{}
	for _, employee := range team {
		status := "Tidak hadir"
		masuk := ""
		pulang := ""
		if record, ok := byEmployee[employee.ID]; ok {
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
		if selectedStatus := c.Query("status"); selectedStatus != "" && status != selectedStatus {
			continue
		}
		checkoutMissing := false
		if record, ok := byEmployee[employee.ID]; ok {
			checkoutMissing = record.IsCheckoutMissing
		}
		rows = append(rows, fiber.Map{"employee_id": employee.ID, "user_id": employee.UserID, "nama": employee.User.Nama, "tanggal": date, "status": status, "jam_masuk": masuk, "jam_pulang": pulang, "checkout_missing": checkoutMissing})
	}
	return c.JSON(rows)
}

func GetManagerTeamReports(c *fiber.Ctx) error {
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
		return c.JSON([]models.WorkReport{})
	}
	query := config.DB.Preload("Employee.User").Preload("Employee.Division").Preload("Attachments").Where("employee_id IN ?", ids).Order("tanggal desc")
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
			return c.JSON([]models.WorkReport{})
		}
		query = query.Where("employee_id IN ?", matchingIDs)
	}
	if start, end := c.Query("start_date"), c.Query("end_date"); start != "" && end != "" {
		query = query.Where("tanggal BETWEEN ? AND ?", start, end)
	}
	var reports []models.WorkReport
	if err := query.Find(&reports).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team reports"})
	}
	return c.JSON(reports)
}

func GetManagerTeamStatistics(c *fiber.Ctx) error {
	managerID := c.Locals("user_id").(uint)
	team, err := managerTeamEmployees(managerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load team"})
	}
	end := c.Query("end_date")
	if end == "" {
		end = attendanceBusinessDate(attendanceNow()).Format("2006-01-02")
	}
	start := c.Query("start_date")
	if start == "" {
		start = attendanceBusinessDate(attendanceNow()).AddDate(0, 0, -6).Format("2006-01-02")
	}
	type row struct {
		Name      string
		Hadir     int64
		Terlambat int64
		Total     int64
	}
	rows := []row{}
	for _, employee := range team {
		var hadir, terlambat, total int64
		config.DB.Model(&models.AttendanceRecord{}).Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND status IN ?", employee.ID, start, end, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Count(&total)
		config.DB.Model(&models.AttendanceRecord{}).Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND status = ?", employee.ID, start, end, models.StatusHadir).Count(&hadir)
		config.DB.Model(&models.AttendanceRecord{}).Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND status = ?", employee.ID, start, end, models.StatusTerlambat).Count(&terlambat)
		rows = append(rows, row{Name: employee.User.Nama, Hadir: hadir, Terlambat: terlambat, Total: total})
	}
	if c.Query("format") == "csv" {
		c.Set("Content-Type", "text/csv")
		c.Set("Content-Disposition", "attachment; filename=statistik-kehadiran-tim.csv")
		var output string
		writer := csv.NewWriter(&stringWriter{value: &output})
		_ = writer.Write([]string{"Nama", "Hadir", "Terlambat", "Total"})
		for _, item := range rows {
			_ = writer.Write([]string{item.Name, strconv.FormatInt(item.Hadir, 10), strconv.FormatInt(item.Terlambat, 10), strconv.FormatInt(item.Total, 10)})
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

func GetManagerLeaveRequests(c *fiber.Ctx) error    { return GetAllLeaveRequests(c) }
func ApproveManagerLeaveRequest(c *fiber.Ctx) error { return ApproveRejectLeaveRequest(c) }

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
	if !containsUint(ids, report.EmployeeID) {
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
	if err := config.DB.Model(&report).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to review logbook"})
	}
	if report.Employee.User != nil {
		_ = utils.CreateNotification(config.DB, report.Employee.UserID, report.Employee.User.Role, "Logbook Magang", "Status Logbook Diperbarui", "Logbook harian Anda telah diperbarui menjadi "+input.Status)
	}
	return c.JSON(fiber.Map{"message": "Logbook reviewed", "status": input.Status})
}
