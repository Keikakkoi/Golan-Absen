package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// paginationParams contains the normalized pagination values used by the
// handlers that support both paginated and legacy, unpaginated responses.
type paginationParams struct {
	Page   int
	Limit  int
	Offset int
}

func hasPaginationQuery(c *fiber.Ctx) bool {
	args := c.Context().QueryArgs()
	return args.Has("page") || args.Has("limit") || args.Has("per_page") || args.Has("page_size")
}

func readPagination(c *fiber.Ctx) paginationParams {
	page := parsePositiveQuery(c.Query("page"), 1)
	limitValue := c.Query("limit")
	if strings.TrimSpace(limitValue) == "" {
		limitValue = c.Query("per_page")
	}
	if strings.TrimSpace(limitValue) == "" {
		limitValue = c.Query("page_size")
	}
	limit := parsePositiveQuery(limitValue, 25)
	if limit > 100 {
		limit = 100
	}

	return paginationParams{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}

func parsePositiveQuery(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

// paginatedQuery executes a GORM query and writes the common pagination
// envelope. The destination must be a pointer to a slice.
func paginatedQuery(c *fiber.Ctx, query *gorm.DB, destination any) error {
	p := readPagination(c)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return err
	}

	totalPages := int64(0)
	if total > 0 {
		totalPages = (total + int64(p.Limit) - 1) / int64(p.Limit)
		if int64(p.Page) > totalPages {
			p.Page = int(totalPages)
			p.Offset = (p.Page - 1) * p.Limit
		}
	}
	if err := query.Offset(p.Offset).Limit(p.Limit).Find(destination).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"data":        destination,
		"total":       total,
		"page":        p.Page,
		"limit":       p.Limit,
		"per_page":    p.Limit,
		"total_pages": totalPages,
	})
}
