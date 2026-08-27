package utils

import (
	"fmt"
	"log"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"gorm.io/gorm"
)

// LogAction records an audit event only when its actor exists in users. The
// actor must always come from the authenticated request context; zero is never
// a valid system fallback because audit_logs.user_id has a foreign key.
func LogAction(userID uint, action string, tableName string, recordID uint, details string) error {
	return LogActionWithDB(config.DB, userID, action, tableName, recordID, details)
}

func LogActionWithDB(db *gorm.DB, userID uint, action string, tableName string, recordID uint, details string) error {
	if userID == 0 {
		err := fmt.Errorf("audit log actor is invalid: user_id must be a non-zero authenticated user")
		log.Printf("audit log rejected: action=%s table=%s record_id=%d reason=%v", action, tableName, recordID, err)
		return err
	}
	var userCount int64
	if err := db.Model(&models.User{}).Where("id = ?", userID).Count(&userCount).Error; err != nil {
		log.Printf("audit log actor validation failed: user_id=%d action=%s table=%s: %v", userID, action, tableName, err)
		return fmt.Errorf("validate audit log actor: %w", err)
	}
	if userCount != 1 {
		err := fmt.Errorf("audit log actor user_id=%d was not found", userID)
		log.Printf("audit log rejected: action=%s table=%s record_id=%d reason=%v", action, tableName, recordID, err)
		return err
	}
	log.Printf("audit log actor validated from authenticated user context: user_id=%d action=%s table=%s record_id=%d", userID, action, tableName, recordID)
	auditLog := models.AuditLog{
		UserID:        userID,
		Action:        action,
		TableName:     tableName,
		RecordID:      recordID,
		ChangesDetail: details,
	}

	if err := db.Create(&auditLog).Error; err != nil {
		log.Printf("failed to create audit log: user_id=%d action=%s table=%s: %v", userID, action, tableName, err)
		return err
	}
	return nil
}
