package handlers

import (
	"strconv"
	"strings"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupNotificationRoutes(router fiber.Router) {
	notif := router.Group("/notifications", middleware.Protected())
	notif.Get("/", GetMyNotifications)
	notif.Get("/push/config", GetPushConfig)
	notif.Post("/push/subscribe", SubscribeToPush)
	notif.Delete("/push/subscribe", UnsubscribeFromPush)
	notif.Put("/read-all", MarkAllNotificationsAsRead)
	notif.Put("/:id/read", MarkNotificationAsRead)

	admin := router.Group("/admin/notifications", middleware.Protected())
	admin.Post("/broadcast", BroadcastNotification)
}

func GetMyNotifications(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var notifications []models.Notification
	if err := config.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&notifications).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch notifications"})
	}

	return c.JSON(notifications)
}

func GetPushConfig(c *fiber.Ctx) error {
	cfg := config.LoadConfig()
	return c.JSON(fiber.Map{
		"enabled":    cfg.VAPIDPublicKey != "" && cfg.VAPIDPrivateKey != "",
		"public_key": cfg.VAPIDPublicKey,
	})
}

func SubscribeToPush(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var subscription webpush.Subscription
	if err := c.BodyParser(&subscription); err != nil || subscription.Endpoint == "" || subscription.Keys.P256dh == "" || subscription.Keys.Auth == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data subscription push tidak valid"})
	}

	var existing models.PushSubscription
	err := config.DB.Where("endpoint = ?", subscription.Endpoint).First(&existing).Error
	if err == nil {
		existing.UserID = userID
		existing.P256dh = subscription.Keys.P256dh
		existing.Auth = subscription.Keys.Auth
		if err := config.DB.Save(&existing).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan subscription push"})
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
	if err != gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membaca subscription push"})
	}

	if err := config.DB.Create(&models.PushSubscription{
		UserID: userID, Endpoint: subscription.Endpoint,
		P256dh: subscription.Keys.P256dh, Auth: subscription.Keys.Auth,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan subscription push"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func UnsubscribeFromPush(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var input struct {
		Endpoint string `json:"endpoint"`
	}
	if err := c.BodyParser(&input); err != nil || strings.TrimSpace(input.Endpoint) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Endpoint push wajib diisi"})
	}
	config.DB.Where("user_id = ? AND endpoint = ?", userID, input.Endpoint).Delete(&models.PushSubscription{})
	return c.SendStatus(fiber.StatusNoContent)
}

func BroadcastNotification(c *fiber.Ctx) error {
	if !isHRD(c) {
		return accessDenied(c)
	}
	var input struct {
		Judul      string `json:"judul"`
		Pesan      string `json:"pesan"`
		TargetRole string `json:"target_role"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data notifikasi tidak valid"})
	}
	input.Judul = strings.TrimSpace(input.Judul)
	input.Pesan = strings.TrimSpace(input.Pesan)
	input.TargetRole = strings.TrimSpace(input.TargetRole)
	if input.Judul == "" || input.Pesan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Judul dan pesan wajib diisi"})
	}
	if len(input.Judul) > 100 || len(input.Pesan) > 2000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Judul atau pesan terlalu panjang"})
	}

	query := config.DB.Model(&models.User{})
	if input.TargetRole != "" && input.TargetRole != "Semua" {
		role := models.Role(input.TargetRole)
		if role != models.RoleKaryawan && role != models.RoleHRD && role != models.RoleMagang && role != models.RoleManajer {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Target role tidak valid"})
		}
		query = query.Where("role = ?", role)
	}
	var users []models.User
	if err := query.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengambil penerima notifikasi"})
	}
	if len(users) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tidak ada penerima notifikasi"})
	}
	for _, user := range users {
		if err := utils.CreateNotification(config.DB, user.ID, user.Role, "Info Admin", input.Judul, input.Pesan); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat notifikasi"})
		}
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Notifikasi berhasil dikirim", "recipient_count": len(users)})
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
