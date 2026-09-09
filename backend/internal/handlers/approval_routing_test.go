package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
)

func approvalTestUser(id uint, role models.Role, status string) models.User {
	return models.User{Model: models.Model{ID: id}, Role: role, Status: status}
}

func TestValidDirectManagerCandidate(t *testing.T) {
	cases := []struct {
		name string
		user models.User
		want bool
	}{
		{"manager aktif", approvalTestUser(20, models.RoleManajer, "aktif"), true},
		{"HRD aktif", approvalTestUser(20, models.RoleHRD, "aktif"), true},
		{"role tidak valid", approvalTestUser(20, models.RoleKaryawan, "aktif"), false},
		{"tidak aktif", approvalTestUser(20, models.RoleManajer, "nonaktif"), false},
		{"menunjuk diri sendiri", approvalTestUser(9, models.RoleManajer, "aktif"), false},
		{"ID nol", models.User{Role: models.RoleManajer, Status: "aktif"}, false},
		{"requester sendiri", approvalTestUser(20, models.RoleManajer, "aktif"), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			requester := uint(99)
			if tc.name == "requester sendiri" {
				requester = 20
			}
			if got := validDirectManagerCandidate(tc.user, 9, requester); got != tc.want {
				t.Fatalf("validDirectManagerCandidate() = %t, want %t", got, tc.want)
			}
		})
	}
}

func TestValidDelegationCandidate(t *testing.T) {
	base := approvalTestUser(10, models.RoleManajer, "aktif")
	cases := []struct {
		name                               string
		managerID, delegateID, requesterID uint
		delegate                           models.User
		want                               bool
	}{
		{"manager aktif valid", 9, 10, 99, base, true},
		{"manager ID tidak cocok", 8, 10, 99, base, false},
		{"delegate sama dengan manager", 9, 9, 99, base, false},
		{"delegate role bukan manajer", 9, 10, 99, approvalTestUser(10, models.RoleHRD, "aktif"), false},
		{"delegate tidak aktif", 9, 10, 99, approvalTestUser(10, models.RoleManajer, "nonaktif"), false},
		{"delegate sama dengan requester", 9, 10, 10, base, false},
		{"delegate ID nol", 9, 0, 99, base, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := validDelegationCandidate(tc.managerID, 9, tc.delegateID, tc.requesterID, tc.delegate); got != tc.want {
				t.Fatalf("validDelegationCandidate() = %t, want %t", got, tc.want)
			}
		})
	}
}

func TestDelegationIsActiveOn(t *testing.T) {
	today := dateOnly(time.Now())
	valid := models.ApprovalDelegation{Status: delegationActive, StartDate: today.AddDate(0, 0, -1), EndDate: today.AddDate(0, 0, 1)}
	if !delegationIsActiveOn(valid, today) {
		t.Fatal("active delegation should be selected inside its period")
	}
	for _, candidate := range []models.ApprovalDelegation{
		{Status: delegationCancelled, StartDate: today.AddDate(0, 0, -1), EndDate: today.AddDate(0, 0, 1)},
		{Status: delegationScheduled, StartDate: today.AddDate(0, 0, 1), EndDate: today.AddDate(0, 0, 2)},
		{Status: delegationActive, StartDate: today.AddDate(0, 0, -2), EndDate: today.AddDate(0, 0, -1)},
	} {
		if delegationIsActiveOn(candidate, today) {
			t.Fatalf("invalid delegation status/period should not be selected: %+v", candidate)
		}
	}
}
