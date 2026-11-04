package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newLocationAPIContractDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, func()) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("create sqlmock: %v", err)
	}
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	if err != nil {
		sqlDB.Close()
		t.Fatalf("open gorm sqlmock: %v", err)
	}
	previous := config.DB
	config.DB = db
	cleanup := func() {
		config.DB = previous
		_ = sqlDB.Close()
	}
	return db, mock, cleanup
}

func TestAlternativeLocationRolesAllowOnlyEmployeeRoles(t *testing.T) {
	allowed := []models.Role{models.RoleKaryawan, models.RoleMagang, models.RoleManajer}
	for _, role := range allowed {
		app := fiber.New()
		app.Get("/alternative-locations", func(c *fiber.Ctx) error {
			c.Locals("role", role)
			c.Locals("user_id", uint(10))
			return c.Next()
		}, middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer), func(c *fiber.Ctx) error {
			return c.SendStatus(fiber.StatusNoContent)
		})

		response, err := app.Test(httptest.NewRequest("GET", "/alternative-locations", nil))
		if err != nil {
			t.Fatalf("role %s request failed: %v", role, err)
		}
		if response.StatusCode != fiber.StatusNoContent {
			t.Fatalf("role %s got status %d, want %d", role, response.StatusCode, fiber.StatusNoContent)
		}
	}
	app := fiber.New()
	app.Get("/alternative-locations", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleHRD)
		return c.Next()
	}, middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})
	response, err := app.Test(httptest.NewRequest("GET", "/alternative-locations", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusForbidden {
		t.Fatalf("HRD got status %d, want %d for owner API", response.StatusCode, fiber.StatusForbidden)
	}
}

func TestAlternativeLocationCreateRoleMatrixAllowsEmployeeRoles(t *testing.T) {
	for _, role := range []models.Role{models.RoleKaryawan, models.RoleMagang, models.RoleManajer} {
		app := fiber.New()
		app.Post("/employee/alternative-locations", func(c *fiber.Ctx) error {
			c.Locals("role", role)
			c.Locals("user_id", uint(42))
			return c.Next()
		}, middleware.RequireRoles(models.RoleKaryawan, models.RoleMagang, models.RoleManajer), func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusCreated).JSON(fiber.Map{"status": string(models.AlternativeLocationPending), "owner_id": c.Locals("user_id")})
		})

		request := httptest.NewRequest("POST", "/employee/alternative-locations", strings.NewReader(`{"nama_lokasi":"Rumah Uji","latitude":-6.2,"longitude":106.8,"radius_meter":100}`))
		request.Header.Set("Content-Type", "application/json")
		response, err := app.Test(request)
		if err != nil {
			t.Fatalf("role %s create request failed: %v", role, err)
		}
		if response.StatusCode != fiber.StatusCreated {
			t.Fatalf("role %s got status %d, want %d", role, response.StatusCode, fiber.StatusCreated)
		}
	}
}

func TestNewAlternativeLocationAlwaysStartsPendingAndUsesServerOwner(t *testing.T) {
	row := newAlternativeLocation(42, locationPayload{
		NamaLokasi:     "  Rumah  ",
		Deskripsi:      "Alamat",
		Latitude:       -6.2,
		Longitude:      106.8,
		RadiusMeter:    100,
		MetodeValidasi: "radius",
	})
	if row.UserID != 42 || row.StatusApproval != models.AlternativeLocationPending || row.StatusAktif != models.LocationInactive {
		t.Fatalf("new location did not enforce server ownership/pending state: %+v", row)
	}
}

func TestAlternativeLocationResponseHasStableUIContract(t *testing.T) {
	row := alternativeLocationResponseFor(models.AlternativeLocation{
		Model:           models.Model{ID: 7},
		UserID:          10,
		NamaLokasi:      "Rumah",
		Deskripsi:       "Alamat rumah",
		Latitude:        -6.2,
		Longitude:       106.8,
		RadiusMeter:     100,
		StatusApproval:  models.AlternativeLocationRejected,
		StatusAktif:     models.LocationInactive,
		RejectionReason: "Koordinat perlu diperbaiki",
	})
	payload, err := json.Marshal(row)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	for _, key := range []string{"id", "user_id", "label", "status", "status_label", "status_aktif", "status_aktif_label", "rejection_reason", "latitude", "longitude", "radius_meter", "can_edit", "can_delete", "can_toggle"} {
		if _, ok := decoded[key]; !ok {
			t.Fatalf("response is missing UI field %q: %s", key, payload)
		}
	}
	if decoded["status"] != string(models.AlternativeLocationRejected) || decoded["rejection_reason"] != "Koordinat perlu diperbaiki" {
		t.Fatalf("rejection status/reason not exposed safely: %s", payload)
	}
}

func TestAlternativeLocationResponsePreservesAllApprovalStatuses(t *testing.T) {
	for _, test := range []struct {
		status    models.AlternativeLocationStatus
		label     string
		canToggle bool
	}{
		{models.AlternativeLocationPending, "Menunggu persetujuan", false},
		{models.AlternativeLocationApproved, "Disetujui", true},
		{models.AlternativeLocationRejected, "Ditolak", false},
	} {
		response := alternativeLocationResponseFor(models.AlternativeLocation{StatusApproval: test.status, StatusAktif: models.LocationInactive})
		if response.Status != string(test.status) || response.StatusLabel != test.label || response.CanToggle != test.canToggle {
			t.Fatalf("status response mismatch for %q: %+v", test.status, response)
		}
	}
}

func TestAlternativeLocationInputCannotSetApprovalOrOwner(t *testing.T) {
	var payload locationPayload
	if err := json.Unmarshal([]byte(`{"user_id":99,"status_approval":"approved","approved_by":99,"rejection_reason":"forged","nama_lokasi":"Rumah","latitude":-6.2,"longitude":106.8,"radius_meter":100}`), &payload); err != nil {
		t.Fatalf("decode input: %v", err)
	}
	if payload.NamaLokasi != "Rumah" || payload.Latitude != -6.2 || payload.Longitude != 106.8 || payload.RadiusMeter != 100 {
		t.Fatalf("allowed location fields were not decoded: %+v", payload)
	}
	// locationPayload has no owner/approval fields, so forged values cannot
	// reach the model. CreateAlternativeLocation assigns them server-side.
}

func TestGetAlternativeLocationCannotCrossOwnership(t *testing.T) {
	_, mock, cleanup := newLocationAPIContractDB(t)
	defer cleanup()
	mock.ExpectQuery(`SELECT .* FROM "alternative_locations"`).
		WithArgs(uint(7), uint(42)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	app := fiber.New()
	app.Get("/employee/alternative-locations/:id", func(c *fiber.Ctx) error {
		c.Locals("user_id", uint(42))
		return GetMyAlternativeLocation(c)
	})
	response, err := app.Test(httptest.NewRequest("GET", "/employee/alternative-locations/7", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusNotFound {
		t.Fatalf("cross-owner lookup got %d, want %d", response.StatusCode, fiber.StatusNotFound)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ownership query expectation: %v", err)
	}
}

func TestCreateAlternativeLocationRejectsFourthLocationAtAPI(t *testing.T) {
	_, mock, cleanup := newLocationAPIContractDB(t)
	defer cleanup()
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT .* FROM "users"`).
		WithArgs(uint(42)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(42))
	mock.ExpectQuery(`SELECT count\(\*\) FROM "alternative_locations"`).
		WithArgs(uint(42)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))
	mock.ExpectRollback()

	app := fiber.New()
	app.Post("/employee/alternative-locations", func(c *fiber.Ctx) error {
		c.Locals("user_id", uint(42))
		return CreateAlternativeLocation(c)
	})
	request := httptest.NewRequest("POST", "/employee/alternative-locations", strings.NewReader(`{"nama_lokasi":"Lokasi 4","latitude":-6.2,"longitude":106.8,"radius_meter":100}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusConflict {
		t.Fatalf("fourth location got %d, want %d", response.StatusCode, fiber.StatusConflict)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("quota query expectation: %v", err)
	}
}

func TestAdminLocationRoleGuardAllowsOnlyHRD(t *testing.T) {
	for _, role := range []models.Role{models.RoleHRD, models.RoleKaryawan, models.RoleMagang, models.RoleManajer} {
		app := fiber.New()
		app.Get("/admin/locations", func(c *fiber.Ctx) error {
			c.Locals("role", role)
			return c.Next()
		}, middleware.RequireRoles(models.RoleHRD), func(c *fiber.Ctx) error {
			return c.SendStatus(fiber.StatusNoContent)
		})
		response, err := app.Test(httptest.NewRequest("GET", "/admin/locations", nil))
		if err != nil {
			t.Fatalf("role %s request failed: %v", role, err)
		}
		want := fiber.StatusForbidden
		if role == models.RoleHRD {
			want = fiber.StatusNoContent
		}
		if response.StatusCode != want {
			t.Fatalf("role %s got %d, want %d", role, response.StatusCode, want)
		}
	}
}

func TestAdminLocationSortIsWhitelisted(t *testing.T) {
	app := fiber.New()
	app.Get("/admin/locations", func(c *fiber.Ctx) error {
		_, _, _, err := adminLocationSort(c, map[string]string{"name": "field_locations.nama_lokasi"}, "name")
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.SendStatus(fiber.StatusNoContent)
	})
	for _, query := range []string{"?sort=name&order=asc", "?sort=name&order=desc"} {
		response, err := app.Test(httptest.NewRequest("GET", "/admin/locations"+query, nil))
		if err != nil || response.StatusCode != fiber.StatusNoContent {
			t.Fatalf("valid sort %s got response=%v status=%d", query, err, response.StatusCode)
		}
	}
	for _, query := range []string{"?sort=nama_lokasi;DROP%20TABLE%20users", "?sort=name&order=sideways"} {
		response, err := app.Test(httptest.NewRequest("GET", "/admin/locations"+query, nil))
		if err != nil || response.StatusCode != fiber.StatusBadRequest {
			t.Fatalf("invalid sort %s got response=%v status=%d", query, err, response.StatusCode)
		}
	}
}

func TestAdminAlternativeResponseDoesNotExposeUserSecrets(t *testing.T) {
	row := models.AlternativeLocation{
		Model:          models.Model{ID: 9},
		UserID:         42,
		NamaLokasi:     "Site",
		Latitude:       -6.2,
		Longitude:      106.8,
		RadiusMeter:    100,
		StatusApproval: models.AlternativeLocationPending,
		StatusAktif:    models.LocationInactive,
		User: models.User{
			Model:        models.Model{ID: 42},
			Nama:         "User A",
			Email:        "user@example.com",
			Role:         models.RoleKaryawan,
			PasswordHash: "secret-hash",
		},
	}
	payload, err := json.Marshal(adminAlternativeLocationResponseFor(row))
	if err != nil {
		t.Fatalf("marshal admin response: %v", err)
	}
	if strings.Contains(string(payload), "secret-hash") || strings.Contains(string(payload), "password") {
		t.Fatalf("admin response exposed user secret: %s", payload)
	}
	if !strings.Contains(string(payload), `"owner"`) || !strings.Contains(string(payload), "user@example.com") {
		t.Fatalf("admin response omitted safe owner summary: %s", payload)
	}
}

func TestAdminAlternativeDecisionStoresActorTimeAndReason(t *testing.T) {
	decidedAt := time.Date(2026, 11, 3, 10, 0, 0, 0, time.FixedZone("Asia/Jakarta", 7*60*60))
	row := models.AlternativeLocation{StatusApproval: models.AlternativeLocationPending, StatusAktif: models.LocationInactive}
	applyAlternativeLocationDecision(&row, false, 99, "  Koordinat tidak jelas  ", decidedAt)
	if row.StatusApproval != models.AlternativeLocationRejected || row.StatusAktif != models.LocationInactive || row.RejectedBy == nil || *row.RejectedBy != 99 || row.RejectedAt == nil || !row.RejectedAt.Equal(decidedAt) || row.RejectionReason != "Koordinat tidak jelas" {
		t.Fatalf("rejection decision was not persisted in model contract: %+v", row)
	}
	row = models.AlternativeLocation{StatusApproval: models.AlternativeLocationPending, StatusAktif: models.LocationInactive}
	applyAlternativeLocationDecision(&row, true, 100, "", decidedAt)
	if row.StatusApproval != models.AlternativeLocationApproved || row.StatusAktif != models.LocationActive || row.ApprovedBy == nil || *row.ApprovedBy != 100 || row.ApprovedAt == nil || !row.ApprovedAt.Equal(decidedAt) {
		t.Fatalf("approval decision was not persisted in model contract: %+v", row)
	}
}

func TestAdminReviewRejectsAlreadyProcessedRequestAtomically(t *testing.T) {
	_, mock, cleanup := newLocationAPIContractDB(t)
	defer cleanup()
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT .* FROM "alternative_locations"`).
		WithArgs(uint(7)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "status_approval"}).AddRow(7, string(models.AlternativeLocationApproved)))
	mock.ExpectRollback()

	app := fiber.New()
	app.Post("/admin/locations/alternative-requests/:id/reject", func(c *fiber.Ctx) error {
		c.Locals("user_id", uint(99))
		return RejectAlternativeLocation(c)
	})
	request := httptest.NewRequest("POST", "/admin/locations/alternative-requests/7/reject", strings.NewReader(`{"rejection_reason":"Tidak valid"}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusConflict {
		t.Fatalf("re-review got %d, want %d", response.StatusCode, fiber.StatusConflict)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("review transaction expectation: %v", err)
	}
}

func TestAdminRejectRequiresReasonBeforeDatabaseWrite(t *testing.T) {
	app := fiber.New()
	app.Post("/admin/locations/alternative-requests/:id/reject", func(c *fiber.Ctx) error {
		c.Locals("user_id", uint(99))
		return RejectAlternativeLocation(c)
	})
	request := httptest.NewRequest("POST", "/admin/locations/alternative-requests/7/reject", strings.NewReader(`{"rejection_reason":"   "}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("empty reason got %d, want %d", response.StatusCode, fiber.StatusBadRequest)
	}
}

func TestAdminFieldLocationListReturnsPaginationMetadata(t *testing.T) {
	_, mock, cleanup := newLocationAPIContractDB(t)
	defer cleanup()
	mock.ExpectQuery(`SELECT count\(\*\) FROM "field_locations"`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))
	mock.ExpectQuery(`SELECT \* FROM "field_locations"`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	app := fiber.New()
	app.Get("/admin/locations/field", func(c *fiber.Ctx) error {
		return ListFieldLocations(c)
	})
	response, err := app.Test(httptest.NewRequest("GET", "/admin/locations/field?page=2&limit=2&status=active&sort=name&order=asc", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusOK {
		t.Fatalf("field list got %d, want %d", response.StatusCode, fiber.StatusOK)
	}
	var body map[string]any
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatalf("decode field list: %v", err)
	}
	if body["page"] != float64(2) || body["limit"] != float64(2) || body["total"] != float64(5) || body["total_pages"] != float64(3) {
		t.Fatalf("pagination metadata mismatch: %+v", body)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("field pagination query expectation: %v", err)
	}
}
