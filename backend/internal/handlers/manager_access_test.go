package handlers

import (
	"net/http/httptest"
	"testing"

	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
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

func TestCanReviewManagerWorkReport(t *testing.T) {
	tests := []struct {
		name string
		role models.Role
		want bool
	}{
		{name: "manager", role: models.RoleManajer, want: true},
		{name: "hrd admin", role: models.RoleHRD, want: false},
		{name: "employee", role: models.RoleKaryawan, want: false},
		{name: "intern", role: models.RoleMagang, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := canReviewManagerWorkReport(test.role); got != test.want {
				t.Fatalf("canReviewManagerWorkReport(%q) = %t, want %t", test.role, got, test.want)
			}
		})
	}
}

func TestCanApproveManagerLeave(t *testing.T) {
	tests := []struct {
		name string
		role models.Role
		want bool
	}{
		{name: "manager", role: models.RoleManajer, want: true},
		{name: "hrd admin monitoring only", role: models.RoleHRD, want: false},
		{name: "employee", role: models.RoleKaryawan, want: false},
		{name: "intern", role: models.RoleMagang, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := canApproveManagerLeave(test.role); got != test.want {
				t.Fatalf("canApproveManagerLeave(%q) = %t, want %t", test.role, got, test.want)
			}
		})
	}
}

func TestApproveManagerLeaveEndpointRejectsHRD(t *testing.T) {
	app := fiber.New()
	app.Put("/manager/leaves/:id/approve", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleHRD)
		c.Locals("user_id", uint(99))
		return ApproveManagerLeaveRequest(c)
	})

	response, err := app.Test(httptest.NewRequest("PUT", "/manager/leaves/123/approve", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != fiber.StatusForbidden {
		t.Fatalf("HRD operational leave approval status = %d, want %d", response.StatusCode, fiber.StatusForbidden)
	}
}

func TestOperationalLeaveNoteEndpointRejectsHRD(t *testing.T) {
	app := fiber.New()
	app.Put("/manager/leaves/:id/note", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleHRD)
		c.Locals("user_id", uint(99))
		return SaveManagerLeaveNote(c)
	})

	response, err := app.Test(httptest.NewRequest("PUT", "/manager/leaves/123/note", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != fiber.StatusForbidden {
		t.Fatalf("HRD operational leave note status = %d, want %d", response.StatusCode, fiber.StatusForbidden)
	}
}
