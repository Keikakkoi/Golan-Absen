package handlers

import (
	"testing"

	"absensi-golan-backend/internal/models"
)

func TestHasManagerOperationsAccess(t *testing.T) {
	tests := []struct {
		name string
		role models.Role
		want bool
	}{
		{name: "manager", role: models.RoleManajer, want: true},
		{name: "hrd admin account", role: models.RoleHRD, want: true},
		{name: "employee", role: models.RoleKaryawan, want: false},
		{name: "intern", role: models.RoleMagang, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := hasManagerOperationsAccess(test.role); got != test.want {
				t.Fatalf("hasManagerOperationsAccess(%q) = %t, want %t", test.role, got, test.want)
			}
		})
	}
}
