package handlers

import (
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type companyEventInput struct {
	Tanggal     string `json:"tanggal"`
	JamMulai    string `json:"jam_mulai"`
	JamSelesai  string `json:"jam_selesai"`
	Judul       string `json:"judul"`
	Tipe        string `json:"tipe"`
	Deskripsi   string `json:"deskripsi"`
	Lokasi      string `json:"lokasi"`
	StatusAktif *bool  `json:"status_aktif"`
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

func CreateCompanyEvent(c *fiber.Ctx) error {
	if !isHRD(c) {
		return accessDenied(c)
	}

	var input companyEventInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data event tidak valid"})
	}
	event, err := input.toModel()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	event.DibuatOleh = c.Locals("user_id").(uint)

	if err := config.DB.Create(&event).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan event perusahaan"})
	}
	utils.LogAction(event.DibuatOleh, "CREATE", "CompanyEvent", event.ID, "Created company event: "+event.Judul)

	// Notify all Karyawan about the new event
	var users []models.User
	if err := config.DB.Where("role = ?", models.RoleKaryawan).Find(&users).Error; err == nil {
		for _, u := range users {
			utils.CreateNotification(config.DB, u.ID, models.RoleKaryawan, "Event Perusahaan", "Event Perusahaan Baru", "Ada event perusahaan baru: "+event.Judul)
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

	var input companyEventInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data event tidak valid"})
	}
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
	jamMulai := strings.TrimSpace(input.JamMulai)
	jamSelesai := strings.TrimSpace(input.JamSelesai)

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

func validClock(value string) bool {
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
