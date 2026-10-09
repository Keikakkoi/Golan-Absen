package middleware

import (
	"net/http/httptest"
	"testing"

	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

func TestRequireRolesRejectsEveryNonAllowedRole(t *testing.T) {
	roles := []models.Role{
		models.RoleMagang,
		models.RoleKaryawan,
		models.RoleManajer,
		models.RoleHRD,
	}

	for _, allowed := range roles {
		for _, current := range roles {
			app := fiber.New()
			app.Get("/role-page", func(c *fiber.Ctx) error {
				c.Locals("role", current)
				return c.Next()
			}, RequireRoles(allowed), func(c *fiber.Ctx) error {
				return c.SendStatus(fiber.StatusNoContent)
			})

			response, err := app.Test(httptest.NewRequest(fiber.MethodGet, "/role-page", nil))
			if err != nil {
				t.Fatalf("allowed=%s current=%s: request failed: %v", allowed, current, err)
			}

			want := fiber.StatusForbidden
			if current == allowed {
				want = fiber.StatusNoContent
			}
			if response.StatusCode != want {
				t.Errorf("allowed=%s current=%s: got status %d, want %d", allowed, current, response.StatusCode, want)
			}
		}
	}
}

func TestRequireRolesKeepsAdminRoleExplicit(t *testing.T) {
	app := fiber.New()
	app.Get("/admin-page", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleHRD)
		return c.Next()
	}, RequireRoles(models.RoleHRD), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	response, err := app.Test(httptest.NewRequest(fiber.MethodGet, "/admin-page", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != fiber.StatusNoContent {
		t.Fatalf("admin role got status %d, want %d", response.StatusCode, fiber.StatusNoContent)
	}
}
