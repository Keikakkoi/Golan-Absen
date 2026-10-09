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

func TestWorkReportSubmissionStages(t *testing.T) {
	tests := []struct {
		name       string
		role       models.Role
		hasManager bool
		rejectedBy string
		revision   bool
		manager    models.WorkReportReviewDecision
		admin      models.WorkReportReviewDecision
		wantErr    bool
	}{
		{name: "new Karyawan with Manager", role: models.RoleKaryawan, hasManager: true, manager: models.WorkReportDecisionPending, admin: models.WorkReportDecisionNotRequired},
		{name: "new MAGANG with Manager", role: models.RoleMagang, hasManager: true, manager: models.WorkReportDecisionPending, admin: models.WorkReportDecisionNotRequired},
		{name: "Manager rejection resubmission", role: models.RoleKaryawan, hasManager: true, rejectedBy: "manager", revision: true, manager: models.WorkReportDecisionPending, admin: models.WorkReportDecisionNotRequired},
		{name: "HRD rejection resubmission", role: models.RoleKaryawan, hasManager: true, rejectedBy: "admin", revision: true, manager: models.WorkReportDecisionApproved, admin: models.WorkReportDecisionPending},
		{name: "Karyawan without Manager", role: models.RoleKaryawan, wantErr: true},
		{name: "MAGANG without Manager", role: models.RoleMagang, manager: models.WorkReportDecisionNotRequired, admin: models.WorkReportDecisionPending},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			manager, admin, err := workReportSubmissionDecision(models.Employee{User: &models.User{Role: test.role}}, test.hasManager, test.rejectedBy, test.revision)
			if (err != nil) != test.wantErr {
				t.Fatalf("unexpected error: %v", err)
			}
			if test.wantErr {
				return
			}
			if manager != test.manager || admin != test.admin {
				t.Fatalf("submission stages = %s/%s, want %s/%s", manager, admin, test.manager, test.admin)
			}
		})
	}
}

func TestManagerReviewDecisionStages(t *testing.T) {
	manager, admin := managerReviewDecision("approved")
	if manager != models.WorkReportDecisionApproved || admin != models.WorkReportDecisionPending {
		t.Fatalf("approval stages = %s/%s, want approved/pending", manager, admin)
	}
	manager, admin = managerReviewDecision("rejected")
	if manager != models.WorkReportDecisionRejected || admin != models.WorkReportDecisionNotRequired {
		t.Fatalf("rejection stages = %s/%s, want rejected/not_required", manager, admin)
	}
}

func TestNewSubmissionDoesNotHaveManagerReviewAudit(t *testing.T) {
	manager, admin, err := workReportSubmissionDecision(models.Employee{User: &models.User{Role: models.RoleMagang}}, true, "", false)
	if err != nil || manager != models.WorkReportDecisionPending || admin != models.WorkReportDecisionNotRequired {
		t.Fatalf("unexpected new submission workflow: %s/%s, %v", manager, admin, err)
	}
	report := models.WorkReport{ManagerReviewStatus: manager, AdminValidationStatus: admin}
	if report.ManagerReviewedBy != nil || report.ManagerReviewedAt != nil {
		t.Fatal("new submission must not have Manager review audit fields")
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
