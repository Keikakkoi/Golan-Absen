package main

import (
	"log"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)
	db := config.DB

	log.Println("Starting database seeding...")

	// Seed Office Location
	var officeCount int64
	db.Model(&models.OfficeLocation{}).Count(&officeCount)
	if officeCount == 0 {
		db.Create(&models.OfficeLocation{
			NamaLokasi:  "Kantor Pusat PT. Golan Digital Kreatif",
			Latitude:    -6.1202471,
			Longitude:   106.7118952,
			RadiusMeter: 100.0,
			Alamat:      "Jalan Manyar II RT.002 RW.011, Tegal Alur, Kalideres, Jakarta Barat",
		})
		log.Println("Seeded office location")
	}

	// Seed Work Schedule
	var scheduleCount int64
	db.Model(&models.WorkSchedule{}).Count(&scheduleCount)
	if scheduleCount == 0 {
		db.Create(&models.WorkSchedule{
			NamaShift:               "Shift Pagi Reguler",
			JamMulai:                "09:00:00",
			JamSelesai:              "17:00:00",
			ToleransiTerlambatMenit: 10,
			HariKerja:               "1,2,3,4,5",
		})
		log.Println("Seeded work schedule")
	}

	// Seed Admin User
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		adminUser := models.User{
			Nama:         "Super Admin",
			Email:        "admin@golan.com",
			PasswordHash: string(hash),
			Role:         models.RoleHRD,
		}
		db.Create(&adminUser)
		
		hashKaryawan, _ := bcrypt.GenerateFromPassword([]byte("karyawan123"), bcrypt.DefaultCost)
		karyawanUser := models.User{
			Nama:         "Karyawan Dummy",
			Email:        "karyawan@golan.com",
			PasswordHash: string(hashKaryawan),
			Role:         models.RoleKaryawan,
		}
		db.Create(&karyawanUser)
		
		// Seed Department
		dept := models.Department{NamaDepartemen: "Engineering"}
		db.Create(&dept)
		
		pos := models.Position{NamaJabatan: "Software Engineer"}
		db.Create(&pos)
		
		db.Create(&models.Employee{
			UserID:           karyawanUser.ID,
			NIK:              "EMP-001",
			DepartmentID:     dept.ID,
			PositionID:       pos.ID,
			TanggalBergabung: time.Now(),
		})

		log.Println("Seeded users and employee")
	}

	log.Println("Seeding completed successfully")
}
