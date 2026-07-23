package handlers

import (
	"strconv"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"

	"github.com/gofiber/fiber/v2"
)

func SetupNotificationRoutes(router fiber.Router) {
	notif := router.Group("/notifications", middleware.Protected())
	notif.Get("/", GetMyNotifications)
	notif.Put("/read-all", MarkAllNotificationsAsRead)
	notif.Put("/:id/read", MarkNotificationAsRead)
}

func GetMyNotifications(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var notifications []models.Notification
	if err := config.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&notifications).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch notifications"})
	}

	return c.JSON(notifications)
}

func MarkNotificationAsRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var notif models.Notification
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&notif).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Notification not found"})
	}

	notif.StatusBaca = true
	if err := config.DB.Save(&notif).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update notification"})
	}

	return c.JSON(fiber.Map{"message": "Notification marked as read"})
}

func MarkAllNotificationsAsRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	if err := config.DB.Model(&models.Notification{}).Where("user_id = ? AND status_baca = ?", userID, false).Update("status_baca", true).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update notifications"})
	}

	return c.JSON(fiber.Map{"message": "All notifications marked as read"})
}
