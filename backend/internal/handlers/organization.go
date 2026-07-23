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
	orgs.Get("/departments", GetAllDepartments)
	orgs.Get("/positions", GetAllPositions)

	// Admin only routes
	admin := router.Group("/admin/organization", middleware.Protected())
	admin.Get("/departments", GetAllDepartments)
	admin.Get("/positions", GetAllPositions)

	admin.Post("/departments", CreateDepartment)
	admin.Put("/departments/:id", UpdateDepartment)
	admin.Delete("/departments/:id", DeleteDepartment)

	admin.Post("/positions", CreatePosition)
	admin.Put("/positions/:id", UpdatePosition)
	admin.Delete("/positions/:id", DeletePosition)
}

// --- DEPARTMENTS ---

func GetAllDepartments(c *fiber.Ctx) error {
	var depts []models.Department
	if err := config.DB.Find(&depts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch departments"})
	}
	return c.JSON(depts)
}

func CreateDepartment(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	dept := new(models.Department)
	if err := c.BodyParser(dept); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Create(&dept).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create department"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "Department", dept.ID, "Created department: "+dept.NamaDepartemen)

	return c.Status(fiber.StatusCreated).JSON(dept)
}

func UpdateDepartment(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var dept models.Department
	if err := config.DB.First(&dept, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Department not found"})
	}

	if err := c.BodyParser(&dept); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Save(&dept).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update department"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Department", dept.ID, "Updated department: "+dept.NamaDepartemen)

	return c.JSON(dept)
}

func DeleteDepartment(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var dept models.Department
	if err := config.DB.First(&dept, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Department not found"})
	}
	if err := config.DB.Delete(&dept).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete department"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "Department", dept.ID, "Deleted department: "+dept.NamaDepartemen)

	return c.JSON(fiber.Map{"message": "Department deleted successfully"})
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
