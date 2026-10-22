package services

import (
	"testing"

	"absensi-golan-backend/internal/models"
)

func TestRoleCodeMapping(t *testing.T) {
	tests := []struct {
		role models.Role
		want string
	}{
		{models.RoleMagang, "01"},
		{models.RoleKaryawan, "02"},
		{models.RoleManajer, "03"},
		{models.RoleHRD, "04"},
	}
	for _, test := range tests {
		if got := RoleCode(test.role); got != test.want {
			t.Errorf("role %q: code = %q, want %q", test.role, got, test.want)
		}
	}
}

func TestRoleCodeUsesFallbackForUnknownRole(t *testing.T) {
	if got := RoleCode(models.Role("unknown")); got != "00" {
		t.Fatalf("unknown role code = %q, want 00", got)
	}
}
