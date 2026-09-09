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
	"absensi-golan-backend/internal/models"
	storage "absensi-golan-backend/pkg/minio"

	"github.com/gofiber/fiber/v2"
	minio "github.com/minio/minio-go/v7"
)

const maxInternshipDocumentSize int64 = 10 * 1024 * 1024

var internshipDocumentTypes = map[string]string{
	"nilai_magang":     "Nilai Magang",
	"keterangan_lulus": "Keterangan Lulus",
}

func validInternshipDocumentType(value string) bool {
	_, ok := internshipDocumentTypes[value]
	return ok
}

func internshipDocumentResponse(doc models.InternshipDocument) fiber.Map {
	return fiber.Map{"available": doc.StorageKey != "", "document_type": doc.DocumentType, "label": internshipDocumentTypes[doc.DocumentType], "file_name": doc.FileName, "file_url": doc.FileURL, "mime_type": doc.MimeType, "file_size": doc.FileSize, "uploaded_at": doc.UploadedAt}
}

func GetInternshipDocuments(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	var docs []models.InternshipDocument
	config.DB.Where("user_id = ?", user.ID).Find(&docs)
	result := fiber.Map{}
	for docType, label := range internshipDocumentTypes {
		result[docType] = fiber.Map{"available": false, "document_type": docType, "label": label}
	}
	for _, doc := range docs {
		result[doc.DocumentType] = internshipDocumentResponse(doc)
	}
	return c.JSON(result)
}

func DownloadInternshipDocument(c *fiber.Ctx) error {
	user, err := getInternUser(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern profile not found"})
	}
	return downloadInternshipDocument(c, user.ID, c.Params("type"))
}

func DownloadAdminInternshipDocument(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userID"), 10, 64)
	if err != nil || !validInternshipDocumentType(c.Params("type")) {
		return c.Status(400).JSON(fiber.Map{"error": "Dokumen magang tidak valid"})
	}
	var user models.User
	if err = config.DB.Where("id = ? AND role = ?", userID, models.RoleMagang).First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern not found"})
	}
	return downloadInternshipDocument(c, user.ID, c.Params("type"))
}

func downloadInternshipDocument(c *fiber.Ctx, userID uint, docType string) error {
	if !validInternshipDocumentType(docType) {
		return c.Status(400).JSON(fiber.Map{"error": "Jenis dokumen tidak valid"})
	}
	var doc models.InternshipDocument
	if err := config.DB.Where("user_id = ? AND document_type = ?", userID, docType).First(&doc).Error; err != nil || doc.StorageKey == "" {
		return c.Status(404).JSON(fiber.Map{"error": internshipDocumentTypes[docType] + " belum diunggah"})
	}
	if storage.Client != nil {
		object, err := storage.Client.GetObject(context.Background(), storage.BucketName, doc.StorageKey, minio.GetObjectOptions{})
		if err == nil {
			defer object.Close()
			if _, err = object.Stat(); err == nil {
				contentType := doc.MimeType
				if contentType == "" {
					contentType = "application/pdf"
				}
				c.Set("Content-Type", contentType)
				filename := docType + ".pdf"
				if ext := filepath.Ext(doc.FileName); ext != "" {
					filename = docType + strings.ToLower(ext)
				}
				c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
				return c.SendStream(object)
			}
		}
	}

	// Older records may have a valid public FileURL while the configured
	// MinIO client cannot read the object directly. Use the saved URL as a
	// compatibility fallback so existing uploads remain downloadable.
	if doc.FileURL != "" {
		response, requestErr := http.Get(doc.FileURL)
		if requestErr == nil {
			defer response.Body.Close()
			if response.StatusCode >= http.StatusOK && response.StatusCode < http.StatusMultipleChoices {
				contentType := doc.MimeType
				if contentType == "" {
					contentType = "application/pdf"
				}
				c.Set("Content-Type", contentType)
				filename := docType + ".pdf"
				if ext := filepath.Ext(doc.FileName); ext != "" {
					filename = docType + strings.ToLower(ext)
				}
				c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
				data, readErr := io.ReadAll(response.Body)
				if readErr == nil {
					return c.Send(data)
				}
			}
		}
	}
	return c.Status(404).JSON(fiber.Map{"error": "File dokumen tidak ditemukan"})
}

func UploadAdminInternshipDocument(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userID"), 10, 64)
	docType := c.FormValue("document_type")
	if err != nil || !validInternshipDocumentType(docType) {
		return c.Status(400).JSON(fiber.Map{"error": "Jenis dokumen magang tidak valid"})
	}
	var user models.User
	if err = config.DB.Where("id = ? AND role = ?", userID, models.RoleMagang).First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Intern not found"})
	}
	today := attendanceBusinessDate(attendanceNow())
	if user.InternshipEndDate == nil || today.Before(*user.InternshipEndDate) {
		return c.Status(400).JSON(fiber.Map{"error": "Dokumen magang hanya dapat diunggah ketika masa magang telah berakhir"})
	}
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File dokumen wajib diunggah pada field file"})
	}
	contentType, err := validateInternshipDocumentUpload(file)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if storage.Client == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Storage dokumen belum tersedia"})
	}
	safeName := safeCertificateFilename(file.Filename)
	key := fmt.Sprintf("internship-documents/%d/%s/%d-%s", user.ID, docType, time.Now().UnixNano(), safeName)
	src, err := file.Open()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "File tidak dapat dibaca"})
	}
	defer src.Close()
	if _, err = storage.Client.PutObject(context.Background(), storage.BucketName, key, src, file.Size, minio.PutObjectOptions{ContentType: contentType}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan file dokumen"})
	}
	var doc models.InternshipDocument
	findErr := config.DB.Where("user_id = ? AND document_type = ?", user.ID, docType).First(&doc).Error
	if findErr == nil && doc.StorageKey != "" {
		_ = storage.Client.RemoveObject(context.Background(), storage.BucketName, doc.StorageKey, minio.RemoveObjectOptions{})
	}
	now := time.Now()
	if findErr != nil {
		doc.UserID = user.ID
		doc.DocumentType = docType
	} else {
	}
	uploader := c.Locals("user_id").(uint)
	cfg := config.LoadConfig()
	doc.StorageKey = key
	doc.FileName = file.Filename
	doc.MimeType = contentType
	doc.FileSize = file.Size
	doc.UploadedBy = &uploader
	doc.UploadedAt = &now
	doc.FileURL = fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, storage.BucketName, key)
	if err = config.DB.Save(&doc).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Metadata dokumen gagal disimpan"})
	}
	return c.JSON(fiber.Map{"message": internshipDocumentTypes[docType] + " berhasil diunggah", "document": internshipDocumentResponse(doc)})
}

func DeleteAdminInternshipDocument(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userID"), 10, 64)
	docType := c.Params("type")
	if err != nil || !validInternshipDocumentType(docType) {
		return c.Status(400).JSON(fiber.Map{"error": "Dokumen magang tidak valid"})
	}
	var doc models.InternshipDocument
	if err = config.DB.Where("user_id = ? AND document_type = ?", userID, docType).First(&doc).Error; err != nil || doc.StorageKey == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Dokumen belum diunggah"})
	}
	if storage.Client != nil {
		_ = storage.Client.RemoveObject(context.Background(), storage.BucketName, doc.StorageKey, minio.RemoveObjectOptions{})
	}
	doc.StorageKey = ""
	doc.FileName = ""
	doc.FileURL = ""
	doc.MimeType = ""
	doc.FileSize = 0
	doc.UploadedBy = nil
	doc.UploadedAt = nil
	if err = config.DB.Save(&doc).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus dokumen"})
	}
	return c.JSON(fiber.Map{"message": internshipDocumentTypes[docType] + " berhasil dihapus"})
}

func validateInternshipDocumentUpload(file *multipart.FileHeader) (string, error) {
	if file.Size > maxInternshipDocumentSize {
		return "", fmt.Errorf("Ukuran file maksimal 10MB")
	}
	if strings.ToLower(filepath.Ext(file.Filename)) != ".pdf" {
		return "", fmt.Errorf("Format file harus .pdf")
	}
	f, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("Gagal membuka file")
	}
	defer f.Close()
	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	if !strings.HasPrefix(http.DetectContentType(buf[:n]), "application/pdf") {
		return "", fmt.Errorf("Isi file tidak sesuai format PDF")
	}
	return "application/pdf", nil
}
