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

var jakartaLocation = time.FixedZone("Asia/Jakarta", 7*60*60)

func CheckIn(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	now := attendanceNow()
	schedule := getAttendanceSchedule()
	workDate, _, lateTime, endTime, checkoutDeadline := attendanceWindow(now, schedule)
	resetAt := time.Date(now.Year(), now.Month(), now.Day(), attendanceResetHour, 0, 0, 0, jakartaLocation)
	if now.Before(resetAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Check-in baru dapat dimulai pukul 07:00."})
	}
	if !now.Before(endTime) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Batas check-in hari ini adalah pukul " + endTime.Format("15:04") + "."})
	}
	_ = closeExpiredAttendanceRecords(now, schedule)
	if now.After(checkoutDeadline) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Periode absensi hari ini sudah ditutup setelah pukul " + checkoutDeadline.Format("15:04") + "."})
	}

	var existingRecord models.AttendanceRecord
	if err := config.DB.Where("employee_id = ? AND tanggal = ?", employee.ID, workDate.Format("2006-01-02")).First(&existingRecord).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Anda sudah melakukan check-in 1 kali untuk hari ini."})
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

	// Determine Status (Hadir or Terlambat). Exactly at the grace limit is still on time.
	nowStr := now.Format("15:04:05")

	status := models.StatusHadir
	if now.After(lateTime) {
		status = models.StatusTerlambat
	}

	record := models.AttendanceRecord{
		EmployeeID:         employee.ID,
		Tanggal:            workDate,
		JamMasuk:           &now,
		Status:             status,
		LatitudeMasuk:      lat,
		LongitudeMasuk:     lon,
		AkurasiGPSMasuk:    acc,
		DalamRadiusMasuk:   dalamRadius,
		FotoSelfieMasukURL: imageURL,
		Latitude:           lat,
		Longitude:          lon,
		AkurasiGPS:         acc,
		DalamRadius:        dalamRadius,
		RadiusTervalidasi:  radiusTervalidasi,
		TipeKerja:          tipeKerja,
	}

	if err := config.DB.Create(&record).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save attendance record"})
	}
	auditutils.LogAction(userID, "CREATE", "AttendanceRecord", record.ID, fmt.Sprintf("Check-in %s untuk %s (%s)", status, employee.NIK, tipeKerja))

	var hrdUsers []models.User
	if status == models.StatusTerlambat || wt.IsHomeBase {
		if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
			for _, hrd := range hrdUsers {
				if status == models.StatusTerlambat {
					_ = auditutils.CreateNotification(config.DB, hrd.ID, models.RoleHRD, "Keterlambatan", "Karyawan Terlambat", fmt.Sprintf("%s melakukan check-in terlambat pada %s", employee.NIK, now.Format("02 Jan 2006 15:04")))
				}
				if wt.IsHomeBase {
					_ = auditutils.CreateNotification(config.DB, hrd.ID, models.RoleHRD, "Kehadiran WFH", "Kehadiran WFH", fmt.Sprintf("%s melakukan check-in %s", employee.NIK, now.Format("02 Jan 2006 15:04")))
				}
			}
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
	schedule := getAttendanceSchedule()
	workDate, _, _, checkoutStart, checkoutDeadline := attendanceWindow(now, schedule)
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
		_ = closeExpiredAttendanceRecords(now, schedule)
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
	_ = closeExpiredAttendanceRecords(now, getAttendanceSchedule())

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	var records []models.AttendanceRecord
	if err := config.DB.Where("employee_id = ?", employee.ID).Order("tanggal desc").Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch records"})
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
			ticker := time.NewTicker(time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				_ = closeExpiredAttendanceRecords(attendanceNow(), getAttendanceSchedule())
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

func getAttendanceSchedule() models.WorkSchedule {
	var schedule models.WorkSchedule
	if config.DB == nil || config.DB.First(&schedule).Error != nil {
		schedule.JamMulai = defaultStartTime
		schedule.JamSelesai = defaultEndTime
		schedule.ToleransiTerlambatMenit = defaultGraceMinutes
	}
	if strings.TrimSpace(schedule.JamMulai) == "" {
		schedule.JamMulai = defaultStartTime
	}
	if strings.TrimSpace(schedule.JamSelesai) == "" {
		schedule.JamSelesai = defaultEndTime
	}
	if schedule.ToleransiTerlambatMenit < 0 {
		schedule.ToleransiTerlambatMenit = defaultGraceMinutes
	}
	return schedule
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

// closeExpiredAttendanceRecords makes the one-hour check-out limit effective
// even when the employee never opens the app again after the deadline.
func closeExpiredAttendanceRecords(now time.Time, schedule models.WorkSchedule) error {
	if config.DB == nil {
		return nil
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
		_, _, _, _, deadline := attendanceWindow(recordDate.Add(12*time.Hour), schedule)
		if now.Before(deadline) {
			continue
		}
		if err := config.DB.Model(&models.AttendanceRecord{}).
			Where("id = ? AND jam_pulang IS NULL", record.ID).
			Updates(map[string]any{"jam_pulang": deadline, "check_out_otomatis": true}).Error; err != nil {
			return err
		}
	}
	return nil
}
