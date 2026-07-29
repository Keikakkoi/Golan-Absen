package main

import (
	"log"
	"strings"
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
)

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg) // This will AutoMigrate, creating the new deskripsi column

	log.Println("Starting database migration for Deskripsi...")
	db := config.DB

	// Update Divisions
	var divisions []models.Division
	db.Find(&divisions)
	for _, div := range divisions {
		if strings.Contains(div.NamaDivisi, "(") && strings.HasSuffix(div.NamaDivisi, ")") {
			parts := strings.SplitN(div.NamaDivisi, " (", 2)
			if len(parts) == 2 {
				newName := strings.TrimSpace(parts[0])
				newDesc := strings.TrimSuffix(parts[1], ")")
				
				div.NamaDivisi = newName
				div.Deskripsi = newDesc
				db.Save(&div)
				log.Printf("Updated Division %d: %s | %s\n", div.ID, div.NamaDivisi, div.Deskripsi)
			}
		} else if div.NamaDivisi == "Migrated Division" {
			div.Deskripsi = "A migrated division description"
			db.Save(&div)
		}
	}

	log.Println("Migration completed.")
}
