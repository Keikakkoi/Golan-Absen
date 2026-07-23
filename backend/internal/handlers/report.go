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
	employee.Get("/stats", GetEmployeeDashboardStats)

	admin := router.Group("/admin/reports", middleware.Protected())
	admin.Get("/stats", GetAdminDashboardStats)
	admin.Get("/", GetAdminReports)
	admin.Get("/daily", GetAdminReports)
	admin.Get("/weekly", GetAdminReports)
	admin.Get("/monthly", GetAdminReports)
	admin.Get("/late", GetLateReportsSummary)
	admin.Get("/late/export", ExportLateReportsCSV)
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
	schedule := getAttendanceSchedule()
	_ = closeExpiredAttendanceRecords(now, schedule)
	workDate := attendanceBusinessDate(now)
	_, _, _, endTime, checkoutDeadline := attendanceWindow(now, schedule)
	todayAtSeven := time.Date(now.Year(), now.Month(), now.Day(), attendanceResetHour, 0, 0, 0, jakartaLocation)
	canCheckIn := !now.Before(todayAtSeven) && now.Before(endTime)
	canCheckOut := !now.Before(endTime) && !now.After(checkoutDeadline)
	startOfMonth := time.Date(workDate.Year(), workDate.Month(), 1, 0, 0, 0, 0, jakartaLocation)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)

	var hadirCount int64
	config.DB.Model(&models.AttendanceRecord{}).
		Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND status = ?", employee.ID, startOfMonth, endOfMonth, models.StatusHadir).
		Count(&hadirCount)

	var terlambatCount int64
	config.DB.Model(&models.AttendanceRecord{}).
		Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND status = ?", employee.ID, startOfMonth, endOfMonth, models.StatusTerlambat).
		Count(&terlambatCount)

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
			if todayRecord.Status == models.StatusHadir {
				todayStatus = "Hadir"
			} else if todayRecord.Status == models.StatusTerlambat {
				todayStatus = "Terlambat"
			}
		}
		if todayRecord.JamMasuk != nil {
			todayCheckInTime = todayRecord.JamMasuk.Format("15:04:05")
		}
	}

	return c.JSON(fiber.Map{
		"hadir_bulan_ini":     hadirCount,
		"terlambat_bulan_ini": terlambatCount,
		"sisa_cuti":           sisaCuti,
		"today_status":        todayStatus,
		"today_check_in":      todayCheckInTime,
		"today_check_out":     todayCheckOutTime,
		"can_check_in":        canCheckIn && todayStatus == "Belum Absen",
		"can_check_out":       canCheckOut && (todayStatus == "Hadir" || todayStatus == "Terlambat"),
		"attendance_message":  attendanceMessage(now, todayStatus, todayAtSeven, endTime, checkoutDeadline),
	})
}

func attendanceMessage(now time.Time, status string, resetAt, checkoutStart, checkoutDeadline time.Time) string {
	if now.Before(resetAt) {
		return "Check-in dibuka pukul 07:00."
	}
	if now.After(checkoutDeadline) {
		return "Batas absensi hari ini sudah lewat."
	}
	if status == "Belum Absen" && !now.Before(checkoutStart) {
		return "Batas check-in hari ini sudah lewat."
	}
	if (status == "Hadir" || status == "Terlambat") && now.Before(checkoutStart) {
		return "Check-out dapat dilakukan mulai pukul 17:00."
	}
	return ""
}

func GetAdminDashboardStats(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var totalKaryawan int64
	config.DB.Model(&models.Employee{}).Count(&totalKaryawan)

	now := attendanceNow()
	_ = closeExpiredAttendanceRecords(now, getAttendanceSchedule())
	today := attendanceBusinessDate(now).Format("2006-01-02")

	var hadirHariIni int64
	config.DB.Model(&models.AttendanceRecord{}).
		Where("tanggal = ? AND status = ?", today, models.StatusHadir).
		Count(&hadirHariIni)

	var terlambatHariIni int64
	config.DB.Model(&models.AttendanceRecord{}).
		Where("tanggal = ? AND status = ?", today, models.StatusTerlambat).
		Count(&terlambatHariIni)

	var izinCutiHariIni int64
	config.DB.Model(&models.LeaveRequest{}).
		Where("? BETWEEN tanggal_mulai AND tanggal_selesai AND status = ?", today, models.LeaveStatusApproved).
		Count(&izinCutiHariIni)

	return c.JSON(fiber.Map{
		"total_karyawan":     totalKaryawan,
		"hadir_hari_ini":     hadirHariIni,
		"terlambat_hari_ini": terlambatHariIni,
		"izin_cuti_hari_ini": izinCutiHariIni,
	})
}

func GetAdminReports(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")
	deptID := c.Query("department_id")

	query := config.DB.Preload("Employee.User").Order("tanggal desc")

	if startDate != "" && endDate != "" {
		query = query.Where("tanggal::date BETWEEN ? AND ?", startDate, endDate)
	}
	if status != "" && status != "Semua" {
		query = query.Where("status = ?", status)
	}
	if deptID != "" && deptID != "Semua" {
		query = query.Where("employee_id IN (SELECT id FROM employees WHERE department_id = ?)", deptID)
	}

	var records []models.AttendanceRecord
	if err := query.Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}

	return c.JSON(records)
}

func ExportAdminReportsCSV(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")
	deptID := c.Query("department_id")

	query := config.DB.Preload("Employee.User").Order("tanggal desc")

	if startDate != "" && endDate != "" {
		query = query.Where("tanggal::date BETWEEN ? AND ?", startDate, endDate)
	}
	if status != "" && status != "Semua" {
		query = query.Where("status = ?", status)
	}
	if deptID != "" && deptID != "Semua" {
		query = query.Where("employee_id IN (SELECT id FROM employees WHERE department_id = ?)", deptID)
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
	Departemen    string                    `json:"departemen"`
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
	Departemen string        `json:"departemen"`
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

func lateMinutes(record models.AttendanceRecord, schedule models.WorkSchedule) int64 {
	if record.JamMasuk == nil {
		return 0
	}
	start, err := scheduleStartTime(schedule, record.Tanggal)
	if err != nil {
		return 0
	}
	minutes := int64(record.JamMasuk.Sub(start).Minutes())
	if minutes < 0 {
		return 0
	}
	return minutes
}

func GetLateReportsSummary(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	startDate, endDate, err := reportDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	query := config.DB.Preload("Employee.User").
		Preload("Employee.Department").
		Preload("Employee.Position").
		Where("status = ?", models.StatusTerlambat).
		Order("tanggal desc")
	query = query.Where("tanggal::date BETWEEN ? AND ?", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	if departmentID := c.Query("department_id"); departmentID != "" && departmentID != "Semua" {
		query = query.Where("employee_id IN (SELECT id FROM employees WHERE department_id = ?)", departmentID)
	}

	var records []models.AttendanceRecord
	if err := query.Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch late reports"})
	}
	var schedule models.WorkSchedule
	if err := config.DB.Order("id asc").First(&schedule).Error; err != nil {
		schedule = models.WorkSchedule{JamMulai: "09:00:00"}
	}

	summaryMap := make(map[uint]*EmployeeReportSummary)
	for _, rec := range records {
		if _, exists := summaryMap[rec.EmployeeID]; !exists {
			summaryMap[rec.EmployeeID] = &EmployeeReportSummary{
				EmployeeID: rec.EmployeeID, NIK: rec.Employee.NIK, Departemen: rec.Employee.Department.NamaDepartemen,
				Jabatan: rec.Employee.Position.NamaJabatan, Details: []models.AttendanceRecord{},
			}
		}
		summary := summaryMap[rec.EmployeeID]
		if rec.Employee.User != nil {
			summary.Nama = rec.Employee.User.Nama
		}
		summary.Total++
		summary.TotalMenit += lateMinutes(rec, schedule)
		summary.Details = append(summary.Details, rec)
	}

	result := make([]EmployeeReportSummary, 0, len(summaryMap))
	for _, v := range summaryMap {
		if v.Total > 0 {
			v.RataRataMenit = v.TotalMenit / v.Total
		}
		result = append(result, *v)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Total != result[j].Total {
			return result[i].Total > result[j].Total
		}
		return result[i].Nama < result[j].Nama
	})

	return c.JSON(result)
}

// ExportLateReportsCSV exports one row per late attendance record so HRD can
// investigate the exact date and check-in time behind an employee summary.
func ExportLateReportsCSV(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	startDate, endDate, err := reportDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	query := config.DB.Preload("Employee.User").Preload("Employee.Department").Preload("Employee.Position").
		Where("status = ?", models.StatusTerlambat).
		Where("tanggal::date BETWEEN ? AND ?", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")).
		Order("tanggal desc")
	if departmentID := c.Query("department_id"); departmentID != "" && departmentID != "Semua" {
		query = query.Where("employee_id IN (SELECT id FROM employees WHERE department_id = ?)", departmentID)
	}
	var records []models.AttendanceRecord
	if err := query.Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to export late reports"})
	}
	var schedule models.WorkSchedule
	if err := config.DB.Order("id asc").First(&schedule).Error; err != nil {
		schedule.JamMulai = "09:00:00"
	}
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="laporan-keterlambatan.csv"`)
	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()
	_ = writer.Write([]string{"Tanggal", "NIK", "Nama", "Departemen", "Jabatan", "Jam Masuk", "Menit Terlambat", "Tipe Kerja"})
	for _, record := range records {
		jamMasuk := "-"
		if record.JamMasuk != nil {
			jamMasuk = record.JamMasuk.Format("15:04:05")
		}
		_ = writer.Write([]string{
			record.Tanggal.Format("2006-01-02"), record.Employee.NIK, record.Employee.User.Nama,
			record.Employee.Department.NamaDepartemen, record.Employee.Position.NamaJabatan,
			jamMasuk, strconv.FormatInt(lateMinutes(record, schedule), 10), record.TipeKerja,
		})
	}
	return nil
}

func GetAlphaReportsSummary(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	startDate, endDate, err := reportDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var schedule models.WorkSchedule
	if err := config.DB.Order("id asc").First(&schedule).Error; err != nil {
		schedule.HariKerja = "1,2,3,4,5"
	}
	workingDays := map[int]bool{}
	for _, value := range strings.Split(schedule.HariKerja, ",") {
		if day, parseErr := strconv.Atoi(strings.TrimSpace(value)); parseErr == nil && day >= 1 && day <= 7 {
			workingDays[day] = true
		}
	}
	if len(workingDays) == 0 {
		workingDays = map[int]bool{1: true, 2: true, 3: true, 4: true, 5: true}
	}

	var employees []models.Employee
	if err := config.DB.Preload("User").Preload("Department").Preload("Position").Find(&employees).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch employees"})
	}
	if departmentID := c.Query("department_id"); departmentID != "" && departmentID != "Semua" {
		filtered := employees[:0]
		for _, employee := range employees {
			if strconv.FormatUint(uint64(employee.DepartmentID), 10) == departmentID {
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
			resultMap[employee.ID] = &AlphaReportSummary{EmployeeID: employee.ID, NIK: employee.NIK, Nama: name, Departemen: employee.Department.NamaDepartemen, Jabatan: employee.Position.NamaJabatan, Details: []AlphaDetail{}}
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
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	// Reuse the report calculation through a small response-capturing context.
	// Fiber handlers write JSON to the response; invoking the calculation again
	// here would make the CSV diverge, so we calculate the compact CSV inputs
	// directly from the already authoritative endpoint response shape.
	startDate, endDate, err := reportDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	departmentID := c.Query("department_id")
	var employees []models.Employee
	query := config.DB.Preload("User").Preload("Department").Preload("Position")
	if departmentID != "" && departmentID != "Semua" {
		query = query.Where("department_id = ?", departmentID)
	}
	if err := query.Find(&employees).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to export alpha reports"})
	}
	var schedule models.WorkSchedule
	if err := config.DB.Order("id asc").First(&schedule).Error; err != nil {
		schedule.HariKerja = "1,2,3,4,5"
	}
	workingDays := map[int]bool{}
	for _, value := range strings.Split(schedule.HariKerja, ",") {
		if day, parseErr := strconv.Atoi(strings.TrimSpace(value)); parseErr == nil && day >= 1 && day <= 7 {
			workingDays[day] = true
		}
	}
	if len(workingDays) == 0 {
		workingDays = map[int]bool{1: true, 2: true, 3: true, 4: true, 5: true}
	}
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
	_ = writer.Write([]string{"Tanggal", "NIK", "Nama", "Departemen", "Jabatan", "Keterangan"})
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
			_ = writer.Write([]string{record.Tanggal.Format("2006-01-02"), employee.NIK, name, employee.Department.NamaDepartemen, employee.Position.NamaJabatan, "Status Alpha tercatat"})
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
				_ = writer.Write([]string{day.Format("2006-01-02"), employee.NIK, name, employee.Department.NamaDepartemen, employee.Position.NamaJabatan, keterangan})
			}
		}
	}
	return nil
}
