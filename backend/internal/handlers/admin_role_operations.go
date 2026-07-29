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
	"absensi-golan-backend/internal/utils"
	storage "absensi-golan-backend/pkg/minio"

	"github.com/gofiber/fiber/v2"
	minio "github.com/minio/minio-go/v7"
)

const maxInternshipCertificateSize int64 = 10 * 1024 * 1024

func SetupAdminRoleOperationRoutes(api fiber.Router) {
	admin := api.Group("/admin/internship", middleware.Protected(), middleware.RequireRoles(models.RoleHRD, models.RolePimpinan))
	admin.Get("/dashboard", GetAdminInternshipDashboard)
	admin.Get("/logbooks", GetAdminInternshipLogbooks)
	admin.Put("/logbooks/:id/review", ReviewAdminInternshipLogbook)
	admin.Get("/certificates", GetAdminInternshipCertificates)
	admin.Get("/certificates/:userID/download", DownloadAdminInternshipCertificate)
	admin.Post("/certificates/:userID/upload", UploadAdminInternshipCertificate)
	admin.Delete("/certificates/:userID/upload", DeleteAdminInternshipCertificate)
}

func GetAdminInternshipDashboard(c *fiber.Ctx) error {
	today := attendanceBusinessDate(attendanceNow())
	var total, active, pending, completed int64
	config.DB.Model(&models.User{}).Where("role = ?", models.RoleMagang).Count(&total)
	config.DB.Model(&models.User{}).Where("role = ? AND internship_end_date >= ?", models.RoleMagang, today).Count(&active)
	config.DB.Model(&models.WorkReport{}).Joins("JOIN employees ON employees.id = work_reports.employee_id").Joins("JOIN users ON users.id = employees.user_id").Where("users.role = ? AND work_reports.status_logbook = ?", models.RoleMagang, "submitted").Count(&pending)
	config.DB.Model(&models.InternshipCertificate{}).Count(&completed)
	return c.JSON(fiber.Map{"total_magang": total, "magang_aktif": active, "logbook_pending": pending, "sertifikat_terbit": completed})
}

func GetAdminInternshipLogbooks(c *fiber.Ctx) error {
	query := config.DB.Preload("Employee.User").Preload("Employee.Division").Where("users.role = ?", models.RoleMagang).Joins("JOIN employees ON employees.id = work_reports.employee_id").Joins("JOIN users ON users.id = employees.user_id").Order("work_reports.tanggal desc")
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
	var report models.WorkReport
	if err := config.DB.Preload("Employee.User").Where("id = ?", c.Params("id")).First(&report).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Logbook not found"})
	}
	if report.Employee.User == nil || report.Employee.User.Role != models.RoleMagang {
		return c.Status(403).JSON(fiber.Map{"error": "Only internship logbooks can be reviewed here"})
	}
	var input struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}
	if input.Status != "approved" && input.Status != "rejected" {
		return c.Status(400).JSON(fiber.Map{"error": "Status harus approved atau rejected"})
	}
	reviewerID := c.Locals("user_id").(uint)
	now := time.Now()
	if err := config.DB.Model(&report).Updates(map[string]interface{}{"status_logbook": input.Status, "reviewed_by": reviewerID, "reviewed_at": now, "review_notes": input.Notes}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to review logbook"})
	}
	_ = utils.CreateNotification(config.DB, report.Employee.UserID, report.Employee.User.Role, "Logbook Magang", "Status Logbook Diperbarui", "Logbook harian Anda telah diperbarui menjadi "+input.Status)
	return c.JSON(fiber.Map{"message": "Logbook reviewed", "status": input.Status})
}

func GetAdminInternshipCertificates(c *fiber.Ctx) error {
	var users []models.User
	if err := config.DB.Where("role = ?", models.RoleMagang).Order("nama asc").Find(&users).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch interns"})
	}
	var certificates []models.InternshipCertificate
	config.DB.Find(&certificates)
	byUser := map[uint]models.InternshipCertificate{}
	for _, certificate := range certificates {
		byUser[certificate.UserID] = certificate
	}
	today := attendanceBusinessDate(attendanceNow())
	result := make([]fiber.Map, 0, len(users))
	for _, user := range users {
		available := user.InternshipEndDate != nil && !user.InternshipEndDate.After(today)
		item := fiber.Map{"user_id": user.ID, "nama": user.Nama, "institution_name": user.InstitutionName, "internship_end_date": user.InternshipEndDate, "available": available}
		if certificate, ok := byUser[user.ID]; ok {
			if certificate.StorageKey != "" {
				available = true
				item["available"] = true
			}
			item["certificate_no"] = certificate.CertificateNo
			item["issued_at"] = certificate.IssuedAt
			item["file_url"] = certificate.FileURL
			item["file_name"] = certificate.FileName
			item["mime_type"] = certificate.MimeType
			item["file_size"] = certificate.FileSize
			item["uploaded"] = certificate.StorageKey != ""
		}
		status := c.Query("status")
		if status == "active" && !available {
			continue
		}
		if status == "completed" && available {
			continue
		}
		if status == "uploaded" && (item["uploaded"] != true) {
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
	hasCertificate := config.DB.Where("user_id = ?", user.ID).First(&certificate).Error == nil
	if !hasCertificate || certificate.StorageKey == "" {
		if user.InternshipEndDate == nil || attendanceBusinessDate(attendanceNow()).Before(*user.InternshipEndDate) {
			return c.Status(403).JSON(fiber.Map{"error": "Sertifikat belum tersedia"})
		}
		certificate = ensureInternshipCertificate(user)
	}
	if certificate.StorageKey != "" {
		return sendStoredCertificate(c, certificate)
	}
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "attachment; filename=\"sertifikat-magang-"+certificate.CertificateNo+".pdf\"")
	return c.SendString(minimalCertificatePDF(user, certificate))
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
	findErr := config.DB.Where("user_id = ?", user.ID).First(&certificate).Error
	if findErr == nil && certificate.StorageKey != "" {
		_ = storage.Client.RemoveObject(context.Background(), storage.BucketName, certificate.StorageKey, minio.RemoveObjectOptions{})
	}
	if findErr != nil {
		certificate = models.InternshipCertificate{UserID: user.ID, IssuedAt: time.Now(), CertificateNo: fmt.Sprintf("MAGANG-%06d", user.ID)}
	}
	uploader := c.Locals("user_id").(uint)
	now := time.Now()
	cfg := config.LoadConfig()
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
	return c.JSON(fiber.Map{"message": "Sertifikat berhasil diunggah", "user_id": user.ID, "file_name": certificate.FileName, "file_url": certificate.FileURL, "mime_type": certificate.MimeType, "file_size": certificate.FileSize})
}

func DeleteAdminInternshipCertificate(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userID"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	var certificate models.InternshipCertificate
	if err := config.DB.Where("user_id = ?", userID).First(&certificate).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Sertifikat belum ada"})
	}
	if certificate.StorageKey != "" && storage.Client != nil {
		_ = storage.Client.RemoveObject(context.Background(), storage.BucketName, certificate.StorageKey, minio.RemoveObjectOptions{})
	}
	if err := config.DB.Model(&certificate).Updates(map[string]interface{}{"file_url": "", "storage_key": "", "file_name": "", "mime_type": "", "file_size": 0, "uploaded_by": nil, "uploaded_at": nil}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Sertifikat gagal dihapus"})
	}
	return c.JSON(fiber.Map{"message": "File sertifikat berhasil dihapus"})
}

func validateCertificateUpload(file *multipart.FileHeader) (string, error) {
	if file.Size <= 0 || file.Size > maxInternshipCertificateSize {
		return "", fmt.Errorf("Ukuran file maksimal 10 MB")
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExt := map[string]bool{".pdf": true, ".jpg": true, ".jpeg": true, ".png": true}
	if !allowedExt[ext] {
		return "", fmt.Errorf("Format sertifikat hanya PDF, JPG, atau PNG")
	}
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("File tidak dapat dibaca")
	}
	defer src.Close()
	buffer := make([]byte, 512)
	n, readErr := src.Read(buffer)
	if readErr != nil && readErr != io.EOF {
		return "", fmt.Errorf("File tidak dapat divalidasi")
	}
	detected := http.DetectContentType(buffer[:n])
	allowedType := detected == "application/pdf" || detected == "image/jpeg" || detected == "image/png"
	if !allowedType {
		return "", fmt.Errorf("Isi file tidak sesuai PDF, JPG, atau PNG")
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
	if builder.Len() == 0 {
		return "certificate"
	}
	return builder.String()
}

func sendStoredCertificate(c *fiber.Ctx, certificate models.InternshipCertificate) error {
	if storage.Client == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Storage sertifikat belum tersedia"})
	}
	object, err := storage.Client.GetObject(context.Background(), storage.BucketName, certificate.StorageKey, minio.GetObjectOptions{})
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "File sertifikat tidak ditemukan"})
	}
	defer object.Close()
	if _, err := object.Stat(); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "File sertifikat tidak ditemukan"})
	}
	contentType := certificate.MimeType
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	c.Set("Content-Type", contentType)
	filename := certificate.FileName
	if filename == "" {
		filename = "sertifikat-magang"
	}
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", safeCertificateFilename(filename)))
	data, err := io.ReadAll(object)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "File sertifikat gagal dibaca"})
	}
	return c.Send(data)
}
