package utils

import (
	"errors"
	"time"

	"absensi-golan-backend/internal/models"
	"gorm.io/gorm"
)

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

	return db.Create(&models.Notification{
		UserID: userID,
		Judul:  title,
		Pesan:  message,
		Waktu:  time.Now(),
	}).Error
}
