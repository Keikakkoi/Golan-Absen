package handlers

import (
	"absensi-golan-backend/internal/models"
	"testing"
)

func TestAdminReportDisplayStatusUsesCanonicalBuckets(t *testing.T) {
	tests := []struct {
		name            string
		record          models.AttendanceRecord
		wantDisplay     string
		matchingFilters []string
	}{
		{name: "hadir", record: models.AttendanceRecord{Status: models.StatusHadir}, wantDisplay: "Hadir", matchingFilters: []string{"Hadir", "Semua"}},
		{name: "terlambat is displayed as hadir", record: models.AttendanceRecord{Status: models.StatusTerlambat}, wantDisplay: "Hadir", matchingFilters: []string{"Hadir", "Semua"}},
		{name: "missing checkout has priority", record: models.AttendanceRecord{Status: models.StatusHadir, IsCheckoutMissing: true}, wantDisplay: adminReportCheckoutMissingStatus, matchingFilters: []string{adminReportCheckoutMissingStatus, "Semua"}},
		{name: "missing checkout also wins over alpha", record: models.AttendanceRecord{Status: models.StatusAlpha, IsCheckoutMissing: true}, wantDisplay: adminReportCheckoutMissingStatus, matchingFilters: []string{adminReportCheckoutMissingStatus, "Semua"}},
		{name: "alpha", record: models.AttendanceRecord{Status: models.StatusAlpha}, wantDisplay: "Alpha", matchingFilters: []string{"Alpha", "Semua"}},
		{name: "izin", record: models.AttendanceRecord{Status: models.StatusIzin}, wantDisplay: "Izin", matchingFilters: []string{"Izin", "Semua"}},
		{name: "cuti", record: models.AttendanceRecord{Status: models.StatusCuti}, wantDisplay: "Cuti", matchingFilters: []string{"Cuti", "Semua"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := adminReportDisplayStatus(tt.record); got != tt.wantDisplay {
				t.Fatalf("adminReportDisplayStatus() = %q, want %q", got, tt.wantDisplay)
			}

			for _, status := range []string{"Hadir", adminReportCheckoutMissingStatus, "Alpha", "Izin", "Cuti", "Semua"} {
				wantMatch := containsAdminReportStatus(tt.matchingFilters, status)
				if got := adminReportStatusMatches(tt.record, status); got != wantMatch {
					t.Errorf("status %q match = %v, want %v", status, got, wantMatch)
				}
			}
		})
	}
}

func containsAdminReportStatus(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
