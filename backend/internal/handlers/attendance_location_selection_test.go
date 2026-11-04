package handlers

import (
	"testing"

	"absensi-golan-backend/internal/models"
	"github.com/DATA-DOG/go-sqlmock"
)

func TestResolveAlternativeLocationRequiresApprovedActiveOwnerAndRadius(t *testing.T) {
	tests := []struct {
		name       string
		userID     uint
		returnRows bool
		latitude   string
		wantError  bool
	}{
		{name: "ownership mismatch", userID: 99, returnRows: false, latitude: "-6.2", wantError: true},
		{name: "pending or rejected or inactive", userID: 42, returnRows: false, latitude: "-6.2", wantError: true},
		{name: "outside radius", userID: 42, returnRows: true, latitude: "-6.3", wantError: true},
		{name: "approved active inside radius", userID: 42, returnRows: true, latitude: "-6.2", wantError: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, mock, cleanup := newLocationAPIContractDB(t)
			defer cleanup()

			query := mock.ExpectQuery(`SELECT .* FROM "alternative_locations"`).WithArgs(
				uint(22), tt.userID, models.AlternativeLocationApproved, models.LocationActive,
			)
			if tt.returnRows {
				query.WillReturnRows(sqlmock.NewRows([]string{
					"id", "nama_lokasi", "deskripsi", "latitude", "longitude", "radius_meter",
				}).AddRow(22, "Rumah", "Alamat", -6.2, 106.8, 100.0))
				mock.ExpectQuery(`SELECT .*radius_toleransi_wfh_alternatif_meter.*FROM "general_settings"`).
					WillReturnRows(sqlmock.NewRows([]string{"radius_toleransi_wfh_alternatif_meter"}).AddRow(100.0))
			} else {
				query.WillReturnRows(sqlmock.NewRows([]string{"id"}))
			}

			resolution, err := resolveAttendanceLocationSelection(
				tt.userID,
				7,
				models.WorkType{CanonicalType: models.WorkTypeAlternative},
				"22",
				"",
				tt.latitude,
				"106.8",
				"0",
			)
			if tt.wantError && err == nil {
				t.Fatalf("expected alternative location selection to fail, got %+v", resolution)
			}
			if !tt.wantError && (err != nil || resolution.AlternativeLocationID == nil || *resolution.AlternativeLocationID != 22) {
				t.Fatalf("expected approved active alternative location to resolve, resolution=%+v err=%v", resolution, err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("database expectations: %v", err)
			}
		})
	}
}

func TestResolveFieldLocationRequiresConfiguredActiveMasterAndMatchingReference(t *testing.T) {
	configuredID := uint(33)

	t.Run("unconfigured work type", func(t *testing.T) {
		_, _, cleanup := newLocationAPIContractDB(t)
		defer cleanup()

		_, err := resolveAttendanceLocationSelection(
			42, 7,
			models.WorkType{CanonicalType: models.WorkTypeField},
			"", "33", "-6.2", "106.8", "0",
		)
		if err == nil {
			t.Fatal("field work type without a configured master location must fail")
		}
	})

	t.Run("reference mismatch", func(t *testing.T) {
		_, _, cleanup := newLocationAPIContractDB(t)
		defer cleanup()

		_, err := resolveAttendanceLocationSelection(
			42, 7,
			models.WorkType{CanonicalType: models.WorkTypeField, FieldLocationID: &configuredID},
			"", "99", "-6.2", "106.8", "0",
		)
		if err == nil {
			t.Fatal("client-supplied field location must match work-type configuration")
		}
	})

	t.Run("active configured location inside radius", func(t *testing.T) {
		_, mock, cleanup := newLocationAPIContractDB(t)
		defer cleanup()

		mock.ExpectQuery(`SELECT .* FROM "field_locations"`).WithArgs(configuredID, models.LocationActive).
			WillReturnRows(sqlmock.NewRows([]string{
				"id", "nama_lokasi", "deskripsi", "latitude", "longitude", "radius_meter",
			}).AddRow(33, "Lapangan", "Alamat lapangan", -6.2, 106.8, 100.0))

		resolution, err := resolveAttendanceLocationSelection(
			42, 7,
			models.WorkType{CanonicalType: models.WorkTypeField, FieldLocationID: &configuredID},
			"", "33", "-6.2", "106.8", "0",
		)
		if err != nil || resolution.FieldLocationID == nil || *resolution.FieldLocationID != configuredID {
			t.Fatalf("expected active field location to resolve, resolution=%+v err=%v", resolution, err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("database expectations: %v", err)
		}
	})
}
