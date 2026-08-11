package handlers

import (
	"encoding/csv"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"

	"github.com/gofiber/fiber/v2"
)

func SetupReportRoutes(router fiber.Router) {
	employee := router.Group("/dashboard/employee", middleware.Protected())
	employee.Get("/stats", middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer), GetEmployeeDashboardStats)

	admin := router.Group("/admin/reports", middleware.Protected())
	admin.Get("/stats", GetAdminDashboardStats)
	admin.Get("/", GetAdminReports)
	admin.Get("", GetAdminReports)
	admin.Get("/daily", GetAdminReports)
	admin.Get("/weekly", GetAdminReports)
	admin.Get("/monthly", GetAdminReports)
	admin.Get("/missing-work-reports", GetMissingWorkReports)
	admin.Get("/alpha", GetAlphaReportsSummary)
	admin.Get("/alpha/export", ExportAlphaReportsCSV)
	admin.Get("/export", ExportAdminReportsCSV)
}

func GetEmployeeDashboardStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	// Current month boundaries
	now := attendanceNow()
	workDate := attendanceBusinessDate(now)
	schedule := getAttendanceSchedule(employee.ID, workDate)
	_ = closeExpiredAttendanceRecords(now)
	_, startTime, _, endTime, checkoutDeadline := attendanceWindow(now, schedule)
	canCheckIn := !now.Before(startTime) && now.Before(endTime)
	canCheckOut := !now.Before(endTime) && !now.After(checkoutDeadline)
	startOfMonth := time.Date(workDate.Year(), workDate.Month(), 1, 0, 0, 0, 0, jakartaLocation)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)

	var hadirCount int64
	config.DB.Model(&models.AttendanceRecord{}).
		Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND status IN ?", employee.ID, startOfMonth, endOfMonth, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).
		Count(&hadirCount)

	// Leave Quota for this year
	var quota models.LeaveQuota
	sisaCuti := 12 // Default
	if err := config.DB.Where("employee_id = ? AND jenis_cuti = ? AND tahun = ?", employee.ID, "Cuti Tahunan", now.Year()).Limit(1).Find(&quota).Error; err == nil && quota.ID != 0 {
		sisaCuti = quota.SisaKuota
	}

	// Today's attendance status
	var todayRecord models.AttendanceRecord
	todayStatus := "Belum Absen"
	todayCheckInTime := ""
	todayCheckOutTime := ""

	err := config.DB.Where("employee_id = ? AND tanggal = ?", employee.ID, workDate.Format("2006-01-02")).First(&todayRecord).Error
	if err == nil {
		if todayRecord.JamPulang != nil {
			todayStatus = "Sudah Check-out"
			todayCheckOutTime = todayRecord.JamPulang.Format("15:04:05")
		} else {
			switch todayRecord.Status {
			case models.StatusHadir, models.StatusTerlambat:
				todayStatus = "Hadir"
			case models.StatusIzin:
				todayStatus = "Izin"
			case models.StatusCuti:
				todayStatus = "Cuti"
			case models.StatusAlpha:
				todayStatus = "Alpha"
			}
		}
		if todayRecord.JamMasuk != nil {
			todayCheckInTime = todayRecord.JamMasuk.Format("15:04:05")
		}
	}

	return c.JSON(fiber.Map{
		"hadir_bulan_ini":    hadirCount,
		"sisa_cuti":          sisaCuti,
		"today_status":       todayStatus,
		"today_check_in":     todayCheckInTime,
		"today_check_out":    todayCheckOutTime,
		"can_check_in":       canCheckIn && todayStatus == "Belum Absen",
		"can_check_out":      canCheckOut && todayStatus == "Hadir",
		"attendance_message": attendanceMessage(now, todayStatus, startTime, endTime, checkoutDeadline),
		"todayMessage":       attendanceMessage(now, todayStatus, startTime, endTime, checkoutDeadline),
		"schedule": fiber.Map{
			"name":      schedule.NamaShift,
			"start":     schedule.JamMulai,
			"end":       schedule.JamSelesai,
			"deadline":  checkoutDeadline.Format("15:04"),
			"overnight": endTime.Format("2006-01-02") != startTime.Format("2006-01-02"),
		},
		"missing_work_reports": missingWorkReportRowsForEmployee(employee.ID, now),
	})
}

func attendanceMessage(now time.Time, status string, checkinStart, checkoutStart, checkoutDeadline time.Time) string {
	if now.Before(checkinStart) {
		return "Check-in dibuka pukul " + checkinStart.Format("15:04") + "."
	}
	if now.After(checkoutDeadline) {
		return "Batas absensi hari ini sudah lewat."
	}
	if status == "Belum Absen" && !now.Before(checkoutStart) {
		return "Batas check-in hari ini sudah lewat."
	}
	if status == "Hadir" && now.Before(checkoutStart) {
		return "Check-out dapat dilakukan mulai pukul " + checkoutStart.Format("15:04") + "."
	}
	if status == "Izin" || status == "Cuti" {
		return "Anda tidak perlu melakukan check-in karena status " + status + " sudah tercatat hari ini."
	}
	if status == "Alpha" {
		return "Anda tidak melakukan absensi pada hari kerja ini."
	}
	return ""
}

func GetAdminDashboardStats(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var totalKaryawan int64
	config.DB.Model(&models.Employee{}).Count(&totalKaryawan)

	now := attendanceNow()
	_ = closeExpiredAttendanceRecords(now)
	today := attendanceBusinessDate(now).Format("2006-01-02")

	var hadirHariIni int64
	config.DB.Model(&models.AttendanceRecord{}).
		Where("tanggal = ? AND status IN ?", today, []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).
		Count(&hadirHariIni)

	var izinCutiHariIni int64
	config.DB.Model(&models.LeaveRequest{}).
		Where("? BETWEEN tanggal_mulai AND tanggal_selesai AND status = ?", today, models.LeaveStatusApproved).
		Count(&izinCutiHariIni)

	belumAbsenHariIni := totalKaryawan - (hadirHariIni + izinCutiHariIni)
	if belumAbsenHariIni < 0 {
		belumAbsenHariIni = 0
	}

	var totalMagang, magangAktif, logbookPending int64
	config.DB.Model(&models.User{}).Where("role = ?", models.RoleMagang).Count(&totalMagang)
	config.DB.Model(&models.User{}).Where("role = ? AND internship_end_date >= ?", models.RoleMagang, today).Count(&magangAktif)
	config.DB.Model(&models.WorkReport{}).Joins("JOIN employees ON employees.id = work_reports.employee_id").Joins("JOIN users ON users.id = employees.user_id").Where("users.role = ? AND work_reports.status_logbook = ?", models.RoleMagang, "submitted").Count(&logbookPending)
	sertifikatTerbit := getSertifikatTerbitCount()
	var employeeIDs []uint
	config.DB.Model(&models.Employee{}).Pluck("id", &employeeIDs)
	missingReports := missingWorkReportRows(employeeIDs, now)

	return c.JSON(fiber.Map{
		"total_karyawan":            totalKaryawan,
		"hadir_hari_ini":            hadirHariIni,
		"belum_absen_hari_ini":      belumAbsenHariIni,
		"izin_cuti_hari_ini":        izinCutiHariIni,
		"total_magang":              totalMagang,
		"magang_aktif":              magangAktif,
		"logbook_pending":           logbookPending,
		"sertifikat_terbit":         sertifikatTerbit,
		"missing_work_reports":      missingReports,
		"missing_work_report_count": len(missingReports),
	})
}

func GetMissingWorkReports(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var employeeIDs []uint
	config.DB.Model(&models.Employee{}).Pluck("id", &employeeIDs)
	return c.JSON(missingWorkReportRows(employeeIDs, attendanceNow()))
}

func GetAdminReports(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	_ = closeExpiredAttendanceRecords(attendanceNow())

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")
	deptID := c.Query("division_id")
	projectID := c.Query("project_id")

	query := config.DB.Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Order("tanggal desc")

	if startDate != "" && endDate != "" {
		query = query.Where("tanggal::date BETWEEN ? AND ?", startDate, endDate)
	}
	if status != "" && status != "Semua" {
		if status == "Belum Check-out" {
			query = query.Where("is_checkout_missing = ?", true)
		} else {
			query = query.Where("status = ?", status)
		}
	}
	if deptID != "" && deptID != "Semua" {
		query = query.Where("employee_id IN (SELECT id FROM employees WHERE division_id = ?)", deptID)
	}
	if projectID != "" && projectID != "Semua" {
		query = query.Where("employee_id IN (SELECT employees.id FROM employees JOIN users ON users.id = employees.user_id WHERE users.project_id = ?)", projectID)
	}

	var records []models.AttendanceRecord
	if err := query.Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}
	// Mask any legacy Terlambat records to Hadir
	for i := range records {
		if records[i].Status == models.StatusTerlambat {
			records[i].Status = models.StatusHadir
		}
	}

	return c.JSON(records)
}

func ExportAdminReportsCSV(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	_ = closeExpiredAttendanceRecords(attendanceNow())

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")
	deptID := c.Query("division_id")
	projectID := c.Query("project_id")

	query := config.DB.Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Order("tanggal desc")

	if startDate != "" && endDate != "" {
		query = query.Where("tanggal::date BETWEEN ? AND ?", startDate, endDate)
	}
	if status != "" && status != "Semua" {
		if status == "Belum Check-out" {
			query = query.Where("is_checkout_missing = ?", true)
		} else {
			query = query.Where("status = ?", status)
		}
	}
	if deptID != "" && deptID != "Semua" {
		query = query.Where("employee_id IN (SELECT id FROM employees WHERE division_id = ?)", deptID)
	}
	if projectID != "" && projectID != "Semua" {
		query = query.Where("employee_id IN (SELECT employees.id FROM employees JOIN users ON users.id = employees.user_id WHERE users.project_id = ?)", projectID)
	}

	var records []models.AttendanceRecord
	if err := query.Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", `attachment; filename="rekap_absensi.csv"`)

	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()

	// Header
	writer.Write([]string{"Tanggal", "NIK", "Nama Karyawan", "Tipe Kerja", "Jam Masuk", "Jam Pulang", "Status"})

	for _, rec := range records {
		jamMasuk := "-"
		if rec.JamMasuk != nil {
			jamMasuk = rec.JamMasuk.Format("15:04:05")
		}
		jamPulang := "-"
		if rec.JamPulang != nil {
			jamPulang = rec.JamPulang.Format("15:04:05")
		}

		writer.Write([]string{
			rec.Tanggal.Format("2006-01-02"),
			rec.Employee.NIK,
			rec.Employee.User.Nama,
			rec.TipeKerja,
			jamMasuk,
			jamPulang,
			string(rec.Status),
		})
	}

	return nil
}

type EmployeeReportSummary struct {
	EmployeeID    uint                      `json:"employee_id"`
	NIK           string                    `json:"nik"`
	Nama          string                    `json:"nama"`
	Divisi        string                    `json:"divisi"`
	Jabatan       string                    `json:"jabatan"`
	Total         int64                     `json:"total"`
	TotalMenit    int64                     `json:"total_menit,omitempty"`
	RataRataMenit int64                     `json:"rata_rata_menit,omitempty"`
	Details       []models.AttendanceRecord `json:"details"`
}

type AlphaDetail struct {
	Tanggal    time.Time `json:"tanggal"`
	Keterangan string    `json:"keterangan"`
}

type AlphaReportSummary struct {
	EmployeeID uint          `json:"employee_id"`
	NIK        string        `json:"nik"`
	Nama       string        `json:"nama"`
	Divisi     string        `json:"divisi"`
	Jabatan    string        `json:"jabatan"`
	Total      int64         `json:"total"`
	Details    []AlphaDetail `json:"details"`
}

func reportDateRange(c *fiber.Ctx) (time.Time, time.Time, error) {
	now := attendanceNow()
	workDate := attendanceBusinessDate(now)
	startValue := c.Query("start_date")
	endValue := c.Query("end_date")
	if startValue == "" {
		startValue = workDate.Format("2006-01-02")[:8] + "01"
	}
	if endValue == "" {
		endValue = workDate.Format("2006-01-02")
	}
	start, err := time.ParseInLocation("2006-01-02", startValue, now.Location())
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("start_date harus berformat YYYY-MM-DD")
	}
	end, err := time.ParseInLocation("2006-01-02", endValue, now.Location())
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("end_date harus berformat YYYY-MM-DD")
	}
	if end.Before(start) {
		return time.Time{}, time.Time{}, fmt.Errorf("end_date tidak boleh lebih awal dari start_date")
	}
	if end.Sub(start) > 366*24*time.Hour {
		return time.Time{}, time.Time{}, fmt.Errorf("periode laporan maksimal 366 hari")
	}
	return start, end, nil
}

func scheduleStartTime(schedule models.WorkSchedule, date time.Time) (time.Time, error) {
	clock := strings.TrimSpace(schedule.JamMulai)
	parsed, err := time.Parse("15:04:05", clock)
	if err != nil {
		parsed, err = time.Parse("15:04", clock)
	}
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(date.Year(), date.Month(), date.Day(), parsed.Hour(), parsed.Minute(), parsed.Second(), 0, date.Location()), nil
}

func GetAlphaReportsSummary(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	_ = closeExpiredAttendanceRecords(attendanceNow())

	startDate, endDate, err := reportDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	workingDays := map[int]bool{1: true, 2: true, 3: true, 4: true, 5: true}

	var employees []models.Employee
	if err := config.DB.Preload("User").Preload("Division").Preload("Position").Find(&employees).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch employees"})
	}
	if divisionID := c.Query("division_id"); divisionID != "" && divisionID != "Semua" {
		filtered := employees[:0]
		for _, employee := range employees {
			if strconv.FormatUint(uint64(employee.DivisionID), 10) == divisionID {
				filtered = append(filtered, employee)
			}
		}
		employees = filtered
	}
	if projectID := c.Query("project_id"); projectID != "" && projectID != "Semua" {
		filtered := employees[:0]
		for _, employee := range employees {
			if employee.User != nil && employee.User.ProjectID != nil && strconv.FormatUint(uint64(*employee.User.ProjectID), 10) == projectID {
				filtered = append(filtered, employee)
			}
		}
		employees = filtered
	}
	if name := c.Query("name"); name != "" {
		lowerName := strings.ToLower(name)
		filtered := employees[:0]
		for _, employee := range employees {
			if employee.User != nil && strings.Contains(strings.ToLower(employee.User.Nama), lowerName) {
				filtered = append(filtered, employee)
			}
		}
		employees = filtered
	}

	var records []models.AttendanceRecord
	if err := config.DB.Where("tanggal::date BETWEEN ? AND ?", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")).Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch attendance records"})
	}
	attendanceByEmployeeDate := make(map[string]models.AttendanceRecord)
	for _, record := range records {
		attendanceByEmployeeDate[fmt.Sprintf("%d:%s", record.EmployeeID, record.Tanggal.Format("2006-01-02"))] = record
	}

	var holidays []models.Holiday
	config.DB.Where("tanggal BETWEEN ? AND ?", startDate, endDate).Find(&holidays)
	holidayDates := make(map[string]bool)
	for _, holiday := range holidays {
		holidayDates[holiday.Tanggal.Format("2006-01-02")] = true
	}
	var leaves []models.LeaveRequest
	config.DB.Where("status = ? AND tanggal_mulai <= ? AND tanggal_selesai >= ?", models.LeaveStatusApproved, endDate, startDate).Find(&leaves)
	leaveDates := make(map[string]bool)
	for _, leave := range leaves {
		for day := leave.TanggalMulai; !day.After(leave.TanggalSelesai); day = day.AddDate(0, 0, 1) {
			leaveDates[fmt.Sprintf("%d:%s", leave.EmployeeID, day.Format("2006-01-02"))] = true
		}
	}

	resultMap := make(map[uint]*AlphaReportSummary)
	ensureSummary := func(employee models.Employee) *AlphaReportSummary {
		if resultMap[employee.ID] == nil {
			name := ""
			if employee.User != nil {
				name = employee.User.Nama
			}
			resultMap[employee.ID] = &AlphaReportSummary{EmployeeID: employee.ID, NIK: employee.NIK, Nama: name, Divisi: employee.Division.NamaDivisi, Jabatan: employee.Position.NamaJabatan, Details: []AlphaDetail{}}
		}
		return resultMap[employee.ID]
	}
	employeesByID := make(map[uint]models.Employee, len(employees))
	for _, employee := range employees {
		employeesByID[employee.ID] = employee
	}
	// Preserve explicit Alpha records, including records inserted by a prior
	// process, while also detecting missing attendance for completed workdays.
	for _, record := range records {
		if record.Status == models.StatusAlpha {
			summary, ok := employeesByID[record.EmployeeID]
			if !ok {
				continue
			}
			item := ensureSummary(summary)
			item.Total++
			item.Details = append(item.Details, AlphaDetail{Tanggal: record.Tanggal, Keterangan: "Status Alpha tercatat"})
		}
	}
	today := time.Now().In(startDate.Location())
	lastCompletedDay := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location()).AddDate(0, 0, -1)
	if endDate.Before(lastCompletedDay) {
		lastCompletedDay = endDate
	}
	for _, employee := range employees {
		for day := startDate; !day.After(lastCompletedDay); day = day.AddDate(0, 0, 1) {
			// time.Weekday uses Sunday=0, while the persisted schedule uses
			// the documented Monday=1 ... Sunday=7 convention.
			weekday := int(day.Weekday())
			if weekday == 0 {
				weekday = 7
			}
			if !workingDays[weekday] || holidayDates[day.Format("2006-01-02")] {
				continue
			}
			if !employee.TanggalBergabung.IsZero() && day.Before(employee.TanggalBergabung) {
				continue
			}
			key := fmt.Sprintf("%d:%s", employee.ID, day.Format("2006-01-02"))
			if _, exists := attendanceByEmployeeDate[key]; exists || leaveDates[key] {
				continue
			}
			item := ensureSummary(employee)
			item.Total++
			item.Details = append(item.Details, AlphaDetail{Tanggal: day, Keterangan: "Tidak ada absensi atau izin yang disetujui"})
		}
	}
	result := make([]AlphaReportSummary, 0, len(resultMap))
	for _, summary := range resultMap {
		result = append(result, *summary)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Total != result[j].Total {
			return result[i].Total > result[j].Total
		}
		return result[i].Nama < result[j].Nama
	})
	return c.JSON(result)
}

// ExportAlphaReportsCSV exports the same computed Alpha result as the screen,
// including inferred absences that have no AttendanceRecord yet.
func ExportAlphaReportsCSV(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	_ = closeExpiredAttendanceRecords(attendanceNow())
	// Reuse the report calculation through a small response-capturing context.
	// Fiber handlers write JSON to the response; invoking the calculation again
	// here would make the CSV diverge, so we calculate the compact CSV inputs
	// directly from the already authoritative endpoint response shape.
	startDate, endDate, err := reportDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	divisionID := c.Query("division_id")
	projectID := c.Query("project_id")
	var employees []models.Employee
	query := config.DB.Preload("User").Preload("Division").Preload("Position")
	if divisionID != "" && divisionID != "Semua" {
		query = query.Where("division_id = ?", divisionID)
	}
	if projectID != "" && projectID != "Semua" {
		query = query.Where("user_id IN (SELECT id FROM users WHERE project_id = ?)", projectID)
	}
	if name := c.Query("name"); name != "" {
		query = query.Where("user_id IN (SELECT id FROM users WHERE nama ILIKE ?)", "%"+name+"%")
	}
	if err := query.Find(&employees).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to export alpha reports"})
	}
	workingDays := map[int]bool{1: true, 2: true, 3: true, 4: true, 5: true}
	var records []models.AttendanceRecord
	if err := config.DB.Where("tanggal::date BETWEEN ? AND ?", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")).Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to export alpha reports"})
	}
	var holidays []models.Holiday
	config.DB.Where("tanggal BETWEEN ? AND ?", startDate, endDate).Find(&holidays)
	holidayDates := make(map[string]bool)
	for _, holiday := range holidays {
		holidayDates[holiday.Tanggal.Format("2006-01-02")] = true
	}
	var leaves []models.LeaveRequest
	config.DB.Where("status = ? AND tanggal_mulai <= ? AND tanggal_selesai >= ?", models.LeaveStatusApproved, endDate, startDate).Find(&leaves)
	leaveDates := make(map[string]bool)
	for _, leave := range leaves {
		for day := leave.TanggalMulai; !day.After(leave.TanggalSelesai); day = day.AddDate(0, 0, 1) {
			leaveDates[fmt.Sprintf("%d:%s", leave.EmployeeID, day.Format("2006-01-02"))] = true
		}
	}
	attendance := make(map[string]models.AttendanceRecord)
	for _, record := range records {
		attendance[fmt.Sprintf("%d:%s", record.EmployeeID, record.Tanggal.Format("2006-01-02"))] = record
	}
	today := time.Now().In(startDate.Location())
	lastCompletedDay := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location()).AddDate(0, 0, -1)
	if endDate.Before(lastCompletedDay) {
		lastCompletedDay = endDate
	}
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="laporan-ketidakhadiran-alpha.csv"`)
	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()
	_ = writer.Write([]string{"Tanggal", "NIK", "Nama", "Divisi", "Jabatan", "Keterangan"})
	written := make(map[string]bool)
	for _, record := range records {
		if record.Status != models.StatusAlpha {
			continue
		}
		for _, employee := range employees {
			if employee.ID != record.EmployeeID {
				continue
			}
			name := ""
			if employee.User != nil {
				name = employee.User.Nama
			}
			key := fmt.Sprintf("%d:%s", employee.ID, record.Tanggal.Format("2006-01-02"))
			written[key] = true
			_ = writer.Write([]string{record.Tanggal.Format("2006-01-02"), employee.NIK, name, employee.Division.NamaDivisi, employee.Position.NamaJabatan, "Status Alpha tercatat"})
		}
	}
	for _, employee := range employees {
		for day := startDate; !day.After(lastCompletedDay); day = day.AddDate(0, 0, 1) {
			weekday := int(day.Weekday())
			if weekday == 0 {
				weekday = 7
			}
			key := fmt.Sprintf("%d:%s", employee.ID, day.Format("2006-01-02"))
			if !workingDays[weekday] || holidayDates[day.Format("2006-01-02")] || !employee.TanggalBergabung.IsZero() && day.Before(employee.TanggalBergabung) || leaveDates[key] {
				continue
			}
			if _, alreadyWritten := written[key]; alreadyWritten {
				continue
			}
			if _, exists := attendance[key]; !exists {
				keterangan := "Tidak ada absensi atau izin yang disetujui"
				name := ""
				if employee.User != nil {
					name = employee.User.Nama
				}
				_ = writer.Write([]string{day.Format("2006-01-02"), employee.NIK, name, employee.Division.NamaDivisi, employee.Position.NamaJabatan, keterangan})
			}
		}
	}
	return nil
}
