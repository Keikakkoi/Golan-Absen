package handlers

import "testing"

func TestParseAttendanceLocationRejectsInvalidAndSwappedCoordinates(t *testing.T) {
	if _, _, _, err := parseAttendanceLocation("not-a-number", "106.8", "10"); err == nil {
		t.Fatal("invalid latitude should be rejected")
	}
	if _, _, _, err := parseAttendanceLocation("106.8", "-6.2", "10"); err == nil {
		t.Fatal("swapped latitude/longitude should be rejected by range validation")
	}
	lat, lon, accuracy, err := parseAttendanceLocation("-6.200000", "106.800000", "12.5")
	if err != nil || lat != -6.2 || lon != 106.8 || accuracy != 12.5 {
		t.Fatalf("valid coordinates parsed incorrectly: %v %.6f %.6f %.1f", err, lat, lon, accuracy)
	}
}

func TestLocationWithinRadiusUsesCappedAccuracyAllowance(t *testing.T) {
	if !locationWithinRadius(105, 100, 10) {
		t.Fatal("small GPS uncertainty should allow a boundary fix")
	}
	if locationWithinRadius(151, 100, 100) {
		t.Fatal("accuracy allowance must be capped")
	}
	if locationWithinRadius(100.1, 100, 0) {
		t.Fatal("point outside exact radius should be rejected without uncertainty")
	}
}
