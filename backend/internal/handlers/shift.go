package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"github.com/gofiber/fiber/v2"
	"strings"
)

var allowedEmployeeShifts = map[string]bool{"Reguler": true, "Shift Pagi": true, "Shift Siang": true, "Shift Malam": true}

// UpdateEmployeeShift is separate from employee profile CRUD by design.
func UpdateEmployeeShift(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Hanya admin yang dapat mengubah shift"})
	}
	var input struct {
		Shift string `json:"shift"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Input shift tidak valid"})
	}
	input.Shift = strings.TrimSpace(input.Shift)
	if input.Shift == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Karyawan dan shift wajib dipilih"})
	}
	if !allowedEmployeeShifts[input.Shift] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Shift tidak tersedia"})
	}
	var user models.User
	if err := config.DB.Preload("Employee").First(&user, c.Params("id")).Error; err != nil || user.Employee.ID == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Karyawan tidak ditemukan"})
	}
	if err := config.DB.Model(&models.Employee{}).Where("id = ?", user.Employee.ID).Update("shift_kerja", input.Shift).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan shift"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Employee", user.Employee.ID, "Admin changed employee shift to "+input.Shift)
	return c.JSON(fiber.Map{"message": "Shift karyawan berhasil diperbarui", "shift": input.Shift})
}
