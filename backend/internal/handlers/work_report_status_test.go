package handlers

import (
	"strings"
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

func TestIsAdminRejectedWorkReportOnlyMatchesAdminRejection(t *testing.T) {
	cases := []struct {
		name     string
		report   models.WorkReport
		rejected bool
	}{
		{name: "admin rejected", report: models.WorkReport{StatusLaporan: "submitted", StatusSesuai: "Tidak Sesuai", RejectionSource: "admin"}, rejected: true},
		{name: "admin rejected legacy label", report: models.WorkReport{StatusLaporan: "draft", StatusSesuai: "Minta Perbaikan", RejectionSource: "ADMIN"}, rejected: true},
		{name: "manager rejected", report: models.WorkReport{StatusLaporan: "submitted", StatusSesuai: "Tidak Sesuai", RejectionSource: "manager"}, rejected: false},
		{name: "pending", report: models.WorkReport{StatusLaporan: "submitted", StatusSesuai: "", RejectionSource: ""}, rejected: false},
	}

	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			if got := isAdminRejectedWorkReport(test.report); got != test.rejected {
				t.Fatalf("isAdminRejectedWorkReport() = %v, want %v", got, test.rejected)
			}
		})
	}
}

func TestWorkReportRevisionSubmissionRequiresRejectedPreviousState(t *testing.T) {
	rejectedAt := time.Date(2026, 10, 3, 10, 0, 0, 0, jakartaLocation)
	adminRejected := models.WorkReport{StatusLaporan: "submitted", StatusSesuai: "Tidak Sesuai", AdminValidationStatus: models.WorkReportDecisionRejected, RejectionSource: "admin", RejectedAt: &rejectedAt}
	if !isWorkReportRevisionSubmission(adminRejected, "submitted") {
		t.Fatal("an admin-rejected report submitted again should be a revision")
	}
	if isWorkReportRevisionSubmission(adminRejected, "draft") {
		t.Fatal("saving an admin-rejected report as draft must not notify a revision")
	}
	if isWorkReportRevisionSubmission(models.WorkReport{StatusLaporan: "submitted", StatusSesuai: "", RejectionSource: ""}, "submitted") {
		t.Fatal("the first submission must not be treated as a revision")
	}
}

func TestWorkReportRevisionDeadlineUsesRejectionTimestampToTheSecond(t *testing.T) {
	rejectedAt := time.Date(2026, 10, 3, 23, 59, 59, 123000000, jakartaLocation)
	report := models.WorkReport{
		StatusLaporan:       "submitted",
		ManagerReviewStatus: models.WorkReportDecisionRejected,
		RejectionSource:     "manager",
		RejectedAt:          &rejectedAt,
	}
	deadline := rejectedAt.Add(24 * time.Hour)
	if got := workReportRevisionDeadline(report.RejectedAt); got == nil || !got.Equal(deadline) {
		t.Fatalf("deadline = %v, want %v", got, deadline)
	}
	if !isWorkReportRevisionAllowed(report, deadline) {
		t.Fatal("revision must be allowed exactly at rejected_at + 24 hours")
	}
	if isWorkReportRevisionAllowed(report, deadline.Add(time.Nanosecond)) {
		t.Fatal("revision must be rejected after the exact deadline")
	}
	// The report date is irrelevant: a rejection shortly before midnight may
	// still be revised on the following Jakarta date.
	if !isWorkReportRevisionAllowed(report, rejectedAt.Add(23*time.Hour)) {
		t.Fatal("revision must not be restricted to the report date")
	}
}

func TestWorkReportRevisionErrorUsesJakartaDeadline(t *testing.T) {
	rejectedAt := time.Date(2026, 10, 1, 15, 4, 5, 0, jakartaLocation)
	errorText := workReportRevisionError(models.WorkReport{RejectedAt: &rejectedAt, AdminValidationStatus: models.WorkReportDecisionRejected})
	if !strings.Contains(errorText, "Batas revisi laporan") || !strings.Contains(errorText, "02-10-2026 15:04:05") {
		t.Fatalf("revision error is not actionable: %q", errorText)
	}
}

func TestRevisionPendingKeepsDraftInsideTheSameDeadlineCycle(t *testing.T) {
	rejectedAt := time.Now().Add(-time.Hour)
	report := models.WorkReport{
		StatusLaporan:   "draft",
		RejectedAt:      &rejectedAt,
		RevisionPending: true,
		RejectionSource: "manager",
	}
	if !isWorkReportRevisionState(report) || !isWorkReportRevisionAllowed(report, time.Now()) {
		t.Fatal("a rejected report saved as draft must remain in its active revision cycle")
	}
	report.RevisionPending = false
	if isWorkReportRevisionState(report) {
		t.Fatal("a resubmitted report must leave the active revision cycle")
	}
}

func TestLegacyRevisionBypassesExpiredAttendanceFillingDeadline(t *testing.T) {
	rejectedAt := time.Now().Add(-time.Hour)
	report := models.WorkReport{
		ReportKind:            models.WorkReportKindLegacyLogbook,
		StatusLogbook:         "submitted",
		StatusLaporan:         "submitted",
		AdminValidationStatus: models.WorkReportDecisionRejected,
		StatusSesuai:          "Tidak Sesuai",
		RejectionSource:       "admin",
		RejectedAt:            &rejectedAt,
		DeskripsiKegiatan:     "Isi laporan revisi",
	}
	// The date is deliberately arbitrary/old. An active revision is governed
	// by rejected_at, so this must not query or enforce the attendance deadline.
	if err := validateWorkReportSubmissionForReport(999999, time.Date(2020, 1, 1, 0, 0, 0, 0, jakartaLocation), time.Now(), &report); err != nil {
		t.Fatalf("legacy revision should bypass the expired attendance filling deadline: %v", err)
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
	if got := normalizeAdminValidationStatus("status lain"); got != "" {
		t.Fatalf("unknown admin status must be rejected, got %q", got)
	}
}

func TestAdminValidationStatusUpdatesKeepCanonicalAndLegacyFieldsInSync(t *testing.T) {
	legacy := models.WorkReport{ReportKind: models.WorkReportKindLegacyLogbook, StatusLogbook: "submitted"}
	for _, test := range []struct {
		status      string
		legacyValue string
	}{
		{status: "Tidak Sesuai", legacyValue: "rejected"},
		{status: "Sesuai", legacyValue: "approved"},
	} {
		updates := adminValidationStatusUpdates(legacy, test.status)
		if updates["status_sesuai"] != test.status || updates["status_logbook"] != test.legacyValue || updates["validasi_oleh_hr"] != true {
			t.Fatalf("status %q did not synchronize both workflow fields: %#v", test.status, updates)
		}
	}

	canonical := adminValidationStatusUpdates(models.WorkReport{ReportKind: models.WorkReportKindCanonical}, "Sesuai")
	if _, exists := canonical["status_logbook"]; exists {
		t.Fatalf("canonical reports must not be assigned a legacy status: %#v", canonical)
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
		{EmployeeID: &employeeID, Tanggal: date, StatusLaporan: "draft", DeskripsiKegiatan: "Draft"},
		{EmployeeID: &employeeID, Tanggal: date.AddDate(0, 0, 1), StatusLaporan: "submitted", StatusLogbook: "DRAFT", DeskripsiKegiatan: "Draft legacy", Employee: models.Employee{User: &models.User{Role: models.RoleMagang}}},
		{EmployeeID: &employeeID, Tanggal: date.AddDate(0, 0, 2), StatusLaporan: "submitted", StatusSesuai: "tidak membuat laporan kerja"},
		{EmployeeID: &employeeID, Tanggal: date.AddDate(0, 0, 3), StatusLaporan: "submitted", DeskripsiKegiatan: "Submitted"},
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
	if compliance["7_2026-10-03"] != "no_report" {
		t.Fatalf("missing marker compliance state was %q", compliance["7_2026-10-02"])
	}
	if compliance["7_2026-10-04"] != "submitted" {
		t.Fatalf("submitted compliance state was %q", compliance["7_2026-10-04"])
	}
}

func TestWorkReportOwnerScopeNeverAllowsMissingOrDifferentEmployee(t *testing.T) {
	owner := uint(11)
	other := uint(12)
	if !ownsWorkReport(&owner, owner) {
		t.Fatal("the report owner should be authorized")
	}
	if ownsWorkReport(&owner, other) || ownsWorkReport(nil, owner) || ownsWorkReport(&owner, 0) {
		t.Fatal("missing or different employee identity must not pass ownership authorization")
	}
}

func TestOnlyKaryawanAndMagangCanSubmitRevisions(t *testing.T) {
	for _, role := range []models.Role{models.RoleKaryawan, models.RoleMagang} {
		if !isWorkReportRevisionOwnerRole(role) {
			t.Fatalf("role %q should be allowed to revise its own report", role)
		}
	}
	for _, role := range []models.Role{models.RoleManajer, models.RoleHRD} {
		if isWorkReportRevisionOwnerRole(role) {
			t.Fatalf("role %q must not be allowed to submit an employee revision", role)
		}
	}
}

func TestWorkReportDraftContractUsesDiscriminator(t *testing.T) {
	if !isWorkReportDraft(models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "draft", StatusLogbook: "submitted", DeskripsiKegiatan: "Draft"}) {
		t.Fatal("canonical draft must be recognized from status_laporan")
	}
	if !isWorkReportDraft(models.WorkReport{ReportKind: models.WorkReportKindLegacyLogbook, StatusLaporan: "submitted", StatusLogbook: "draft", DeskripsiKegiatan: "Draft"}) {
		t.Fatal("legacy draft must be recognized from status_logbook")
	}
	if isWorkReportDraft(models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "submitted", StatusLogbook: "draft", DeskripsiKegiatan: "Submitted"}) {
		t.Fatal("canonical submitted report must not inherit legacy draft status")
	}
}

func TestCanonicalMutationAuthorizationRecoversOnlyOwnedMagangDraft(t *testing.T) {
	legacyDraft := models.WorkReport{
		ReportKind:    models.WorkReportKindLegacyLogbook,
		StatusLogbook: "draft",
		Tugas:         "Isi legacy tetap ada",
		Judul:         "Judul legacy tetap ada",
	}
	cases := []struct {
		name    string
		report  models.WorkReport
		role    string
		owns    bool
		allowed bool
	}{
		{name: "owner magang draft", report: legacyDraft, role: string(models.RoleMagang), owns: true, allowed: true},
		{name: "different owner", report: legacyDraft, role: string(models.RoleMagang), owns: false, allowed: false},
		{name: "manager cannot repair", report: legacyDraft, role: string(models.RoleManajer), owns: true, allowed: false},
		{name: "hrd cannot mutate legacy through canonical endpoint", report: legacyDraft, role: string(models.RoleHRD), owns: false, allowed: false},
		{name: "submitted legacy is read only", report: models.WorkReport{ReportKind: models.WorkReportKindLegacyLogbook, StatusLogbook: "submitted"}, role: string(models.RoleMagang), owns: true, allowed: false},
		{name: "approved legacy is read only", report: models.WorkReport{ReportKind: models.WorkReportKindLegacyLogbook, StatusLogbook: "approved"}, role: string(models.RoleMagang), owns: true, allowed: false},
		{name: "rejected legacy is read only", report: models.WorkReport{ReportKind: models.WorkReportKindLegacyLogbook, StatusLogbook: "rejected"}, role: string(models.RoleMagang), owns: true, allowed: false},
		{name: "reviewed draft is not recoverable", report: func() models.WorkReport {
			reviewed := legacyDraft
			reviewed.ReviewNotes = "Sudah direview"
			return reviewed
		}(), role: string(models.RoleMagang), owns: true, allowed: false},
		{name: "missing marker is not recoverable", report: func() models.WorkReport {
			marked := legacyDraft
			marked.StatusSesuai = "tidak membuat laporan kerja"
			return marked
		}(), role: string(models.RoleMagang), owns: true, allowed: false},
		{name: "empty canonical no-report is not mutable", report: models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "submitted"}, role: string(models.RoleMagang), owns: true, allowed: false},
		{name: "canonical draft remains editable", report: models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "draft", DeskripsiKegiatan: "Draft"}, role: string(models.RoleMagang), owns: true, allowed: true},
	}

	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			if got := canUseCanonicalWorkReportMutation(test.report, test.role, test.owns); got != test.allowed {
				t.Fatalf("canonical mutation authorization = %v, want %v", got, test.allowed)
			}
			if got := isRecoverableLegacyDraft(test.report, test.role, test.owns); got != (test.name == "owner magang draft") {
				t.Fatalf("legacy draft recovery = %v for %s", got, test.name)
			}
		})
	}
}

func TestLegacyDraftRecoveryLeavesHistoricalFieldsUntouched(t *testing.T) {
	report := models.WorkReport{
		ReportKind:           models.WorkReportKindLegacyLogbook,
		StatusLogbook:        "draft",
		StatusLaporan:        "submitted",
		Tugas:                "Tugas lama",
		Judul:                "Judul lama",
		EmployeeNameSnapshot: "Peserta Magang",
		CustomFields:         `{"legacy":"kept"}`,
	}
	if !isRecoverableLegacyDraft(report, string(models.RoleMagang), true) {
		t.Fatal("fixture should qualify for repair-on-write")
	}
	if report.ReportKind != models.WorkReportKindLegacyLogbook || report.StatusLogbook != "draft" || report.Tugas != "Tugas lama" || report.Judul != "Judul lama" || report.CustomFields != `{"legacy":"kept"}` {
		t.Fatalf("recovery eligibility must not mutate historical fields: %#v", report)
	}
}

func TestAdminWorkReportStatusVocabulary(t *testing.T) {
	for _, status := range []string{"draft", "submitted", "approved", "rejected"} {
		if !isValidAdminWorkReportStatus(status) {
			t.Fatalf("expected admin status %q to be accepted", status)
		}
	}
	if isValidAdminWorkReportStatus("pending") {
		t.Fatal("pending is a review status, not an admin work-report filter status")
	}
}

func TestAdminPendingConditionUsesCanonicalAndLegacyStatuses(t *testing.T) {
	condition := workReportPendingCondition("work_reports.")
	for _, field := range []string{"report_kind", "status_logbook", "status_laporan", "status_sesuai"} {
		if !strings.Contains(condition, field) {
			t.Fatalf("pending condition must include compatibility field %q: %s", field, condition)
		}
	}
	if !strings.Contains(condition, "'legacy_logbook'") || !strings.Contains(condition, "'submitted'") {
		t.Fatalf("pending condition must map legacy rows and submitted reports: %s", condition)
	}
	if !strings.Contains(condition, "'sesuai'") || !strings.Contains(condition, "'tidak sesuai'") {
		t.Fatalf("pending condition must exclude reviewed reports: %s", condition)
	}
	if !strings.Contains(condition, "status_sesuai") || !strings.Contains(condition, "judul_tugas") {
		t.Fatalf("pending condition must exclude marker and empty rows: %s", condition)
	}
}

func TestWorkReportChartContractUsesCanonicalWorkflowBuckets(t *testing.T) {
	labels := workReportChartLabels(false)
	wantLabels := []string{models.WorkReportNoReportLabel, "Menunggu Review", "Disetujui", "Ditolak"}
	if strings.Join(labels, "|") != strings.Join(wantLabels, "|") {
		t.Fatalf("active chart labels = %v, want %v", labels, wantLabels)
	}

	empty := models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "submitted"}
	cases := []struct {
		name   string
		report models.WorkReport
		status models.WorkReportWorkflowStatus
	}{
		{name: "user without report", report: empty, status: models.WorkReportStatusNoReport},
		{name: "draft", report: models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "draft", DeskripsiKegiatan: "Draft"}, status: models.WorkReportStatusDraft},
		{name: "submitted", report: models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "submitted", DeskripsiKegiatan: "Submitted"}, status: models.WorkReportStatusSubmitted},
		{name: "approved", report: models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "submitted", StatusSesuai: "Sesuai", DeskripsiKegiatan: "Approved"}, status: models.WorkReportStatusApproved},
		{name: "rejected", report: models.WorkReport{ReportKind: models.WorkReportKindCanonical, StatusLaporan: "submitted", StatusSesuai: "Tidak Sesuai", DeskripsiKegiatan: "Rejected"}, status: models.WorkReportStatusRejected},
		{name: "legacy marker", report: models.WorkReport{ReportKind: models.WorkReportKindLegacyLogbook, StatusLogbook: "submitted", StatusSesuai: models.WorkReportNoReportMarker}, status: models.WorkReportStatusNoReport},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			if got := models.CanonicalWorkReportStatus(test.report); got != test.status {
				t.Fatalf("canonical status = %q, want %q", got, test.status)
			}
		})
	}
}

func TestWorkReportTitleUpdatesKeepLegacyFieldsUntouchedForCanonicalPayload(t *testing.T) {
	updates := workReportTitleUpdates(workReportInput{
		JudulTugas:             "Judul Tugas baru",
		CanonicalTitleProvided: true,
	})
	if len(updates) != 1 || updates["judul_tugas"] != "Judul Tugas baru" {
		t.Fatalf("canonical title update must only write judul_tugas: %#v", updates)
	}
}

func TestWorkReportTitleUpdatesSupportLegacyPayload(t *testing.T) {
	updates := workReportTitleUpdates(workReportInput{
		Judul:                     "Judul lama",
		Tugas:                     "Tugas lama",
		JudulTugas:                "Judul lama — Tugas lama",
		LegacyTitleFieldsProvided: true,
	})
	if updates["judul"] != "Judul lama" || updates["tugas"] != "Tugas lama" || updates["judul_tugas"] != "Judul lama — Tugas lama" {
		t.Fatalf("legacy payload should write all compatible title fields: %#v", updates)
	}
	if got := workReportTitleUpdates(workReportInput{AdminNotes: stringPtrForTest("note")}); got != nil {
		t.Fatalf("metadata-only update must not touch title fields: %#v", got)
	}
}

func stringPtrForTest(value string) *string { return &value }
