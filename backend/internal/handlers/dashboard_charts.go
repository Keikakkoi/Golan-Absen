package handlers

import (
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

// SetupDashboardChartRoutes exposes one scoped read model for all existing
// dashboards. The scope is resolved from the authenticated user, never from
// a client supplied employee/team/department id.
func SetupDashboardChartRoutes(api fiber.Router) {
	api.Get("/dashboard/charts", middleware.Protected(), middleware.RequireRoles(models.RoleHRD, models.RoleManajer, models.RoleKaryawan, models.RoleMagang), GetDashboardCharts)
}

type chartPoint struct {
	Date      string `json:"date"`
	Hadir     int64  `json:"hadir"`
	Terlambat int64  `json:"terlambat"`
	Izin      int64  `json:"izin"`
	Alfa      int64  `json:"alfa"`
}

type chartValue struct {
	Label string `json:"label"`
	Value int64  `json:"value"`
}

func GetDashboardCharts(c *fiber.Ctx) error {
	start, end, err := chartDateRange(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	role := c.Locals("role").(models.Role)
	userID := c.Locals("user_id").(uint)
	ids, _, err := chartScope(role, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to resolve dashboard scope"})
	}

	trend := make([]chartPoint, 0, int(end.Sub(start).Hours()/24)+1)
	for day := start; !day.After(end); day = day.AddDate(0, 0, 1) {
		p := chartPoint{Date: day.Format("2006-01-02")}
		var rows []models.AttendanceRecord
		if len(ids) > 0 {
			config.DB.Where("employee_id IN ? AND tanggal = ?", ids, day).Find(&rows)
		}
		for _, row := range rows {
			switch row.Status {
			case models.StatusHadir:
				p.Hadir++
			case models.StatusTerlambat:
				p.Terlambat++
			case models.StatusIzin, models.StatusCuti:
				p.Izin++
			case models.StatusAlpha:
				p.Alfa++
			}
		}
		trend = append(trend, p)
	}

	today := attendanceBusinessDate(attendanceNow())
	todayStatus := chartStatus(ids, today)
	result := fiber.Map{
		"start_date": start.Format("2006-01-02"), "end_date": end.Format("2006-01-02"),
		"attendance_trend": trend, "today_status": todayStatus,
		"comparison": make([]chartValue, 0), "report_status": make([]chartValue, 0),
		"logbook_status": make([]chartValue, 0), "internship": fiber.Map{"progress_percent": 0, "days_remaining": 0},
	}
	if role == models.RoleKaryawan || role == models.RoleMagang {
		result["today_status"] = chartStatusFromTrend(trend)
	}

	if role == models.RoleHRD {
		result["comparison"] = chartDepartmentComparison(start, end)
		result["report_status"] = chartReportStatus(ids, start, end, false)
	} else if role == models.RoleManajer {
		result["comparison"] = chartMemberComparison(ids, start, end)
		result["report_status"] = chartReportStatus(ids, start, end, false)
	} else if role == models.RoleKaryawan {
		result["report_status"] = chartReportStatus(ids, start, end, false)
	} else if role == models.RoleMagang {
		result["logbook_status"] = chartLogbookStatus(ids, start, end)
		result["internship"] = chartInternship(userID)
	}
	return c.JSON(result)
}

func chartDateRange(c *fiber.Ctx) (time.Time, time.Time, error) {
	now := attendanceBusinessDate(attendanceNow())
	end := now
	start := now.AddDate(0, 0, -29)
	if value := c.Query("start_date"); value != "" {
		parsed, e := time.ParseInLocation("2006-01-02", value, jakartaLocation)
		if e != nil {
			return start, end, e
		}
		start = parsed
	}
	if value := c.Query("end_date"); value != "" {
		parsed, e := time.ParseInLocation("2006-01-02", value, jakartaLocation)
		if e != nil {
			return start, end, e
		}
		end = parsed
	}
	if end.Before(start) || end.Sub(start).Hours() > 30*24 {
		return start, end, fiber.ErrBadRequest
	}
	return start, end, nil
}

func chartScope(role models.Role, userID uint) ([]uint, []models.Employee, error) {
	if role == models.RoleManajer {
		team, err := managerTeamEmployees(userID)
		if err != nil {
			return nil, nil, err
		}
		ids := make([]uint, 0, len(team))
		for _, e := range team {
			ids = append(ids, e.ID)
		}
		return ids, team, nil
	}
	if role == models.RoleKaryawan || role == models.RoleMagang {
		var e models.Employee
		if err := config.DB.Where("user_id = ?", userID).First(&e).Error; err != nil {
			return nil, nil, err
		}
		return []uint{e.ID}, []models.Employee{e}, nil
	}
	var employees []models.Employee
	if err := config.DB.Joins("JOIN users ON users.id = employees.user_id").Where("users.status = ?", "aktif").Preload("User").Preload("Division").Find(&employees).Error; err != nil {
		return nil, nil, err
	}
	ids := make([]uint, 0, len(employees))
	for _, e := range employees {
		ids = append(ids, e.ID)
	}
	return ids, employees, nil
}

func chartStatus(ids []uint, date time.Time) []chartValue {
	values := []chartValue{{Label: "Hadir", Value: 0}, {Label: "Terlambat", Value: 0}, {Label: "Izin/Cuti", Value: 0}, {Label: "Alfa", Value: 0}, {Label: "Belum Absen", Value: 0}}
	var rows []models.AttendanceRecord
	if len(ids) > 0 {
		config.DB.Where("employee_id IN ? AND tanggal = ?", ids, date).Find(&rows)
	}
	seen := make(map[uint]bool)
	for _, row := range rows {
		seen[row.EmployeeID] = true
		switch row.Status {
		case models.StatusHadir:
			values[0].Value++
		case models.StatusTerlambat:
			values[1].Value++
		case models.StatusIzin, models.StatusCuti:
			values[2].Value++
		case models.StatusAlpha:
			values[3].Value++
		}
	}
	var approved int64
	if len(ids) > 0 {
		config.DB.Model(&models.LeaveRequest{}).Where("employee_id IN ? AND ? BETWEEN tanggal_mulai AND tanggal_selesai AND status = ?", ids, date, models.LeaveStatusApproved).Count(&approved)
	}
	// Leave records are the source of truth when attendance has not created a row.
	if approved > values[2].Value {
		values[2].Value = approved
	}
	values[4].Value = int64(len(ids)) - int64(len(seen)) - approved
	if values[4].Value < 0 {
		values[4].Value = 0
	}
	return values
}

func chartStatusFromTrend(trend []chartPoint) []chartValue {
	values := []chartValue{{Label: "Hadir", Value: 0}, {Label: "Terlambat", Value: 0}, {Label: "Izin/Cuti", Value: 0}, {Label: "Alfa", Value: 0}}
	for _, point := range trend {
		values[0].Value += point.Hadir
		values[1].Value += point.Terlambat
		values[2].Value += point.Izin
		values[3].Value += point.Alfa
	}
	return values
}

func chartDepartmentComparison(start, end time.Time) []chartValue {
	var rows []struct {
		Name  string
		Total int64
	}
	config.DB.Table("divisions").Select("nama_divisi as name, count(employees.id) as total").Joins("LEFT JOIN employees ON employees.division_id = divisions.id").Joins("LEFT JOIN attendance_records ON attendance_records.employee_id = employees.id AND attendance_records.tanggal BETWEEN ? AND ? AND attendance_records.status IN ?", start, end, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Group("divisions.id, divisions.nama_divisi").Scan(&rows)
	result := make([]chartValue, 0, len(rows))
	for _, r := range rows {
		result = append(result, chartValue{Label: r.Name, Value: r.Total})
	}
	return result
}

func chartMemberComparison(ids []uint, start, end time.Time) []chartValue {
	result := make([]chartValue, 0, len(ids))
	for _, id := range ids {
		var row struct {
			Name  string
			Total int64
		}
		config.DB.Table("employees").Select("users.nama as name, count(attendance_records.id) as total").Joins("JOIN users ON users.id=employees.user_id").Joins("LEFT JOIN attendance_records ON attendance_records.employee_id=employees.id AND attendance_records.tanggal BETWEEN ? AND ? AND attendance_records.status IN ?", start, end, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Where("employees.id = ?", id).Group("employees.id, users.nama").Scan(&row)
		result = append(result, chartValue{Label: row.Name, Value: row.Total})
	}
	return result
}

func chartReportStatus(ids []uint, start, end time.Time, logbook bool) []chartValue {
	labels := []string{"Selesai", "Pending", "Terlambat", "Ditolak"}
	if logbook {
		labels = []string{"Submitted", "Approved", "Pending", "Rejected"}
	}
	result := make([]chartValue, 0, len(labels))
	for _, label := range labels {
		var count int64
		q := config.DB.Model(&models.WorkReport{}).Where("employee_id IN ? AND tanggal BETWEEN ? AND ?", ids, start, end)
		if logbook {
			q = q.Where("status_logbook = ?", label)
		} else {
			switch label {
			case "Selesai":
				q = q.Where("status_sesuai = ? OR status_logbook = ?", "Sesuai", "approved")
			case "Pending":
				q = q.Where("status_logbook IN ?", []string{"draft", "submitted"})
			case "Terlambat":
				q = q.Where("is_late_submission = ?", true)
			case "Ditolak":
				q = q.Where("status_logbook = ?", "rejected")
			}
		}
		q.Count(&count)
		result = append(result, chartValue{Label: label, Value: count})
	}
	return result
}

func chartLogbookStatus(ids []uint, start, end time.Time) []chartValue {
	return chartReportStatus(ids, start, end, true)
}

func chartInternship(userID uint) fiber.Map {
	var u models.User
	if config.DB.First(&u, userID).Error != nil || u.InternshipStartDate == nil || u.InternshipEndDate == nil {
		return fiber.Map{"progress_percent": 0, "days_remaining": 0}
	}
	today := attendanceBusinessDate(attendanceNow())
	total := u.InternshipEndDate.Sub(*u.InternshipStartDate).Hours()/24 + 1
	elapsed := today.Sub(*u.InternshipStartDate).Hours()/24 + 1
	progress := elapsed / total * 100
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}
	remaining := int(u.InternshipEndDate.Sub(today).Hours() / 24)
	if remaining < 0 {
		remaining = 0
	}
	return fiber.Map{"progress_percent": int(progress), "days_remaining": remaining}
}
