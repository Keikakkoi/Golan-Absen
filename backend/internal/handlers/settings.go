package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupSettingsRoutes(router fiber.Router) {
	// Admin only routes
	admin := router.Group("/admin/settings", middleware.Protected())
	admin.Get("/office", GetOfficeLocation)
	admin.Put("/office", UpdateOfficeLocation)
	admin.Get("/schedule", GetWorkSchedule)
	admin.Put("/schedule", UpdateWorkSchedule)
	admin.Get("/general", GetGeneralSettings)
	admin.Put("/general", UpdateGeneralSettings)
	admin.Get("/audit-logs", GetAuditLogs)
	admin.Get("/audit-logs/export", ExportAuditLogsCSV)
	admin.Get("/notifications", GetNotificationSettings)
	admin.Put("/notifications", UpdateNotificationSettings)
	admin.Get("/backup", BackupDatabase)
	admin.Put("/helpdesk", UpdateHelpdeskContact)

	// General protected settings (accessible to all authenticated users)
	router.Get("/settings/helpdesk", middleware.Protected(), GetHelpdeskContact)

	// Shift management is separate from the default working-hours setting.
	// The existing /schedule endpoint remains the default schedule used by attendance.
	shifts := router.Group("/admin/schedules", middleware.Protected())
	shifts.Get("/", GetSchedules)
	shifts.Post("/", CreateSchedule)
	shifts.Put("/:id", UpdateSchedule)
	shifts.Delete("/:id", DeleteSchedule)
}

func GetGeneralSettings(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	return c.JSON(getGeneralSetting())
}

func UpdateGeneralSettings(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var input struct {
		MinimumMasaKerjaCutiBulan      int `json:"minimum_masa_kerja_cuti_bulan"`
		BatasLaporanSetelahCheckoutJam int `json:"batas_laporan_setelah_checkout_jam"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if input.MinimumMasaKerjaCutiBulan < 0 || input.MinimumMasaKerjaCutiBulan > 120 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Minimum masa kerja harus antara 0 dan 120 bulan"})
	}
	if input.BatasLaporanSetelahCheckoutJam < 0 || input.BatasLaporanSetelahCheckoutJam > 24 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Batas laporan harus antara 0 dan 24 jam"})
	}
	var setting models.GeneralSetting
	if err := config.DB.First(&setting).Error; err != nil {
		setting = models.GeneralSetting{}
	}
	setting.MinimumMasaKerjaCutiBulan = input.MinimumMasaKerjaCutiBulan
	setting.BatasLaporanSetelahCheckoutJam = input.BatasLaporanSetelahCheckoutJam
	if err := config.DB.Save(&setting).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update general settings"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "GeneralSetting", setting.ID, "Admin updated general attendance and leave rules")
	return c.JSON(setting)
}

func GetSchedules(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var schedules []models.WorkSchedule
	query := config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division")

	search := c.Query("search")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate != "" && endDate != "" {
		query = query.Where("tanggal BETWEEN ? AND ?", startDate, endDate)
	}
	if search != "" {
		// Use lowercasing for simple case-insensitive matching
		// Assuming we want to search by NamaShift, Employee Name, or Employee NIK
		query = query.Joins("LEFT JOIN employees ON employees.id = work_schedules.employee_id").
			Joins("LEFT JOIN users ON users.id = employees.user_id").
			Where("LOWER(work_schedules.nama_shift) LIKE ? OR LOWER(users.nama) LIKE ? OR LOWER(employees.nik) LIKE ?", "%"+strings.ToLower(search)+"%", "%"+strings.ToLower(search)+"%", "%"+strings.ToLower(search)+"%")
	}

	if err := query.Order("tanggal desc").Order("id desc").Find(&schedules).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch schedules"})
	}
	return c.JSON(schedules)
}

func CreateSchedule(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var schedule models.WorkSchedule
	if err := c.BodyParser(&schedule); err != nil || schedule.NamaShift == "" || schedule.JamMulai == "" || schedule.JamSelesai == "" || schedule.Tanggal == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nama shift, jam mulai, jam selesai, dan tanggal wajib diisi"})
	}
	
	if schedule.EmployeeID == nil || *schedule.EmployeeID == 0 {
		var count int64
		config.DB.Model(&models.WorkSchedule{}).Where("employee_id IS NULL").Count(&count)
		if count > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Shift global (untuk semua karyawan) sudah ada. Hanya boleh ada satu shift global."})
		}
		schedule.EmployeeID = nil // pastikan benar-benar nil jika 0
	}

	if err := config.DB.Create(&schedule).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan shift ke database: " + err.Error()})
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "WorkSchedule", schedule.ID, "Admin created work schedule: "+schedule.NamaShift)
	return c.Status(fiber.StatusCreated).JSON(schedule)
}

func UpdateSchedule(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var schedule models.WorkSchedule
	if err := config.DB.First(&schedule, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Schedule not found"})
	}
	var input models.WorkSchedule
	if err := c.BodyParser(&input); err != nil || input.NamaShift == "" || input.JamMulai == "" || input.JamSelesai == "" || input.Tanggal == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nama shift, jam mulai, jam selesai, dan tanggal wajib diisi"})
	}
	
	if input.EmployeeID == nil || *input.EmployeeID == 0 {
		var count int64
		config.DB.Model(&models.WorkSchedule{}).Where("employee_id IS NULL AND id != ?", schedule.ID).Count(&count)
		if count > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Shift global (untuk semua karyawan) sudah ada. Hanya boleh ada satu shift global."})
		}
		input.EmployeeID = nil
	}
	
	schedule.EmployeeID = input.EmployeeID
	schedule.Tanggal = input.Tanggal
	schedule.NamaShift = input.NamaShift
	schedule.JamMulai = input.JamMulai
	schedule.JamSelesai = input.JamSelesai
	schedule.ToleransiTerlambatMenit = input.ToleransiTerlambatMenit
	
	if err := config.DB.Save(&schedule).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengupdate shift ke database: " + err.Error()})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "WorkSchedule", schedule.ID, "Admin updated work schedule: "+schedule.NamaShift)
	return c.JSON(schedule)
}

func DeleteSchedule(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var schedule models.WorkSchedule
	if err := config.DB.First(&schedule, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Schedule not found"})
	}
	if err := config.DB.Delete(&schedule).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete schedule"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "WorkSchedule", schedule.ID, "Admin deleted work schedule: "+schedule.NamaShift)
	return c.JSON(fiber.Map{"message": "Schedule deleted successfully"})
}

func BackupDatabase(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	// Create a portable JSON snapshot of the application's data. This keeps the
	// backup useful even when mysqldump is unavailable in the deployment image.
	var (
		users              []models.User
		employees          []models.Employee
		divisions          []models.Division
		positions          []models.Position
		attendanceRecords  []models.AttendanceRecord
		leaveRequests      []models.LeaveRequest
		leaveQuotas        []models.LeaveQuota
		workTypes          []models.WorkType
		workSchedules      []models.WorkSchedule
		officeLocations    []models.OfficeLocation
		holidays           []models.Holiday
		notifications      []models.Notification
		notificationConfig []models.NotificationSetting
		auditLogs          []models.AuditLog
		homeLocations      []models.EmployeeHomeLocation
		permissions        []models.Permission
		rolePermissions    []models.RolePermission
	)
	queries := []struct {
		name string
		dest any
	}{
		{"users", &users}, {"employees", &employees}, {"divisions", &divisions},
		{"positions", &positions}, {"attendance_records", &attendanceRecords},
		{"leave_requests", &leaveRequests}, {"leave_quotas", &leaveQuotas},
		{"work_types", &workTypes}, {"work_schedules", &workSchedules},
		{"office_locations", &officeLocations}, {"holidays", &holidays},
		{"notifications", &notifications}, {"notification_settings", &notificationConfig},
		{"audit_logs", &auditLogs}, {"employee_home_locations", &homeLocations},
		{"permissions", &permissions}, {"role_permissions", &rolePermissions},
	}
	for _, query := range queries {
		if err := config.DB.Find(query.dest).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create backup",
				"table": query.name,
			})
		}
	}

	backupData := fiber.Map{
		"metadata": fiber.Map{
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "1.0.0",
			"format":    "golan-json-snapshot",
		},
		"data": fiber.Map{
			"users": users, "employees": employees, "divisions": divisions,
			"positions": positions, "attendance_records": attendanceRecords,
			"leave_requests": leaveRequests, "leave_quotas": leaveQuotas,
			"work_types": workTypes, "work_schedules": workSchedules,
			"office_locations": officeLocations, "holidays": holidays,
			"notifications": notifications, "notification_settings": notificationConfig,
			"audit_logs": auditLogs, "employee_home_locations": homeLocations,
			"permissions": permissions, "role_permissions": rolePermissions,
		},
	}

	c.Set("Content-Disposition", "attachment; filename=backup_golan_db_"+time.Now().Format("20060102150405")+".json")
	c.Set("Content-Type", "application/json")
	return c.JSON(backupData)
}

func GetOfficeLocation(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var office models.OfficeLocation

	if config.RedisClient != nil {
		cached, err := config.RedisClient.Get(config.Ctx, "cache:office").Result()
		if err == nil && cached != "" {
			if json.Unmarshal([]byte(cached), &office) == nil {
				return c.JSON(office)
			}
		}
	}

	if err := config.DB.First(&office).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Office location not found"})
	}

	if config.RedisClient != nil {
		if bytes, err := json.Marshal(office); err == nil {
			config.RedisClient.Set(config.Ctx, "cache:office", bytes, 1*time.Hour)
		}
	}

	return c.JSON(office)
}

func UpdateOfficeLocation(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var office models.OfficeLocation
	if err := config.DB.First(&office).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Office location not found"})
	}

	var input models.OfficeLocation
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	office.NamaLokasi = input.NamaLokasi
	office.GoogleMapsURL = input.GoogleMapsURL
	office.RadiusMeter = input.RadiusMeter
	office.Alamat = input.Alamat

	if strings.TrimSpace(input.GoogleMapsURL) != "" {
		lat, lng, err := utils.ResolveGoogleMapsLocationURL(input.GoogleMapsURL)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		office.Latitude = lat
		office.Longitude = lng
	}

	if err := config.DB.Save(&office).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update office location"})
	}

	if config.RedisClient != nil {
		config.RedisClient.Del(config.Ctx, "cache:office")
	}

	userID := c.Locals("user_id").(uint)
	utils.LogAction(userID, "UPDATE", "OfficeLocation", office.ID, "Admin updated office location settings")

	return c.JSON(office)
}

func GetWorkSchedule(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var schedule models.WorkSchedule

	if config.RedisClient != nil {
		cached, err := config.RedisClient.Get(config.Ctx, "cache:schedule").Result()
		if err == nil && cached != "" {
			if json.Unmarshal([]byte(cached), &schedule) == nil {
				return c.JSON(schedule)
			}
		}
	}

	if err := config.DB.First(&schedule).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Work schedule not found"})
	}

	if config.RedisClient != nil {
		if bytes, err := json.Marshal(schedule); err == nil {
			config.RedisClient.Set(config.Ctx, "cache:schedule", bytes, 1*time.Hour)
		}
	}

	return c.JSON(schedule)
}

func UpdateWorkSchedule(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var schedule models.WorkSchedule
	if err := config.DB.First(&schedule).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Work schedule not found"})
	}

	if err := c.BodyParser(&schedule); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := config.DB.Save(&schedule).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update work schedule"})
	}

	if config.RedisClient != nil {
		config.RedisClient.Del(config.Ctx, "cache:schedule")
	}

	userID := c.Locals("user_id").(uint)
	utils.LogAction(userID, "UPDATE", "WorkSchedule", schedule.ID, "Admin updated work schedule settings")

	return c.JSON(schedule)
}

func GetAuditLogs(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "25"))
	if limit < 1 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}

	query, err := auditLogQuery(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count audit logs"})
	}

	var logs []models.AuditLog
	if err := query.Preload("User").Order("audit_logs.created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&logs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch audit logs"})
	}

	return c.JSON(fiber.Map{"data": logs, "total": total, "page": page, "limit": limit})
}

func auditLogQuery(c *fiber.Ctx) (*gorm.DB, error) {
	query := config.DB.Model(&models.AuditLog{}).Joins("LEFT JOIN users ON users.id = audit_logs.user_id")
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		like := "%" + q + "%"
		query = query.Where("users.nama ILIKE ? OR users.email ILIKE ? OR audit_logs.changes_detail ILIKE ?", like, like, like)
	}
	if action := strings.TrimSpace(c.Query("action")); action != "" && action != "Semua" {
		query = query.Where("audit_logs.action = ?", action)
	}
	if tableName := strings.TrimSpace(c.Query("table_name")); tableName != "" && tableName != "Semua" {
		query = query.Where("audit_logs.table_name = ?", tableName)
	}
	if start := c.Query("start_date"); start != "" {
		date, err := time.Parse("2006-01-02", start)
		if err != nil {
			return nil, fmt.Errorf("start_date harus berformat YYYY-MM-DD")
		}
		query = query.Where("audit_logs.created_at >= ?", date)
	}
	if end := c.Query("end_date"); end != "" {
		date, err := time.Parse("2006-01-02", end)
		if err != nil {
			return nil, fmt.Errorf("end_date harus berformat YYYY-MM-DD")
		}
		query = query.Where("audit_logs.created_at < ?", date.AddDate(0, 0, 1))
	}
	return query, nil
}

func ExportAuditLogsCSV(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	query, err := auditLogQuery(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var logs []models.AuditLog
	if err := query.Preload("User").Order("audit_logs.created_at desc").Limit(5000).Find(&logs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to export audit logs"})
	}
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="audit-log.csv"`)
	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()
	_ = writer.Write([]string{"Waktu", "Nama Aktor", "Email", "Role", "Aksi", "Tabel", "Record ID", "Detail"})
	for _, log := range logs {
		_ = writer.Write([]string{
			log.CreatedAt.Format("2006-01-02 15:04:05"), log.User.Nama, log.User.Email,
			string(log.User.Role), log.Action, log.TableName, strconv.FormatUint(uint64(log.RecordID), 10), log.ChangesDetail,
		})
	}
	return nil
}

func GetNotificationSettings(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var settings []models.NotificationSetting
	if err := config.DB.Order("role asc, tipe_notifikasi asc").Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch notification settings"})
	}

	return c.JSON(settings)
}

func UpdateNotificationSettings(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var input []models.NotificationSetting
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input format"})
	}
	if len(input) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Minimal satu pengaturan harus dikirim"})
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start update"})
	}
	for _, setting := range input {
		setting.TipeNotifikasi = strings.TrimSpace(setting.TipeNotifikasi)
		if setting.TipeNotifikasi == "" || (setting.Role != models.RoleHRD && setting.Role != models.RoleKaryawan && setting.Role != models.RolePimpinan && setting.Role != models.RoleMagang && setting.Role != models.RoleManajer) {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tipe notifikasi dan role tidak valid"})
		}
		var existing models.NotificationSetting
		err := tx.Where("tipe_notifikasi = ? AND role = ?", setting.TipeNotifikasi, setting.Role).First(&existing).Error
		switch err {
		case nil:
			existing.IsEmailEnabled = setting.IsEmailEnabled
			existing.IsInAppEnabled = setting.IsInAppEnabled
			if err := tx.Save(&existing).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update notification settings"})
			}
		case gorm.ErrRecordNotFound:
			if err := tx.Create(&models.NotificationSetting{
				TipeNotifikasi: setting.TipeNotifikasi,
				Role:           setting.Role,
				IsEmailEnabled: setting.IsEmailEnabled,
				IsInAppEnabled: setting.IsInAppEnabled,
			}).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create notification settings"})
			}
		default:
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read notification settings"})
		}
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit notification settings"})
	}

	userID := c.Locals("user_id").(uint)
	utils.LogAction(userID, "UPDATE", "NotificationSetting", 0, "Admin updated notification settings")

	var updatedSettings []models.NotificationSetting
	config.DB.Order("role asc, tipe_notifikasi asc").Find(&updatedSettings)
	return c.JSON(updatedSettings)
}

func GetHelpdeskContact(c *fiber.Ctx) error {
	var contact models.HelpdeskContact
	if err := config.DB.First(&contact).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Helpdesk contact not found"})
	}
	return c.JSON(contact)
}

func UpdateHelpdeskContact(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var contact models.HelpdeskContact
	if err := config.DB.First(&contact).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Helpdesk contact not found"})
	}

	var input models.HelpdeskContact
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	contact.EmailHelpdesk = input.EmailHelpdesk
	contact.EmailIT = input.EmailIT
	contact.WhatsAppHRD = input.WhatsAppHRD
	contact.WhatsAppIT = input.WhatsAppIT
	contact.JamLayanan = input.JamLayanan

	if err := config.DB.Save(&contact).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update helpdesk contact"})
	}

	userID := c.Locals("user_id").(uint)
	utils.LogAction(userID, "UPDATE", "HelpdeskContact", contact.ID, "Admin updated helpdesk contact settings")

	return c.JSON(contact)
}
