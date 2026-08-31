package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
)

func TestEffectiveHomeLocationUsesHistoryOnlyOnOrAfterJakartaDate(t *testing.T) {
	base := models.EmployeeHomeLocation{LatitudeRumah: -6.1, LongitudeRumah: 106.7, RadiusMeter: 100, AlamatRumah: "Lama", GoogleMapsURL: "old-url"}
	history := models.EmployeeHomeLocationHistory{NewLatitude: -6.2, NewLongitude: 106.8, NewRadiusMeter: 250, NewAddress: "Baru", NewGoogleMapsURL: "new-url"}

	before := time.Date(2026, 8, 31, 23, 59, 59, 0, jakartaLocation)
	today := time.Date(2026, 9, 1, 0, 0, 0, 0, jakartaLocation)
	if homeLocationIsEffective(today, before) {
		t.Fatal("future location must not be effective before its Jakarta date")
	}
	if got := applyHomeLocationHistory(base, history); got.LatitudeRumah != -6.2 || got.RadiusMeter != 250 || got.GoogleMapsURL != "new-url" {
		t.Fatalf("history did not carry all effective fields: %+v", got)
	}
	if !homeLocationIsEffective(today, today.Add(12*time.Hour)) {
		t.Fatal("location must be effective on its Jakarta start date")
	}
}

func TestHomeLocationApprovalTodayActivatesDenormalizedEmployeeFields(t *testing.T) {
	effectiveDate := time.Date(2026, 8, 31, 0, 0, 0, 0, jakartaLocation)
	now := time.Date(2026, 8, 31, 15, 0, 0, 0, jakartaLocation)
	if !homeLocationIsEffective(effectiveDate, now) {
		t.Fatal("approval with today's effective date must activate immediately")
	}
	if homeLocationIsEffective(effectiveDate.AddDate(0, 0, 1), now) {
		t.Fatal("future effective date must not activate immediately")
	}
}

func TestValidateHomeLocationInput(t *testing.T) {
	future := time.Now().In(jakartaLocation).AddDate(0, 0, 2).Format("2006-01-02")
	if _, err := validateHomeLocationInput(homeLocationRequestInput{Address: "Alamat", Latitude: -6.2, Longitude: 106.8, Radius: 100, EffectiveDate: future, Reason: "Pindah"}); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}
	tests := []homeLocationRequestInput{
		{Address: "", Latitude: -6.2, Longitude: 106.8, Radius: 100, EffectiveDate: future, Reason: "Pindah"},
		{Address: "Alamat", Latitude: 91, Longitude: 106.8, Radius: 100, EffectiveDate: future, Reason: "Pindah"},
		{Address: "Alamat", Latitude: -6.2, Longitude: 106.8, Radius: 0, EffectiveDate: future, Reason: "Pindah"},
	}
	for _, input := range tests {
		if _, err := validateHomeLocationInput(input); err == nil {
			t.Errorf("invalid request was accepted: %+v", input)
		}
	}
}

func TestParseEffectiveDate(t *testing.T) {
	date, err := parseEffectiveDate("2026-09-01")
	if err != nil || date.Location() != jakartaLocation || date.Format("2006-01-02") != "2026-09-01" {
		t.Fatalf("unexpected effective date: %v %v", date, err)
	}
}
