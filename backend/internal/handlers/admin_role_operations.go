package handlers

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	storage "absensi-golan-backend/pkg/minio"

	"github.com/gofiber/fiber/v2"
	minio "github.com/minio/minio-go/v7"
)

const maxInternshipCertificateSize int64 = 10 * 1024 * 1024

func SetupAdminRoleOperationRoutes(api fiber.Router) {
	admin := api.Group("/admin/internship", middleware.Protected(), middleware.RequireRoles(models.RoleHRD))
	admin.Get("/dashboard", GetAdminInternshipDashboard)
	admin.Get("/logbooks", GetAdminInternshipLogbooks)
	admin.Delete("/logbooks/:id", DeleteAdminInternshipLogbook)
	admin.Get("/certificates", GetAdminInternshipCertificates)
	admin.Get("/certificates/:userID/download", DownloadAdminInternshipCertificate)
	admin.Post("/certificates/:userID/upload", UploadAdminInternshipCertificate)
	admin.Delete("/certificates/:userID/upload", DeleteAdminInternshipCertificate)
	admin.Get("/documents/:userID/:type/download", DownloadAdminInternshipDocument)
	admin.Post("/documents/:userID/upload", UploadAdminInternshipDocument)
	admin.Delete("/documents/:userID/:type", DeleteAdminInternshipDocument)
}

func recordCertificateIssuance(userID uint, certNo string, action string) {
	var count int64
	config.DB.Model(&models.CertificateIssuanceLog{}).Where("user_id = ?", userID).Count(&count)
	if count == 0 {
		config.DB.Create(&models.CertificateIssuanceLog{
			UserID:        userID,
			CertificateNo: certNo,
			IssuedAt:      time.Now(),
			Action:        action,
		})
	}
}

func getSertifikatTerbitCount() int64 {
	var count int64
	config.DB.Model(&models.InternshipCertificate{}).
		Joins("JOIN users ON users.id = internship_certificates.user_id").
		Where("users.role = ? AND internship_certificates.storage_key IS NOT NULL AND internship_certificates.storage_key != ''", models.RoleMagang).
		Count(&count)
	return count
}

func GetAdminInternshipDashboard(c *fiber.Ctx) error {
	today := attendanceBusinessDate(attendanceNow())
	var total, active, pending int64
	config.DB.Model(&models.User{}).Where("role = ?", models.RoleMagang).Count(&total)
	config.DB.Model(&models.User{}).Where("role = ? AND internship_end_date >= ?", models.RoleMagang, today).Count(&active)
	config.DB.Model(&models.WorkReport{}).Joins("JOIN employees ON employees.id = work_reports.employee_id").Joins("JOIN users ON users.id = employees.user_id").Where("users.role = ? AND work_reports.status_logbook = ?", models.RoleMagang, "submitted").Count(&pending)
	completed := getSertifikatTerbitCount()
	return c.JSON(fiber.Map{"total_magang": total, "magang_aktif": active, "logbook_pending": pending, "sertifikat_terbit": completed})
}

func GetAdminInternshipLogbooks(c *fiber.Ctx) error {
	EnsureDailyWorkReportsAutoCreated(config.DB, attendanceNow())
	query := config.DB.Preload("Attachments").Preload("Employee.User").Preload("Employee.Division").Where("users.role = ?", models.RoleMagang).Joins("JOIN employees ON employees.id = work_reports.employee_id").Joins("JOIN users ON users.id = employees.user_id").Order("work_reports.tanggal desc")
	if status := c.Query("status"); status != "" {
		if status != "draft" && status != "submitted" && status != "approved" && status != "rejected" {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid logbook status"})
		}
		query = query.Where("work_reports.status_logbook = ?", status)
	}
	if start, end := c.Query("start_date"), c.Query("end_date"); start != "" && end != "" {
		query = query.Where("work_reports.tanggal BETWEEN ? AND ?", start, end)
	}
	if userID := c.Query("user_id"); userID != "" {
		id, parseErr := strconv.ParseUint(userID, 10, 64)
		if parseErr != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user_id"})
		}
		query = query.Where("users.id = ?", id)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		term := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(users.nama) LIKE ? OR LOWER(employees.nik) LIKE ?", term, term)
	}
	var reports []models.WorkReport
	if err := query.Find(&reports).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch internship logbooks"})
	}
	return c.JSON(reports)
}

func ReviewAdminInternshipLogbook(c *fiber.Ctx) error {
	return c.Status(403).JSON(fiber.Map{"error": "Admin tidak memiliki akses untuk mereview logbook magang. Review hanya dilakukan oleh Manager."})
}

func DeleteAdminInternshipLogbook(c *fiber.Ctx) error {
	var report models.WorkReport
	if err := config.DB.Preload("Employee.User").Where("id = ?", c.Params("id")).First(&report).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Logbook not found"})
	}
	if report.Employee.User == nil || report.Employee.User.Role != models.RoleMagang {
		return c.Status(403).JSON(fiber.Map{"error": "Only internship logbooks can be deleted here"})
	}
	if err := config.DB.Delete(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete logbook"})
	}
	return c.JSON(fiber.Map{"message": "Logbook deleted successfully"})
}

func GetAdminInternshipCertificates(c *fiber.Ctx) error {
	var users []models.User
	query := config.DB.Where("role = ?", models.RoleMagang).Order("nama asc")
	if filterUserID := c.Query("user_id"); filterUserID != "" {
		if id, parseErr := strconv.ParseUint(filterUserID, 10, 64); parseErr == nil {
			query = query.Where("id = ?", id)
		}
	}
	if err := query.Find(&users).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch interns"})
	}
	var certificates []models.InternshipCertificate
	config.DB.Find(&certificates)
	var documents []models.InternshipDocument
	config.DB.Find(&documents)
	byUser := map[uint]models.InternshipCertificate{}
	for _, certificate := range certificates {
		byUser[certificate.UserID] = certificate
	}
	docsByUser := map[uint]map[string]models.InternshipDocument{}
	for _, document := range documents {
		if docsByUser[document.UserID] == nil {
			docsByUser[document.UserID] = map[string]models.InternshipDocument{}
		}
		docsByUser[document.UserID][document.DocumentType] = document
	}
	today := attendanceBusinessDate(attendanceNow())
	result := make([]fiber.Map, 0, len(users))
	for _, user := range users {
		isEnded := false
		if user.InternshipEndDate != nil {
			localEnd := user.InternshipEndDate.In(jakartaLocation)
			endDate := time.Date(localEnd.Year(), localEnd.Month(), localEnd.Day(), 0, 0, 0, 0, jakartaLocation)
			isEnded = !today.Before(endDate)
		}
		available := false
		uploaded := false
		item := fiber.Map{
			"user_id":             user.ID,
			"nama":                user.Nama,
			"institution_name":    user.InstitutionName,
			"internship_end_date": user.InternshipEndDate,
			"is_ended":            isEnded,
			"available":           false,
			"uploaded":            false,
		}
		if certificate, ok := byUser[user.ID]; ok {
			if certificate.StorageKey != "" {
				available = true
				uploaded = true
				item["available"] = true
				item["uploaded"] = true
			}
			item["certificate_no"] = certificate.CertificateNo
			issuedAt := certificate.IssuedAt
			if certificate.UploadedAt != nil && !certificate.UploadedAt.IsZero() {
				issuedAt = *certificate.UploadedAt
			}
			item["issued_at"] = issuedAt
			item["uploaded_at"] = certificate.UploadedAt
			item["file_url"] = certificate.FileURL
			item["file_name"] = certificate.FileName
			item["mime_type"] = certificate.MimeType
			item["file_size"] = certificate.FileSize
		}
		for _, documentType := range []string{"nilai_magang", "keterangan_lulus"} {
			if document, ok := docsByUser[user.ID][documentType]; ok {
				item[documentType] = internshipDocumentResponse(document)
			} else {
				item[documentType] = fiber.Map{"available": false, "document_type": documentType}
			}
		}
		status := c.Query("status")
		if status == "uploaded" && !uploaded {
			continue
		}
		if (status == "not_uploaded" || status == "completed") && uploaded {
			continue
		}
		if status == "active" && !available {
			continue
		}
		if search := strings.TrimSpace(c.Query("search")); search != "" && !strings.Contains(strings.ToLower(user.Nama), strings.ToLower(search)) {
			continue
		}
		result = append(result, item)
	}
	return c.JSON(result)
}

func DownloadAdminInternshipCertificate(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userID"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	var user models.User
	if err := config.DB.Where("id = ? AND role = ?", userID, models.RoleMagang).First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern not found"})
	}
	var certificate models.InternshipCertificate
	if err := config.DB.Where("user_id = ?", user.ID).First(&certificate).Error; err != nil || certificate.StorageKey == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Sertifikat belum diunggah oleh HRD"})
	}
	return sendStoredCertificate(c, certificate)
}

func UploadAdminInternshipCertificate(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userID"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	var user models.User
	if err := config.DB.Where("id = ? AND role = ?", userID, models.RoleMagang).First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern not found"})
	}
	today := attendanceBusinessDate(attendanceNow())
	if user.InternshipEndDate == nil || today.Before(*user.InternshipEndDate) {
		return c.Status(400).JSON(fiber.Map{"error": "Sertifikat magang hanya dapat diunggah ketika masa magang telah berakhir"})
	}
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File sertifikat wajib diunggah pada field file"})
	}
	contentType, err := validateCertificateUpload(file)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if storage.Client == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Storage sertifikat belum tersedia"})
	}
	safeName := safeCertificateFilename(file.Filename)
	key := fmt.Sprintf("certificates/%d/%d-%s", user.ID, time.Now().UnixNano(), safeName)
	src, err := file.Open()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File tidak dapat dibaca"})
	}
	defer src.Close()
	if _, err = storage.Client.PutObject(context.Background(), storage.BucketName, key, src, file.Size, minio.PutObjectOptions{ContentType: contentType}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan file sertifikat"})
	}
	var certificate models.InternshipCertificate
	// Include soft-deleted metadata rows. The unique user_id constraint remains
	// active after a soft delete, so inserting a replacement would fail.
	findErr := config.DB.Unscoped().Where("user_id = ?", user.ID).First(&certificate).Error
	if findErr == nil && certificate.StorageKey != "" {
		_ = storage.Client.RemoveObject(context.Background(), storage.BucketName, certificate.StorageKey, minio.RemoveObjectOptions{})
	}
	now := time.Now()
	if findErr != nil {
		certificate = models.InternshipCertificate{UserID: user.ID, IssuedAt: now, CertificateNo: fmt.Sprintf("MAGANG-%06d", user.ID)}
	} else {
		// Reuse the existing row and make it visible again.
		certificate.DeletedAt.Valid = false
	}
	uploader := c.Locals("user_id").(uint)
	cfg := config.LoadConfig()
	certificate.IssuedAt = now
	certificate.StorageKey = key
	certificate.FileName = file.Filename
	certificate.MimeType = contentType
	certificate.FileSize = file.Size
	certificate.UploadedBy = &uploader
	certificate.UploadedAt = &now
	certificate.FileURL = fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, storage.BucketName, key)
	if err := config.DB.Save(&certificate).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Metadata sertifikat gagal disimpan"})
	}
	recordCertificateIssuance(user.ID, certificate.CertificateNo, "MANUAL_UPLOAD")
	return c.JSON(fiber.Map{"message": "Sertifikat berhasil diunggah", "user_id": user.ID, "file_name": certificate.FileName, "file_url": certificate.FileURL, "mime_type": certificate.MimeType, "file_size": certificate.FileSize})
}

func DeleteAdminInternshipCertificate(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userID"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	var certificate models.InternshipCertificate
	if err := config.DB.Where("user_id = ?", userID).First(&certificate).Error; err != nil || certificate.StorageKey == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Sertifikat tidak ditemukan"})
	}
	_ = storage.Client.RemoveObject(context.Background(), storage.BucketName, certificate.StorageKey, minio.RemoveObjectOptions{})
	certificate.StorageKey = ""
	certificate.FileName = ""
	certificate.FileURL = ""
	certificate.MimeType = ""
	certificate.FileSize = 0
	certificate.UploadedBy = nil
	certificate.UploadedAt = nil
	if err := config.DB.Save(&certificate).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus sertifikat"})
	}
	return c.JSON(fiber.Map{"message": "Sertifikat berhasil dihapus"})
}

func validateCertificateUpload(file *multipart.FileHeader) (string, error) {
	if file.Size > maxInternshipCertificateSize {
		return "", fmt.Errorf("Ukuran file sertifikat maksimal 10MB")
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".pdf" {
		return "", fmt.Errorf("Format file sertifikat harus .pdf")
	}
	f, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("Gagal membuka file sertifikat")
	}
	defer f.Close()
	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	detected := http.DetectContentType(buf[:n])
	allowedType := false
	for _, mime := range []string{"application/pdf"} {
		if strings.HasPrefix(detected, mime) {
			allowedType = true
			break
		}
	}
	if !allowedType {
		return "", fmt.Errorf("Isi file tidak sesuai format PDF")
	}
	return detected, nil
}

func safeCertificateFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, " ", "-")
	var builder strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			builder.WriteRune(r)
		}
	}
	res := builder.String()
	if res == "" {
		res = "sertifikat-magang.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(res), ".pdf") {
		res += ".pdf"
	}
	return res
}

func sendStoredCertificate(c *fiber.Ctx, certificate models.InternshipCertificate) error {
	if storage.Client == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Storage sertifikat belum tersedia"})
	}
	object, err := storage.Client.GetObject(context.Background(), storage.BucketName, certificate.StorageKey, minio.GetObjectOptions{})
	if err == nil {
		defer object.Close()
		if _, statErr := object.Stat(); statErr == nil {
			return sendCertificateObject(c, object, certificate.FileName, certificate.MimeType)
		}
	}
	// Compatibility fallback for existing uploads whose public URL works even
	// when the API's MinIO client cannot read the object directly.
	if certificate.FileURL != "" {
		response, requestErr := http.Get(certificate.FileURL)
		if requestErr == nil {
			defer response.Body.Close()
			if response.StatusCode >= http.StatusOK && response.StatusCode < http.StatusMultipleChoices {
				data, readErr := io.ReadAll(response.Body)
				if readErr == nil {
					contentType := certificate.MimeType
					if contentType == "" {
						contentType = "application/pdf"
					}
					c.Set("Content-Type", contentType)
					c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", certificateDownloadFilename(certificate.FileName)))
					return c.Send(data)
				}
			}
		}
	}
	return c.Status(404).JSON(fiber.Map{"error": "File sertifikat tidak ditemukan"})
}

func sendCertificateObject(c *fiber.Ctx, object *minio.Object, originalName, mimeType string) error {
	contentType := mimeType
	if contentType == "" {
		contentType = "application/pdf"
	}
	c.Set("Content-Type", contentType)
	ext := filepath.Ext(originalName)
	if ext == "" {
		ext = ".pdf"
	}
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", certificateDownloadFilename(originalName)))
	data, err := io.ReadAll(object)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "File sertifikat gagal dibaca"})
	}
	return c.Send(data)
}

func certificateDownloadFilename(originalName string) string {
	ext := filepath.Ext(originalName)
	if ext == "" {
		ext = ".pdf"
	}
	return "sertifikat-magang" + strings.ToLower(ext)
}
