package handlers

import (
	"testing"

	"absensi-golan-backend/internal/models"
)

func TestAttendancePresentationUsesCanonicalLabelsAndLegacyFallback(t *testing.T) {
	tests := []struct {
		name      string
		canonical models.WorkTypeCanonical
		legacy    string
		wantType  string
		wantLabel string
	}{
		{name: "wfo", canonical: models.WorkTypeWFO, legacy: "WFO", wantType: "wfo", wantLabel: "WFO"},
		{name: "wfh", canonical: models.WorkTypeWFH, legacy: "WFH", wantType: "wfh", wantLabel: "WFH"},
		{name: "alternative", canonical: models.WorkTypeAlternative, legacy: "Lokasi Alternatif", wantType: "alternative_location", wantLabel: "Lokasi Alternatif"},
		{name: "field", canonical: models.WorkTypeField, legacy: "Lokasi Lapangan", wantType: "field_location", wantLabel: "Lokasi Lapangan"},
		{name: "legacy remote", legacy: "Remote", wantType: "", wantLabel: "Remote"},
		{name: "legacy dinas luar", legacy: "Dinas Luar", wantType: "", wantLabel: "Dinas Luar"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			record := models.AttendanceRecord{TipeKerja: tt.legacy, TipeKerjaCanonical: tt.canonical}
			decorateAttendanceRecordPresentation(&record)
			if string(record.TipeKerjaCanonical) != tt.wantType || record.TipeKerjaLabel != tt.wantLabel {
				t.Fatalf("got canonical=%q label=%q, want canonical=%q label=%q", record.TipeKerjaCanonical, record.TipeKerjaLabel, tt.wantType, tt.wantLabel)
			}
		})
	}
}

func TestAttendancePresentationKeepsInactiveLocationHistorySnapshot(t *testing.T) {
	latitude, longitude := -6.2, 106.8
	record := models.AttendanceRecord{
		TipeKerja:                 "Lokasi Lapangan",
		TipeKerjaCanonical:        models.WorkTypeField,
		LocationNameSnapshot:      "Proyek Lama",
		LocationAddressSnapshot:   "Alamat proyek saat check-in",
		LocationLatitudeSnapshot:  &latitude,
		LocationLongitudeSnapshot: &longitude,
	}

	decorateAttendanceRecordPresentation(&record)
	if record.LocationName != "Proyek Lama" || record.LocationAddress != "Alamat proyek saat check-in" {
		t.Fatalf("location history snapshot was not exposed: %+v", record)
	}
	if record.LocationLatitude == nil || record.LocationLongitude == nil || *record.LocationLatitude != latitude || *record.LocationLongitude != longitude {
		t.Fatalf("location coordinates snapshot was not preserved: %+v", record)
	}
}
