package handlers

import (
	"fmt"
	"strings"

	"absensi-golan-backend/internal/models"
)

type attendanceLocationPresentation struct {
	Name        string
	Address     string
	Coordinates string
}

// attendanceCanonicalType resolves the additive canonical value first and
// falls back to the legacy display value for old attendance rows.
func attendanceCanonicalType(record models.AttendanceRecord) models.WorkTypeCanonical {
	if record.TipeKerjaCanonical.Valid() {
		return record.TipeKerjaCanonical
	}
	return models.CanonicalWorkType(record.TipeKerja)
}

// attendanceTypeLabel is shared by API responses and exports. Unknown legacy
// values remain visible instead of being silently relabeled as WFO.
func attendanceTypeLabel(record models.AttendanceRecord) string {
	switch attendanceCanonicalType(record) {
	case models.WorkTypeWFO:
		return "WFO"
	case models.WorkTypeWFH:
		return "WFH"
	case models.WorkTypeAlternative:
		return "Lokasi Alternatif"
	case models.WorkTypeField:
		return "Lokasi Lapangan"
	}
	legacy := strings.TrimSpace(record.TipeKerja)
	if legacy == "" {
		return "WFO"
	}
	return legacy
}

// decorateAttendanceRecordPresentation adds read-only presentation fields to
// the existing attendance model. Snapshot fields are used deliberately: an
// inactive/deleted location must remain readable in history without joining a
// current master or exposing another user's alternative-location records.
func decorateAttendanceRecordPresentation(record *models.AttendanceRecord) {
	if record == nil {
		return
	}
	canonical := attendanceCanonicalType(*record)
	record.TipeKerjaCanonical = canonical
	record.TipeKerjaLabel = attendanceTypeLabel(*record)
	record.LocationName = strings.TrimSpace(record.LocationNameSnapshot)
	record.LocationAddress = strings.TrimSpace(record.LocationAddressSnapshot)
	if record.LocationLatitudeSnapshot != nil {
		value := *record.LocationLatitudeSnapshot
		record.LocationLatitude = &value
	}
	if record.LocationLongitudeSnapshot != nil {
		value := *record.LocationLongitudeSnapshot
		record.LocationLongitude = &value
	}
	if record.LocationLatitude == nil && record.LatitudeMasuk != 0 {
		value := record.LatitudeMasuk
		record.LocationLatitude = &value
	}
	if record.LocationLongitude == nil && record.LongitudeMasuk != 0 {
		value := record.LongitudeMasuk
		record.LocationLongitude = &value
	}
}

func decorateAttendanceRecords(records []models.AttendanceRecord) {
	for index := range records {
		decorateAttendanceRecordPresentation(&records[index])
	}
}

func attendanceLocationSummary(record models.AttendanceRecord) attendanceLocationPresentation {
	result := attendanceLocationPresentation{
		Name:    strings.TrimSpace(record.LocationNameSnapshot),
		Address: strings.TrimSpace(record.LocationAddressSnapshot),
	}
	if record.LocationLatitudeSnapshot != nil && record.LocationLongitudeSnapshot != nil {
		result.Coordinates = fmt.Sprintf("%.6f, %.6f", *record.LocationLatitudeSnapshot, *record.LocationLongitudeSnapshot)
	} else if record.LatitudeMasuk != 0 && record.LongitudeMasuk != 0 {
		result.Coordinates = fmt.Sprintf("%.6f, %.6f", record.LatitudeMasuk, record.LongitudeMasuk)
	}
	return result
}
