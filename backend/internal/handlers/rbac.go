package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

func SetupRBACRoutes(router fiber.Router) {
	admin := router.Group("/admin/roles", middleware.Protected())
	admin.Get("/", GetRolePermissions)
	admin.Put("/", UpdateRolePermissions)
}

func GetRolePermissions(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var permissions []models.Permission
	if err := config.DB.Order("id asc").Find(&permissions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch permissions"})
	}
	var assignments []models.RolePermission
	if err := config.DB.Find(&assignments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch role permissions"})
	}
	return c.JSON(fiber.Map{"permissions": permissions, "assignments": assignments, "roles": []models.Role{models.RoleHRD, models.RolePimpinan, models.RoleKaryawan, models.RoleMagang, models.RoleManajer}})
}

type rolePermissionInput struct {
	Role         models.Role `json:"role"`
	PermissionID uint        `json:"permission_id"`
	Diizinkan    bool        `json:"diizinkan"`
}

func UpdateRolePermissions(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var inputs []rolePermissionInput
	if err := c.BodyParser(&inputs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid permission payload"})
	}
	tx := config.DB.Begin()
	for _, input := range inputs {
		if input.Role != models.RoleHRD && input.Role != models.RolePimpinan && input.Role != models.RoleKaryawan && input.Role != models.RoleMagang && input.Role != models.RoleManajer {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
		}
		var assignment models.RolePermission
		err := tx.Where("role = ? AND permission_id = ?", input.Role, input.PermissionID).First(&assignment).Error
		if err != nil {
			assignment = models.RolePermission{Role: input.Role, PermissionID: input.PermissionID, Diizinkan: input.Diizinkan}
			if err = tx.Create(&assignment).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save permissions"})
			}
		} else {
			if err = tx.Model(&assignment).Update("diizinkan", input.Diizinkan).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save permissions"})
			}
		}
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit permissions"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "RolePermission", 0, "Updated role permissions")
	return GetRolePermissions(c)
}

func isHRD(c *fiber.Ctx) bool {
	role, ok := c.Locals("role").(models.Role)
	return ok && role == models.RoleHRD
}
