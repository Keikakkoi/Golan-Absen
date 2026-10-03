package models

import "testing"

func TestCombineWorkReportTitleTask(t *testing.T) {
	tests := []struct {
		name, judul, tugas, want string
	}{
		{name: "both values", judul: "Judul lama", tugas: "Tugas lama", want: "Judul lama — Tugas lama"},
		{name: "title only", judul: "Judul lama", want: "Judul lama"},
		{name: "task only", tugas: "Tugas lama", want: "Tugas lama"},
		{name: "trim values", judul: " Judul ", tugas: " Tugas ", want: "Judul — Tugas"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := CombineWorkReportTitleTask(test.judul, test.tugas); got != test.want {
				t.Fatalf("CombineWorkReportTitleTask(%q, %q) = %q, want %q", test.judul, test.tugas, got, test.want)
			}
		})
	}
}

func TestNormalizeContractDerivesCanonicalTitleWithoutChangingLegacyFields(t *testing.T) {
	report := WorkReport{Judul: "Judul lama", Tugas: "Tugas lama"}
	report.NormalizeContract()
	if report.JudulTugas != "Judul lama — Tugas lama" {
		t.Fatalf("derived canonical title = %q", report.JudulTugas)
	}
	if report.Judul != "Judul lama" || report.Tugas != "Tugas lama" {
		t.Fatal("legacy title/task fields must remain unchanged")
	}
}

func TestWorkReportContractMapsLegacyLogbookStatus(t *testing.T) {
	report := WorkReport{
		ReportKind:        WorkReportKindLegacyLogbook,
		StatusLogbook:     "approved",
		DeskripsiKegiatan: "Isi historis",
		IsLateSubmission:  true,
	}

	report.NormalizeContract()

	if report.Status != WorkReportStatusApproved || report.ReviewStatus != WorkReportReviewApproved {
		t.Fatalf("legacy approved report mapped to status=%q review=%q", report.Status, report.ReviewStatus)
	}
	if report.FillingStatus != WorkReportFillingSubmitted || report.SubmissionTiming != WorkReportSubmittedLate {
		t.Fatalf("legacy filling/timing mapped to %q/%q", report.FillingStatus, report.SubmissionTiming)
	}
	if report.LegacyStatusLogbook != "approved" {
		t.Fatalf("raw legacy status was not preserved: %q", report.LegacyStatusLogbook)
	}
}

func TestWorkReportContractMapsCanonicalValidationStatus(t *testing.T) {
	report := WorkReport{
		ReportKind:        WorkReportKindCanonical,
		StatusLaporan:     "submitted",
		StatusSesuai:      "Minta Perbaikan",
		DeskripsiKegiatan: "Isi laporan",
	}

	report.NormalizeContract()

	if report.Status != WorkReportStatusRejected || report.ReviewStatus != WorkReportReviewRejected {
		t.Fatalf("canonical improvement request mapped to status=%q review=%q", report.Status, report.ReviewStatus)
	}
	if report.FillingStatus != WorkReportFillingSubmitted {
		t.Fatalf("submitted canonical report mapped to filling status %q", report.FillingStatus)
	}
}

func TestWorkReportContractMapsEmptyHistoricalCanonicalRowToNoReport(t *testing.T) {
	report := WorkReport{ReportKind: WorkReportKindCanonical}
	report.NormalizeContract()

	if report.Status != WorkReportStatusNoReport || report.FillingStatus != WorkReportFillingNoReport || report.ReviewStatus != WorkReportReviewNoReport {
		t.Fatalf("empty historical canonical row mapped to status=%q filling=%q review=%q", report.Status, report.FillingStatus, report.ReviewStatus)
	}
}

func TestWorkReportContractClassifiesUnmigratedInternshipRowWithoutWritingIt(t *testing.T) {
	report := WorkReport{
		Employee:          Employee{User: &User{Role: RoleMagang}},
		StatusLogbook:     "rejected",
		DeskripsiKegiatan: "Isi historis",
	}

	report.NormalizeContract()

	if report.ReportKind != WorkReportKindLegacyLogbook || report.Status != WorkReportStatusRejected {
		t.Fatalf("unmigrated internship row mapped to kind=%q status=%q", report.ReportKind, report.Status)
	}
}

func TestWorkReportNoReportMarkerAlwaysWinsOverWorkflowStatus(t *testing.T) {
	report := WorkReport{ReportKind: WorkReportKindCanonical, StatusLaporan: "submitted", StatusSesuai: WorkReportNoReportMarker, DeskripsiKegiatan: ""}
	report.NormalizeContract()
	if report.Status != WorkReportStatusNoReport || report.FillingStatus != WorkReportFillingNoReport || report.ReviewStatus != WorkReportReviewNoReport {
		t.Fatalf("marker mapped to status=%q filling=%q review=%q", report.Status, report.FillingStatus, report.ReviewStatus)
	}
}

func TestWorkReportNoReportDoesNotReclassifyNonEmptySubmittedReport(t *testing.T) {
	report := WorkReport{ReportKind: WorkReportKindCanonical, StatusLaporan: "submitted", DeskripsiKegiatan: "Isi laporan"}
	if got := CanonicalWorkReportStatus(report); got != WorkReportStatusSubmitted {
		t.Fatalf("non-empty submitted report mapped to %q", got)
	}
}
