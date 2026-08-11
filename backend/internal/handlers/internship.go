package handlers

import (
	"fmt"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"

	"github.com/gofiber/fiber/v2"
)

func SetupInternshipRoutes(api fiber.Router) {
	intern := api.Group("/internship", middleware.Protected(), middleware.RequireRoles(models.RoleMagang))
	intern.Get("/dashboard", GetInternshipDashboard)
	intern.Get("/statistics", GetInternshipStatistics)
	intern.Get("/mentor", GetInternshipMentor)
	intern.Get("/certificate", GetInternshipCertificate)
	intern.Get("/certificate/download", DownloadInternshipCertificate)
	intern.Get("/documents", GetInternshipDocuments)
	intern.Get("/documents/:type/download", DownloadInternshipDocument)
	intern.Get("/logbooks", GetInternshipLogbooks)
	intern.Post("/logbooks", CreateInternshipLogbook)
	intern.Put("/logbooks/:id", UpdateInternshipLogbook)
	intern.Delete("/logbooks/:id", DeleteInternshipLogbook)
}

func getInternUser(c *fiber.Ctx) (models.User, error) {
	var user models.User
	err := config.DB.Preload("Employee").Where("id = ? AND role = ?", c.Locals("user_id").(uint), models.RoleMagang).First(&user).Error
	return user, err
}

func internshipPeriod(user models.User) (time.Time, time.Time) {
	start := time.Time{}
	end := time.Time{}
	if user.InternshipStartDate != nil {
		start = user.InternshipStartDate.Truncate(24 * time.Hour)
	}
	if user.InternshipEndDate != nil {
		end = user.InternshipEndDate.Truncate(24 * time.Hour)
	}
	return start, end
}

func GetInternshipDashboard(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	start, end := internshipPeriod(user)
	today := time.Now().Truncate(24 * time.Hour)
	progress := 0
	remaining := 0
	if !start.IsZero() && !end.IsZero() && !end.Before(start) {
		total := int(end.Sub(start).Hours()/24) + 1
		elapsed := int(today.Sub(start).Hours()/24) + 1
		if elapsed < 0 {
			elapsed = 0
		}
		if elapsed > total {
			elapsed = total
		}
		progress = elapsed * 100 / total
		if !today.After(end) {
			remaining = int(end.Sub(today).Hours()/24) + 1
		}
	}

	var submitted, approved int64
	config.DB.Model(&models.WorkReport{}).Where("employee_id = ? AND status_logbook = ?", user.Employee.ID, "submitted").Count(&submitted)
	config.DB.Model(&models.WorkReport{}).Where("employee_id = ? AND status_logbook = ?", user.Employee.ID, "approved").Count(&approved)
	return c.JSON(fiber.Map{
		"internship_start_date": user.InternshipStartDate,
		"internship_end_date":   user.InternshipEndDate,
		"days_remaining":        remaining,
		"progress_percent":      progress,
		"logbooks_submitted":    submitted,
		"logbooks_approved":     approved,
		"missing_work_reports":  missingWorkReportRowsForEmployee(user.Employee.ID, attendanceNow()),
	})
}

func GetInternshipMentor(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	return c.JSON(fiber.Map{"name": user.MentorName, "contact": user.MentorContact, "institution": user.InstitutionName})
}

func GetInternshipStatistics(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}

	var records []models.AttendanceRecord
	query := config.DB.Where("employee_id = ?", user.Employee.ID).Order("tanggal asc")

	start := c.Query("start_date")
	end := c.Query("end_date")
	if start != "" && end != "" {
		query = query.Where("tanggal BETWEEN ? AND ?", start, end)
	}

	if err := query.Find(&records).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch attendance records"})
	}

	var countHadir, countTerlambat, countAlpha int64
	var totalCheckInSecs int64
	var checkInCount int64
	wfoCount, wfhCount, remoteCount := 0, 0, 0

	for _, rec := range records {
		switch rec.Status {
		case models.StatusHadir:
			countHadir++
		case models.StatusTerlambat:
			countTerlambat++
		case models.StatusAlpha:
			countAlpha++
		}

		tipe := strings.ToUpper(rec.TipeKerja)
		if tipe == "WFH" {
			wfhCount++
		} else if tipe == "REMOTE" {
			remoteCount++
		} else {
			wfoCount++
		}

		if rec.JamMasuk != nil {
			timePart := *rec.JamMasuk
			secs := int64(timePart.Hour()*3600 + timePart.Minute()*60 + timePart.Second())
			totalCheckInSecs += secs
			checkInCount++
		}
	}

	var leaveCount int64
	leaveQuery := config.DB.Model(&models.LeaveRequest{}).Where("employee_id = ? AND status = ?", user.Employee.ID, models.LeaveStatusApproved)
	if start != "" && end != "" {
		leaveQuery = leaveQuery.Where("tanggal_mulai <= ? AND tanggal_selesai >= ?", end, start)
	}
	leaveQuery.Count(&leaveCount)

	var logbooksSubmitted, logbooksApproved int64
	config.DB.Model(&models.WorkReport{}).Where("employee_id = ? AND status_logbook = ?", user.Employee.ID, "submitted").Count(&logbooksSubmitted)
	config.DB.Model(&models.WorkReport{}).Where("employee_id = ? AND status_logbook = ?", user.Employee.ID, "approved").Count(&logbooksApproved)

	totalDays := int64(len(records)) + leaveCount
	if totalDays == 0 {
		totalDays = int64(len(records))
	}

	attendanceRate := 100
	if totalDays > 0 {
		presentCount := countHadir + countTerlambat
		attendanceRate = int((presentCount * 100) / totalDays)
		if attendanceRate > 100 {
			attendanceRate = 100
		}
	}

	avgCheckInStr := "-"
	if checkInCount > 0 {
		avgSecs := totalCheckInSecs / checkInCount
		h := avgSecs / 3600
		m := (avgSecs % 3600) / 60
		s := avgSecs % 60
		avgCheckInStr = fmt.Sprintf("%02d:%02d:%02d", h, m, s)
	}

	dayNames := map[time.Weekday]string{
		time.Sunday:    "Min",
		time.Monday:    "Sen",
		time.Tuesday:   "Sel",
		time.Wednesday: "Rab",
		time.Thursday:  "Kam",
		time.Friday:    "Jum",
		time.Saturday:  "Sab",
	}

	dailyTrend := []fiber.Map{}
	for _, rec := range records {
		var hours float64 = 0
		if rec.JamMasuk != nil && rec.JamPulang != nil {
			diff := rec.JamPulang.Sub(*rec.JamMasuk)
			if diff > 0 {
				hours = float64(diff) / float64(time.Hour)
				if hours > 24 {
					hours = 24
				}
			}
		}
		heightPercent := int((hours / 12.0) * 100.0)
		if heightPercent > 100 {
			heightPercent = 100
		}

		masukStr := ""
		if rec.JamMasuk != nil {
			masukStr = rec.JamMasuk.Format("15:04")
		}
		pulangStr := ""
		if rec.JamPulang != nil {
			pulangStr = rec.JamPulang.Format("15:04")
		}

		dailyTrend = append(dailyTrend, fiber.Map{
			"tanggal":        rec.Tanggal.Format("2006-01-02"),
			"day_name":       dayNames[rec.Tanggal.Weekday()],
			"date_str":       rec.Tanggal.Format("02 Jan"),
			"status":         string(rec.Status),
			"hours":          fmt.Sprintf("%.1f", hours),
			"hours_val":      hours,
			"height_percent": heightPercent,
			"jam_masuk":      masukStr,
			"jam_pulang":     pulangStr,
			"tipe_kerja":     rec.TipeKerja,
		})
	}

	return c.JSON(fiber.Map{
		"hadir":                countHadir,
		"terlambat":            countTerlambat,
		"izin_disetujui":       leaveCount,
		"alpha":                countAlpha,
		"total_days":           totalDays,
		"attendance_rate":      attendanceRate,
		"average_checkin_time": avgCheckInStr,
		"work_type_stats": fiber.Map{
			"wfo":    wfoCount,
			"wfh":    wfhCount,
			"remote": remoteCount,
		},
		"logbooks_submitted": logbooksSubmitted,
		"logbooks_approved":  logbooksApproved,
		"daily_trend":        dailyTrend,
		"start_date":         start,
		"end_date":           end,
	})
}

func GetInternshipCertificate(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var certificate models.InternshipCertificate
	hasCertificate := config.DB.Where("user_id = ?", user.ID).First(&certificate).Error == nil
	if !hasCertificate || certificate.StorageKey == "" {
		return c.JSON(fiber.Map{"available": false, "uploaded": false, "message": "Sertifikat belum diunggah oleh HRD"})
	}
	issuedAt := certificate.IssuedAt
	if certificate.UploadedAt != nil && !certificate.UploadedAt.IsZero() {
		issuedAt = *certificate.UploadedAt
	}
	return c.JSON(fiber.Map{
		"available":      true,
		"certificate_no": certificate.CertificateNo,
		"issued_at":      issuedAt,
		"uploaded_at":    certificate.UploadedAt,
		"uploaded":       true,
		"file_name":      certificate.FileName,
		"file_url":       certificate.FileURL,
		"mime_type":      certificate.MimeType,
		"file_size":      certificate.FileSize,
	})
}

func DownloadInternshipCertificate(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var certificate models.InternshipCertificate
	if err := config.DB.Where("user_id = ?", user.ID).First(&certificate).Error; err != nil || certificate.StorageKey == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Sertifikat belum diunggah oleh HRD"})
	}
	return sendStoredCertificate(c, certificate)
}

func ensureInternshipCertificate(user models.User) models.InternshipCertificate {
	var certificate models.InternshipCertificate
	if config.DB.Where("user_id = ?", user.ID).First(&certificate).Error == nil {
		return certificate
	}
	certificate = models.InternshipCertificate{UserID: user.ID, IssuedAt: time.Now(), CertificateNo: fmt.Sprintf("MAGANG-%06d", user.ID)}
	config.DB.Create(&certificate)
	recordCertificateIssuance(user.ID, certificate.CertificateNo, "AUTO_GENERATED")
	return certificate
}

func minimalCertificatePDF(user models.User, certificate models.InternshipCertificate) string {
	text := fmt.Sprintf("SERTIFIKAT MAGANG\\n\\nDiberikan kepada: %s\\nInstitusi: %s\\nNomor: %s", user.Nama, user.InstitutionName, certificate.CertificateNo)
	stream := fmt.Sprintf("BT /F1 16 Tf 72 720 Td (%s) Tj ET", escapePDFText(text))
	return fmt.Sprintf("%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length %d>>stream\n%s\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF", len(stream)+1, stream)
}

func escapePDFText(value string) string {
	result := ""
	for _, r := range value {
		if r == '(' || r == ')' || r == '\\' {
			result += "\\"
		}
		result += string(r)
	}
	return result
}

func GetInternshipLogbooks(c *fiber.Ctx) error {
	EnsureDailyWorkReportsAutoCreated(config.DB, attendanceNow())
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var reports []models.WorkReport
	query := config.DB.Preload("Attachments").Where("employee_id = ?", user.Employee.ID).Order("tanggal desc")
	if start, end := c.Query("start_date"), c.Query("end_date"); start != "" && end != "" {
		query = query.Where("tanggal BETWEEN ? AND ?", start, end)
	}
	if status := c.Query("status"); status != "" {
		if status != "draft" && status != "submitted" && status != "approved" && status != "rejected" {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid logbook status"})
		}
		query = query.Where("status_logbook = ?", status)
	}
	if err := query.Find(&reports).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch logbooks"})
	}
	return c.JSON(reports)
}

func CreateInternshipLogbook(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	input, files, err := parseWorkReportInput(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	date, err := time.Parse("2006-01-02", input.Tanggal)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Tanggal wajib berformat YYYY-MM-DD"})
	}
	status := input.Status
	if status == "" {
		status = "draft"
	}
	if status != "draft" && status != "submitted" {
		return c.Status(400).JSON(fiber.Map{"error": "Status logbook harus draft atau submitted"})
	}

	var existing models.WorkReport
	if config.DB.Where("employee_id = ? AND tanggal = ?", user.Employee.ID, date).First(&existing).Error == nil {
		updates := map[string]interface{}{
			"tugas":              input.Tugas,
			"deskripsi_kegiatan": input.DeskripsiKegiatan,
			"kendala":            input.Kendala,
			"status_logbook":     status,
			"is_late_submission": existing.IsLateSubmission || isLateWorkReportSubmission(user.Employee.ID, date),
		}
		if err := config.DB.Model(&existing).Updates(updates).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update logbook"})
		}
		if len(files) > 0 {
			saveWorkReportAttachments(existing.ID, user.Employee.NIK, files)
		}
		config.DB.Preload("Attachments").First(&existing, existing.ID)
		return c.Status(200).JSON(existing)
	}

	report := models.WorkReport{EmployeeID: user.Employee.ID, Tanggal: date, Tugas: input.Tugas, DeskripsiKegiatan: input.DeskripsiKegiatan, Kendala: input.Kendala, StatusLogbook: status, IsLateSubmission: isLateWorkReportSubmission(user.Employee.ID, date)}
	if err := config.DB.Create(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create logbook"})
	}
	if err := saveWorkReportAttachments(report.ID, user.Employee.NIK, files); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	config.DB.Preload("Attachments").First(&report, report.ID)
	WsHub.Broadcast <- fiber.Map{"event": "new_logbook"}
	return c.Status(201).JSON(report)
}

func UpdateInternshipLogbook(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var report models.WorkReport
	if err := config.DB.Where("id = ? AND employee_id = ?", c.Params("id"), user.Employee.ID).First(&report).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Logbook not found"})
	}
	if report.StatusLogbook == "submitted" || report.StatusLogbook == "approved" {
		return c.Status(409).JSON(fiber.Map{"error": "Logbook dengan status Submitted atau Approved tidak dapat diubah"})
	}
	input, files, err := parseWorkReportInput(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	updates := map[string]interface{}{"tugas": input.Tugas, "deskripsi_kegiatan": input.DeskripsiKegiatan, "kendala": input.Kendala}
	if input.Tanggal != "" {
		date, parseErr := time.Parse("2006-01-02", input.Tanggal)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid tanggal"})
		}
		updates["tanggal"] = date
	}
	status := input.Status
	if status == "draft" || status == "submitted" {
		updates["status_logbook"] = status
	} else if report.StatusLogbook == "rejected" {
		updates["status_logbook"] = "submitted"
	}
	if err := config.DB.Model(&report).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update logbook"})
	}
	if err := saveWorkReportAttachments(report.ID, user.Employee.NIK, files); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	config.DB.Preload("Attachments").First(&report, report.ID)
	return c.JSON(report)
}

func DeleteInternshipLogbook(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var report models.WorkReport
	if err := config.DB.Where("id = ? AND employee_id = ?", c.Params("id"), user.Employee.ID).First(&report).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Logbook not found"})
	}
	if report.StatusLogbook == "submitted" || report.StatusLogbook == "approved" {
		return c.Status(409).JSON(fiber.Map{"error": "Logbook dengan status Submitted atau Approved tidak dapat dihapus"})
	}
	if err := config.DB.Delete(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus logbook"})
	}
	return c.JSON(fiber.Map{"message": "Logbook berhasil dihapus"})
}
