package handlers

import (
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

// SetupPublicSummaryRoutes exposes only aggregate values used by the public
// landing page. No employee names or attendance details leave the server.
func SetupPublicSummaryRoutes(api fiber.Router) {
	api.Get("/public/attendance-summary", GetPublicAttendanceSummary)
}

func GetPublicAttendanceSummary(c *fiber.Ctx) error {
	now := attendanceNow()
	today := attendanceBusinessDate(now).Format("2006-01-02")

	var total, present, guided int64
	config.DB.Model(&models.Employee{}).
		Joins("JOIN users ON users.id = employees.user_id").
		Where("users.status = ?", "aktif").Count(&total)
	if total > 0 {
		config.DB.Model(&models.AttendanceRecord{}).
			Joins("JOIN employees ON employees.id = attendance_records.employee_id").Joins("JOIN users ON users.id = employees.user_id").
			Where("attendance_records.tanggal = ? AND users.status = ? AND attendance_records.status IN ?", today, "aktif", []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Count(&present)
		config.DB.Model(&models.AttendanceRecord{}).
			Joins("JOIN employees ON employees.id = attendance_records.employee_id").Joins("JOIN users ON users.id = employees.user_id").
			Where("attendance_records.tanggal = ? AND users.status = ? AND (attendance_records.status = ? OR attendance_records.is_late = ?)", today, "aktif", models.StatusTerlambat, true).Count(&guided)
	}

	var lastUpdated time.Time
	config.DB.Model(&models.AttendanceRecord{}).Where("tanggal = ?", today).Select("MAX(updated_at)").Scan(&lastUpdated)
	if lastUpdated.IsZero() {
		lastUpdated = now
	}
	percentage := int64(0)
	if total > 0 {
		percentage = present * 100 / total
	}
	return c.JSON(fiber.Map{
		"date": today, "team_present_percentage": percentage,
		"present": present, "late": guided, "last_updated": lastUpdated.In(jakartaLocation),
	})
}
