package handlers

import (
	"context"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"absensi-golan-backend/pkg/minio"

	"github.com/gofiber/fiber/v2"
	miniogo "github.com/minio/minio-go/v7"
	"gorm.io/gorm"
)

type companyEventInput struct {
	Tanggal     string `json:"tanggal" form:"tanggal"`
	JamMulai    string `json:"jam_mulai" form:"jam_mulai"`
	JamSelesai  string `json:"jam_selesai" form:"jam_selesai"`
	Judul       string `json:"judul" form:"judul"`
	Tipe        string `json:"tipe" form:"tipe"`
	Deskripsi   string `json:"deskripsi" form:"deskripsi"`
	Lokasi      string `json:"lokasi" form:"lokasi"`
	StatusAktif *bool  `json:"status_aktif"`
	RemoveFile  string `json:"remove_file" form:"remove_file"`
}

func SetupEventRoutes(router fiber.Router) {
	events := router.Group("/events", middleware.Protected())
	events.Get("/", GetCompanyEvents)

	admin := router.Group("/admin/events", middleware.Protected())
	admin.Get("/", GetAdminCompanyEvents)
	admin.Post("/", CreateCompanyEvent)
	admin.Put("/:id", UpdateCompanyEvent)
	admin.Delete("/:id", DeleteCompanyEvent)
}

func GetCompanyEvents(c *fiber.Ctx) error {
	query := config.DB.Model(&models.CompanyEvent{}).Where("status_aktif = ?", true)
	query = applyEventDateFilter(query, c)

	var events []models.CompanyEvent
	if err := query.Order("tanggal asc, jam_mulai asc, id asc").Find(&events).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memuat event perusahaan"})
	}
	return c.JSON(events)
}

func GetAdminCompanyEvents(c *fiber.Ctx) error {
	if !isHRD(c) {
		return accessDenied(c)
	}

	query := config.DB.Model(&models.CompanyEvent{})
	query = applyEventDateFilter(query, c)

	var events []models.CompanyEvent
	if err := query.Order("tanggal asc, jam_mulai asc, id asc").Find(&events).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memuat event perusahaan"})
	}
	return c.JSON(events)
}

func getFormField(c *fiber.Ctx, keys ...string) string {
	if mf, err := c.MultipartForm(); err == nil && mf != nil {
		for _, key := range keys {
			if values, ok := mf.Value[key]; ok && len(values) > 0 {
				if val := strings.TrimSpace(values[0]); val != "" {
					return val
				}
			}
		}
	}
	for _, key := range keys {
		if val := strings.TrimSpace(c.FormValue(key)); val != "" {
			return val
		}
	}
	return ""
}

func parseCompanyEventInput(c *fiber.Ctx) companyEventInput {
	var input companyEventInput
	_ = c.BodyParser(&input)

	if input.Judul == "" {
		input.Judul = getFormField(c, "judul", "Judul")
	}
	if input.JamMulai == "" {
		input.JamMulai = getFormField(c, "jam_mulai", "jamMulai", "JamMulai")
	}
	if input.JamSelesai == "" {
		input.JamSelesai = getFormField(c, "jam_selesai", "jamSelesai", "JamSelesai")
	}
	if input.Tanggal == "" {
		input.Tanggal = getFormField(c, "tanggal", "Tanggal")
	}
	if input.Tipe == "" {
		input.Tipe = getFormField(c, "tipe", "Tipe")
	}
	if input.Deskripsi == "" {
		input.Deskripsi = getFormField(c, "deskripsi", "Deskripsi")
	}
	if input.Lokasi == "" {
		input.Lokasi = getFormField(c, "lokasi", "Lokasi")
	}
	if input.RemoveFile == "" {
		input.RemoveFile = getFormField(c, "remove_file", "removeFile", "RemoveFile")
	}

	if input.StatusAktif == nil {
		statusStr := getFormField(c, "status_aktif", "statusAktif", "StatusAktif")
		if statusStr != "" {
			val := statusStr == "true" || statusStr == "1"
			input.StatusAktif = &val
		}
	}

	return input
}

func CreateCompanyEvent(c *fiber.Ctx) error {
	if !isHRD(c) {
		return accessDenied(c)
	}

	input := parseCompanyEventInput(c)

	event, err := input.toModel()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	event.DibuatOleh = c.Locals("user_id").(uint)

	// Process file attachment upload if provided
	if file, err := c.FormFile("file"); err == nil && file != nil {
		if file.Size > 10*1024*1024 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ukuran file lampiran maksimal 10MB"})
		}
		src, err := file.Open()
		if err == nil {
			defer src.Close()
			fileName := fmt.Sprintf("events/%d-%s", time.Now().UnixNano(), filepath.Base(file.Filename))
			ctx := context.Background()
			if minio.Client != nil {
				_, uploadErr := minio.Client.PutObject(ctx, minio.BucketName, fileName, src, file.Size, miniogo.PutObjectOptions{
					ContentType: file.Header.Get("Content-Type"),
				})
				if uploadErr == nil {
					cfg := config.LoadConfig()
					event.FileAttachmentURL = fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, minio.BucketName, fileName)
					event.FileAttachmentName = file.Filename
				}
			}
		}
	}

	if err := config.DB.Create(&event).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan event perusahaan"})
	}
	utils.LogAction(event.DibuatOleh, "CREATE", "CompanyEvent", event.ID, "Created company event: "+event.Judul)

	// Notify all Karyawan, Magang, and Manager about the new event
	var users []models.User
	if err := config.DB.Where("role IN ?", []models.Role{models.RoleKaryawan, models.RoleMagang, models.RoleManajer}).Find(&users).Error; err == nil {
		for _, u := range users {
			utils.CreateNotification(config.DB, u.ID, u.Role, "Event Perusahaan", "Event Perusahaan Baru", "Ada event perusahaan baru: "+event.Judul)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(event)
}

func UpdateCompanyEvent(c *fiber.Ctx) error {
	if !isHRD(c) {
		return accessDenied(c)
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID event tidak valid"})
	}

	var event models.CompanyEvent
	if err := config.DB.First(&event, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Event tidak ditemukan"})
	}

	input := parseCompanyEventInput(c)

	updated, err := input.toModel()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	event.Tanggal = updated.Tanggal
	event.JamMulai = updated.JamMulai
	event.JamSelesai = updated.JamSelesai
	event.Judul = updated.Judul
	event.Tipe = updated.Tipe
	event.Deskripsi = updated.Deskripsi
	event.Lokasi = updated.Lokasi
	event.StatusAktif = updated.StatusAktif

	removeFile := getFormField(c, "remove_file", "removeFile") == "true" || input.RemoveFile == "true"
	if removeFile {
		event.FileAttachmentURL = ""
		event.FileAttachmentName = ""
	}

	if file, err := c.FormFile("file"); err == nil && file != nil {
		if file.Size > 10*1024*1024 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ukuran file lampiran maksimal 10MB"})
		}
		src, err := file.Open()
		if err == nil {
			defer src.Close()
			fileName := fmt.Sprintf("events/%d-%s", time.Now().UnixNano(), filepath.Base(file.Filename))
			ctx := context.Background()
			if minio.Client != nil {
				_, uploadErr := minio.Client.PutObject(ctx, minio.BucketName, fileName, src, file.Size, miniogo.PutObjectOptions{
					ContentType: file.Header.Get("Content-Type"),
				})
				if uploadErr == nil {
					cfg := config.LoadConfig()
					event.FileAttachmentURL = fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, minio.BucketName, fileName)
					event.FileAttachmentName = file.Filename
				}
			}
		}
	}

	if err := config.DB.Save(&event).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memperbarui event perusahaan"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "CompanyEvent", event.ID, "Updated company event: "+event.Judul)
	return c.JSON(event)
}

func DeleteCompanyEvent(c *fiber.Ctx) error {
	if !isHRD(c) {
		return accessDenied(c)
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID event tidak valid"})
	}

	var event models.CompanyEvent
	if err := config.DB.First(&event, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Event tidak ditemukan"})
	}
	if err := config.DB.Delete(&event).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menghapus event perusahaan"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "CompanyEvent", event.ID, "Deleted company event: "+event.Judul)
	return c.JSON(fiber.Map{"message": "Event perusahaan berhasil dihapus"})
}

func (input companyEventInput) toModel() (models.CompanyEvent, error) {
	tanggal := strings.TrimSpace(input.Tanggal)
	judul := strings.TrimSpace(input.Judul)
	jamMulai := normalizeClock(input.JamMulai)
	jamSelesai := normalizeClock(input.JamSelesai)

	parsedDate, err := time.Parse("2006-01-02", tanggal)
	if err != nil {
		return models.CompanyEvent{}, fiber.NewError(fiber.StatusBadRequest, "Tanggal event wajib diisi dengan format yang valid")
	}
	if judul == "" || jamMulai == "" {
		return models.CompanyEvent{}, fiber.NewError(fiber.StatusBadRequest, "Judul dan jam mulai event wajib diisi")
	}
	if !validClock(jamMulai) || (jamSelesai != "" && !validClock(jamSelesai)) {
		return models.CompanyEvent{}, fiber.NewError(fiber.StatusBadRequest, "Format jam harus HH:mm")
	}
	if jamSelesai != "" && jamSelesai < jamMulai {
		return models.CompanyEvent{}, fiber.NewError(fiber.StatusBadRequest, "Jam selesai tidak boleh lebih awal dari jam mulai")
	}

	tipe := strings.ToLower(strings.TrimSpace(input.Tipe))
	if tipe == "" {
		tipe = "info"
	}
	if tipe != "rapat" && tipe != "meeting" && tipe != "info" && tipe != "lainnya" {
		return models.CompanyEvent{}, fiber.NewError(fiber.StatusBadRequest, "Tipe event tidak valid")
	}

	aktif := true
	if input.StatusAktif != nil {
		aktif = *input.StatusAktif
	}
	return models.CompanyEvent{
		Tanggal: parsedDate, JamMulai: jamMulai, JamSelesai: jamSelesai,
		Judul: judul, Tipe: tipe, Deskripsi: strings.TrimSpace(input.Deskripsi),
		Lokasi: strings.TrimSpace(input.Lokasi), StatusAktif: aktif,
	}, nil
}

func normalizeClock(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	value = strings.ReplaceAll(value, ".", ":")
	parts := strings.Split(value, ":")
	if len(parts) >= 2 {
		h := strings.TrimSpace(parts[0])
		m := strings.TrimSpace(parts[1])
		if len(h) == 1 {
			h = "0" + h
		}
		if len(m) == 1 {
			m = "0" + m
		}
		if len(h) > 2 {
			h = h[:2]
		}
		if len(m) > 2 {
			m = m[:2]
		}
		return fmt.Sprintf("%s:%s", h, m)
	}
	if len(value) > 5 {
		return value[:5]
	}
	return value
}

func validClock(value string) bool {
	value = normalizeClock(value)
	parsed, err := time.Parse("15:04", value)
	return err == nil && parsed.Format("15:04") == value
}

func applyEventDateFilter(query *gorm.DB, c *fiber.Ctx) *gorm.DB {
	if start := strings.TrimSpace(c.Query("start")); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			query = query.Where("tanggal >= ?", parsed)
		}
	}
	if end := strings.TrimSpace(c.Query("end")); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			query = query.Where("tanggal <= ?", parsed)
		}
	}
	return query
}

func accessDenied(c *fiber.Ctx) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Akses hanya untuk HRD"})
}
