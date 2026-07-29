package handlers

import (
	"strconv"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

func SetupOrganizationRoutes(router fiber.Router) {
	// Public (Authenticated) routes
	orgs := router.Group("/organization", middleware.Protected())
	orgs.Get("/divisions", GetAllDivisions)
	orgs.Get("/positions", GetAllPositions)

	// Admin only routes
	admin := router.Group("/admin/organization", middleware.Protected())
	admin.Get("/divisions", GetAllDivisions)
	admin.Get("/positions", GetAllPositions)

	admin.Post("/divisions", CreateDivision)
	admin.Put("/divisions/:id", UpdateDivision)
	admin.Delete("/divisions/:id", DeleteDivision)

	admin.Post("/positions", CreatePosition)
	admin.Put("/positions/:id", UpdatePosition)
	admin.Delete("/positions/:id", DeletePosition)
}

// --- DIVISIS ---

func GetAllDivisions(c *fiber.Ctx) error {
	var depts []models.Division
	if err := config.DB.Find(&depts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch divisions"})
	}
	return c.JSON(depts)
}

func CreateDivision(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	dept := new(models.Division)
	if err := c.BodyParser(dept); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Create(&dept).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create division"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "Division", dept.ID, "Created division: "+dept.NamaDivisi)

	return c.Status(fiber.StatusCreated).JSON(dept)
}

func UpdateDivision(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var dept models.Division
	if err := config.DB.First(&dept, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Division not found"})
	}

	if err := c.BodyParser(&dept); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Save(&dept).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update division"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Division", dept.ID, "Updated division: "+dept.NamaDivisi)

	return c.JSON(dept)
}

func DeleteDivision(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var dept models.Division
	if err := config.DB.First(&dept, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Division not found"})
	}
	if err := config.DB.Delete(&dept).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete division"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "Division", dept.ID, "Deleted division: "+dept.NamaDivisi)

	return c.JSON(fiber.Map{"message": "Division deleted successfully"})
}

// --- POSITIONS ---

func GetAllPositions(c *fiber.Ctx) error {
	var pos []models.Position
	if err := config.DB.Find(&pos).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch positions"})
	}
	return c.JSON(pos)
}

func CreatePosition(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	pos := new(models.Position)
	if err := c.BodyParser(pos); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Create(&pos).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create position"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "Position", pos.ID, "Created position: "+pos.NamaJabatan)

	return c.Status(fiber.StatusCreated).JSON(pos)
}

func UpdatePosition(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var pos models.Position
	if err := config.DB.First(&pos, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Position not found"})
	}

	if err := c.BodyParser(&pos); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Save(&pos).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update position"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Position", pos.ID, "Updated position: "+pos.NamaJabatan)

	return c.JSON(pos)
}

func DeletePosition(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var pos models.Position
	if err := config.DB.First(&pos, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Position not found"})
	}
	if err := config.DB.Delete(&pos).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete position"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "Position", pos.ID, "Deleted position: "+pos.NamaJabatan)

	return c.JSON(fiber.Map{"message": "Position deleted successfully"})
}
