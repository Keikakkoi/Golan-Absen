package config

import (
	"fmt"
	"log"

	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/services"

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
	// Backfill legacy rows before AutoMigrate attempts to enforce the model's
	// NOT NULL constraint. This is harmless on a fresh database.
	_ = DB.Exec("UPDATE employees SET shift_kerja = 'Reguler' WHERE shift_kerja IS NULL OR BTRIM(shift_kerja) = ''")

	err = DB.AutoMigrate(
		&models.Project{},
		&models.User{},
		&models.PasswordResetChallenge{},
		&models.Division{},
		&models.Position{},
		&models.Employee{},
		&models.CodeGenerator{},
		&models.EmployeeHomeLocation{},
		&models.HomeLocationChangeRequest{},
		&models.EmployeeHomeLocationHistory{},
		&models.AttendanceRecord{},
		&models.OfficeLocation{},
		&models.WorkSchedule{},
		&models.RegularWorkSchedule{},
		&models.LeaveRequest{},
		&models.LeaveApprovalHistory{},
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
		&models.InternshipDocument{},
		&models.CertificateIssuanceLog{},
		&models.GeneralSetting{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database schemas: %v", err)
	}
	if err := services.BackfillCodes(DB); err != nil {
		log.Printf("Code backfill failed: %v", err)
	}
	if err := DB.Exec("UPDATE employees SET shift_kerja = 'Reguler' WHERE shift_kerja IS NULL OR BTRIM(shift_kerja) = ''").Error; err != nil {
		log.Printf("Failed to backfill employee shifts: %v", err)
	}
	if err := DB.Exec("ALTER TABLE employees ALTER COLUMN shift_kerja SET DEFAULT 'Reguler', ALTER COLUMN shift_kerja SET NOT NULL").Error; err != nil {
		log.Printf("Failed to enforce employee shift constraint: %v", err)
	}
	if err := DB.Exec("UPDATE work_schedules SET hari_kerja = '[1,2,3,4,5,6]' WHERE hari_kerja IS NULL OR BTRIM(hari_kerja) = '' OR hari_kerja = '[]'").Error; err != nil {
		log.Printf("Failed to backfill work schedule days: %v", err)
	}
	seedRegularWorkSchedules()
	// The old unique date index prevented a national and company holiday from
	// sharing a date. Keep all legacy rows and replace it with date/type uniqueness.
	_ = DB.Exec("ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_tanggal_key")
	_ = DB.Exec("DROP INDEX IF EXISTS idx_holidays_tanggal")
	_ = DB.Exec("DROP INDEX IF EXISTS uni_holidays_tanggal")
	_ = DB.Exec("UPDATE holidays SET type = 'company' WHERE type IS NULL OR BTRIM(type) = ''")
	_ = DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_date_type ON holidays (tanggal, type)")

	log.Println("Database migration completed")

	// Backfill CertificateIssuanceLog for existing certificates
	var existingCerts []models.InternshipCertificate
	DB.Find(&existingCerts)
	for _, cert := range existingCerts {
		var logCount int64
		DB.Model(&models.CertificateIssuanceLog{}).Where("user_id = ?", cert.UserID).Count(&logCount)
		if logCount == 0 {
			DB.Create(&models.CertificateIssuanceLog{
				UserID:        cert.UserID,
				CertificateNo: cert.CertificateNo,
				IssuedAt:      cert.IssuedAt,
				Action:        "INITIAL_ISSUANCE",
			})
		}
	}

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

	// Legacy global schedules remain readable for compatibility; regular hours
	// are now seeded in regular_work_schedules.
	var wsCount int64
	DB.Model(&models.WorkSchedule{}).Count(&wsCount)
	_ = wsCount

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
			MinimumMasaKerjaCutiBulan:        3,
			BatasLaporanSetelahCheckoutMenit: 60,
			BatasLaporanSetelahCheckoutJam:   1,
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

func seedRegularWorkSchedules() {
	names := []string{"", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"}
	start, end, tolerance := "09:00:00", "17:00:00", 10
	var legacy models.WorkSchedule
	if DB.Where("employee_id IS NULL AND LOWER(TRIM(nama_shift)) = ?", "reguler").Order("id desc").First(&legacy).Error == nil {
		if legacy.JamMulai != "" {
			start = legacy.JamMulai
		}
		if legacy.JamSelesai != "" {
			end = legacy.JamSelesai
		}
		if legacy.ToleransiTerlambatMenit >= 0 {
			tolerance = legacy.ToleransiTerlambatMenit
		}
	}
	for day := 1; day <= 7; day++ {
		var row models.RegularWorkSchedule
		if DB.Where("day_of_week = ?", day).First(&row).Error == nil {
			continue
		}
		DB.Create(&models.RegularWorkSchedule{DayOfWeek: day, DayName: names[day], IsWorkingDay: day <= 6, StartTime: start, EndTime: end, LateToleranceMinutes: tolerance})
	}
}

func seedNotificationSettings() {
	defaults := []models.NotificationSetting{
		{TipeNotifikasi: "Info Admin", Role: models.RoleKaryawan, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Info Admin", Role: models.RoleMagang, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Info Admin", Role: models.RoleManajer, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Info Admin", Role: models.RoleHRD, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Jadwal Shift", Role: models.RoleKaryawan, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Jadwal Shift", Role: models.RoleMagang, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Jadwal Shift", Role: models.RoleManajer, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Pengajuan Izin", Role: models.RoleHRD, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Pengajuan Lokasi WFH", Role: models.RoleHRD, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Persetujuan Izin Tim", Role: models.RoleManajer, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Status Pengajuan", Role: models.RoleKaryawan, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Status Pengajuan", Role: models.RoleMagang, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Status Pengajuan", Role: models.RoleManajer, IsEmailEnabled: true, IsInAppEnabled: true},
		{TipeNotifikasi: "Keterlambatan", Role: models.RoleHRD, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Kehadiran WFH", Role: models.RoleHRD, IsEmailEnabled: false, IsInAppEnabled: true},
		{TipeNotifikasi: "Laporan Mingguan", Role: models.RoleManajer, IsEmailEnabled: true, IsInAppEnabled: false},
	}
	for _, setting := range defaults {
		var existing models.NotificationSetting
		if DB.Where("tipe_notifikasi = ? AND role = ?", setting.TipeNotifikasi, setting.Role).First(&existing).Error != nil {
			DB.Create(&setting)
		}
	}
}
