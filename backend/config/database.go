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
		&models.Division{},
		&models.Position{},
		&models.Employee{},
		&models.EmployeeHomeLocation{},
		&models.AttendanceRecord{},
		&models.OfficeLocation{},
		&models.WorkSchedule{},
		&models.LeaveRequest{},
		&models.LeaveQuota{},
		&models.Notification{},
		&models.PushSubscription{},
		&models.NotificationSetting{},
		&models.WorkType{},
		&models.AuditLog{},
		&models.Holiday{},
		&models.CompanyEvent{},
		&models.HelpdeskContact{},
		&models.WorkReport{},
		&models.WorkReportAttachment{},
		&models.WorkReportColumn{},
		&models.InternshipCertificate{},
		&models.GeneralSetting{},
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
			NamaLokasi:    "PT. Golan Digital Kreatif",
			GoogleMapsURL: "https://maps.app.goo.gl/e3wNfVYXS8whxHRF7",
			Latitude:      -6.1202471,
			Longitude:     106.7118952,
			RadiusMeter:   100,
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

	var generalSettingCount int64
	DB.Model(&models.GeneralSetting{}).Count(&generalSettingCount)
	if generalSettingCount == 0 {
		DB.Create(&models.GeneralSetting{
			MinimumMasaKerjaCutiBulan:      3,
			BatasLaporanSetelahCheckoutJam: 1,
		})
	}

	// Seed HelpdeskContact
	var hcCount int64
	DB.Model(&models.HelpdeskContact{}).Count(&hcCount)
	if hcCount == 0 {
		DB.Create(&models.HelpdeskContact{
			EmailHelpdesk: "hrd@golan.co.id",
			EmailIT:       "support@golan.co.id",
			WhatsAppHRD:   "+62 813-2493-7038",
			WhatsAppIT:    "+62 895-3414-40181",
			JamLayanan:    "Senin - Jumat: 08:00 - 17:00 WIB",
		})
		log.Println("Seeded default helpdesk contact")
	}
}

func seedNotificationSettings() {
	defaults := []models.NotificationSetting{
		{TipeNotifikasi: "Info Admin", Role: models.RoleKaryawan, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Info Admin", Role: models.RoleMagang, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Info Admin", Role: models.RoleManajer, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Info Admin", Role: models.RoleHRD, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Info Admin", Role: models.RolePimpinan, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Pengajuan Izin", Role: models.RoleHRD, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Persetujuan Izin Tim", Role: models.RoleManajer, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Status Pengajuan", Role: models.RoleKaryawan, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Status Pengajuan", Role: models.RoleMagang, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Status Pengajuan", Role: models.RoleManajer, IsEmailEnabled: true, IsInAppEnabled: true},
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
		{Kode: "organization.manage", Nama: "Kelola organisasi", Deskripsi: "Mengelola divisi dan jabatan"},
		{Kode: "settings.manage", Nama: "Pengaturan sistem", Deskripsi: "Mengelola lokasi, shift, hari libur, dan tipe kerja"},
		{Kode: "quota.manage", Nama: "Kuota izin/cuti", Deskripsi: "Mengelola kuota izin dan cuti karyawan"},
		{Kode: "team.attendance", Nama: "Absensi tim", Deskripsi: "Melihat absensi anggota tim sendiri"},
		{Kode: "team.reports", Nama: "Laporan tim", Deskripsi: "Melihat laporan dan logbook anggota tim sendiri"},
		{Kode: "team.leave.approve", Nama: "Approval izin tim", Deskripsi: "Approve/reject izin anggota tim sendiri"},
		{Kode: "internship.logbook", Nama: "Logbook magang", Deskripsi: "Mengelola logbook harian peserta magang"},
		{Kode: "internship.certificate", Nama: "Sertifikat magang", Deskripsi: "Mengunduh sertifikat setelah periode selesai"},
	}
	for _, permission := range defaults {
		var existing models.Permission
		if DB.Where("kode = ?", permission.Kode).First(&existing).Error != nil {
			DB.Create(&permission)
			existing = permission
		}
		for _, role := range []models.Role{models.RoleHRD, models.RolePimpinan, models.RoleManajer} {
			var count int64
			DB.Model(&models.RolePermission{}).Where("role = ? AND permission_id = ?", role, existing.ID).Count(&count)
			if count == 0 {
				allowed := role == models.RoleHRD || permission.Kode == "employee.view" || permission.Kode == "attendance.report"
				if role == models.RoleManajer && (permission.Kode == "team.attendance" || permission.Kode == "team.reports" || permission.Kode == "team.leave.approve") {
					allowed = true
				}
				if role == models.RoleMagang && (permission.Kode == "internship.logbook" || permission.Kode == "internship.certificate") {
					allowed = true
				}
				DB.Create(&models.RolePermission{Role: role, PermissionID: existing.ID, Diizinkan: allowed})
			}
		}
	}
}
