package utils

import (
	"encoding/json"
	"errors"
	"io"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	webpush "github.com/SherClockHolmes/webpush-go"
	"gorm.io/gorm"
)

// NotificationEvents is consumed by the WebSocket hub so open dashboards can
// refresh their in-app notification badge immediately.
var NotificationEvents = make(chan NotificationEvent, 128)

type NotificationEvent struct {
	UserID         uint
	NotificationID uint
}

// CreateNotification creates an in-app notification only when the recipient's
// notification setting allows the requested notification type. Missing
// settings are treated as enabled so existing installations remain functional
// while they are being migrated.
func CreateNotification(db *gorm.DB, userID uint, role models.Role, notificationType, title, message string) error {
	var setting models.NotificationSetting
	err := db.Where("tipe_notifikasi = ? AND role = ?", notificationType, role).First(&setting).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	if err == nil && !setting.IsInAppEnabled {
		return nil
	}

	notification := models.Notification{
		UserID: userID,
		Judul:  title,
		Pesan:  message,
		Waktu:  time.Now(),
	}
	if err := db.Create(&notification).Error; err != nil {
		return err
	}

	select {
	case NotificationEvents <- NotificationEvent{UserID: userID, NotificationID: notification.ID}:
	default:
		// A slow/disconnected realtime client must never block a business action.
	}

	// Push delivery is best-effort. The in-app notification is already safely
	// stored, so a browser/device that is offline can still read it later.
	go sendWebPush(userID, role, title, message)
	return nil
}

func sendWebPush(userID uint, role models.Role, title, message string) {
	cfg := config.LoadConfig()
	if cfg.VAPIDPublicKey == "" || cfg.VAPIDPrivateKey == "" {
		return
	}

	var subscriptions []models.PushSubscription
	if err := config.DB.Where("user_id = ?", userID).Find(&subscriptions).Error; err != nil {
		return
	}
	url := "/employee/notifications"
	if role == models.RoleHRD {
		url = "/admin/dashboard"
	} else if role == models.RolePimpinan {
		url = "/executive/dashboard"
	}
	payload, err := json.Marshal(map[string]string{"title": title, "body": message, "url": url})
	if err != nil {
		return
	}

	for _, item := range subscriptions {
		response, _ := webpush.SendNotification(payload, &webpush.Subscription{
			Endpoint: item.Endpoint,
			Keys:     webpush.Keys{P256dh: item.P256dh, Auth: item.Auth},
		}, &webpush.Options{
			Subscriber:      cfg.VAPIDSubject,
			VAPIDPublicKey:  cfg.VAPIDPublicKey,
			VAPIDPrivateKey: cfg.VAPIDPrivateKey,
			TTL:             60 * 60,
			Urgency:         webpush.UrgencyNormal,
		})
		if response != nil {
			_, _ = io.Copy(io.Discard, response.Body)
			_ = response.Body.Close()
			if response.StatusCode == 404 || response.StatusCode == 410 {
				config.DB.Delete(&item)
			}
		}
		// Push delivery is intentionally best-effort; keep failures out of the
		// request path because the in-app record is the source of truth.
	}
}
