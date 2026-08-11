package handlers

import (
	"strconv"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
)

func SetupWorkTypeRoutes(router fiber.Router) {
	// Public (Authenticated) routes
	worktypes := router.Group("/worktypes", middleware.Protected())
	worktypes.Get("/", GetAllWorkTypes)

	// Admin only routes
	admin := router.Group("/admin/worktypes", middleware.Protected())
	admin.Get("/", GetAllWorkTypes)
	admin.Post("/", CreateWorkType)
	admin.Put("/:id", UpdateWorkType)
	admin.Delete("/:id", DeleteWorkType)
}

func GetAllWorkTypes(c *fiber.Ctx) error {
	var types []models.WorkType

	// Try to get from Redis Cache first
	if config.RedisClient != nil {
		cached, err := config.RedisClient.Get(config.Ctx, "cache:worktypes").Result()
		if err == nil && cached != "" {
			if json.Unmarshal([]byte(cached), &types) == nil {
				return c.JSON(types)
			}
		}
	}

	if err := config.DB.Find(&types).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch work types"})
	}

	// Set to Cache
	if config.RedisClient != nil {
		if bytes, err := json.Marshal(types); err == nil {
			config.RedisClient.Set(config.Ctx, "cache:worktypes", bytes, 1*time.Hour)
		}
	}

	return c.JSON(types)
}

func CreateWorkType(c *fiber.Ctx) error {
	wt := new(models.WorkType)
	if err := c.BodyParser(wt); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Create(&wt).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create work type"})
	}

	// Invalidate cache
	if config.RedisClient != nil {
		config.RedisClient.Del(config.Ctx, "cache:worktypes")
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "WorkType", wt.ID, "Created work type: "+wt.Nama)

	return c.Status(fiber.StatusCreated).JSON(wt)
}

func UpdateWorkType(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var wt models.WorkType
	if err := config.DB.First(&wt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Work type not found"})
	}

	if err := c.BodyParser(&wt); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Save(&wt).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update work type"})
	}

	// Invalidate cache
	if config.RedisClient != nil {
		config.RedisClient.Del(config.Ctx, "cache:worktypes")
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "WorkType", wt.ID, "Updated work type: "+wt.Nama)

	return c.JSON(wt)
}

func DeleteWorkType(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var wt models.WorkType
	if err := config.DB.First(&wt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Work type not found"})
	}

	// Invalidate cache
	if config.RedisClient != nil {
		config.RedisClient.Del(config.Ctx, "cache:worktypes")
	}

	if err := config.DB.Delete(&wt).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete work type"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "WorkType", wt.ID, "Deleted work type: "+wt.Nama)

	return c.JSON(fiber.Map{"message": "Work type deleted successfully"})
}
