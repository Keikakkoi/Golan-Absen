package handlers

import (
	"fmt"
	"strconv"
	"strings"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
)

const workTypeCacheKey = "cache:worktypes:v2"

func SetupWorkTypeRoutes(router fiber.Router) {
	// Public (Authenticated) routes
	worktypes := router.Group("/worktypes", middleware.Protected())
	worktypes.Get("/", GetAllWorkTypes)

	// Admin only routes
	admin := router.Group("/admin/worktypes", middleware.Protected(), middleware.RequireRoles(models.RoleHRD))
	admin.Get("/", GetAllWorkTypes)
	admin.Post("/", CreateWorkType)
	admin.Put("/:id", UpdateWorkType)
	admin.Delete("/:id", DeleteWorkType)
}

func GetAllWorkTypes(c *fiber.Ctx) error {
	var types []models.WorkType

	// Try to get from Redis Cache first
	if config.RedisClient != nil {
		cached, err := config.RedisClient.Get(config.Ctx, workTypeCacheKey).Result()
		if err == nil && cached != "" {
			if json.Unmarshal([]byte(cached), &types) == nil {
				normalizeWorkTypeResponses(types)
				return c.JSON(types)
			}
		}
	}

	if err := config.DB.Find(&types).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch work types"})
	}
	normalizeWorkTypeResponses(types)

	// Set to Cache
	if config.RedisClient != nil {
		if bytes, err := json.Marshal(types); err == nil {
			config.RedisClient.Set(config.Ctx, workTypeCacheKey, bytes, 1*time.Hour)
		}
	}

	return c.JSON(types)
}

const (
	workTypeValidationOffice = "kantor"
	workTypeValidationHome   = "rumah"
	workTypeValidationNone   = "tanpa_validasi"
)

// workTypeValidationMode is the single compatibility boundary for work-type
// location rules. RadiusYangBerlaku is authoritative for new rows. The two
// legacy fallbacks are intentionally kept here so old data remains usable
// without making attendance handlers depend on a work-type name.
func workTypeValidationMode(workType models.WorkType) string {
	configured := strings.ToLower(strings.TrimSpace(workType.RadiusYangBerlaku))
	switch configured {
	case workTypeValidationHome:
		return workTypeValidationHome
	case workTypeValidationNone:
		return workTypeValidationNone
	case workTypeValidationOffice:
		// Existing WFH rows may still have the old default "kantor" value.
		if workType.IsHomeBase {
			return workTypeValidationHome
		}
		return workTypeValidationOffice
	case "kombinasi":
		if !workType.ButuhValidasiGeofence {
			return workTypeValidationNone
		}
	}

	if workType.IsHomeBase {
		return workTypeValidationHome
	}
	if strings.EqualFold(strings.TrimSpace(workType.Nama), "WFO") {
		return workTypeValidationOffice
	}
	if !workType.ButuhValidasiGeofence {
		return workTypeValidationNone
	}
	// Legacy custom work types did not have a dedicated no-geofence value.
	return workTypeValidationNone
}

func normalizeWorkTypeResponses(types []models.WorkType) {
	for index := range types {
		mode := workTypeValidationMode(types[index])
		types[index].RadiusYangBerlaku = mode
		types[index].IsHomeBase = mode == workTypeValidationHome
		types[index].ButuhValidasiGeofence = mode != workTypeValidationNone
	}
}

type workTypePayload struct {
	Nama               string `json:"Nama"`
	RadiusYangBerlaku  string `json:"RadiusYangBerlaku"`
	ModeValidasiLokasi string `json:"ModeValidasiLokasi"`
}

func (payload workTypePayload) validationMode() string {
	value := payload.RadiusYangBerlaku
	if strings.TrimSpace(value) == "" {
		value = payload.ModeValidasiLokasi
	}
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer("-", "_", " ", "_").Replace(value)
	switch value {
	case workTypeValidationOffice, workTypeValidationHome, workTypeValidationNone:
		return value
	default:
		return ""
	}
}

func validateWorkTypePayload(payload workTypePayload, currentID uint) (string, error) {
	payload.Nama = strings.TrimSpace(payload.Nama)
	if payload.Nama == "" {
		return "", fmt.Errorf("Nama tipe kerja wajib diisi")
	}
	mode := payload.validationMode()
	if mode == "" {
		return "", fmt.Errorf("Mode validasi lokasi wajib dipilih")
	}
	query := config.DB.Where("LOWER(BTRIM(nama)) = ?", strings.ToLower(payload.Nama))
	if currentID != 0 {
		query = query.Where("id <> ?", currentID)
	}
	var duplicate models.WorkType
	if err := query.First(&duplicate).Error; err == nil {
		return "", fmt.Errorf("Nama tipe kerja sudah digunakan")
	}
	return mode, nil
}

func invalidateWorkTypeCache() {
	if config.RedisClient != nil {
		config.RedisClient.Del(config.Ctx, workTypeCacheKey)
	}
}

func CreateWorkType(c *fiber.Ctx) error {
	payload := new(workTypePayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	mode, err := validateWorkTypePayload(*payload, 0)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	wt := models.WorkType{
		Nama:                  strings.TrimSpace(payload.Nama),
		RadiusYangBerlaku:     mode,
		IsHomeBase:            mode == workTypeValidationHome,
		ButuhValidasiGeofence: mode != workTypeValidationNone,
		WajibSelfie:           true,
		StatusAktif:           true,
	}

	if err := config.DB.Create(&wt).Error; err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Nama tipe kerja sudah digunakan"})
	}

	invalidateWorkTypeCache()
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "WorkType", wt.ID, "Created work type: "+wt.Nama)

	return c.Status(fiber.StatusCreated).JSON(wt)
}

func UpdateWorkType(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var wt models.WorkType
	if err := config.DB.First(&wt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Work type not found"})
	}

	payload := new(workTypePayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	mode, err := validateWorkTypePayload(*payload, wt.ID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	wt.Nama = strings.TrimSpace(payload.Nama)
	wt.RadiusYangBerlaku = mode
	wt.IsHomeBase = mode == workTypeValidationHome
	wt.ButuhValidasiGeofence = mode != workTypeValidationNone

	if err := config.DB.Save(&wt).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update work type"})
	}

	invalidateWorkTypeCache()
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "WorkType", wt.ID, "Updated work type: "+wt.Nama)

	return c.JSON(wt)
}

func DeleteWorkType(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var wt models.WorkType
	if err := config.DB.First(&wt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Work type not found"})
	}

	invalidateWorkTypeCache()

	if err := config.DB.Delete(&wt).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete work type"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "WorkType", wt.ID, "Deleted work type: "+wt.Nama)

	return c.JSON(fiber.Map{"message": "Work type deleted successfully"})
}
