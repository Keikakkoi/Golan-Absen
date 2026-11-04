package handlers

import (
	"testing"

	"absensi-golan-backend/internal/models"
	"github.com/DATA-DOG/go-sqlmock"
)

func TestWorkTypeCanonicalLocationLabelsAndLegacyAdapter(t *testing.T) {
	types := []models.WorkType{
		{Nama: "WFO", RadiusYangBerlaku: "kantor"},
		{Nama: "WFH", IsHomeBase: true, RadiusYangBerlaku: "kantor"},
		{Nama: "Lokasi Alternatif", RadiusYangBerlaku: "alternatif"},
		{Nama: "Lokasi Lapangan", RadiusYangBerlaku: "lapangan"},
		{Nama: "Dinas Luar", RadiusYangBerlaku: "tanpa_validasi"},
	}
	normalizeWorkTypeResponses(types)
	want := []struct {
		canonical models.WorkTypeCanonical
		label     string
	}{
		{models.WorkTypeWFO, "WFO"},
		{models.WorkTypeWFH, "WFH"},
		{models.WorkTypeAlternative, "Lokasi Alternatif"},
		{models.WorkTypeField, "Lokasi Lapangan"},
		{"", "Tanpa validasi lokasi"},
	}
	for index, expectation := range want {
		if types[index].CanonicalType != expectation.canonical || types[index].LocationModeLabel != expectation.label {
			t.Fatalf("type %d normalized to canonical=%q label=%q, want canonical=%q label=%q", index, types[index].CanonicalType, types[index].LocationModeLabel, expectation.canonical, expectation.label)
		}
	}
}

func TestWorkTypeCannotStoreFieldLocationForNonFieldMode(t *testing.T) {
	id := uint(7)
	if err := validateFieldLocationReference(workTypeValidationOffice, &id); err == nil {
		t.Fatal("non-field work type must reject a field-location reference")
	}
	if err := validateFieldLocationReference(workTypeValidationAlternative, &id); err == nil {
		t.Fatal("alternative work type must not store an admin field-location reference")
	}
	if err := validateFieldLocationReference(workTypeValidationOffice, nil); err != nil {
		t.Fatalf("non-field work type without a reference should be valid: %v", err)
	}
	if got := normalizeFieldLocationID(&[]uint{0}[0]); got != nil {
		t.Fatal("zero field-location ID must normalize to nil")
	}
}

func TestWorkTypeCanonicalModeMapsOnlySupportedSources(t *testing.T) {
	for mode, want := range map[string]models.WorkTypeCanonical{
		workTypeValidationOffice:      models.WorkTypeWFO,
		workTypeValidationHome:        models.WorkTypeWFH,
		workTypeValidationAlternative: models.WorkTypeAlternative,
		workTypeValidationField:       models.WorkTypeField,
	} {
		if got := workTypeCanonicalForMode(mode); got != want {
			t.Fatalf("mode %q mapped to %q, want %q", mode, got, want)
		}
	}
	if got := workTypeCanonicalForMode(workTypeValidationNone); got.Valid() {
		t.Fatalf("legacy no-validation mode should not become a canonical location source: %q", got)
	}
}

func TestFieldWorkTypeReferenceRequiresActiveMasterLocation(t *testing.T) {
	_, mock, cleanup := newLocationAPIContractDB(t)
	defer cleanup()
	id := uint(7)
	mock.ExpectQuery(`SELECT .* FROM "field_locations"`).
		WithArgs(id, models.LocationActive).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(id))
	if err := validateFieldLocationReference(workTypeValidationField, &id); err != nil {
		t.Fatalf("active master location should be accepted: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("active location query expectation: %v", err)
	}

	_, mock, cleanup = newLocationAPIContractDB(t)
	defer cleanup()
	mock.ExpectQuery(`SELECT .* FROM "field_locations"`).
		WithArgs(id, models.LocationActive).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))
	if err := validateFieldLocationReference(workTypeValidationField, &id); err == nil {
		t.Fatal("inactive or missing master location must be rejected")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("inactive location query expectation: %v", err)
	}
}
