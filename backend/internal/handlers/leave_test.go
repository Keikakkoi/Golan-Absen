package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
)

func TestLeaveQuotaTypes(t *testing.T) {
	if !consumesAnnualLeaveQuota(models.LeaveTypeCuti) {
		t.Fatal("Cuti must consume quota")
	}
	if !consumesAnnualLeaveQuota(models.LeaveTypeLainnya) {
		t.Fatal("Lainnya must consume quota")
	}
	if consumesAnnualLeaveQuota(models.LeaveTypeSakit) {
		t.Fatal("Sakit must not consume annual quota")
	}
}

func TestCalendarLeaveDaysIsInclusive(t *testing.T) {
	start := time.Date(2026, 8, 20, 0, 0, 0, 0, jakartaLocation)
	end := time.Date(2026, 8, 24, 0, 0, 0, 0, jakartaLocation)
	if got := calendarLeaveDays(start, end); got != 5 {
		t.Fatalf("calendarLeaveDays() = %d, want 5", got)
	}
}

func TestInitialLeaveStatusByRole(t *testing.T) {
	if got := initialLeaveStatus(models.RoleKaryawan); got != models.LeaveStatusPendingManager {
		t.Fatalf("employee request status = %q, want manager approval", got)
	}
	if got := initialLeaveStatus(models.RoleMagang); got != models.LeaveStatusPendingManager {
		t.Fatalf("intern request status = %q, want manager approval", got)
	}
	if got := initialLeaveStatus(models.RoleManajer); got != models.LeaveStatusPendingHRD {
		t.Fatalf("manager request status = %q, want HRD approval", got)
	}
}

func TestManagerCanOnlyProcessPendingManagerApproval(t *testing.T) {
	if !managerCanProcessLeaveStatus(models.LeaveStatusPendingManager) || !managerCanProcessLeaveStatus(models.LeaveStatusPending) {
		t.Fatal("manager should process new and legacy pending manager requests")
	}
	for _, status := range []models.LeaveStatus{models.LeaveStatusManagerApproved, models.LeaveStatusManagerRejected, models.LeaveStatusPendingHRD, models.LeaveStatusHRDApproved} {
		if managerCanProcessLeaveStatus(status) {
			t.Fatalf("manager must not process status %q", status)
		}
	}
}
