package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"encoding/csv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetExecutiveDashboard returns high-level KPI and trends
func GetExecutiveDashboard(c *fiber.Ctx) error {
	if !isExecutive(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var totalEmployees int64
	var totalPresent int64
	var totalAbsent int64

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// Total Karyawan Aktif
	config.DB.Model(&models.Employee{}).Where("status = ?", "aktif").Count(&totalEmployees)

	// Kehadiran Hari Ini (Hadir + legacy Terlambat)
	config.DB.Model(&models.AttendanceRecord{}).
		Where("tanggal = ? AND status IN ?", startOfDay, []string{"Hadir", "Terlambat"}).
		Count(&totalPresent)

	// Izin/Cuti/Alpha Hari Ini
	config.DB.Model(&models.AttendanceRecord{}).
		Where("tanggal = ? AND status IN ?", startOfDay, []string{"Izin", "Cuti", "Alpha"}).
		Count(&totalAbsent)

	return c.JSON(fiber.Map{
		"kpi": fiber.Map{
			"total_employees": totalEmployees,
			"present_today":   totalPresent,
			"absent_today":    totalAbsent,
			"attendance_rate": calculateRate(totalPresent, totalEmployees),
		},
	})
}

func calculateRate(present, total int64) float64 {
	if total == 0 {
		return 0
	}
	return float64(present) / float64(total) * 100
}

// GetDivisionStats returns attendance statistics grouped by division
func GetDivisionStats(c *fiber.Ctx) error {
	if !isExecutive(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	type DeptStat struct {
		DivisionID     uint    `json:"division_id"`
		DivisionName   string  `json:"division_name"`
		TotalEmployees int     `json:"total_employees"`
		PresentCount   int     `json:"present_count"`
		AbsentCount    int     `json:"absent_count"`
		AttendanceRate float64 `json:"attendance_rate"`
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		endDate = now.Format("2006-01-02")
	}

	// This is a simplified version. For a robust solution, we'd use raw SQL or GORM grouping.
	var divisions []models.Division
	config.DB.Find(&divisions)

	var stats []DeptStat
	for _, dept := range divisions {
		var totalEmp int64
		config.DB.Model(&models.Employee{}).Where("division_id = ? AND status = ?", dept.ID, "aktif").Count(&totalEmp)

		var present, absent int64
		config.DB.Table("attendance_records").
			Joins("JOIN employees ON attendance_records.employee_id = employees.id").
			Where("employees.division_id = ? AND attendance_records.tanggal BETWEEN ? AND ?", dept.ID, startDate, endDate).
			Where("attendance_records.status IN ?", []string{"Hadir", "Terlambat"}).
			Count(&present)

		config.DB.Table("attendance_records").
			Joins("JOIN employees ON attendance_records.employee_id = employees.id").
			Where("employees.division_id = ? AND attendance_records.tanggal BETWEEN ? AND ?", dept.ID, startDate, endDate).
			Where("attendance_records.status IN ?", []string{"Alpha", "Izin", "Cuti"}).
			Count(&absent)

		var rate float64 = 0
		totalDays := present + absent
		if totalDays > 0 {
			rate = float64(present) / float64(totalDays) * 100
		}

		stats = append(stats, DeptStat{
			DivisionID:     dept.ID,
			DivisionName:   dept.NamaDivisi,
			TotalEmployees: int(totalEmp),
			PresentCount:   int(present),
			AbsentCount:    int(absent),
			AttendanceRate: rate,
		})
	}

	return c.JSON(stats)
}

// GetDivisionComparison is the dedicated comparison endpoint used by the
// executive comparison page. It intentionally shares the same calculation as
// the statistics endpoint so both screens always show identical figures.
func GetDivisionComparison(c *fiber.Ctx) error {
	return GetDivisionStats(c)
}

// GetExecutiveReports returns attendance details for employees with division filtering
func GetExecutiveReports(c *fiber.Ctx) error {
	if !isExecutive(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	deptID := c.Query("division_id")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		endDate = now.Format("2006-01-02")
	}

	type Result struct {
		Tanggal    time.Time
		NIK        string
		Nama       string
		NamaDivisi string
		JamMasuk   *time.Time
		JamPulang  *time.Time
		Status     string
	}

	query := config.DB.Table("attendance_records").
		Select("attendance_records.tanggal, employees.nik, users.nama, divisions.nama_divisi, attendance_records.jam_masuk, attendance_records.jam_pulang, attendance_records.status").
		Joins("JOIN employees ON attendance_records.employee_id = employees.id").
		Joins("JOIN users ON employees.user_id = users.id").
		Joins("JOIN divisions ON employees.division_id = divisions.id").
		Where("attendance_records.tanggal BETWEEN ? AND ?", startDate, endDate)

	if deptID != "" {
		query = query.Where("employees.division_id = ?", deptID)
	}

	search := c.Query("search")
	if search != "" {
		query = query.Where("LOWER(users.nama) LIKE ? OR employees.nik LIKE ?", "%"+strings.ToLower(search)+"%", "%"+search+"%")
	}

	var records []Result
	if err := query.Order("attendance_records.tanggal DESC").Find(&records).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}

	// Transform for frontend
	type ReportRow struct {
		Date         time.Time `json:"date"`
		NIK          string    `json:"nik"`
		Name         string    `json:"name"`
		DivisionName string    `json:"division_name"`
		CheckIn      string    `json:"check_in"`
		CheckOut     string    `json:"check_out"`
		Status       string    `json:"status"`
	}

	var results []ReportRow
	for _, r := range records {
		var checkIn, checkOut string
		if r.JamMasuk != nil {
			checkIn = r.JamMasuk.Format("15:04:05")
		}
		if r.JamPulang != nil {
			checkOut = r.JamPulang.Format("15:04:05")
		}

		status := r.Status
		if status == "Terlambat" {
			status = "Hadir"
		}
		results = append(results, ReportRow{
			Date:         r.Tanggal,
			NIK:          r.NIK,
			Name:         r.Nama,
			DivisionName: r.NamaDivisi,
			CheckIn:      checkIn,
			CheckOut:     checkOut,
			Status:       status,
		})
	}

	return c.JSON(results)
}

// ExportExecutiveReportsCSV exports the filtered executive report directly
// from the API, so export is not limited by the browser's currently rendered
// page and remains available when the result set is empty.
func ExportExecutiveReportsCSV(c *fiber.Ctx) error {
	if !isExecutive(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		endDate = now.Format("2006-01-02")
	}

	type result struct {
		Tanggal    time.Time
		NIK        string
		Nama       string
		NamaDivisi string
		JamMasuk   *time.Time
		JamPulang  *time.Time
		Status     string
	}
	query := config.DB.Table("attendance_records").
		Select("attendance_records.tanggal, employees.nik, users.nama, divisions.nama_divisi, attendance_records.jam_masuk, attendance_records.jam_pulang, attendance_records.status").
		Joins("JOIN employees ON attendance_records.employee_id = employees.id").
		Joins("JOIN users ON employees.user_id = users.id").
		Joins("JOIN divisions ON employees.division_id = divisions.id").
		Where("attendance_records.tanggal BETWEEN ? AND ?", startDate, endDate)

	if deptID := c.Query("division_id"); deptID != "" {
		query = query.Where("employees.division_id = ?", deptID)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("LOWER(users.nama) LIKE ? OR employees.nik LIKE ?", "%"+strings.ToLower(search)+"%", "%"+search+"%")
	}

	var records []result
	if err := query.Order("attendance_records.tanggal DESC").Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to export reports"})
	}

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="laporan-kehadiran-pimpinan.csv"`)
	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()
	_ = writer.Write([]string{"Tanggal", "NIK", "Nama Karyawan", "Divisi", "Check In", "Check Out", "Status"})
	for _, record := range records {
		checkIn, checkOut := "", ""
		if record.JamMasuk != nil {
			checkIn = record.JamMasuk.Format("15:04:05")
		}
		if record.JamPulang != nil {
			checkOut = record.JamPulang.Format("15:04:05")
		}
		recordStatus := record.Status
		if recordStatus == "Terlambat" {
			recordStatus = "Hadir"
		}
		_ = writer.Write([]string{
			record.Tanggal.Format("2006-01-02"), record.NIK, record.Nama,
			record.NamaDivisi, checkIn, checkOut, recordStatus,
		})
	}
	return nil
}

func isExecutive(c *fiber.Ctx) bool {
	role, ok := c.Locals("role").(models.Role)
	return ok && role == models.RolePimpinan
}
