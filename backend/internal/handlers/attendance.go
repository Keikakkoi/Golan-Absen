package handlers

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	auditutils "absensi-golan-backend/internal/utils"
	"absensi-golan-backend/pkg/minio"
	"absensi-golan-backend/pkg/utils"
	"github.com/gofiber/fiber/v2"
	miniogo "github.com/minio/minio-go/v7"
)

func SetupAttendanceRoutes(router fiber.Router) {
	attendance := router.Group("/attendance", middleware.Protected(), middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer))
	attendance.Post("/checkin", CheckIn)
	attendance.Post("/checkout", CheckOut)
	attendance.Get("/history", GetAttendanceHistory)
	attendance.Get("/office", GetOfficeInfo)
	startAttendanceAutoCheckout()
}

const (
	attendanceResetHour = 7
	defaultStartTime    = "09:00:00"
	defaultEndTime      = "17:00:00"
	defaultGraceMinutes = 10
)

var autoCheckoutOnce sync.Once
var missingAttendanceMu sync.Mutex

var jakartaLocation = time.FixedZone("Asia/Jakarta", 7*60*60)

func CheckIn(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	now := attendanceNow()
	workDate := attendanceBusinessDate(now)
	schedule := getAttendanceSchedule(employee.ID, workDate)
	_, startTime, lateTime, endTime, checkoutDeadline := attendanceWindow(now, schedule)
	if now.Before(startTime) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Check-in baru dapat dilakukan mulai pukul " + startTime.Format("15:04") + "."})
	}
	if !now.Before(endTime) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Batas check-in hari ini adalah pukul " + endTime.Format("15:04") + "."})
	}
	_ = closeExpiredAttendanceRecords(now)
	if now.After(checkoutDeadline) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Periode absensi hari ini sudah ditutup setelah pukul " + checkoutDeadline.Format("15:04") + "."})
	}

	// An attendance row can also be created for an approved leave/cuti. Such a
	// row has no JamMasuk and must not be treated as a completed check-in.
	var existingRecord models.AttendanceRecord
	if err := config.DB.Where("employee_id = ? AND tanggal = ? AND jam_masuk IS NOT NULL", employee.ID, workDate.Format("2006-01-02")).First(&existingRecord).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Anda sudah melakukan check-in 1 kali untuk hari ini."})
	}

	// The leave request is the source of truth. Attendance rows for future
	// leave dates used to be materialized when a request was approved, which
	// made the history look as if the employee had already been absent for
	// days that had not happened yet. Keep the check-in guard scoped to the
	// actual attendance date.
	var leaveRequest models.LeaveRequest
	if err := config.DB.Where(
		"employee_id = ? AND status = ? AND tanggal_mulai <= ? AND tanggal_selesai >= ?",
		employee.ID,
		models.LeaveStatusApproved,
		workDate.Format("2006-01-02"),
		workDate.Format("2006-01-02"),
	).First(&leaveRequest).Error; err == nil {
		leaveStatus := models.StatusIzin
		if leaveRequest.JenisIzin == models.LeaveTypeCuti {
			leaveStatus = models.StatusCuti
		}
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Anda memiliki status " + string(leaveStatus) + " untuk hari ini, sehingga tidak dapat melakukan check-in."})
	}

	latStr := c.FormValue("latitude")
	lonStr := c.FormValue("longitude")
	accStr := c.FormValue("accuracy")

	lat, _ := strconv.ParseFloat(latStr, 64)
	lon, _ := strconv.ParseFloat(lonStr, 64)
	acc, _ := strconv.ParseFloat(accStr, 64)

	tipeKerja := c.FormValue("tipe_kerja")
	if tipeKerja == "" {
		tipeKerja = "WFO"
	}

	// Fetch WorkType details
	var wt models.WorkType
	if err := config.DB.Where("nama = ?", tipeKerja).First(&wt).Error; err != nil {
		// fallback to defaults if not found in db
		wt.Nama = tipeKerja
		wt.IsHomeBase = (tipeKerja == "WFH")
	}

	var distance float64
	var dalamRadius bool
	radiusTervalidasi := "tidak_tervalidasi"

	if wt.IsHomeBase {
		var validationErr error
		dalamRadius, radiusTervalidasi, validationErr = validateHomeAttendanceLocation(employee.ID, lat, lon)
		if validationErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": validationErr.Error()})
		}
	} else if wt.Nama == "WFO" {
		var office models.OfficeLocation
		if err := config.DB.First(&office).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Office location not configured"})
		}
		// Use office coordinates
		distance = utils.HaversineDistance(lat, lon, office.Latitude, office.Longitude)
		dalamRadius = distance <= office.RadiusMeter
		radiusTervalidasi = "kantor"
		if !dalamRadius {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Location outside of allowed radius for WFO"})
		}
	} else {
		// Custom work type (e.g. Dinas Luar) - bypass radius check
		dalamRadius = true
		radiusTervalidasi = "custom"
	}

	// Selfie is a mandatory attendance proof for both check-in and check-out.
	var imageURL string
	file, err := c.FormFile("selfie")
	if err != nil || file == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Selfie wajib diambil sebagai bukti check-in"})
	}
	imageURL, err = uploadToMinIO(file, employee.NIK, "checkin")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to upload image"})
	}

	// Determine Status — always Hadir within the check-in window.
	nowStr := now.Format("15:04:05")

	status := models.StatusHadir
	lateMinutes := 0
	if now.After(lateTime) {
		lateMinutes = int(now.Sub(startTime).Minutes())
		if lateMinutes < 0 {
			lateMinutes = 0
		}
	}

	record := models.AttendanceRecord{
		EmployeeID:          employee.ID,
		Tanggal:             workDate,
		JamMasuk:            &now,
		IsLate:              now.After(lateTime),
		LateDurationMinutes: lateMinutes,
		Status:              status,
		LatitudeMasuk:       lat,
		LongitudeMasuk:      lon,
		AkurasiGPSMasuk:     acc,
		DalamRadiusMasuk:    dalamRadius,
		FotoSelfieMasukURL:  imageURL,
		Latitude:            lat,
		Longitude:           lon,
		AkurasiGPS:          acc,
		DalamRadius:         dalamRadius,
		RadiusTervalidasi:   radiusTervalidasi,
		TipeKerja:           tipeKerja,
	}

	if err := config.DB.Create(&record).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save attendance record"})
	}
	auditutils.LogAction(userID, "CREATE", "AttendanceRecord", record.ID, fmt.Sprintf("Check-in %s untuk %s (%s)", status, employee.NIK, tipeKerja))

	var hrdUsers []models.User
	if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
		for _, hrd := range hrdUsers {
			_ = auditutils.CreateNotification(config.DB, hrd.ID, models.RoleHRD, "Check-In", "Check-In Karyawan", fmt.Sprintf("%s melakukan check-in pada %s (%s)", employee.NIK, now.Format("02 Jan 2006 15:04"), wt.Nama))
		}
	}

	// Broadcast WS
	WsHub.Broadcast <- fiber.Map{
		"event": "new_checkin",
		"data":  record,
	}

	return c.JSON(fiber.Map{
		"message": "Check-in successful",
		"status":  status,
		"time":    nowStr,
	})
}

func CheckOut(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	now := attendanceNow()
	workDate := attendanceBusinessDate(now)
	schedule := getAttendanceSchedule(employee.ID, workDate)
	_, _, _, checkoutStart, checkoutDeadline := attendanceWindow(now, schedule)
	if now.Before(checkoutStart) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Check-out baru dapat dilakukan mulai pukul " + checkoutStart.Format("15:04") + "."})
	}

	// Find the current attendance-day record. The attendance day resets at 07:00.
	var record models.AttendanceRecord
	if err := config.DB.Where("employee_id = ? AND tanggal = ?", employee.ID, workDate.Format("2006-01-02")).First(&record).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Anda belum melakukan check-in untuk hari ini."})
	}

	if record.JamPulang != nil {
		if record.CheckOutOtomatis {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Batas check-out sudah lewat. Sistem telah melakukan check-out otomatis pada pukul " + record.JamPulang.Format("15:04") + "."})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Already checked out today"})
	}
	if now.After(checkoutDeadline) {
		_ = closeExpiredAttendanceRecords(now)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Batas check-out pukul " + checkoutDeadline.Format("15:04") + " sudah lewat. Sistem melakukan check-out otomatis."})
	}

	latStr := c.FormValue("latitude")
	lonStr := c.FormValue("longitude")
	accStr := c.FormValue("accuracy")

	lat, _ := strconv.ParseFloat(latStr, 64)
	lon, _ := strconv.ParseFloat(lonStr, 64)
	acc, _ := strconv.ParseFloat(accStr, 64)

	var wt models.WorkType
	if err := config.DB.Where("nama = ?", record.TipeKerja).First(&wt).Error; err != nil {
		wt.Nama = record.TipeKerja
		wt.IsHomeBase = (record.TipeKerja == "WFH")
	}

	var dalamRadius bool
	radiusTervalidasi := "tidak_tervalidasi"

	if wt.IsHomeBase {
		var validationErr error
		dalamRadius, radiusTervalidasi, validationErr = validateHomeAttendanceLocation(employee.ID, lat, lon)
		if validationErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": validationErr.Error()})
		}
	} else if wt.Nama == "WFO" {
		var office models.OfficeLocation
		if err := config.DB.First(&office).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Office location not configured"})
		}
		distance := utils.HaversineDistance(lat, lon, office.Latitude, office.Longitude)
		dalamRadius = distance <= office.RadiusMeter
		radiusTervalidasi = "kantor"
		if !dalamRadius {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Location outside of allowed radius for WFO"})
		}
	} else {
		dalamRadius = true
		radiusTervalidasi = "custom"
	}

	// Selfie is a mandatory attendance proof for both check-in and check-out.
	var imageURL string
	file, err := c.FormFile("selfie")
	if err != nil || file == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Selfie wajib diambil sebagai bukti check-out"})
	}
	imageURL, err = uploadToMinIO(file, employee.NIK, "checkout")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to upload image"})
	}

	record.JamPulang = &now
	record.LatitudePulang = lat
	record.LongitudePulang = lon
	record.AkurasiGPSPulang = acc
	record.DalamRadiusPulang = dalamRadius
	record.FotoSelfiePulangURL = imageURL
	record.Latitude = lat
	record.Longitude = lon
	record.AkurasiGPS = acc
	record.DalamRadius = dalamRadius
	record.RadiusTervalidasi = radiusTervalidasi

	if err := config.DB.Save(&record).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save check-out record"})
	}
	auditutils.LogAction(userID, "UPDATE", "AttendanceRecord", record.ID, fmt.Sprintf("Check-out untuk %s", employee.NIK))

	var hrdUsers []models.User
	if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
		for _, hrd := range hrdUsers {
			_ = auditutils.CreateNotification(config.DB, hrd.ID, models.RoleHRD, "Check-Out", "Check-Out Karyawan", fmt.Sprintf("%s melakukan check-out pada %s (%s)", employee.NIK, now.Format("02 Jan 2006 15:04"), wt.Nama))
		}
	}

	// Broadcast WS
	WsHub.Broadcast <- fiber.Map{
		"event": "new_checkout",
		"data":  record,
	}

	return c.JSON(fiber.Map{
		"message": "Check-out successful",
		"time":    now.Format("15:04:05"),
	})
}

// validateHomeAttendanceLocation is the single WFH geofence rule used by
// check-in and check-out. The link is required; coordinates are the values
// resolved from that link when the home location was saved.
func validateHomeAttendanceLocation(employeeID uint, latitude, longitude float64) (bool, string, error) {
	var home models.EmployeeHomeLocation
	if err := config.DB.Where("employee_id = ?", employeeID).First(&home).Error; err != nil || strings.TrimSpace(home.GoogleMapsURL) == "" {
		return false, "tidak_tervalidasi", fmt.Errorf("Anda belum mengatur lokasi rumah untuk absensi WFH")
	}
	return validateConfiguredHomeLocation(home, latitude, longitude)
}

func validateConfiguredHomeLocation(home models.EmployeeHomeLocation, latitude, longitude float64) (bool, string, error) {
	if strings.TrimSpace(home.GoogleMapsURL) == "" {
		return false, "tidak_tervalidasi", fmt.Errorf("Anda belum mengatur lokasi rumah untuk absensi WFH")
	}
	if home.LatitudeRumah == 0 || home.LongitudeRumah == 0 || home.RadiusMeter <= 0 {
		return false, "tidak_tervalidasi", fmt.Errorf("Anda belum mengatur lokasi rumah untuk absensi WFH")
	}
	if utils.HaversineDistance(latitude, longitude, home.LatitudeRumah, home.LongitudeRumah) > home.RadiusMeter {
		return false, "rumah", fmt.Errorf("Lokasi berada di luar radius rumah")
	}
	return true, "rumah", nil
}

func GetAttendanceHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	now := attendanceNow()
	_ = closeExpiredAttendanceRecords(now)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	// Do not expose pre-created rows for future dates. A history row should
	// represent a date that has already started, not a planned leave period.
	currentDate := attendanceBusinessDate(now)
	var records []models.AttendanceRecord
	if err := config.DB.Where("employee_id = ? AND tanggal <= ?", employee.ID, currentDate.Format("2006-01-02")).Order("tanggal desc").Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch records"})
	}
	for index := range records {
		// Older approvals could overwrite a real punched record with Izin or
		// Cuti. A record with JamMasuk is attendance evidence and must remain
		// visible as attendance in the history.
		if records[index].JamMasuk != nil && (records[index].Status == models.StatusIzin || records[index].Status == models.StatusCuti) {
			records[index].Status = models.StatusHadir
		}
		if records[index].Status == models.StatusTerlambat {
			records[index].Status = models.StatusHadir
		}
	}

	return c.JSON(records)
}

func uploadToMinIO(file *multipart.FileHeader, nik, tipe string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	fileName := fmt.Sprintf("%s-%s-%d%s", nik, tipe, time.Now().Unix(), filepath.Ext(file.Filename))

	ctx := context.Background()
	_, err = minio.Client.PutObject(ctx, minio.BucketName, fileName, src, file.Size, miniogo.PutObjectOptions{
		ContentType: file.Header.Get("Content-Type"),
	})

	if err != nil {
		return "", err
	}

	// Assuming local development, format URL.
	// In production, this should be configurable or use MinIO Presigned URL
	cfg := config.LoadConfig()
	url := fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, minio.BucketName, fileName)
	return url, nil
}

func GetOfficeInfo(c *fiber.Ctx) error {
	var office models.OfficeLocation
	if err := config.DB.First(&office).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Office location not configured"})
	}
	return c.JSON(office)
}

func startAttendanceAutoCheckout() {
	autoCheckoutOnce.Do(func() {
		go func() {
			// Reconcile completed workdays immediately so records remain visible
			// even when nobody opens the attendance screen after a missed day.
			_ = reconcileMissingAttendanceRecords(attendanceNow())
			ticker := time.NewTicker(time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				_ = reconcileMissingAttendanceRecords(attendanceNow())
			}
		}()
	})
}

func attendanceNow() time.Time {
	return time.Now().In(jakartaLocation)
}

func attendanceBusinessDate(now time.Time) time.Time {
	now = now.In(jakartaLocation)
	date := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jakartaLocation)
	if now.Hour() < attendanceResetHour {
		return date.AddDate(0, 0, -1)
	}
	return date
}

func getAttendanceSchedule(employeeID uint, date time.Time) models.WorkSchedule {
	dateStr := date.Format("2006-01-02")
	if config.DB != nil {
		var schedule models.WorkSchedule

		// An employee-specific assignment always wins over a global schedule.
		// Use the latest assignment on or before the attendance date as a
		// fallback. This also keeps a shift active when the admin saved it one
		// day earlier than the current attendance date.
		result := config.DB.Where("employee_id = ? AND DATE(tanggal) = ?", employeeID, dateStr).
			Order("id desc").Limit(1).Find(&schedule)
		if result.Error == nil && result.RowsAffected > 0 {
			return schedule
		}

		result = config.DB.Where("employee_id = ? AND tanggal <= ?", employeeID, dateStr).
			Order("tanggal desc").Order("id desc").Limit(1).Find(&schedule)
		if result.Error == nil && result.RowsAffected > 0 {
			return schedule
		}

		// Fallback to the latest global shift. Prefer a dated global shift
		// effective for this attendance date, then the legacy undated default.
		result = config.DB.Where("employee_id IS NULL AND DATE(tanggal) = ?", dateStr).
			Order("id desc").Limit(1).Find(&schedule)
		if result.Error == nil && result.RowsAffected > 0 {
			return schedule
		}

		result = config.DB.Where("employee_id IS NULL AND tanggal <= ?", dateStr).
			Order("tanggal desc").Order("id desc").Limit(1).Find(&schedule)
		if result.Error == nil && result.RowsAffected > 0 {
			return schedule
		}

		result = config.DB.Where("employee_id IS NULL AND tanggal IS NULL").
			Order("id desc").Limit(1).Find(&schedule)
		if result.Error == nil && result.RowsAffected > 0 {
			return schedule
		}
	}

	return models.WorkSchedule{
		NamaShift:               "Reguler (Default)",
		JamMulai:                defaultStartTime,
		JamSelesai:              defaultEndTime,
		ToleransiTerlambatMenit: defaultGraceMinutes,
	}
}

func scheduleMoment(date time.Time, raw, fallback string) time.Time {
	value := strings.TrimSpace(raw)
	if len(value) == 5 {
		value += ":00"
	}
	parsed, err := time.Parse("15:04:05", value)
	if err != nil {
		parsed, _ = time.Parse("15:04:05", fallback)
	}
	return time.Date(date.Year(), date.Month(), date.Day(), parsed.Hour(), parsed.Minute(), parsed.Second(), 0, jakartaLocation)
}

func attendanceWindow(now time.Time, schedule models.WorkSchedule) (time.Time, time.Time, time.Time, time.Time, time.Time) {
	workDate := attendanceBusinessDate(now)
	start := scheduleMoment(workDate, schedule.JamMulai, defaultStartTime)
	lateAt := start.Add(time.Duration(schedule.ToleransiTerlambatMenit) * time.Minute)
	end := scheduleEndTime(schedule, workDate)
	checkoutDeadline := end.Add(time.Hour)
	return workDate, start, lateAt, end, checkoutDeadline
}

func scheduleCheckoutDeadline(schedule models.WorkSchedule, date time.Time) time.Time {
	return scheduleEndTime(schedule, date).Add(time.Hour)
}

func scheduleEndTime(schedule models.WorkSchedule, date time.Time) time.Time {
	start := scheduleMoment(date, schedule.JamMulai, defaultStartTime)
	end := scheduleMoment(date, schedule.JamSelesai, defaultEndTime)
	// Support an overnight shift when the configured end time is earlier than
	// its start time. The existing regular shift remains unchanged.
	if !end.After(start) {
		end = end.AddDate(0, 0, 1)
	}
	return end
}

// reconcileMissingAttendanceRecords materializes Alpha rows for completed
// working days. It is intentionally idempotent: an existing attendance row or
// approved leave row always wins, so a late leave approval can replace an
// inferred Alpha record through the existing leave approval flow.
func reconcileMissingAttendanceRecords(now time.Time) error {
	if config.DB == nil {
		return nil
	}

	missingAttendanceMu.Lock()
	defer missingAttendanceMu.Unlock()
	now = now.In(jakartaLocation)
	var employees []models.Employee
	if err := config.DB.Find(&employees).Error; err != nil {
		return err
	}
	if len(employees) == 0 {
		return nil
	}

	// Use the earliest join date as the lower bound so existing missed days are
	// backfilled as well, while employees without a join date get this month's
	// start as a safe fallback.
	currentDate := attendanceBusinessDate(now)
	// Remove stale future leave rows created by older versions. Future leave
	// belongs in leave_requests and is evaluated when that date becomes active.
	if err := config.DB.Where(
		"tanggal > ? AND jam_masuk IS NULL AND status IN ?",
		currentDate.Format("2006-01-02"),
		[]models.AttendanceStatus{models.StatusIzin, models.StatusCuti},
	).Delete(&models.AttendanceRecord{}).Error; err != nil {
		return err
	}
	startDate := time.Date(currentDate.Year(), currentDate.Month(), 1, 0, 0, 0, 0, jakartaLocation)
	for _, employee := range employees {
		joined := normalizeAttendanceDate(employee.TanggalBergabung)
		if !joined.IsZero() && joined.Before(startDate) {
			startDate = joined
		}
	}

	var holidays []models.Holiday
	if err := config.DB.Where("tanggal BETWEEN ? AND ?", startDate.Format("2006-01-02"), currentDate.Format("2006-01-02")).Find(&holidays).Error; err != nil {
		return err
	}
	holidayDates := make(map[string]bool, len(holidays))
	for _, holiday := range holidays {
		holidayDates[normalizeAttendanceDate(holiday.Tanggal).Format("2006-01-02")] = true
	}

	var leaves []models.LeaveRequest
	if err := config.DB.Where("status = ? AND tanggal_mulai <= ? AND tanggal_selesai >= ?", models.LeaveStatusApproved, currentDate.Format("2006-01-02"), startDate.Format("2006-01-02")).Find(&leaves).Error; err != nil {
		return err
	}
	leaveStatusMap := make(map[string]models.AttendanceStatus)
	for _, leave := range leaves {
		leaveStatus := models.StatusIzin
		if leave.JenisIzin == models.LeaveTypeCuti {
			leaveStatus = models.StatusCuti
		}
		for day := normalizeAttendanceDate(leave.TanggalMulai); !day.After(normalizeAttendanceDate(leave.TanggalSelesai)); day = day.AddDate(0, 0, 1) {
			leaveStatusMap[fmt.Sprintf("%d:%s", leave.EmployeeID, day.Format("2006-01-02"))] = leaveStatus
		}
	}

	var records []models.AttendanceRecord
	if err := config.DB.Where("tanggal BETWEEN ? AND ?", startDate.Format("2006-01-02"), currentDate.Format("2006-01-02")).Find(&records).Error; err != nil {
		return err
	}
	existingMap := make(map[string]models.AttendanceRecord, len(records))
	for _, record := range records {
		existingMap[fmt.Sprintf("%d:%s", record.EmployeeID, normalizeAttendanceDate(record.Tanggal).Format("2006-01-02"))] = record
	}

	for _, employee := range employees {
		joined := normalizeAttendanceDate(employee.TanggalBergabung)
		if joined.IsZero() {
			joined = startDate
		}
		for day := startDate; !day.After(currentDate); day = day.AddDate(0, 0, 1) {
			if day.Before(joined) || holidayDates[day.Format("2006-01-02")] {
				continue
			}

			key := fmt.Sprintf("%d:%s", employee.ID, day.Format("2006-01-02"))
			leaveStatus, isOnLeave := leaveStatusMap[key]

			if existingRecord, found := existingMap[key]; found {
				if isOnLeave && existingRecord.JamMasuk == nil && (existingRecord.Status == models.StatusAlpha || existingRecord.Status == "") {
					config.DB.Model(&models.AttendanceRecord{}).Where("id = ?", existingRecord.ID).Update("status", leaveStatus)
					existingRecord.Status = leaveStatus
					existingMap[key] = existingRecord
				}
				continue
			}

			if isOnLeave {
				record := models.AttendanceRecord{
					EmployeeID: employee.ID,
					Tanggal:    day,
					TipeKerja:  "WFO",
					Status:     leaveStatus,
				}
				if err := config.DB.Create(&record).Error; err != nil {
					return err
				}
				existingMap[key] = record
				continue
			}

			wd := day.Weekday()
			schedule := getAttendanceSchedule(employee.ID, day)
			// Check if it's a working day (Monday-Friday or has a specific schedule override)
			isWorkingDay := (wd >= time.Monday && wd <= time.Friday) || schedule.NamaShift != "Reguler (Default)"

			latestEnd := scheduleEndTime(schedule, day)
			if !isWorkingDay || now.Before(latestEnd) {
				continue
			}

			record := models.AttendanceRecord{
				EmployeeID: employee.ID,
				Tanggal:    day,
				TipeKerja:  "WFO",
				Status:     models.StatusAlpha,
			}
			if err := config.DB.Create(&record).Error; err != nil {
				return err
			}
			existingMap[key] = record
		}
	}
	return nil
}

func normalizeAttendanceDate(value time.Time) time.Time {
	if value.IsZero() {
		return time.Time{}
	}
	local := value.In(jakartaLocation)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, jakartaLocation)
}

// closeExpiredAttendanceRecords makes the one-hour check-out limit effective
// even when the employee never opens the app again after the deadline.
func closeExpiredAttendanceRecords(now time.Time) error {
	if config.DB == nil {
		return nil
	}
	if err := reconcileMissingAttendanceRecords(now); err != nil {
		return err
	}
	currentDate := attendanceBusinessDate(now)
	var records []models.AttendanceRecord
	if err := config.DB.Where("jam_pulang IS NULL AND jam_masuk IS NOT NULL AND tanggal <= ?", currentDate.Format("2006-01-02")).Find(&records).Error; err != nil {
		return err
	}
	for _, record := range records {
		recordDate, err := time.ParseInLocation("2006-01-02", record.Tanggal.Format("2006-01-02"), jakartaLocation)
		if err != nil {
			continue
		}
		schedule := getAttendanceSchedule(record.EmployeeID, recordDate)
		_, _, _, _, deadline := attendanceWindow(recordDate.Add(12*time.Hour), schedule)
		if now.Before(deadline) {
			continue
		}
		if err := config.DB.Model(&models.AttendanceRecord{}).
			Where("id = ? AND jam_pulang IS NULL", record.ID).
			Updates(map[string]any{"jam_pulang": deadline, "check_out_otomatis": true, "is_checkout_missing": true}).Error; err != nil {
			return err
		}
	}
	return nil
}
