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
	worktypes.Get("/:id", GetWorkType)

	// Admin only routes
	admin := router.Group("/admin/worktypes", middleware.Protected(), middleware.RequireRoles(models.RoleHRD))
	admin.Get("/", GetAllWorkTypes)
	admin.Get("/:id", GetWorkType)
	admin.Post("/", CreateWorkType)
	admin.Put("/:id", UpdateWorkType)
	admin.Delete("/:id", DeleteWorkType)
}

func GetAllWorkTypes(c *fiber.Ctx) error {
	var types []models.WorkType
	search := strings.TrimSpace(c.Query("search"))
	canonicalFilter := strings.TrimSpace(c.Query("canonical_type"))
	statusFilter := strings.TrimSpace(c.Query("status"))
	hasFilter := search != "" || canonicalFilter != "" || statusFilter != ""

	// Try to get from Redis Cache first
	if !hasFilter && config.RedisClient != nil {
		cached, err := config.RedisClient.Get(config.Ctx, workTypeCacheKey).Result()
		if err == nil && cached != "" {
			if json.Unmarshal([]byte(cached), &types) == nil {
				normalizeWorkTypeResponses(types)
				hydrateWorkTypeLocations(types)
				return c.JSON(types)
			}
		}
	}

	query := config.DB.Model(&models.WorkType{})
	if search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(nama) LIKE ? OR LOWER(COALESCE(deskripsi, '')) LIKE ?", pattern, pattern)
	}
	if canonicalFilter != "" {
		canonical := models.CanonicalWorkType(canonicalFilter)
		if !canonical.Valid() {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "canonical_type tidak valid"})
		}
		legacyNames := []string{strings.ToLower(canonicalFilter)}
		switch canonical {
		case models.WorkTypeAlternative:
			legacyNames = append(legacyNames, "lokasi alternatif")
		case models.WorkTypeField:
			legacyNames = append(legacyNames, "lokasi lapangan")
		}
		query = query.Where("canonical_type = ? OR (canonical_type IS NULL AND LOWER(BTRIM(nama)) IN ?)", canonical, legacyNames)
	}
	if statusFilter != "" {
		switch strings.ToLower(statusFilter) {
		case "active", "aktif", "true":
			query = query.Where("status_aktif = ?", true)
		case "inactive", "nonaktif", "false":
			query = query.Where("status_aktif = ?", false)
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status tipe kerja tidak valid"})
		}
	}
	if err := query.Order("is_default desc").Order("nama asc").Find(&types).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch work types"})
	}
	normalizeWorkTypeResponses(types)
	hydrateWorkTypeLocations(types)

	// Set to Cache
	if config.RedisClient != nil {
		if bytes, err := json.Marshal(types); err == nil {
			config.RedisClient.Set(config.Ctx, workTypeCacheKey, bytes, 1*time.Hour)
		}
	}

	return c.JSON(types)
}

func GetWorkType(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(strings.TrimSpace(c.Params("id")), 10, 64)
	if err != nil || id == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Work type ID tidak valid"})
	}
	var workType models.WorkType
	if err := config.DB.First(&workType, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Work type not found"})
	}
	types := []models.WorkType{workType}
	normalizeWorkTypeResponses(types)
	hydrateWorkTypeLocations(types)
	return c.JSON(types[0])
}

const (
	workTypeValidationOffice      = "kantor"
	workTypeValidationHome        = "rumah"
	workTypeValidationNone        = "tanpa_validasi"
	workTypeValidationAlternative = "alternatif"
	workTypeValidationField       = "lapangan"
)

func canonicalWorkType(workType models.WorkType) models.WorkTypeCanonical {
	if workType.CanonicalType.Valid() {
		return workType.CanonicalType
	}
	if canonical := models.CanonicalWorkType(workType.Nama); canonical.Valid() {
		return canonical
	}
	if workType.IsHomeBase {
		return models.WorkTypeWFH
	}
	if strings.EqualFold(strings.TrimSpace(workType.Nama), "WFO") {
		return models.WorkTypeWFO
	}
	return ""
}

func workTypeCanonicalForMode(mode string) models.WorkTypeCanonical {
	switch mode {
	case workTypeValidationOffice:
		return models.WorkTypeWFO
	case workTypeValidationHome:
		return models.WorkTypeWFH
	case workTypeValidationAlternative:
		return models.WorkTypeAlternative
	case workTypeValidationField:
		return models.WorkTypeField
	default:
		return ""
	}
}

func workTypeLocationModeLabel(canonical models.WorkTypeCanonical, mode string) string {
	switch canonical {
	case models.WorkTypeWFO:
		return "WFO"
	case models.WorkTypeWFH:
		return "WFH"
	case models.WorkTypeAlternative:
		return "Lokasi Alternatif"
	case models.WorkTypeField:
		return "Lokasi Lapangan"
	}
	switch mode {
	case workTypeValidationOffice:
		return "WFO"
	case workTypeValidationHome:
		return "WFH"
	case workTypeValidationAlternative:
		return "Lokasi Alternatif"
	case workTypeValidationField:
		return "Lokasi Lapangan"
	default:
		return "Tanpa validasi lokasi"
	}
}

// workTypeValidationMode is the single compatibility boundary for work-type
// location rules. RadiusYangBerlaku is authoritative for new rows. The two
// legacy fallbacks are intentionally kept here so old data remains usable
// without making attendance handlers depend on a work-type name.
func workTypeValidationMode(workType models.WorkType) string {
	switch canonicalWorkType(workType) {
	case models.WorkTypeAlternative:
		return workTypeValidationAlternative
	case models.WorkTypeField:
		return workTypeValidationField
	case models.WorkTypeWFO:
		return workTypeValidationOffice
	case models.WorkTypeWFH:
		return workTypeValidationHome
	}
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
		if !types[index].CanonicalType.Valid() {
			types[index].CanonicalType = canonicalWorkType(types[index])
			if !types[index].CanonicalType.Valid() {
				types[index].CanonicalType = workTypeCanonicalForMode(mode)
			}
		}
		types[index].RadiusYangBerlaku = mode
		types[index].IsHomeBase = mode == workTypeValidationHome
		types[index].ButuhValidasiGeofence = mode != workTypeValidationNone
		types[index].LocationModeLabel = workTypeLocationModeLabel(types[index].CanonicalType, mode)
	}
}

func hydrateWorkTypeLocations(types []models.WorkType) {
	if config.DB == nil {
		return
	}
	ids := make([]uint, 0)
	seen := make(map[uint]struct{})
	for _, workType := range types {
		if workType.FieldLocationID != nil && *workType.FieldLocationID != 0 {
			if _, ok := seen[*workType.FieldLocationID]; !ok {
				ids = append(ids, *workType.FieldLocationID)
				seen[*workType.FieldLocationID] = struct{}{}
			}
		}
	}
	if len(ids) == 0 {
		return
	}
	var locations []models.FieldLocation
	if err := config.DB.Unscoped().Where("id IN ?", ids).Find(&locations).Error; err != nil {
		return
	}
	byID := make(map[uint]models.FieldLocation, len(locations))
	for _, location := range locations {
		byID[location.ID] = location
	}
	for index := range types {
		if types[index].FieldLocationID == nil {
			continue
		}
		if location, ok := byID[*types[index].FieldLocationID]; ok {
			types[index].FieldLocationName = location.NamaLokasi
			active := location.StatusAktif == models.LocationActive && location.DeletedAt.Time.IsZero()
			types[index].FieldLocationActive = &active
		}
	}
}

type workTypePayload struct {
	Nama               string                   `json:"Nama"`
	RadiusYangBerlaku  string                   `json:"RadiusYangBerlaku"`
	ModeValidasiLokasi string                   `json:"ModeValidasiLokasi"`
	CanonicalType      models.WorkTypeCanonical `json:"canonical_type"`
	FieldLocationID    *uint                    `json:"field_location_id"`
}

func (payload workTypePayload) validationMode() string {
	canonical := models.CanonicalWorkType(string(payload.CanonicalType))
	if canonical.Valid() {
		switch canonical {
		case models.WorkTypeWFO:
			return workTypeValidationOffice
		case models.WorkTypeWFH:
			return workTypeValidationHome
		case models.WorkTypeAlternative:
			return workTypeValidationAlternative
		case models.WorkTypeField:
			return workTypeValidationField
		}
	}
	value := payload.RadiusYangBerlaku
	if strings.TrimSpace(value) == "" {
		value = payload.ModeValidasiLokasi
	}
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer("-", "_", " ", "_").Replace(value)
	switch value {
	case workTypeValidationOffice, workTypeValidationHome, workTypeValidationNone, workTypeValidationAlternative, workTypeValidationField:
		return value
	case "alternative_location":
		return workTypeValidationAlternative
	case "field_location":
		return workTypeValidationField
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

func validateFieldLocationReference(mode string, locationID *uint) error {
	if mode != workTypeValidationField {
		if locationID != nil && *locationID != 0 {
			return fmt.Errorf("lokasi lapangan hanya boleh dipilih untuk tipe kerja Lokasi Lapangan")
		}
		return nil
	}
	if locationID == nil || *locationID == 0 {
		return fmt.Errorf("Lokasi lapangan wajib dipilih")
	}
	var location models.FieldLocation
	if err := config.DB.Where("id = ? AND status_aktif = ?", *locationID, models.LocationActive).First(&location).Error; err != nil {
		return fmt.Errorf("Lokasi lapangan tidak ditemukan atau tidak aktif")
	}
	return nil
}

func normalizeFieldLocationID(locationID *uint) *uint {
	if locationID == nil || *locationID == 0 {
		return nil
	}
	return locationID
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
		CanonicalType:         models.CanonicalWorkType(string(payload.CanonicalType)),
		FieldLocationID:       normalizeFieldLocationID(payload.FieldLocationID),
		WajibSelfie:           true,
		StatusAktif:           true,
	}
	if !wt.CanonicalType.Valid() {
		wt.CanonicalType = models.CanonicalWorkType(wt.Nama)
		if !wt.CanonicalType.Valid() && mode == workTypeValidationOffice {
			wt.CanonicalType = models.WorkTypeWFO
		}
		if !wt.CanonicalType.Valid() && mode == workTypeValidationHome {
			wt.CanonicalType = models.WorkTypeWFH
		}
		if !wt.CanonicalType.Valid() && mode == workTypeValidationAlternative {
			wt.CanonicalType = models.WorkTypeAlternative
		}
		if !wt.CanonicalType.Valid() && mode == workTypeValidationField {
			wt.CanonicalType = models.WorkTypeField
		}
	}
	if err := validateFieldLocationReference(mode, wt.FieldLocationID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
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
	wt.CanonicalType = models.CanonicalWorkType(string(payload.CanonicalType))
	wt.FieldLocationID = normalizeFieldLocationID(payload.FieldLocationID)
	if !wt.CanonicalType.Valid() {
		wt.CanonicalType = models.CanonicalWorkType(wt.Nama)
		if !wt.CanonicalType.Valid() && mode == workTypeValidationOffice {
			wt.CanonicalType = models.WorkTypeWFO
		}
		if !wt.CanonicalType.Valid() && mode == workTypeValidationHome {
			wt.CanonicalType = models.WorkTypeWFH
		}
		if !wt.CanonicalType.Valid() && mode == workTypeValidationAlternative {
			wt.CanonicalType = models.WorkTypeAlternative
		}
		if !wt.CanonicalType.Valid() && mode == workTypeValidationField {
			wt.CanonicalType = models.WorkTypeField
		}
	}
	if err := validateFieldLocationReference(mode, wt.FieldLocationID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

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
