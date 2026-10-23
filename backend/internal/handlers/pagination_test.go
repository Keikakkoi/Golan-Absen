package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestReadPaginationNormalizesInvalidValuesAndCapsLimit(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(readPagination(c))
	})

	request := httptest.NewRequest("GET", "/?page=-2&limit=1000", nil)
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	var got paginationParams
	if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Page != 1 || got.Limit != 100 || got.Offset != 0 {
		t.Fatalf("unexpected normalized pagination: %+v", got)
	}
}

func TestReadPaginationCalculatesOffset(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(readPagination(c))
	})

	response, err := app.Test(httptest.NewRequest("GET", "/?page=3&limit=25", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	var got paginationParams
	if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got.Page != 3 || got.Limit != 25 || got.Offset != 50 {
		t.Fatalf("unexpected pagination offset: %+v", got)
	}
}
