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
	attendance := router.Group("/attendance", middleware.Protected())
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
	resetAt := time.Date(now.Year(), now.Month(), now.Day(), attendanceResetHour, 0, 0, 0, jakartaLocation)
	if now.Before(resetAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Check-in baru dapat dimulai pukul 07:00."})
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

	var leaveRecord models.AttendanceRecord
	if err := config.DB.Where("employee_id = ? AND tanggal = ? AND status IN ?", employee.ID, workDate.Format("2006-01-02"), []models.AttendanceStatus{models.StatusIzin, models.StatusCuti}).First(&leaveRecord).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Anda memiliki status " + string(leaveRecord.Status) + " untuk hari ini, sehingga tidak dapat melakukan check-in."})
	}

	latStr := c.FormValue("latitude")
	lonStr := c.FormValue("longitude")
	accStr := c.FormValue("accuracy")

	lat, _ := strconv.ParseFloat(latStr, 64)
	lon, _ := strconv.ParseFloat(lonStr, 64)
	acc, _ := strconv.ParseFloat(accStr, 64)

	// Get Office Location
	var office models.OfficeLocation
	if err := config.DB.First(&office).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Office location not configured"})
	}

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
		// WFH accepts either the office radius or the employee's configured home radius.
		officeDistance := utils.HaversineDistance(lat, lon, office.Latitude, office.Longitude)
		officeValid := officeDistance <= office.RadiusMeter
		homeConfigured := employee.HomeLatitude != 0 && employee.HomeLongitude != 0
		homeDistance := 0.0
		homeValid := false
		if homeConfigured {
			homeDistance = utils.HaversineDistance(lat, lon, employee.HomeLatitude, employee.HomeLongitude)
			homeValid = homeDistance <= 100
		}
		dalamRadius = officeValid || homeValid
		if !dalamRadius {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lokasi berada di luar radius kantor maupun rumah"})
		}
		if homeValid {
			radiusTervalidasi = "rumah"
		} else {
			radiusTervalidasi = "kantor"
		}
	} else if wt.Nama == "WFO" {
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

	var office models.OfficeLocation
	config.DB.First(&office)

	var wt models.WorkType
	if err := config.DB.Where("nama = ?", record.TipeKerja).First(&wt).Error; err != nil {
		wt.Nama = record.TipeKerja
		wt.IsHomeBase = (record.TipeKerja == "WFH")
	}

	var dalamRadius bool
	radiusTervalidasi := "tidak_tervalidasi"

	if wt.IsHomeBase {
		officeDistance := utils.HaversineDistance(lat, lon, office.Latitude, office.Longitude)
		officeValid := officeDistance <= office.RadiusMeter
		homeConfigured := employee.HomeLatitude != 0 && employee.HomeLongitude != 0
		homeValid := false
		if homeConfigured {
			homeDistance := utils.HaversineDistance(lat, lon, employee.HomeLatitude, employee.HomeLongitude)
			homeValid = homeDistance <= 100
		}
		dalamRadius = officeValid || homeValid
		if !dalamRadius {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lokasi berada di luar radius kantor maupun rumah"})
		}
		if homeValid {
			radiusTervalidasi = "rumah"
		} else {
			radiusTervalidasi = "kantor"
		}
	} else if wt.Nama == "WFO" {
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

func GetAttendanceHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	now := attendanceNow()
	_ = closeExpiredAttendanceRecords(now)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	var records []models.AttendanceRecord
	if err := config.DB.Where("employee_id = ?", employee.ID).Order("tanggal desc").Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch records"})
	}
	for index := range records {
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
	var schedules []models.WorkSchedule
	dateStr := date.Format("2006-01-02")
	if config.DB != nil {
		config.DB.Where("employee_id = ? AND DATE(tanggal) = ?", employeeID, dateStr).Limit(1).Find(&schedules)
		if len(schedules) > 0 {
			return schedules[0]
		}

		// Fallback to global shift (employee_id IS NULL)
		config.DB.Where("employee_id IS NULL").Limit(1).Find(&schedules)
		if len(schedules) > 0 {
			return schedules[0]
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
	end := scheduleMoment(workDate, schedule.JamSelesai, defaultEndTime)
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
	leaveDates := make(map[string]bool)
	for _, leave := range leaves {
		for day := normalizeAttendanceDate(leave.TanggalMulai); !day.After(normalizeAttendanceDate(leave.TanggalSelesai)); day = day.AddDate(0, 0, 1) {
			leaveDates[fmt.Sprintf("%d:%s", leave.EmployeeID, day.Format("2006-01-02"))] = true
		}
	}

	var records []models.AttendanceRecord
	if err := config.DB.Where("tanggal BETWEEN ? AND ?", startDate.Format("2006-01-02"), currentDate.Format("2006-01-02")).Find(&records).Error; err != nil {
		return err
	}
	existing := make(map[string]bool, len(records))
	for _, record := range records {
		existing[fmt.Sprintf("%d:%s", record.EmployeeID, normalizeAttendanceDate(record.Tanggal).Format("2006-01-02"))] = true
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

			wd := day.Weekday()
			schedule := getAttendanceSchedule(employee.ID, day)
			// Check if it's a working day (Monday-Friday or has a specific schedule override)
			isWorkingDay := (wd >= time.Monday && wd <= time.Friday) || schedule.NamaShift != "Reguler (Default)"
			
			latestEnd := scheduleEndTime(schedule, day)
			if !isWorkingDay || now.Before(latestEnd) {
				continue
			}

			key := fmt.Sprintf("%d:%s", employee.ID, day.Format("2006-01-02"))
			if existing[key] || leaveDates[key] {
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
			existing[key] = true
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
