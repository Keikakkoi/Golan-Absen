package handlers

import (
	"strconv"
	"strings"

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
	orgs.Get("/managers", GetAvailableManagers)
	orgs.Get("/projects", GetAllProjects)

	// Admin only routes
	admin := router.Group("/admin/organization", middleware.Protected())
	admin.Get("/divisions", GetAllDivisions)
	admin.Get("/positions", GetAllPositions)
	admin.Get("/projects", GetAllProjectsForAdmin)

	admin.Post("/divisions", CreateDivision)
	admin.Put("/divisions/:id", UpdateDivision)
	admin.Delete("/divisions/:id", DeleteDivision)

	admin.Post("/positions", CreatePosition)
	admin.Put("/positions/:id", UpdatePosition)
	admin.Delete("/positions/:id", DeletePosition)

	admin.Post("/projects", CreateProject)
	admin.Put("/projects/:id", UpdateProject)
	admin.Delete("/projects/:id", DeleteProject)
}

func GetAvailableManagers(c *fiber.Ctx) error {
	var managers []models.User
	if err := config.DB.Where("role = ? AND status = ?", models.RoleManajer, "aktif").Order("nama asc").Find(&managers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch available managers"})
	}
	return c.JSON(managers)
}

func GetAllProjects(c *fiber.Ctx) error {
	var projects []models.Project
	if err := config.DB.Where("status_aktif = ?", true).Order("nama_project asc").Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch projects"})
	}
	return c.JSON(projects)
}

func GetAllProjectsForAdmin(c *fiber.Ctx) error {
	var projects []models.Project
	if err := config.DB.Order("nama_project asc").Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch projects"})
	}
	return c.JSON(projects)
}

func CreateProject(c *fiber.Ctx) error {
	var project models.Project
	if err := c.BodyParser(&project); err != nil || strings.TrimSpace(project.NamaProject) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nama project wajib diisi"})
	}
	project.NamaProject = strings.TrimSpace(project.NamaProject)
	if err := config.DB.Create(&project).Error; err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Nama project sudah digunakan atau gagal disimpan"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "Project", project.ID, "Created project: "+project.NamaProject)
	return c.Status(fiber.StatusCreated).JSON(project)
}

func UpdateProject(c *fiber.Ctx) error {
	var project models.Project
	if err := config.DB.First(&project, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}
	var req struct {
		NamaProject string
		Deskripsi   string
		StatusAktif *bool
	}
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.NamaProject) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nama project wajib diisi"})
	}
	project.NamaProject = strings.TrimSpace(req.NamaProject)
	project.Deskripsi = req.Deskripsi
	if req.StatusAktif != nil {
		project.StatusAktif = *req.StatusAktif
	}
	if err := config.DB.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Nama project sudah digunakan atau gagal disimpan"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Project", project.ID, "Updated project: "+project.NamaProject)
	return c.JSON(project)
}

func DeleteProject(c *fiber.Ctx) error {
	var project models.Project
	if err := config.DB.First(&project, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}
	var assigned int64
	config.DB.Model(&models.User{}).Where("project_id = ?", project.ID).Count(&assigned)
	if assigned > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Project masih digunakan oleh karyawan dan tidak dapat dihapus"})
	}
	if err := config.DB.Delete(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete project"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "Project", project.ID, "Deleted project: "+project.NamaProject)
	return c.JSON(fiber.Map{"message": "Project deleted successfully"})
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
