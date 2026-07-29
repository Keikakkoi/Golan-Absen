package handlers

import (
	"fmt"
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
	intern.Get("/logbooks", GetInternshipLogbooks)
	intern.Post("/logbooks", CreateInternshipLogbook)
	intern.Put("/logbooks/:id", UpdateInternshipLogbook)
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
	var present, late, leave int64
	attendanceQuery := config.DB.Model(&models.AttendanceRecord{}).Where("employee_id = ?", user.Employee.ID)
	lateQuery := config.DB.Model(&models.AttendanceRecord{}).Where("employee_id = ?", user.Employee.ID)
	leaveQuery := config.DB.Model(&models.LeaveRequest{}).Where("employee_id = ? AND status = ?", user.Employee.ID, models.LeaveStatusApproved)
	if start, end := c.Query("start_date"), c.Query("end_date"); start != "" && end != "" {
		attendanceQuery = attendanceQuery.Where("tanggal BETWEEN ? AND ?", start, end)
		lateQuery = lateQuery.Where("tanggal BETWEEN ? AND ?", start, end)
		leaveQuery = leaveQuery.Where("tanggal_mulai <= ? AND tanggal_selesai >= ?", end, start)
	}
	attendanceQuery.Where("status IN ?", []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Count(&present)
	lateQuery.Where("status = ?", models.StatusTerlambat).Count(&late)
	leaveQuery.Count(&leave)
	return c.JSON(fiber.Map{"hadir": present, "terlambat": late, "izin_disetujui": leave, "start_date": c.Query("start_date"), "end_date": c.Query("end_date")})
}

func GetInternshipCertificate(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var certificate models.InternshipCertificate
	hasCertificate := config.DB.Where("user_id = ?", user.ID).First(&certificate).Error == nil
	if (!hasCertificate || certificate.StorageKey == "") && (user.InternshipEndDate == nil || time.Now().Truncate(24*time.Hour).Before(*user.InternshipEndDate)) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Sertifikat aktif setelah periode magang selesai"})
	}
	if !hasCertificate {
		certificate = ensureInternshipCertificate(user)
	}
	return c.JSON(fiber.Map{"available": true, "certificate_no": certificate.CertificateNo, "issued_at": certificate.IssuedAt, "uploaded": certificate.StorageKey != "", "file_name": certificate.FileName, "mime_type": certificate.MimeType, "file_size": certificate.FileSize})
}

func DownloadInternshipCertificate(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var certificate models.InternshipCertificate
	hasCertificate := config.DB.Where("user_id = ?", user.ID).First(&certificate).Error == nil
	if (!hasCertificate || certificate.StorageKey == "") && (user.InternshipEndDate == nil || time.Now().Truncate(24*time.Hour).Before(*user.InternshipEndDate)) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Sertifikat belum tersedia"})
	}
	if !hasCertificate {
		certificate = ensureInternshipCertificate(user)
	}
	if certificate.StorageKey != "" {
		return sendStoredCertificate(c, certificate)
	}
	filename := fmt.Sprintf("sertifikat-magang-%s.pdf", certificate.CertificateNo)
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.SendString(minimalCertificatePDF(user, certificate))
}

func ensureInternshipCertificate(user models.User) models.InternshipCertificate {
	var certificate models.InternshipCertificate
	if config.DB.Where("user_id = ?", user.ID).First(&certificate).Error == nil {
		return certificate
	}
	certificate = models.InternshipCertificate{UserID: user.ID, IssuedAt: time.Now(), CertificateNo: fmt.Sprintf("MAGANG-%06d", user.ID)}
	config.DB.Create(&certificate)
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
	report := models.WorkReport{EmployeeID: user.Employee.ID, Tanggal: date, Tugas: input.Tugas, DeskripsiKegiatan: input.DeskripsiKegiatan, Kendala: input.Kendala, StatusLogbook: status, IsLateSubmission: isLateWorkReportSubmission(user.Employee.ID, date)}
	if err := config.DB.Create(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create logbook"})
	}
	if err := saveWorkReportAttachments(report.ID, user.Employee.NIK, files); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	config.DB.Preload("Attachments").First(&report, report.ID)
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
	if report.StatusLogbook == "approved" {
		return c.Status(409).JSON(fiber.Map{"error": "Logbook yang sudah approved tidak dapat diubah"})
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
	if status != "" && (status == "draft" || status == "submitted") {
		updates["status_logbook"] = status
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
