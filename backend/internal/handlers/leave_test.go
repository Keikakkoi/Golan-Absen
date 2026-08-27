package handlers

import (
	"strings"
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
	"gorm.io/gorm"
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

func TestManagerCanReceiveLeave(t *testing.T) {
	manager := models.User{Model: gorm.Model{ID: 10}, Role: models.RoleManajer, Status: "aktif"}
	cases := []struct {
		name    string
		user    models.User
		onLeave bool
		want    bool
	}{
		{"aktif dan tidak cuti", manager, false, true},
		{"sedang cuti", manager, true, false},
		{"tidak aktif", models.User{Model: gorm.Model{ID: 10}, Role: models.RoleManajer, Status: "nonaktif"}, false, false},
		{"role lain", models.User{Model: gorm.Model{ID: 10}, Role: models.RoleKaryawan, Status: "aktif"}, false, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := managerCanReceiveLeave(tc.user, tc.onLeave); got != tc.want {
				t.Fatalf("managerCanReceiveLeave() = %t, want %t", got, tc.want)
			}
		})
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

func TestAdminLeaveWorkflowIncludesEmployeesAndInterns(t *testing.T) {
	for _, role := range []models.Role{models.RoleKaryawan, models.RoleMagang, models.RoleManajer} {
		if !isAdminLeaveWorkflowRole(role) {
			t.Fatalf("role %q should be visible in the admin leave workflow", role)
		}
	}
	if isAdminLeaveWorkflowRole(models.RoleHRD) {
		t.Fatal("HRD must not be treated as a leave requester in the admin workflow")
	}
}

func TestRejectionReasonMustNotAcceptWhitespace(t *testing.T) {
	if reason := strings.TrimSpace(" \t\n"); reason != "" {
		t.Fatalf("whitespace-only rejection reason should be empty, got %q", reason)
	}
}

func TestApprovalDelegationMustOverlapLeavePeriod(t *testing.T) {
	leaveStart := time.Date(2026, 8, 20, 0, 0, 0, 0, jakartaLocation)
	leaveEnd := time.Date(2026, 8, 24, 0, 0, 0, 0, jakartaLocation)
	if !periodsOverlap(leaveStart, leaveEnd, time.Date(2026, 8, 24, 0, 0, 0, 0, jakartaLocation), time.Date(2026, 8, 30, 0, 0, 0, 0, jakartaLocation)) {
		t.Fatal("delegation starting on the leave end date must be considered active")
	}
	if periodsOverlap(leaveStart, leaveEnd, time.Date(2026, 8, 25, 0, 0, 0, 0, jakartaLocation), time.Date(2026, 8, 30, 0, 0, 0, 0, jakartaLocation)) {
		t.Fatal("delegation entirely after the leave period must not be selected")
	}
}
