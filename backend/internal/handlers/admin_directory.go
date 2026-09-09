package handlers

import (
	"fmt"
	"strconv"
	"strings"
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
	admin.Delete("/leave-quotas/:id", DeleteLeaveQuota)
}

func GetHomeLocations(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	paginated := c.Context().QueryArgs().Has("page") || c.Context().QueryArgs().Has("limit") || c.Context().QueryArgs().Has("per_page")
	var employees []models.Employee
	query := config.DB.Preload("User").Preload("Division").Preload("Position").Preload("HomeLocation").Order("employees.id asc")
	var total int64
	if !paginated {
		if err := query.Find(&employees).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch employees"})
		}
	} else {
		p := readPagination(c)
		if err := query.Model(&models.Employee{}).Count(&total).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count employees"})
		}
		if err := query.Offset(p.Offset).Limit(p.Limit).Find(&employees).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to paginate home locations"})
		}
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
		if effective, err := effectiveHomeLocation(config.DB, employee.ID, attendanceNow()); err == nil {
			location, ok = effective, true
			employee.HomeLatitude = effective.LatitudeRumah
			employee.HomeLongitude = effective.LongitudeRumah
		}
		result = append(result, fiber.Map{"employee": employee, "location": func() any {
			if ok {
				return location
			}
			return nil
		}()})
	}
	if paginated {
		p := readPagination(c)
		return c.JSON(fiber.Map{"data": result, "total": total, "page": p.Page, "limit": p.Limit, "total_pages": (total + int64(p.Limit) - 1) / int64(p.Limit)})
	}
	return c.JSON(result)
}

type homeLocationInput struct {
	LatitudeRumah  float64 `json:"latitude_rumah"`
	LongitudeRumah float64 `json:"longitude_rumah"`
	RadiusMeter    float64 `json:"radius_meter"`
	AlamatRumah    string  `json:"alamat_rumah"`
	GoogleMapsURL  string  `json:"google_maps_url"`
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
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data lokasi rumah tidak valid"})
	}
	input.GoogleMapsURL = strings.TrimSpace(input.GoogleMapsURL)
	if input.GoogleMapsURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Link Google Maps Rumah - Untuk WFH wajib diisi"})
	}
	latitude, longitude, err := utils.ResolveGoogleMapsLocationURL(input.GoogleMapsURL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	input.LatitudeRumah = latitude
	input.LongitudeRumah = longitude
	if input.LatitudeRumah == 0 || input.LongitudeRumah == 0 || input.RadiusMeter <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Link Google Maps dan radius rumah wajib valid"})
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
	location.GoogleMapsURL = input.GoogleMapsURL
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
	setting := getGeneralSetting()
	var employees []models.Employee
	if err := config.DB.Preload("User").Find(&employees).Error; err == nil {
		for _, employee := range employees {
			if employee.User != nil && employee.User.Role != models.RoleMagang {
				_ = ensureCutiQuota(config.DB, employee, year, attendanceNow(), setting.MinimumMasaKerjaCutiBulan)
			}
		}
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
	if normalizeLeaveType(input.JenisCuti) == models.LeaveTypeCuti {
		var employee models.Employee
		if err := config.DB.First(&employee, uint(employeeID)).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee not found"})
		}
		setting := getGeneralSetting()
		if !isEligibleForCuti(employee, attendanceNow(), setting.MinimumMasaKerjaCutiBulan) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": fmt.Sprintf("Kuota cuti hanya dapat diberikan setelah karyawan memenuhi masa kerja minimal %d bulan", setting.MinimumMasaKerjaCutiBulan)})
		}
		input.JenisCuti = models.LeaveTypeCuti
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

func DeleteLeaveQuota(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid quota id"})
	}
	if err := config.DB.Delete(&models.LeaveQuota{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete leave quota"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "LeaveQuota", uint(id), "Deleted employee leave quota")
	return c.JSON(fiber.Map{"message": "Quota deleted"})
}
