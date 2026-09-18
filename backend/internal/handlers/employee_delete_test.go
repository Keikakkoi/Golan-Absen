package handlers

import (
	"net/http/httptest"
	"testing"

	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

func TestDeleteEmployeeRequiresHRD(t *testing.T) {
	app := fiber.New()
	app.Delete("/employees/:id", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleKaryawan)
		return DeleteEmployee(c)
	})

	response, err := app.Test(httptest.NewRequest("DELETE", "/employees/12", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusForbidden {
		t.Fatalf("non-HRD delete status: got %d, want %d", response.StatusCode, fiber.StatusForbidden)
	}
}

func TestDeleteEmployeeRejectsInvalidUserID(t *testing.T) {
	app := fiber.New()
	app.Delete("/employees/:id", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleHRD)
		return DeleteEmployee(c)
	})

	for _, id := range []string{"0", "employee-id", "-1"} {
		response, err := app.Test(httptest.NewRequest("DELETE", "/employees/"+id, nil))
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != fiber.StatusBadRequest {
			t.Fatalf("invalid user id %q: got %d, want %d", id, response.StatusCode, fiber.StatusBadRequest)
		}
	}
}
