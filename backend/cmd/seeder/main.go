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
			HariKerja:               "[1,2,3,4,5,6]",
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

		// Seed Division
		divisions := []models.Division{
			{NamaDivisi: "Golan Education", Deskripsi: "Platform Edukasi dan Pelatihan Online"},
			{NamaDivisi: "Golan Website", Deskripsi: "Pembuatan Website Profesional & Content Writer / SEO Writer"},
			{NamaDivisi: "Golan Nusantara", Deskripsi: "Portal Berita Online dan Media Promosi Digital"},
			{NamaDivisi: "Golan Sertifikasi", Deskripsi: "Lembaga Pelatihan dan Sertifikasi Kompetensi"},
			{NamaDivisi: "Golan Properti", Deskripsi: "Platform Iklan dan Layanan Properti"},
			{NamaDivisi: "Golan Event", Deskripsi: "Event Organizer Digital"},
			{NamaDivisi: "Golan Jurnal", Deskripsi: "Layanan Publikasi Jurnal Ilmiah"},
			{NamaDivisi: "Golan SDM", Deskripsi: "Layanan Perekrutan Tenaga Kerja"},
		}

		for i, d := range divisions {
			db.Create(&d)
			divisions[i] = d // update with ID
		}

		pos := models.Position{NamaJabatan: "Software Engineer"}
		db.Create(&pos)

		db.Create(&models.Employee{
			UserID:           karyawanUser.ID,
			NIK:              "EMP-001",
			DivisionID:       divisions[0].ID,
			PositionID:       pos.ID,
			TanggalBergabung: time.Now(),
		})

		log.Println("Seeded users and employee")
	}

	// Always ensure these divisions exist
	var expectedDivisions = []models.Division{
		{NamaDivisi: "Golan Education", Deskripsi: "Platform Edukasi dan Pelatihan Online"},
		{NamaDivisi: "Golan Website", Deskripsi: "Pembuatan Website Profesional & Content Writer / SEO Writer"},
		{NamaDivisi: "Golan Nusantara", Deskripsi: "Portal Berita Online dan Media Promosi Digital"},
		{NamaDivisi: "Golan Sertifikasi", Deskripsi: "Lembaga Pelatihan dan Sertifikasi Kompetensi"},
		{NamaDivisi: "Golan Properti", Deskripsi: "Platform Iklan dan Layanan Properti"},
		{NamaDivisi: "Golan Event", Deskripsi: "Event Organizer Digital"},
		{NamaDivisi: "Golan Jurnal", Deskripsi: "Layanan Publikasi Jurnal Ilmiah"},
		{NamaDivisi: "Golan SDM", Deskripsi: "Layanan Perekrutan Tenaga Kerja"},
	}

	for _, div := range expectedDivisions {
		var count int64
		db.Model(&models.Division{}).Where("nama_divisi = ?", div.NamaDivisi).Count(&count)
		if count == 0 {
			db.Create(&models.Division{NamaDivisi: div.NamaDivisi, Deskripsi: div.Deskripsi})
			log.Println("Added division:", div.NamaDivisi)
		} else {
			// Update existing division
			db.Model(&models.Division{}).Where("nama_divisi = ?", div.NamaDivisi).Update("deskripsi", div.Deskripsi)
		}
	}

	log.Println("Seeding completed successfully")
}
