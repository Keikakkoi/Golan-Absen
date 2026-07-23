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

func SetupAdminDirectoryRoutes(router fiber.Router) {
	admin := router.Group("/admin", middleware.Protected())
	admin.Get("/home-locations", GetHomeLocations)
	admin.Put("/home-locations/:employee_id", UpdateHomeLocation)
	admin.Get("/leave-quotas", GetLeaveQuotas)
	admin.Put("/leave-quotas/:employee_id", UpsertLeaveQuota)
}

func GetHomeLocations(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var employees []models.Employee
	if err := config.DB.Preload("User").Preload("Department").Preload("Position").Order("id asc").Find(&employees).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch employees"})
	}
	var locations []models.EmployeeHomeLocation
	config.DB.Find(&locations)
	byEmployee := make(map[uint]models.EmployeeHomeLocation)
	for _, location := range locations {
		byEmployee[location.EmployeeID] = location
	}
	result := make([]fiber.Map, 0, len(employees))
	for _, employee := range employees {
		location, ok := byEmployee[employee.ID]
		result = append(result, fiber.Map{"employee": employee, "location": func() any {
			if ok {
				return location
			}
			return nil
		}()})
	}
	return c.JSON(result)
}

type homeLocationInput struct {
	LatitudeRumah  float64 `json:"latitude_rumah"`
	LongitudeRumah float64 `json:"longitude_rumah"`
	RadiusMeter    float64 `json:"radius_meter"`
	AlamatRumah    string  `json:"alamat_rumah"`
}

func UpdateHomeLocation(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	employeeID, err := strconv.ParseUint(c.Params("employee_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid employee id"})
	}
	var input homeLocationInput
	if err := c.BodyParser(&input); err != nil || input.LatitudeRumah == 0 || input.LongitudeRumah == 0 || input.RadiusMeter <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Koordinat dan radius rumah wajib valid"})
	}
	var employee models.Employee
	if err := config.DB.First(&employee, uint(employeeID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee not found"})
	}
	var location models.EmployeeHomeLocation
	err = config.DB.Where("employee_id = ?", employee.ID).First(&location).Error
	if err != nil {
		location = models.EmployeeHomeLocation{EmployeeID: employee.ID}
	}
	location.LatitudeRumah = input.LatitudeRumah
	location.LongitudeRumah = input.LongitudeRumah
	location.RadiusMeter = input.RadiusMeter
	location.AlamatRumah = input.AlamatRumah
	if err := config.DB.Save(&location).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save home location"})
	}
	// Keep legacy employee fields in sync because the attendance client still reads them.
	employee.HomeLatitude = input.LatitudeRumah
	employee.HomeLongitude = input.LongitudeRumah
	config.DB.Model(&employee).Updates(map[string]any{"home_latitude": employee.HomeLatitude, "home_longitude": employee.HomeLongitude})
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "EmployeeHomeLocation", location.ID, "Updated employee home geofence")
	return c.JSON(location)
}

func GetLeaveQuotas(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	year := c.QueryInt("tahun", 0)
	if year == 0 {
		year = time.Now().Year()
	}
	var quotas []models.LeaveQuota
	query := config.DB.Preload("Employee.User").Where("tahun = ?", year).Order("employee_id asc")
	if err := query.Find(&quotas).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leave quotas"})
	}
	return c.JSON(quotas)
}

type leaveQuotaInput struct {
	Tahun     int    `json:"tahun"`
	JenisCuti string `json:"jenis_cuti"`
	SisaKuota int    `json:"sisa_kuota"`
}

func UpsertLeaveQuota(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	employeeID, err := strconv.ParseUint(c.Params("employee_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid employee id"})
	}
	var input leaveQuotaInput
	if err := c.BodyParser(&input); err != nil || input.Tahun < 2000 || input.JenisCuti == "" || input.SisaKuota < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data kuota tidak valid"})
	}
	var quota models.LeaveQuota
	err = config.DB.Where("employee_id = ? AND tahun = ? AND jenis_cuti = ?", uint(employeeID), input.Tahun, input.JenisCuti).First(&quota).Error
	if err != nil {
		quota = models.LeaveQuota{EmployeeID: uint(employeeID), Tahun: input.Tahun, JenisCuti: input.JenisCuti}
	}
	quota.SisaKuota = input.SisaKuota
	if err := config.DB.Save(&quota).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save leave quota"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "LeaveQuota", quota.ID, "Updated employee leave quota")
	return c.JSON(quota)
}
