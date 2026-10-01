package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
)

func TestNormalizeWorkReportStatusDefaultsToSubmitted(t *testing.T) {
	if got := normalizeWorkReportStatus(""); got != "submitted" {
		t.Fatalf("empty status should remain backward-compatible as submitted, got %q", got)
	}
	if got := normalizeWorkReportStatus("draft"); got != "draft" {
		t.Fatalf("draft status was normalized to %q", got)
	}
	if got := normalizeWorkReportStatus("unexpected"); got != "submitted" {
		t.Fatalf("unexpected status should be submitted, got %q", got)
	}
}

func TestNormalizeAdminValidationStatusRetiresImprovement(t *testing.T) {
	for _, status := range []string{"Minta Perbaikan", " minta_perbaikan ", "MINTA PERBAIKAN"} {
		if got := normalizeAdminValidationStatus(status); got != "Tidak Sesuai" {
			t.Fatalf("legacy status %q should normalize to Tidak Sesuai, got %q", status, got)
		}
	}
	if got := normalizeAdminValidationStatus("Sesuai"); got != "Sesuai" {
		t.Fatalf("Sesuai must remain unchanged, got %q", got)
	}
}

func TestCanModifyInternshipLogbookOnlyAllowsDraft(t *testing.T) {
	for _, status := range []string{"draft", " Draft ", "DRAFT"} {
		if !canModifyInternshipLogbook(status) {
			t.Fatalf("status %q should be editable/deletable", status)
		}
	}
	for _, status := range []string{"", "submitted", "approved", "rejected", " Rejected "} {
		if canModifyInternshipLogbook(status) {
			t.Fatalf("status %q must not be editable/deletable", status)
		}
	}
}

func TestWorkReportStatusMapExcludesDraftAndMissingMarkers(t *testing.T) {
	date := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	employeeID := uint(7)
	reports := []models.WorkReport{
		{EmployeeID: &employeeID, Tanggal: date, StatusLaporan: "draft"},
		{EmployeeID: &employeeID, Tanggal: date.AddDate(0, 0, 1), StatusLaporan: "submitted", StatusLogbook: "DRAFT"},
		{EmployeeID: &employeeID, Tanggal: date.AddDate(0, 0, 2), StatusLaporan: "submitted", StatusSesuai: "tidak membuat laporan kerja"},
		{EmployeeID: &employeeID, Tanggal: date.AddDate(0, 0, 3), StatusLaporan: "submitted"},
	}

	status := workReportStatusMap(reports)
	if status["7_2026-10-01"] {
		t.Fatal("draft must not count as submitted compliance")
	}
	if status["7_2026-10-02"] {
		t.Fatal("logbook draft must not count as submitted compliance")
	}
	if status["7_2026-10-03"] {
		t.Fatal("automatic missing marker must not count as submitted compliance")
	}
	if !status["7_2026-10-04"] {
		t.Fatal("submitted report should count as submitted compliance")
	}

	compliance := workReportComplianceStatusMap(reports)
	if compliance["7_2026-10-01"] != "draft" {
		t.Fatalf("draft compliance state was %q", compliance["7_2026-10-01"])
	}
	if compliance["7_2026-10-02"] != "draft" {
		t.Fatalf("logbook draft compliance state was %q", compliance["7_2026-10-02"])
	}
	if compliance["7_2026-10-03"] != "missing" {
		t.Fatalf("missing marker compliance state was %q", compliance["7_2026-10-02"])
	}
	if compliance["7_2026-10-04"] != "submitted" {
		t.Fatalf("submitted compliance state was %q", compliance["7_2026-10-04"])
	}
}
