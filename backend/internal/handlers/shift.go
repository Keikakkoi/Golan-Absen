package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"github.com/gofiber/fiber/v2"
	"strings"
	"time"
)

var allowedEmployeeShifts = map[string]bool{"Reguler": true, "Shift Pagi": true, "Shift Siang": true, "Shift Malam": true}

func canonicalEmployeeShift(value string) (string, bool) {
	for shift := range allowedEmployeeShifts {
		if strings.EqualFold(strings.TrimSpace(value), shift) {
			return shift, true
		}
	}
	return "", false
}

func validBaseShiftAssignment(shift string, employeeID uint) bool {
	if config.DB == nil {
		return false
	}
	if shift == "Reguler" {
		var regular []models.RegularWorkSchedule
		if config.DB.Where("is_working_day = ? AND BTRIM(start_time) <> '' AND BTRIM(end_time) <> ''", true).Find(&regular).Error != nil {
			return false
		}
		for _, row := range regular {
			if validScheduleClock(row.StartTime) && validScheduleClock(row.EndTime) {
				return true
			}
		}
		return false
	}

	var schedules []models.WorkSchedule
	if config.DB.Where("LOWER(BTRIM(nama_shift)) = ? AND (employee_id IS NULL OR employee_id = ?)", strings.ToLower(shift), employeeID).Find(&schedules).Error != nil {
		return false
	}
	today := scheduleDateOnly(time.Now().In(jakartaLocation))
	for _, schedule := range schedules {
		if scheduleStartsAfter(schedule.Tanggal, today) || !validScheduleHours(schedule) || len(schedule.WorkDays()) == 0 {
			continue
		}
		return true
	}
	return false
}

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
	input.Shift, _ = canonicalEmployeeShift(input.Shift)
	if input.Shift == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Karyawan dan shift wajib dipilih"})
	}
	var user models.User
	if err := config.DB.Preload("Employee").First(&user, c.Params("id")).Error; err != nil || user.Employee.ID == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Karyawan tidak ditemukan"})
	}
	if !validBaseShiftAssignment(input.Shift, user.Employee.ID) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Shift belum memiliki konfigurasi jam kerja dan hari kerja yang valid"})
	}
	if err := config.DB.Model(&models.Employee{}).Where("id = ?", user.Employee.ID).Update("shift_kerja", input.Shift).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan shift"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Employee", user.Employee.ID, "Admin changed employee shift to "+input.Shift)
	return c.JSON(fiber.Map{"message": "Shift karyawan berhasil diperbarui", "shift": input.Shift})
}
