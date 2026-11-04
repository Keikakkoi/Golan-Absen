package models

import (
	"math"
	"reflect"
	"testing"
)

func TestValidateLocationFields(t *testing.T) {
	tests := []struct {
		name    string
		label   string
		lat     float64
		lon     float64
		radius  float64
		wantErr bool
	}{
		{"valid", "Kantor", -6.2, 106.8, 100, false},
		{"empty name", "", -6.2, 106.8, 100, true},
		{"latitude out of range", "Lokasi", 90.1, 106.8, 100, true},
		{"longitude out of range", "Lokasi", -6.2, 180.1, 100, true},
		{"zero point", "Lokasi", 0, 0, 100, true},
		{"radius too small", "Lokasi", -6.2, 106.8, 0, true},
		{"nan latitude", "Lokasi", math.NaN(), 106.8, 100, true},
		{"infinite longitude", "Lokasi", -6.2, math.Inf(1), 100, true},
		{"name too long", string(make([]rune, 101)), -6.2, 106.8, 100, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := ValidateLocationFields(tt.label, tt.lat, tt.lon, tt.radius); (err != nil) != tt.wantErr {
				t.Fatalf("error=%v wantErr=%v", err, tt.wantErr)
			}
		})
	}
}

func TestLocationValidationMethodAndOwner(t *testing.T) {
	if LocationNameKey("  Kantor Pusat  ") != "kantor pusat" {
		t.Fatal("duplicate-name comparison must trim and ignore case")
	}
	if err := ValidateLocationValidationMethod(""); err != nil {
		t.Fatalf("empty method should use the default radius method: %v", err)
	}
	if NormalizeLocationValidationMethod("") != LocationValidationRadius {
		t.Fatal("empty method should normalize to radius")
	}
	if err := ValidateLocationValidationMethod("polygon"); err == nil {
		t.Fatal("unsupported validation method should be rejected")
	}
	if err := ValidateLocationOwner(0); err == nil {
		t.Fatal("zero owner should be rejected")
	}
	if err := ValidateLocationOwner(12); err != nil {
		t.Fatalf("non-zero owner should be accepted: %v", err)
	}
}

func TestAlternativeLocationQuota(t *testing.T) {
	for _, used := range []int64{0, 1, 2} {
		if err := ValidateAlternativeLocationQuota(used); err != nil {
			t.Fatalf("used=%d should remain available: %v", used, err)
		}
	}
	for _, used := range []int64{3, 4} {
		if err := ValidateAlternativeLocationQuota(used); err == nil {
			t.Fatalf("used=%d should exceed the quota", used)
		}
	}
	if err := ValidateAlternativeLocationQuota(-1); err == nil {
		t.Fatal("negative usage should be rejected")
	}
}

func TestAlternativeLocationLifecycleRules(t *testing.T) {
	for _, status := range []AlternativeLocationStatus{AlternativeLocationPending, AlternativeLocationApproved, AlternativeLocationRejected} {
		if !CanEditAlternativeLocation(status) || !CanDeleteAlternativeLocation(status) {
			t.Fatalf("status %q should be editable and soft-deletable", status)
		}
	}
	if CanToggleAlternativeLocation(AlternativeLocationPending) || CanToggleAlternativeLocation(AlternativeLocationRejected) {
		t.Fatal("only approved locations may be activated")
	}
	if !CanToggleAlternativeLocation(AlternativeLocationApproved) {
		t.Fatal("approved locations should be toggleable")
	}
}

func TestLocationModelsValidateAndNormalizeDefaults(t *testing.T) {
	alternative := AlternativeLocation{UserID: 7, NamaLokasi: "  Rumah  ", Latitude: -6.2, Longitude: 106.8, RadiusMeter: 100}
	if err := alternative.BeforeSave(nil); err != nil {
		t.Fatalf("alternative location should validate: %v", err)
	}
	if alternative.NamaLokasi != "Rumah" || alternative.MetodeValidasi != LocationValidationRadius || alternative.StatusApproval != AlternativeLocationPending || alternative.StatusAktif != LocationInactive {
		t.Fatalf("alternative defaults were not normalized: %+v", alternative)
	}
	field := FieldLocation{NamaLokasi: "  Proyek  ", Latitude: -6.2, Longitude: 106.8, RadiusMeter: 100}
	if err := field.BeforeSave(nil); err != nil {
		t.Fatalf("field location should validate: %v", err)
	}
	if field.NamaLokasi != "Proyek" || field.MetodeValidasi != LocationValidationRadius || field.StatusAktif != LocationActive {
		t.Fatalf("field defaults were not normalized: %+v", field)
	}
}

func TestLocationHistoryUsesSoftDeleteReferences(t *testing.T) {
	if _, ok := reflect.TypeOf(AlternativeLocation{}).FieldByName("DeletedAt"); !ok {
		t.Fatal("alternative locations must use soft delete to preserve history")
	}
	if _, ok := reflect.TypeOf(FieldLocation{}).FieldByName("DeletedAt"); !ok {
		t.Fatal("field locations must use soft delete to preserve history")
	}
	attendanceType := reflect.TypeOf(AttendanceRecord{})
	for _, field := range []string{"AlternativeLocationID", "FieldLocationID", "LocationNameSnapshot", "LocationLatitudeSnapshot"} {
		if _, ok := attendanceType.FieldByName(field); !ok {
			t.Fatalf("attendance history is missing immutable location reference/snapshot %s", field)
		}
	}
}

func TestCanonicalWorkTypeKeepsLegacyLabelsCompatible(t *testing.T) {
	if got := CanonicalWorkType("WFO"); got != WorkTypeWFO {
		t.Fatalf("WFO canonical value: got %q", got)
	}
	if got := CanonicalWorkType("Lokasi Alternatif"); got != WorkTypeAlternative {
		t.Fatalf("alternative canonical value: got %q", got)
	}
	if got := CanonicalWorkType("Dinas Luar"); got != "" {
		t.Fatalf("legacy Dinas Luar should remain adapter-only, got %q", got)
	}
}

func TestLocationStatusesAreClosedVocabularies(t *testing.T) {
	for _, status := range []AlternativeLocationStatus{AlternativeLocationPending, AlternativeLocationApproved, AlternativeLocationRejected} {
		if !ValidateAlternativeLocationStatus(status) {
			t.Fatalf("status %q should be valid", status)
		}
	}
	if ValidateAlternativeLocationStatus("archived") {
		t.Fatal("unknown alternative-location status should be rejected")
	}
}
