package handlers

import (
	"strconv"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

func SetupHolidayRoutes(router fiber.Router) {
	holidays := router.Group("/holidays", middleware.Protected())
	holidays.Get("/", GetAllHolidays)

	admin := router.Group("/admin/holidays", middleware.Protected())
	admin.Post("/", CreateHoliday)
	admin.Put("/:id", UpdateHoliday)
	admin.Delete("/:id", DeleteHoliday)
}

func GetAllHolidays(c *fiber.Ctx) error {
	var holidays []models.Holiday
	if err := config.DB.Order("tanggal asc").Find(&holidays).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch holidays"})
	}
	return c.JSON(holidays)
}

func CreateHoliday(c *fiber.Ctx) error {
	var input struct {
		Tanggal    string `json:"tanggal"`
		Keterangan string `json:"keterangan"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	tanggal, err := time.Parse(time.RFC3339, input.Tanggal)
	if err != nil {
		tanggal, err = time.Parse("2006-01-02", input.Tanggal)
	}
	if err != nil || input.Keterangan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal dan keterangan wajib diisi"})
	}
	h := &models.Holiday{Tanggal: tanggal, Keterangan: input.Keterangan}

	if err := config.DB.Create(&h).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create holiday"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "Holiday", h.ID, "Created holiday: "+h.Keterangan)

	return c.Status(fiber.StatusCreated).JSON(h)
}

func UpdateHoliday(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var h models.Holiday
	if err := config.DB.First(&h, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Holiday not found"})
	}

	var input struct {
		Tanggal    string `json:"tanggal"`
		Keterangan string `json:"keterangan"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	tanggal, err := time.Parse(time.RFC3339, input.Tanggal)
	if err != nil {
		tanggal, err = time.Parse("2006-01-02", input.Tanggal)
	}
	if err != nil || input.Keterangan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal dan keterangan wajib diisi"})
	}
	h.Tanggal = tanggal
	h.Keterangan = input.Keterangan

	if err := config.DB.Save(&h).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update holiday"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Holiday", h.ID, "Updated holiday: "+h.Keterangan)

	return c.JSON(h)
}

func DeleteHoliday(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var h models.Holiday
	if err := config.DB.First(&h, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Holiday not found"})
	}
	if err := config.DB.Delete(&h).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete holiday"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "Holiday", h.ID, "Deleted holiday: "+h.Keterangan)

	return c.JSON(fiber.Map{"message": "Holiday deleted successfully"})
}
