package config

import (
	"fmt"
	"log"

	"absensi-golan-backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB(cfg *Config) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connection established")

	err = DB.AutoMigrate(
		&models.User{},
		&models.Permission{},
		&models.RolePermission{},
		&models.Department{},
		&models.Position{},
		&models.Employee{},
		&models.EmployeeHomeLocation{},
		&models.AttendanceRecord{},
		&models.OfficeLocation{},
		&models.WorkSchedule{},
		&models.LeaveRequest{},
		&models.LeaveQuota{},
		&models.Notification{},
		&models.NotificationSetting{},
		&models.WorkType{},
		&models.AuditLog{},
		&models.Holiday{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database schemas: %v", err)
	}

	log.Println("Database migration completed")

	seedPermissions()

	// Seed default office location based on PRD v1.2
	var officeCount int64
	DB.Model(&models.OfficeLocation{}).Count(&officeCount)
	if officeCount == 0 {
		DB.Create(&models.OfficeLocation{
			NamaLokasi:  "PT. Golan Digital Kreatif",
			Latitude:    -6.1202471,
			Longitude:   106.7118952,
			RadiusMeter: 100,
		})
		log.Println("Seeded default office location")
	}

	// Seed WorkSchedule
	var wsCount int64
	DB.Model(&models.WorkSchedule{}).Count(&wsCount)
	if wsCount == 0 {
		DB.Create(&models.WorkSchedule{
			NamaShift:               "Reguler",
			JamMulai:                "09:00:00",
			JamSelesai:              "17:00:00",
			ToleransiTerlambatMenit: 10,
			HariKerja:               "1,2,3,4,5",
		})
		log.Println("Seeded default work schedule")
	}

	// Seed WorkTypes
	var wtCount int64
	DB.Model(&models.WorkType{}).Count(&wtCount)
	if wtCount == 0 {
		DB.Create(&models.WorkType{
			Nama:                  "WFO",
			Deskripsi:             "Work From Office",
			IsDefault:             true,
			IsHomeBase:            false,
			ButuhValidasiGeofence: true,
			RadiusYangBerlaku:     "kantor",
			WajibSelfie:           true,
			WarnaLabel:            "#3B82F6",
			StatusAktif:           true,
		})
		DB.Create(&models.WorkType{
			Nama:                  "WFH",
			Deskripsi:             "Work From Home",
			IsDefault:             false,
			IsHomeBase:            true,
			ButuhValidasiGeofence: true,
			RadiusYangBerlaku:     "rumah",
			WajibSelfie:           true,
			WarnaLabel:            "#10B981",
			StatusAktif:           true,
		})
		DB.Create(&models.WorkType{
			Nama:                  "Dinas Luar",
			Deskripsi:             "Penugasan Kerja Luar Kota / Client",
			IsDefault:             false,
			IsHomeBase:            false,
			ButuhValidasiGeofence: false,
			RadiusYangBerlaku:     "kombinasi",
			WajibSelfie:           true,
			WarnaLabel:            "#F59E0B",
			StatusAktif:           true,
		})
		log.Println("Seeded default work types")
	}

	seedNotificationSettings()
}

func seedNotificationSettings() {
	defaults := []models.NotificationSetting{
		{TipeNotifikasi: "Pengajuan Izin", Role: models.RoleHRD, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Status Pengajuan", Role: models.RoleKaryawan, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Keterlambatan", Role: models.RoleHRD, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Kehadiran WFH", Role: models.RoleHRD, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Laporan Mingguan", Role: models.RolePimpinan, IsEmailEnabled: true, IsInAppEnabled: false},
	}
	for _, setting := range defaults {
		var existing models.NotificationSetting
		if DB.Where("tipe_notifikasi = ? AND role = ?", setting.TipeNotifikasi, setting.Role).First(&existing).Error != nil {
			DB.Create(&setting)
		}
	}
}

func seedPermissions() {
	defaults := []models.Permission{
		{Kode: "employee.view", Nama: "Lihat data karyawan", Deskripsi: "Melihat daftar dan detail karyawan"},
		{Kode: "employee.manage", Nama: "Kelola data karyawan", Deskripsi: "Menambah, mengubah, menghapus, dan import karyawan"},
		{Kode: "leave.approve", Nama: "Approval izin/cuti", Deskripsi: "Memproses pengajuan izin dan cuti"},
		{Kode: "attendance.report", Nama: "Rekap absensi", Deskripsi: "Melihat dan mengekspor rekap absensi"},
		{Kode: "organization.manage", Nama: "Kelola organisasi", Deskripsi: "Mengelola departemen dan jabatan"},
		{Kode: "settings.manage", Nama: "Pengaturan sistem", Deskripsi: "Mengelola lokasi, shift, hari libur, dan tipe kerja"},
		{Kode: "quota.manage", Nama: "Kuota izin/cuti", Deskripsi: "Mengelola kuota izin dan cuti karyawan"},
	}
	for _, permission := range defaults {
		var existing models.Permission
		if DB.Where("kode = ?", permission.Kode).First(&existing).Error != nil {
			DB.Create(&permission)
			existing = permission
		}
		for _, role := range []models.Role{models.RoleHRD, models.RolePimpinan} {
			var count int64
			DB.Model(&models.RolePermission{}).Where("role = ? AND permission_id = ?", role, existing.ID).Count(&count)
			if count == 0 {
				DB.Create(&models.RolePermission{Role: role, PermissionID: existing.ID, Diizinkan: role == models.RoleHRD || permission.Kode == "employee.view" || permission.Kode == "attendance.report"})
			}
		}
	}
}
