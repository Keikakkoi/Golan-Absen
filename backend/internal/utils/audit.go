package utils

import (
	"log"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
)

func LogAction(userID uint, action string, tableName string, recordID uint, details string) {
	auditLog := models.AuditLog{
		UserID:        userID,
		Action:        action,
		TableName:     tableName,
		RecordID:      recordID,
		ChangesDetail: details,
	}

	if err := config.DB.Create(&auditLog).Error; err != nil {
		log.Printf("Failed to create audit log: %v", err)
	}
}
