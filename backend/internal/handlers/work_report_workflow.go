package handlers

import (
	"fmt"
	"strings"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"

	"gorm.io/gorm"
)

// workReportManagerIDs is the single routing rule used by submission,
// notification, and review authorization. Direct ManagerID wins; TeamID is
// the established fallback for legacy assignments without a direct manager.
func workReportManagerIDs(employee models.Employee) ([]uint, error) {
	if employee.User == nil {
		return nil, nil
	}
	query := config.DB.Where("role = ? AND status = ?", models.RoleManajer, "aktif")
	if employee.User.ManagerID != nil {
		var manager models.User
		if err := query.Where("id = ?", *employee.User.ManagerID).First(&manager).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return []uint{}, nil
			}
			return nil, err
		}
		return []uint{manager.ID}, nil
	}
	teamID := strings.TrimSpace(employee.User.TeamID)
	if teamID == "" {
		return []uint{}, nil
	}
	var managers []models.User
	if err := query.Where("team_id = ?", teamID).Find(&managers).Error; err != nil {
		return nil, err
	}
	ids := make([]uint, 0, len(managers))
	for _, manager := range managers {
		if manager.ID != employee.User.ID {
			ids = append(ids, manager.ID)
		}
	}
	return ids, nil
}

func workReportHasManager(employee models.Employee) (bool, error) {
	ids, err := workReportManagerIDs(employee)
	return len(ids) > 0, err
}

func workReportSubmissionDecision(employee models.Employee, hasManager bool, rejectedBy string, isRevision bool) (models.WorkReportReviewDecision, models.WorkReportReviewDecision, error) {
	if employee.User != nil && employee.User.Role == models.RoleKaryawan && !hasManager {
		return "", "", fmt.Errorf("Karyawan belum memiliki Manager aktif")
	}
	if !hasManager {
		return models.WorkReportDecisionNotRequired, models.WorkReportDecisionPending, nil
	}
	if !isRevision {
		return models.WorkReportDecisionPending, models.WorkReportDecisionNotRequired, nil
	}
	// A Manager rejection must pass through the Manager again. An HRD/Admin
	// rejection preserves the already-approved Manager stage and returns to the
	// HRD/Admin queue after the employee resubmits.
	if strings.EqualFold(strings.TrimSpace(rejectedBy), "manager") {
		return models.WorkReportDecisionPending, models.WorkReportDecisionNotRequired, nil
	}
	return models.WorkReportDecisionApproved, models.WorkReportDecisionPending, nil
}

// workReportSubmissionWorkflow returns the active stage for a submission.
// A first submission always starts in the Manager queue when an active
// Manager exists. Only a resubmission after an explicit HRD/Admin rejection
// may skip that queue; Manager approval is written by ReviewManagerWorkReport,
// never while the employee is submitting the report.
func workReportSubmissionWorkflow(employee models.Employee, rejectedBy string, isRevision bool) (models.WorkReportReviewDecision, models.WorkReportReviewDecision, error) {
	hasManager, err := workReportHasManager(employee)
	if err != nil {
		return "", "", err
	}
	return workReportSubmissionDecision(employee, hasManager, rejectedBy, isRevision)
}

func managerReviewDecision(status string) (models.WorkReportReviewDecision, models.WorkReportReviewDecision) {
	if status == "rejected" {
		return models.WorkReportDecisionRejected, models.WorkReportDecisionNotRequired
	}
	return models.WorkReportDecisionApproved, models.WorkReportDecisionPending
}

func effectiveManagerReviewStatus(report models.WorkReport) models.WorkReportReviewDecision {
	if report.ManagerReviewStatus != "" {
		return report.ManagerReviewStatus
	}
	if report.ReportKind == models.WorkReportKindLegacyLogbook {
		switch strings.ToLower(strings.TrimSpace(report.StatusLogbook)) {
		case "approved":
			return models.WorkReportDecisionApproved
		case "rejected":
			return models.WorkReportDecisionRejected
		case "submitted":
			return models.WorkReportDecisionPending
		}
	}
	return models.WorkReportDecisionNotRequired
}

func effectiveAdminValidationStatus(report models.WorkReport) models.WorkReportReviewDecision {
	if report.AdminValidationStatus != "" {
		return report.AdminValidationStatus
	}
	switch strings.ToLower(strings.TrimSpace(report.StatusSesuai)) {
	case "sesuai":
		return models.WorkReportDecisionApproved
	case "tidak sesuai", "ditolak", "minta perbaikan", "minta_perbaikan":
		return models.WorkReportDecisionRejected
	default:
		return models.WorkReportDecisionNotRequired
	}
}

func managerReviewPendingCondition(prefix string) string {
	return "LOWER(COALESCE(NULLIF(BTRIM(" + prefix + "manager_review_status), ''), 'not_required')) = 'pending'"
}

func adminValidationReady(report models.WorkReport) bool {
	status := effectiveManagerReviewStatus(report)
	if status == models.WorkReportDecisionApproved {
		return true
	}
	// A Karyawan report always has the Manager stage. Keep the historical
	// not_required fallback only for Manager/Magang compatibility rows that
	// predate explicit routing; it must never open a new Karyawan report to HRD.
	if status != models.WorkReportDecisionNotRequired {
		return false
	}
	if report.Employee.User != nil && report.Employee.User.Role == models.RoleKaryawan {
		return false
	}
	return true
}
