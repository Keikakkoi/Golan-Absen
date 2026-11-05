package handlers

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	errAlternativeLocationNotFound = errors.New("pengajuan lokasi tidak ditemukan")
	errAlternativeLocationReviewed = errors.New("pengajuan lokasi sudah diproses")
)

const (
	alternativeLocationSubmissionNotificationType = "Pengajuan Lokasi Alternatif"
	alternativeLocationStatusNotificationType     = "Status Pengajuan"
)

func SetupLocationRoutes(router fiber.Router) {
	user := router.Group("/employee/alternative-locations", middleware.Protected(), middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer))
	user.Get("/", GetMyAlternativeLocations)
	user.Get("/:id", GetMyAlternativeLocation)
	user.Post("/", CreateAlternativeLocation)
	user.Put("/:id", UpdateAlternativeLocation)
	user.Delete("/:id", DeleteAlternativeLocation)
	user.Patch("/:id/status", ToggleAlternativeLocation)

	// This alias follows the existing profile API namespace and keeps the
	// resource discoverable by profile clients without duplicating storage.
	profile := router.Group("/employee/profile/alternative-locations", middleware.Protected(), middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer))
	profile.Get("/", GetMyAlternativeLocations)
	profile.Get("/:id", GetMyAlternativeLocation)
	profile.Post("/", CreateAlternativeLocation)
	profile.Put("/:id", UpdateAlternativeLocation)
	profile.Delete("/:id", DeleteAlternativeLocation)
	profile.Patch("/:id/status", ToggleAlternativeLocation)

	admin := router.Group("/admin/locations", middleware.Protected(), middleware.RequireRoles(models.RoleHRD))
	admin.Get("/alternative-requests", GetAlternativeLocationRequests)
	admin.Get("/alternative-requests/:id", GetAlternativeLocationRequest)
	admin.Post("/alternative-requests/:id/approve", ApproveAlternativeLocation)
	admin.Post("/alternative-requests/:id/reject", RejectAlternativeLocation)
	admin.Get("/field", ListFieldLocations)
	admin.Get("/field/:id", GetFieldLocation)
	admin.Post("/field", CreateFieldLocation)
	admin.Put("/field/:id", UpdateFieldLocation)
	admin.Patch("/field/:id/status", ToggleFieldLocation)
	admin.Delete("/field/:id", DeleteFieldLocation)

	// Active field locations are safe to expose to authenticated employees;
	// inactive and deleted master rows are filtered at the database boundary.
	router.Get("/locations/field/active", middleware.Protected(), middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer), ListActiveFieldLocations)
}

type locationPayload struct {
	NamaLokasi     string  `json:"nama_lokasi" form:"nama_lokasi"`
	Deskripsi      string  `json:"deskripsi" form:"deskripsi"`
	GoogleMapsURL  string  `json:"google_maps_url" form:"google_maps_url"`
	Latitude       float64 `json:"latitude" form:"latitude"`
	Longitude      float64 `json:"longitude" form:"longitude"`
	RadiusMeter    float64 `json:"radius_meter" form:"radius_meter"`
	MetodeValidasi string  `json:"metode_validasi" form:"metode_validasi"`
	StatusAktif    string  `json:"status_aktif" form:"status_aktif"`
}

func resolveLocationPayloadCoordinates(input *locationPayload) error {
	input.GoogleMapsURL = strings.TrimSpace(input.GoogleMapsURL)
	if input.GoogleMapsURL == "" || (input.Latitude != 0 || input.Longitude != 0) {
		return nil
	}
	latitude, longitude, err := utils.ResolveGoogleMapsLocationURL(input.GoogleMapsURL)
	if err != nil {
		return err
	}
	input.Latitude, input.Longitude = latitude, longitude
	return nil
}

func validateLocationPayload(input locationPayload) error {
	if err := models.ValidateLocationFields(input.NamaLokasi, input.Latitude, input.Longitude, input.RadiusMeter); err != nil {
		return err
	}
	return models.ValidateLocationValidationMethod(input.MetodeValidasi)
}

func parseLocationID(c *fiber.Ctx) (uint, error) {
	id, err := strconv.ParseUint(strings.TrimSpace(c.Params("id")), 10, 64)
	if err != nil || id == 0 {
		return 0, fmt.Errorf("ID lokasi tidak valid")
	}
	return uint(id), nil
}

func normalizeValidationMethod(value string) string {
	return models.NormalizeLocationValidationMethod(value)
}

func parseLocationUsageStatus(value string, fallback models.LocationUsageStatus) (models.LocationUsageStatus, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return fallback, nil
	}
	status := models.LocationUsageStatus(value)
	if !models.ValidateLocationUsageStatus(status) {
		return "", fmt.Errorf("status aktif lokasi tidak valid")
	}
	return status, nil
}

func validateAlternativeLocationNameUnique(db *gorm.DB, ownerID uint, name string, excludeID uint) error {
	query := db.Model(&models.AlternativeLocation{}).
		Where("user_id = ? AND LOWER(BTRIM(nama_lokasi)) = ?", ownerID, models.LocationNameKey(name))
	if excludeID != 0 {
		query = query.Where("id <> ?", excludeID)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return models.ErrDuplicateLocationName
	}
	return nil
}

func validateFieldLocationNameUnique(db *gorm.DB, name string, excludeID uint) error {
	query := db.Model(&models.FieldLocation{}).
		Where("LOWER(BTRIM(nama_lokasi)) = ?", models.LocationNameKey(name))
	if excludeID != 0 {
		query = query.Where("id <> ?", excludeID)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return models.ErrDuplicateLocationName
	}
	return nil
}

func locationConflict(err error) bool {
	return errors.Is(err, models.ErrDuplicateLocationName) || strings.Contains(strings.ToLower(err.Error()), "idx_alternative_locations_user_name_active") || strings.Contains(strings.ToLower(err.Error()), "idx_field_locations_name_active")
}

func newAlternativeLocation(ownerID uint, input locationPayload) models.AlternativeLocation {
	return models.AlternativeLocation{
		UserID:         ownerID,
		NamaLokasi:     models.NormalizeLocationName(input.NamaLokasi),
		Deskripsi:      strings.TrimSpace(input.Deskripsi),
		Latitude:       input.Latitude,
		Longitude:      input.Longitude,
		RadiusMeter:    input.RadiusMeter,
		MetodeValidasi: normalizeValidationMethod(input.MetodeValidasi),
		StatusApproval: models.AlternativeLocationPending,
		StatusAktif:    models.LocationInactive,
	}
}

func alternativeLocationView(row models.AlternativeLocation) models.AlternativeLocation {
	// Keep sensitive approval actor IDs out of ordinary owner responses while
	// retaining the fields in the model for the admin/audit contract.
	row.User = models.User{}
	if row.StatusApproval != models.AlternativeLocationRejected {
		row.RejectionReason = ""
	}
	return row
}

type alternativeLocationResponse struct {
	models.AlternativeLocation
	ID               uint      `json:"id"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	Label            string    `json:"label"`
	Status           string    `json:"status"`
	StatusLabel      string    `json:"status_label"`
	StatusAktifLabel string    `json:"status_aktif_label"`
	RejectionReason  string    `json:"rejection_reason,omitempty"`
	CanEdit          bool      `json:"can_edit"`
	CanDelete        bool      `json:"can_delete"`
	CanToggle        bool      `json:"can_toggle"`
}

type adminLocationUserSummary struct {
	ID    uint        `json:"id"`
	Nama  string      `json:"nama"`
	Email string      `json:"email"`
	Role  models.Role `json:"role"`
}

type adminAlternativeLocationResponse struct {
	alternativeLocationResponse
	Owner *adminLocationUserSummary `json:"owner,omitempty"`
}

func alternativeLocationStatusLabel(status models.AlternativeLocationStatus) string {
	switch status {
	case models.AlternativeLocationApproved:
		return "Disetujui"
	case models.AlternativeLocationRejected:
		return "Ditolak"
	default:
		return "Menunggu persetujuan"
	}
}

func locationUsageStatusLabel(status models.LocationUsageStatus) string {
	if status == models.LocationActive {
		return "Aktif"
	}
	return "Tidak aktif"
}

func alternativeLocationResponseFor(row models.AlternativeLocation) alternativeLocationResponse {
	row = alternativeLocationView(row)
	return alternativeLocationResponse{
		AlternativeLocation: row,
		ID:                  row.ID,
		CreatedAt:           row.CreatedAt,
		UpdatedAt:           row.UpdatedAt,
		Label:               row.NamaLokasi,
		Status:              string(row.StatusApproval),
		StatusLabel:         alternativeLocationStatusLabel(row.StatusApproval),
		StatusAktifLabel:    locationUsageStatusLabel(row.StatusAktif),
		RejectionReason:     row.RejectionReason,
		CanEdit:             models.CanEditAlternativeLocation(row.StatusApproval),
		CanDelete:           models.CanDeleteAlternativeLocation(row.StatusApproval),
		CanToggle:           models.CanToggleAlternativeLocation(row.StatusApproval),
	}
}

func applyConfiguredAlternativeRadius(row *models.AlternativeLocation) {
	if row == nil {
		return
	}
	row.RadiusMeter = wfhAlternativeRadius(config.DB)
}

func adminAlternativeLocationResponseFor(row models.AlternativeLocation) adminAlternativeLocationResponse {
	response := adminAlternativeLocationResponse{alternativeLocationResponse: alternativeLocationResponseFor(row)}
	if row.User.ID != 0 {
		response.Owner = &adminLocationUserSummary{ID: row.User.ID, Nama: row.User.Nama, Email: row.User.Email, Role: row.User.Role}
	}
	return response
}

func applyAlternativeLocationDecision(row *models.AlternativeLocation, approve bool, adminID uint, reason string, decidedAt time.Time) {
	if approve {
		row.StatusApproval, row.StatusAktif, row.ApprovedBy, row.ApprovedAt = models.AlternativeLocationApproved, models.LocationActive, &adminID, &decidedAt
		row.RejectedBy, row.RejectedAt, row.RejectionReason = nil, nil, ""
		return
	}
	row.StatusApproval, row.StatusAktif, row.RejectedBy, row.RejectedAt, row.RejectionReason = models.AlternativeLocationRejected, models.LocationInactive, &adminID, &decidedAt, models.NormalizeAlternativeLocationRejectionReason(reason)
	row.ApprovedBy, row.ApprovedAt = nil, nil
}

func alternativeLocationUserLabel(user models.User) string {
	if name := strings.TrimSpace(user.Nama); name != "" {
		return name
	}
	if email := strings.TrimSpace(user.Email); email != "" {
		return email
	}
	return fmt.Sprintf("user %d", user.ID)
}

func notifyAlternativeLocationSubmission(row models.AlternativeLocation, submitter models.User) {
	var recipients []models.User
	if err := config.DB.Where("role = ?", models.RoleHRD).Find(&recipients).Error; err != nil {
		log.Printf("notification alternative location submission: recipient lookup failed for location %d: %v", row.ID, err)
		return
	}

	message := fmt.Sprintf("Ada pengajuan lokasi alternatif baru dari %s.", alternativeLocationUserLabel(submitter))
	key := fmt.Sprintf("alternative-location-submitted:%d", row.ID)
	for _, recipient := range recipients {
		if err := utils.CreateNotificationWithIdempotencyKey(config.DB, recipient.ID, recipient.Role, alternativeLocationSubmissionNotificationType, "Pengajuan Lokasi Alternatif Baru", message, key); err != nil {
			log.Printf("notification alternative location submission: failed for location %d/user %d: %v", row.ID, recipient.ID, err)
		}
	}
}

func notifyAlternativeLocationDecision(row models.AlternativeLocation, approved bool) {
	title, message, key, ok := alternativeLocationDecisionNotificationPayload(row, approved)
	if !ok {
		return
	}
	if err := utils.CreateNotificationWithIdempotencyKey(config.DB, row.UserID, row.User.Role, alternativeLocationStatusNotificationType, title, message, key); err != nil {
		log.Printf("notification alternative location decision: failed for location %d/user %d: %v", row.ID, row.UserID, err)
	}
}

func alternativeLocationDecisionNotificationPayload(row models.AlternativeLocation, approved bool) (string, string, string, bool) {
	decisionAt := row.RejectedAt
	statusLabel := "rejected"
	title := "Pengajuan Lokasi Alternatif Ditolak"
	message := fmt.Sprintf("Pengajuan lokasi alternatif %s Anda ditolak. Alasan: %s", row.NamaLokasi, row.RejectionReason)
	if approved {
		decisionAt = row.ApprovedAt
		statusLabel = "approved"
		title = "Pengajuan Lokasi Alternatif Disetujui"
		message = fmt.Sprintf("Pengajuan lokasi alternatif %s Anda telah disetujui dan sudah dapat digunakan untuk check-in.", row.NamaLokasi)
	}
	if decisionAt == nil {
		log.Printf("notification alternative location decision: missing decision timestamp for location %d", row.ID)
		return "", "", "", false
	}

	key := fmt.Sprintf("alternative-location-decision:%d:%s:%s", row.ID, statusLabel, decisionAt.Format(time.RFC3339Nano))
	return title, message, key, true
}

func GetMyAlternativeLocations(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var rows []models.AlternativeLocation
	if err := config.DB.Where("user_id = ?", userID).Order("created_at desc, id desc").Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat lokasi alternatif"})
	}
	responses := make([]alternativeLocationResponse, 0, len(rows))
	for _, row := range rows {
		applyConfiguredAlternativeRadius(&row)
		responses = append(responses, alternativeLocationResponseFor(row))
	}
	var used int64
	if err := config.DB.Model(&models.AlternativeLocation{}).Where("user_id = ?", userID).Count(&used).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghitung kuota lokasi alternatif"})
	}
	return c.JSON(fiber.Map{"data": responses, "used": used, "limit": models.MaxAlternativeLocations, "radius_meter": wfhAlternativeRadius(config.DB)})
}

func GetMyAlternativeLocation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.AlternativeLocation
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&row).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi alternatif tidak ditemukan"})
	}
	applyConfiguredAlternativeRadius(&row)
	return c.JSON(alternativeLocationResponseFor(row))
}

func CreateAlternativeLocation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var input locationPayload
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data lokasi tidak valid"})
	}
	if err := resolveLocationPayloadCoordinates(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	// Validate the legacy payload shape with a safe fallback. The authoritative
	// value is loaded inside the transaction below and never comes from client.
	input.RadiusMeter = 100
	if err := validateLocationPayload(input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.AlternativeLocation
	var submitter models.User
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Lock the owner row so two simultaneous requests cannot both pass the
		// three-location quota check.
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&submitter, userID).Error; err != nil {
			return err
		}
		var used int64
		if err := tx.Model(&models.AlternativeLocation{}).Where("user_id = ?", userID).Count(&used).Error; err != nil {
			return err
		}
		if err := models.ValidateAlternativeLocationQuota(used); err != nil {
			return err
		}
		if err := validateAlternativeLocationNameUnique(tx, userID, input.NamaLokasi, 0); err != nil {
			return err
		}
		input.RadiusMeter = wfhAlternativeRadius(tx)
		row = newAlternativeLocation(userID, input)
		return tx.Create(&row).Error
	}); err != nil {
		if locationConflict(err) || strings.Contains(err.Error(), "kuota maksimal") {
			return c.Status(409).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan lokasi alternatif"})
	}
	applyConfiguredAlternativeRadius(&row)
	_ = utils.LogAction(userID, "CREATE", "AlternativeLocation", row.ID, "Pengajuan lokasi alternatif")
	notifyAlternativeLocationSubmission(row, submitter)
	return c.Status(201).JSON(alternativeLocationResponseFor(row))
}

func UpdateAlternativeLocation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var input locationPayload
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data lokasi tidak valid"})
	}
	if err := resolveLocationPayloadCoordinates(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	input.RadiusMeter = 100
	if err := validateLocationPayload(input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.AlternativeLocation
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&row).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi alternatif tidak ditemukan"})
	}
	if !models.CanEditAlternativeLocation(row.StatusApproval) {
		return c.Status(409).JSON(fiber.Map{"error": "Status pengajuan tidak dapat diedit"})
	}
	configuredRadius := wfhAlternativeRadius(config.DB)
	if err := validateAlternativeLocationNameUnique(config.DB, userID, input.NamaLokasi, row.ID); err != nil {
		if locationConflict(err) {
			return c.Status(409).JSON(fiber.Map{"error": "Nama lokasi alternatif sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memvalidasi nama lokasi alternatif"})
	}
	row.NamaLokasi, row.Deskripsi, row.Latitude, row.Longitude, row.RadiusMeter = strings.TrimSpace(input.NamaLokasi), strings.TrimSpace(input.Deskripsi), input.Latitude, input.Longitude, configuredRadius
	row.MetodeValidasi = normalizeValidationMethod(input.MetodeValidasi)
	// Any edit must be reviewed again. This prevents an approved location from
	// remaining usable after its coordinates or meaning have changed.
	row.StatusApproval, row.StatusAktif = models.AlternativeLocationPending, models.LocationInactive
	row.RejectionReason, row.ApprovedBy, row.RejectedBy, row.ApprovedAt, row.RejectedAt = "", nil, nil, nil, nil
	if err := config.DB.Save(&row).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memperbarui lokasi alternatif"})
	}
	_ = utils.LogAction(userID, "UPDATE", "AlternativeLocation", row.ID, "Mengubah lokasi alternatif; status kembali pending")
	applyConfiguredAlternativeRadius(&row)
	return c.JSON(alternativeLocationResponseFor(row))
}

func DeleteAlternativeLocation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.AlternativeLocation
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&row).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi alternatif tidak ditemukan"})
	}
	if !models.CanDeleteAlternativeLocation(row.StatusApproval) {
		return c.Status(409).JSON(fiber.Map{"error": "Status pengajuan tidak dapat dihapus"})
	}
	if err := config.DB.Delete(&row).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus lokasi alternatif"})
	}
	_ = utils.LogAction(userID, "DELETE", "AlternativeLocation", row.ID, "Mengarsipkan lokasi alternatif")
	return c.JSON(fiber.Map{"message": "Lokasi alternatif dihapus"})
}

func ToggleAlternativeLocation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var body struct {
		Active *bool `json:"active"`
	}
	if err := c.BodyParser(&body); err != nil || body.Active == nil {
		return c.Status(400).JSON(fiber.Map{"error": "Status aktif wajib diisi"})
	}
	var row models.AlternativeLocation
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&row).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi alternatif tidak ditemukan"})
	}
	if !models.CanToggleAlternativeLocation(row.StatusApproval) {
		return c.Status(409).JSON(fiber.Map{"error": "Hanya lokasi yang sudah disetujui yang dapat diaktifkan"})
	}
	if *body.Active {
		row.StatusAktif = models.LocationActive
	} else {
		row.StatusAktif = models.LocationInactive
	}
	if err := config.DB.Save(&row).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengubah status lokasi alternatif"})
	}
	_ = utils.LogAction(userID, "UPDATE", "AlternativeLocation", row.ID, "Mengubah status lokasi alternatif menjadi "+string(row.StatusAktif))
	return c.JSON(alternativeLocationResponseFor(row))
}

func GetAlternativeLocationRequests(c *fiber.Ctx) error {
	page, limit := pagination(c)
	sortExpression, sortNeedsUser, sortDirection, err := adminLocationSort(c, map[string]string{
		"created_at": "alternative_locations.created_at",
		"updated_at": "alternative_locations.updated_at",
		"name":       "alternative_locations.nama_lokasi",
		"status":     "alternative_locations.status_approval",
		"user":       "users.nama",
	}, "created_at")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	query := config.DB.Model(&models.AlternativeLocation{}).Preload("User")
	joinedUser := false
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		if !models.ValidateAlternativeLocationStatus(models.AlternativeLocationStatus(status)) {
			return c.Status(400).JSON(fiber.Map{"error": "Filter status tidak valid"})
		}
		query = query.Where("status_approval = ?", status)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Joins("JOIN users ON users.id = alternative_locations.user_id").Where("LOWER(alternative_locations.nama_lokasi) LIKE ? OR LOWER(users.nama) LIKE ? OR LOWER(users.email) LIKE ?", pattern, pattern, pattern)
		joinedUser = true
	}
	if sortNeedsUser && !joinedUser {
		query = query.Joins("JOIN users ON users.id = alternative_locations.user_id")
	}
	query = query.Order(sortExpression + " " + sortDirection).Order("alternative_locations.id desc")
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghitung pengajuan lokasi"})
	}
	var rows []models.AlternativeLocation
	if err := query.Offset((page - 1) * limit).Limit(limit).Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat pengajuan lokasi"})
	}
	responses := make([]adminAlternativeLocationResponse, 0, len(rows))
	for _, row := range rows {
		applyConfiguredAlternativeRadius(&row)
		responses = append(responses, adminAlternativeLocationResponseFor(row))
	}
	return c.JSON(fiber.Map{"data": responses, "page": page, "limit": limit, "total": total, "total_pages": int((total + int64(limit) - 1) / int64(limit)), "radius_meter": wfhAlternativeRadius(config.DB)})
}

func GetAlternativeLocationRequest(c *fiber.Ctx) error {
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.AlternativeLocation
	if err := config.DB.Preload("User").First(&row, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": errAlternativeLocationNotFound.Error()})
	}
	applyConfiguredAlternativeRadius(&row)
	return c.JSON(adminAlternativeLocationResponseFor(row))
}

func reviewAlternativeLocation(c *fiber.Ctx, approve bool) error {
	adminID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var body struct {
		Reason       string `json:"rejection_reason"`
		LegacyReason string `json:"alasan_penolakan"`
	}
	_ = c.BodyParser(&body)
	var row models.AlternativeLocation
	reason := body.Reason
	if reason == "" {
		reason = body.LegacyReason
	}
	if !approve {
		if err := models.ValidateAlternativeLocationRejectionReason(reason); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		reason = models.NormalizeAlternativeLocationRejectionReason(reason)
	}
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("User").First(&row, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errAlternativeLocationNotFound
			}
			return err
		}
		if row.StatusApproval != models.AlternativeLocationPending {
			return errAlternativeLocationReviewed
		}
		now := time.Now().In(jakartaLocation)
		applyAlternativeLocationDecision(&row, approve, adminID, reason, now)
		return tx.Save(&row).Error
	})
	if err != nil {
		switch {
		case errors.Is(err, errAlternativeLocationNotFound):
			return c.Status(404).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, errAlternativeLocationReviewed):
			return c.Status(409).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan keputusan lokasi"})
		}
	}
	detail := "approved"
	if !approve {
		detail = "rejected: " + row.RejectionReason
	}
	_ = utils.LogAction(adminID, "UPDATE", "AlternativeLocation", row.ID, detail)
	notifyAlternativeLocationDecision(row, approve)
	applyConfiguredAlternativeRadius(&row)
	return c.JSON(adminAlternativeLocationResponseFor(row))
}

func ApproveAlternativeLocation(c *fiber.Ctx) error { return reviewAlternativeLocation(c, true) }
func RejectAlternativeLocation(c *fiber.Ctx) error  { return reviewAlternativeLocation(c, false) }

func pagination(c *fiber.Ctx) (int, int) {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}

func adminLocationSort(c *fiber.Ctx, allowed map[string]string, defaultField string) (string, bool, string, error) {
	field := strings.ToLower(strings.TrimSpace(c.Query("sort", defaultField)))
	expression, ok := allowed[field]
	if !ok {
		return "", false, "", fmt.Errorf("sort lokasi tidak valid")
	}
	direction := strings.ToLower(strings.TrimSpace(c.Query("order", "desc")))
	if direction != "asc" && direction != "desc" {
		return "", false, "", fmt.Errorf("order lokasi tidak valid")
	}
	return expression, strings.Contains(expression, "users."), direction, nil
}

func ListFieldLocations(c *fiber.Ctx) error {
	page, limit := pagination(c)
	sortExpression, _, sortDirection, err := adminLocationSort(c, map[string]string{
		"created_at": "field_locations.created_at",
		"updated_at": "field_locations.updated_at",
		"name":       "field_locations.nama_lokasi",
		"status":     "field_locations.status_aktif",
	}, "created_at")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	query := config.DB.Model(&models.FieldLocation{}).Order(sortExpression + " " + sortDirection).Order("field_locations.id desc")
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		if status != string(models.LocationActive) && status != string(models.LocationInactive) {
			return c.Status(400).JSON(fiber.Map{"error": "Filter status tidak valid"})
		}
		query = query.Where("status_aktif = ?", status)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(field_locations.nama_lokasi) LIKE ? OR LOWER(COALESCE(field_locations.deskripsi, '')) LIKE ?", pattern, pattern)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghitung lokasi lapangan"})
	}
	var rows []models.FieldLocation
	if err := query.Offset((page - 1) * limit).Limit(limit).Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat lokasi lapangan"})
	}
	return c.JSON(fiber.Map{"data": rows, "page": page, "limit": limit, "total": total, "total_pages": int((total + int64(limit) - 1) / int64(limit))})
}

func ListActiveFieldLocations(c *fiber.Ctx) error {
	var rows []models.FieldLocation
	if err := config.DB.Where("status_aktif = ?", models.LocationActive).Order("nama_lokasi asc").Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat lokasi lapangan aktif"})
	}
	return c.JSON(rows)
}

func GetFieldLocation(c *fiber.Ctx) error {
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.FieldLocation
	if err := config.DB.First(&row, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi lapangan tidak ditemukan"})
	}
	return c.JSON(row)
}

func CreateFieldLocation(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(uint)
	var input locationPayload
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data lokasi tidak valid"})
	}
	if err := resolveLocationPayloadCoordinates(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := validateLocationPayload(input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := validateFieldLocationNameUnique(config.DB, input.NamaLokasi, 0); err != nil {
		if locationConflict(err) {
			return c.Status(409).JSON(fiber.Map{"error": "Nama lokasi lapangan sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memvalidasi nama lokasi lapangan"})
	}
	status, err := parseLocationUsageStatus(input.StatusAktif, models.LocationActive)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	row := models.FieldLocation{NamaLokasi: strings.TrimSpace(input.NamaLokasi), Deskripsi: strings.TrimSpace(input.Deskripsi), Latitude: input.Latitude, Longitude: input.Longitude, RadiusMeter: input.RadiusMeter, MetodeValidasi: normalizeValidationMethod(input.MetodeValidasi), StatusAktif: status, CreatedBy: &adminID, UpdatedBy: &adminID}
	if err := config.DB.Create(&row).Error; err != nil {
		if locationConflict(err) {
			return c.Status(409).JSON(fiber.Map{"error": "Nama lokasi lapangan sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan lokasi lapangan"})
	}
	invalidateWorkTypeCache()
	_ = utils.LogAction(adminID, "CREATE", "FieldLocation", row.ID, "Membuat lokasi lapangan")
	return c.Status(201).JSON(row)
}

func UpdateFieldLocation(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var input locationPayload
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data lokasi tidak valid"})
	}
	if err := resolveLocationPayloadCoordinates(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := validateLocationPayload(input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.FieldLocation
	if err := config.DB.First(&row, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi lapangan tidak ditemukan"})
	}
	status, err := parseLocationUsageStatus(input.StatusAktif, row.StatusAktif)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := validateFieldLocationNameUnique(config.DB, input.NamaLokasi, row.ID); err != nil {
		if locationConflict(err) {
			return c.Status(409).JSON(fiber.Map{"error": "Nama lokasi lapangan sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memvalidasi nama lokasi lapangan"})
	}
	row.NamaLokasi, row.Deskripsi, row.Latitude, row.Longitude, row.RadiusMeter = strings.TrimSpace(input.NamaLokasi), strings.TrimSpace(input.Deskripsi), input.Latitude, input.Longitude, input.RadiusMeter
	row.MetodeValidasi, row.StatusAktif, row.UpdatedBy = normalizeValidationMethod(input.MetodeValidasi), status, &adminID
	if err := config.DB.Save(&row).Error; err != nil {
		if locationConflict(err) {
			return c.Status(409).JSON(fiber.Map{"error": "Nama lokasi lapangan sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memperbarui lokasi lapangan"})
	}
	invalidateWorkTypeCache()
	_ = utils.LogAction(adminID, "UPDATE", "FieldLocation", row.ID, "Mengubah lokasi lapangan")
	return c.JSON(row)
}

func ToggleFieldLocation(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var body struct {
		Active *bool `json:"active"`
	}
	if err := c.BodyParser(&body); err != nil || body.Active == nil {
		return c.Status(400).JSON(fiber.Map{"error": "Status aktif wajib diisi"})
	}
	var row models.FieldLocation
	if err := config.DB.First(&row, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi lapangan tidak ditemukan"})
	}
	if *body.Active {
		row.StatusAktif = models.LocationActive
	} else {
		row.StatusAktif = models.LocationInactive
	}
	row.UpdatedBy = &adminID
	if err := config.DB.Save(&row).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengubah status lokasi lapangan"})
	}
	invalidateWorkTypeCache()
	_ = utils.LogAction(adminID, "UPDATE", "FieldLocation", row.ID, "Mengubah status lokasi lapangan menjadi "+string(row.StatusAktif))
	return c.JSON(row)
}

func DeleteFieldLocation(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(uint)
	id, err := parseLocationID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var row models.FieldLocation
	if err := config.DB.First(&row, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Lokasi lapangan tidak ditemukan"})
	}
	// Delete is always a GORM soft delete. Attendance rows retain their ID and
	// snapshots, so historical reports remain readable even after archiving.
	if err := config.DB.Delete(&row).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengarsipkan lokasi lapangan"})
	}
	invalidateWorkTypeCache()
	_ = utils.LogAction(adminID, "DELETE", "FieldLocation", row.ID, "Mengarsipkan lokasi lapangan")
	return c.JSON(fiber.Map{"message": "Lokasi lapangan diarsipkan"})
}
