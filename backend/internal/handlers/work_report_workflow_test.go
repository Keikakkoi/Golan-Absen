package handlers

import (
	"testing"

	"absensi-golan-backend/internal/models"
)

func TestWorkReportDecisionStagesStayIndependent(t *testing.T) {
	report := models.WorkReport{
		ManagerReviewStatus:   models.WorkReportDecisionApproved,
		AdminValidationStatus: models.WorkReportDecisionPending,
	}
	if !adminValidationReady(report) {
		t.Fatal("HRD/Admin should be able to validate after Manager approval")
	}
	if effectiveManagerReviewStatus(report) != models.WorkReportDecisionApproved {
		t.Fatal("Manager approval must remain independent from admin pending")
	}

	report.ManagerReviewStatus = models.WorkReportDecisionPending
	if adminValidationReady(report) {
		t.Fatal("HRD/Admin must not validate while Manager review is pending")
	}
}

func TestAdminValidationRequiresManagerApprovalForKaryawan(t *testing.T) {
	employee := models.User{Role: models.RoleKaryawan}
	report := models.WorkReport{
		Employee:              models.Employee{User: &employee},
		ManagerReviewStatus:   models.WorkReportDecisionPending,
		AdminValidationStatus: models.WorkReportDecisionNotRequired,
	}
	if adminValidationReady(report) {
		t.Fatal("HRD/Admin must not validate a Karyawan report before Manager approval")
	}

	report.ManagerReviewStatus = models.WorkReportDecisionApproved
	if !adminValidationReady(report) {
		t.Fatal("HRD/Admin should validate a Karyawan report after Manager approval")
	}
}

func TestRejectedCanonicalReportCanEnterEmployeeRevisionCycle(t *testing.T) {
	report := models.WorkReport{
		ReportKind:          models.WorkReportKindCanonical,
		StatusLaporan:       "submitted",
		ManagerReviewStatus: models.WorkReportDecisionRejected,
		RejectionSource:     "manager",
		StatusSesuai:        "",
		DeskripsiKegiatan:   "Isi laporan",
		RealisasiKegiatan:   "100%",
	}
	if !canUseCanonicalWorkReportMutation(report, string(models.RoleKaryawan), true) {
		t.Fatal("a Manager-rejected report should be editable by its owner")
	}

	report.ManagerReviewStatus = models.WorkReportDecisionApproved
	report.AdminValidationStatus = models.WorkReportDecisionRejected
	report.RejectionSource = "admin"
	report.StatusSesuai = "Tidak Sesuai"
	if !canUseCanonicalWorkReportMutation(report, string(models.RoleKaryawan), true) {
		t.Fatal("an HRD/Admin-rejected report should be editable by its owner")
	}
}

func TestWorkReportReviewEligibilityDoesNotDependOnReportKind(t *testing.T) {
	for _, kind := range []models.WorkReportKind{models.WorkReportKindCanonical, models.WorkReportKindLegacyLogbook} {
		report := models.WorkReport{
			ReportKind:          kind,
			StatusLaporan:       "submitted",
			StatusLogbook:       "submitted",
			ManagerReviewStatus: models.WorkReportDecisionPending,
		}
		if effectiveManagerReviewStatus(report) != models.WorkReportDecisionPending {
			t.Fatalf("%s report should remain reviewable while pending", kind)
		}
		if isWorkReportRevisionSubmission(report, "submitted") {
			t.Fatalf("a first pending %s submission is not a revision", kind)
		}
	}
}

func TestManagerRejectedReportIsRecognizedForResubmission(t *testing.T) {
	report := models.WorkReport{
		StatusLaporan:       "submitted",
		ManagerReviewStatus: models.WorkReportDecisionRejected,
		RejectionSource:     "manager",
	}
	if !isWorkReportRevisionSubmission(report, "submitted") {
		t.Fatal("Manager-rejected reports must return to the appropriate stage on resubmission")
	}
}

func TestManagerReviewPendingConditionUsesExplicitStatus(t *testing.T) {
	condition := managerReviewPendingCondition("work_reports.")
	if condition == "" || !containsString(condition, "manager_review_status") || !containsString(condition, "pending") {
		t.Fatalf("unexpected Manager review predicate: %s", condition)
	}
}

func containsString(value, fragment string) bool {
	for i := 0; i+len(fragment) <= len(value); i++ {
		if value[i:i+len(fragment)] == fragment {
			return true
		}
	}
	return false
}
