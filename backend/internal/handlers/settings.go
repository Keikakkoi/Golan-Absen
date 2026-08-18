package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	storage "absensi-golan-backend/pkg/minio"
	"archive/zip"
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	minioSDK "github.com/minio/minio-go/v7"
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
	admin.Post("/backup/restore", RestoreBackup)
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
		MinimumMasaKerjaCutiBulan        int `json:"minimum_masa_kerja_cuti_bulan"`
		BatasLaporanSetelahCheckoutMenit int `json:"batas_laporan_setelah_checkout_menit"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if input.MinimumMasaKerjaCutiBulan < 0 || input.MinimumMasaKerjaCutiBulan > 120 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Minimum masa kerja harus antara 0 dan 120 bulan"})
	}
	if input.BatasLaporanSetelahCheckoutMenit < 0 || input.BatasLaporanSetelahCheckoutMenit > 24*60 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Toleransi laporan harus antara 0 dan 1.440 menit"})
	}
	var setting models.GeneralSetting
	if err := config.DB.First(&setting).Error; err != nil {
		setting = models.GeneralSetting{}
	}
	setting.MinimumMasaKerjaCutiBulan = input.MinimumMasaKerjaCutiBulan
	setting.BatasLaporanSetelahCheckoutMenit = input.BatasLaporanSetelahCheckoutMenit
	setting.BatasLaporanSetelahCheckoutJam = input.BatasLaporanSetelahCheckoutMenit / 60
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

type scheduleInput struct {
	EmployeeID              *uint      `json:"EmployeeID"`
	EmployeeIDs             []uint     `json:"EmployeeIDs"`
	Tanggal                 *time.Time `json:"Tanggal"`
	NamaShift               string     `json:"NamaShift"`
	JamMulai                string     `json:"JamMulai"`
	JamSelesai              string     `json:"JamSelesai"`
	ToleransiTerlambatMenit int        `json:"ToleransiTerlambatMenit"`
}

func selectedEmployeeIDs(input scheduleInput) []uint {
	ids := make([]uint, 0, len(input.EmployeeIDs)+1)
	seen := make(map[uint]bool)
	add := func(id uint) {
		if id > 0 && !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}
	for _, id := range input.EmployeeIDs {
		add(id)
	}
	if len(ids) == 0 && input.EmployeeID != nil {
		add(*input.EmployeeID)
	}
	return ids
}

func CreateSchedule(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var input scheduleInput
	if err := c.BodyParser(&input); err != nil || input.NamaShift == "" || input.JamMulai == "" || input.JamSelesai == "" || input.Tanggal == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nama shift, jam mulai, jam selesai, dan tanggal wajib diisi"})
	}

	employeeIDs := selectedEmployeeIDs(input)
	if len(employeeIDs) == 0 {
		var count int64
		config.DB.Model(&models.WorkSchedule{}).Where("employee_id IS NULL").Count(&count)
		if count > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Shift global (untuk semua karyawan) sudah ada. Hanya boleh ada satu shift global."})
		}
	}

	if len(employeeIDs) > 0 {
		var employeeCount int64
		if err := config.DB.Model(&models.Employee{}).Where("id IN ?", employeeIDs).Count(&employeeCount).Error; err != nil || employeeCount != int64(len(employeeIDs)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ada karyawan yang tidak valid"})
		}
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memulai penyimpanan shift"})
	}
	createSchedule := func(employeeID *uint) models.WorkSchedule {
		return models.WorkSchedule{EmployeeID: employeeID, Tanggal: input.Tanggal, NamaShift: input.NamaShift, JamMulai: input.JamMulai, JamSelesai: input.JamSelesai, ToleransiTerlambatMenit: input.ToleransiTerlambatMenit}
	}
	created := make([]models.WorkSchedule, 0, len(employeeIDs))
	if len(employeeIDs) == 0 {
		schedule := createSchedule(nil)
		if err := tx.Create(&schedule).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan shift ke database: " + err.Error()})
		}
		created = append(created, schedule)
	} else {
		for _, employeeID := range employeeIDs {
			id := employeeID
			schedule := createSchedule(&id)
			if err := tx.Create(&schedule).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan shift ke database: " + err.Error()})
			}
			created = append(created, schedule)
		}
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan shift ke database: " + err.Error()})
	}
	userID := c.Locals("user_id").(uint)
	for _, schedule := range created {
		notifyScheduleChange(schedule, nil, false)
		utils.LogAction(userID, "CREATE", "WorkSchedule", schedule.ID, "Admin created work schedule: "+schedule.NamaShift)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func UpdateSchedule(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var schedule models.WorkSchedule
	if err := config.DB.First(&schedule, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Schedule not found"})
	}
	previousSchedule := schedule
	var input scheduleInput
	if err := c.BodyParser(&input); err != nil || input.NamaShift == "" || input.JamMulai == "" || input.JamSelesai == "" || input.Tanggal == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nama shift, jam mulai, jam selesai, dan tanggal wajib diisi"})
	}

	employeeIDs := selectedEmployeeIDs(input)
	if len(employeeIDs) == 0 {
		var count int64
		config.DB.Model(&models.WorkSchedule{}).Where("employee_id IS NULL AND id != ?", schedule.ID).Count(&count)
		if count > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Shift global (untuk semua karyawan) sudah ada. Hanya boleh ada satu shift global."})
		}
		input.EmployeeID = nil
	}
	if len(employeeIDs) > 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Edit shift hanya dapat dilakukan untuk satu karyawan"})
	}

	if len(employeeIDs) == 1 {
		employeeID := employeeIDs[0]
		schedule.EmployeeID = &employeeID
	} else {
		schedule.EmployeeID = nil
	}
	schedule.Tanggal = input.Tanggal
	schedule.NamaShift = input.NamaShift
	schedule.JamMulai = input.JamMulai
	schedule.JamSelesai = input.JamSelesai
	schedule.ToleransiTerlambatMenit = input.ToleransiTerlambatMenit

	if err := config.DB.Save(&schedule).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengupdate shift ke database: " + err.Error()})
	}
	notifyScheduleChange(schedule, &previousSchedule, false)
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
	notifyScheduleChange(schedule, nil, true)
	if err := config.DB.Delete(&schedule).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete schedule"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "WorkSchedule", schedule.ID, "Admin deleted work schedule: "+schedule.NamaShift)
	return c.JSON(fiber.Map{"message": "Schedule deleted successfully"})
}

// notifyScheduleChange keeps every non-admin employee informed when an admin
// assigns, changes, or removes a shift. The profile exposes the same schedule
// rows as a durable reference, while this notification provides the immediate
// warning on dashboards and in the notification center.
func notifyScheduleChange(schedule models.WorkSchedule, previous *models.WorkSchedule, deleted bool) {
	recipientIDs := make(map[uint]bool)
	addRecipients := func(employeeID *uint) {
		var employees []models.Employee
		query := config.DB.Preload("User")
		if employeeID != nil && *employeeID != 0 {
			query = query.Where("id = ?", *employeeID)
		}
		if err := query.Find(&employees).Error; err != nil {
			return
		}
		for _, employee := range employees {
			if employee.User != nil && employee.User.Role != models.RoleHRD {
				recipientIDs[employee.UserID] = true
			}
		}
	}

	// A global shift applies to everyone. An update can move a shift from one
	// employee to another, so include both the old and new recipients.
	if schedule.EmployeeID == nil || *schedule.EmployeeID == 0 {
		addRecipients(nil)
	} else {
		addRecipients(schedule.EmployeeID)
	}
	if previous != nil && previous.EmployeeID != nil && *previous.EmployeeID != 0 {
		addRecipients(previous.EmployeeID)
	}

	dateLabel := "tanggal yang ditentukan"
	if schedule.Tanggal != nil {
		dateLabel = schedule.Tanggal.Format("02 Jan 2006")
	}
	title := "Jadwal Shift Baru"
	verb := "ditetapkan"
	if previous != nil {
		title = "Jadwal Shift Diperbarui"
		verb = "diperbarui"
	}
	if deleted {
		title = "Jadwal Shift Dihapus"
		verb = "dihapus"
	}

	message := fmt.Sprintf("Shift %s pada %s %s: %s–%s. Check-in hanya dapat dilakukan mulai jam shift dan check-out mengikuti batas shift.", schedule.NamaShift, dateLabel, verb, schedule.JamMulai, schedule.JamSelesai)
	if deleted {
		message = fmt.Sprintf("Shift %s pada %s telah dihapus oleh admin. Silakan cek jadwal terbaru di profil Anda.", schedule.NamaShift, dateLabel)
	}
	for userID := range recipientIDs {
		var user models.User
		if err := config.DB.First(&user, userID).Error; err == nil {
			_ = utils.CreateNotification(config.DB, user.ID, user.Role, "Jadwal Shift", title, message)
		}
	}
}

func BackupDatabase(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
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
		projects           []models.Project
		companyEvents      []models.CompanyEvent
		internshipCerts    []models.InternshipCertificate
		internshipDocs     []models.InternshipDocument
		issuanceLogs       []models.CertificateIssuanceLog
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
		{"projects", &projects}, {"company_events", &companyEvents},
		{"internship_certificates", &internshipCerts}, {"internship_documents", &internshipDocs},
		{"certificate_issuance_logs", &issuanceLogs},
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
			"projects": projects, "company_events": companyEvents,
			"internship_certificates": internshipCerts, "internship_documents": internshipDocs,
			"certificate_issuance_logs": issuanceLogs,
		},
	}

	backupFilename := "backup_golan_db_" + time.Now().Format("20060102150405")
	backupFormat := strings.ToLower(strings.TrimSpace(c.Query("format", "json")))
	if backupFormat != "json" && backupFormat != "zip" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format backup tidak didukung"})
	}
	if requested := strings.TrimSpace(c.Query("name")); requested != "" {
		requested = strings.TrimSuffix(requested, ".json")
		requested = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
				return r
			}
			return -1
		}, requested)
		if requested != "" {
			backupFilename = requested
		}
	}
	jsonData, err := json.Marshal(backupData)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat isi backup"})
	}
	if backupFormat == "zip" {
		var archive bytes.Buffer
		writer := zip.NewWriter(&archive)
		entry, err := writer.Create(backupFilename + ".json")
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat arsip backup"})
		}
		if _, err = entry.Write(jsonData); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menulis isi backup"})
		}
		if err = appendInternshipBackupFiles(writer, internshipCerts, internshipDocs); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mencadangkan file sertifikat atau dokumen magang: " + err.Error()})
		}
		if err = writer.Close(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengompres backup"})
		}
		c.Set("Content-Disposition", "attachment; filename="+backupFilename+".zip")
		c.Set("Content-Type", "application/zip")
		c.Set("Content-Length", strconv.Itoa(archive.Len()))
		return c.SendStream(bytes.NewReader(archive.Bytes()))
	}
	c.Set("Content-Disposition", "attachment; filename="+backupFilename+".json")
	c.Set("Content-Type", "application/json")
	return c.Send(jsonData)
}

// appendInternshipBackupFiles stores the actual certificate/document objects
// in ZIP backups. JSON backups retain their database metadata and storage key.
func appendInternshipBackupFiles(writer *zip.Writer, certificates []models.InternshipCertificate, documents []models.InternshipDocument) error {
	if storage.Client == nil {
		return nil
	}
	add := func(key, folder, filename string) error {
		if strings.TrimSpace(key) == "" {
			return nil
		}
		object, err := storage.Client.GetObject(context.Background(), storage.BucketName, key, minioSDK.GetObjectOptions{})
		if err != nil {
			return err
		}
		defer object.Close()
		content, err := io.ReadAll(io.LimitReader(object, 10*1024*1024+1))
		if err != nil {
			return err
		}
		if len(content) > 10*1024*1024 {
			return fmt.Errorf("file %s melebihi batas 10 MB", key)
		}
		name := filepath.Base(filename)
		if name == "." || name == "" || name == string(filepath.Separator) {
			name = filepath.Base(key)
		}
		name = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
				return r
			}
			return '-'
		}, name)
		entry, err := writer.Create("files/" + folder + "/" + name)
		if err != nil {
			return err
		}
		_, err = entry.Write(content)
		return err
	}
	for _, certificate := range certificates {
		if err := add(certificate.StorageKey, "certificates", fmt.Sprintf("%d-%s", certificate.ID, certificate.FileName)); err != nil {
			return err
		}
	}
	for _, document := range documents {
		if err := add(document.StorageKey, "documents", fmt.Sprintf("%d-%s", document.ID, document.FileName)); err != nil {
			return err
		}
	}
	return nil
}

type restoreRequest struct {
	Mode         string `json:"mode"`
	Confirmation string `json:"confirmation"`
}

// RestoreBackup restores only the explicitly supported JSON snapshot format.
// Every write is performed in one transaction; a single invalid row rolls the
// entire operation back. Existing audit logs are intentionally never imported.
func RestoreBackup(c *fiber.Ctx) error {
	if !isHRD(c) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Anda tidak memiliki izin untuk melakukan restore"})
	}
	file, err := c.FormFile("file")
	if err != nil || file == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File backup wajib diunggah"})
	}
	if file.Size <= 0 || file.Size > 20*1024*1024 || !strings.HasSuffix(strings.ToLower(file.Filename), ".json") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File harus berupa JSON dan berukuran maksimal 20 MB"})
	}
	mode := strings.ToLower(strings.TrimSpace(c.FormValue("mode", "add")))
	if mode != "add" && mode != "overwrite" && mode != "full" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Mode restore tidak valid"})
	}
	if mode == "full" && strings.TrimSpace(c.FormValue("confirmation")) != "RESTORE DATA" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Konfirmasi RESTORE DATA wajib diisi untuk restore penuh"})
	}
	handle, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File backup tidak dapat dibaca"})
	}
	defer handle.Close()
	body, err := io.ReadAll(io.LimitReader(handle, 20*1024*1024+1))
	if err != nil || len(body) > 20*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File backup tidak dapat dibaca"})
	}
	var snapshot struct {
		Meta       map[string]any             `json:"backup_meta"`
		LegacyMeta map[string]any             `json:"metadata"`
		Data       map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &snapshot); err != nil || snapshot.Data == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Struktur file backup tidak valid"})
	}
	meta := snapshot.Meta
	if meta == nil {
		meta = snapshot.LegacyMeta
	}
	if meta == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Metadata backup tidak ditemukan"})
	}
	if version, ok := meta["backup_format_version"].(string); ok && version != "1.0" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Versi backup tidak kompatibel dengan aplikasi ini"})
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Restore gagal dimulai"})
	}
	if mode == "full" {
		if err := clearRestoreTables(tx); err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Restore penuh gagal: " + err.Error()})
		}
	}
	counts := map[string]int{}
	collections := []struct {
		key     string
		rows    json.RawMessage
		restore func(json.RawMessage, string) (int, error)
	}{
		{"users", snapshot.Data["users"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "users", func(b []byte) (uint, error) {
				var v models.User
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Manager = nil
				v.Project = nil
				v.Employee = models.Employee{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"divisions", snapshot.Data["divisions"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "divisions", func(b []byte) (uint, error) {
				var v models.Division
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Employees = nil
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"positions", snapshot.Data["positions"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "positions", func(b []byte) (uint, error) {
				var v models.Position
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Employees = nil
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"projects", snapshot.Data["projects"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "projects", func(b []byte) (uint, error) {
				var v models.Project
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"company_events", snapshot.Data["company_events"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "company_events", func(b []byte) (uint, error) {
				var v models.CompanyEvent
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"employees", snapshot.Data["employees"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "employees", func(b []byte) (uint, error) {
				var v models.Employee
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.User = nil
				v.Division = models.Division{}
				v.Position = models.Position{}
				v.HomeLocation = nil
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"work_types", snapshot.Data["work_types"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "work_types", func(b []byte) (uint, error) {
				var v models.WorkType
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"internship_certificates", snapshot.Data["internship_certificates"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "internship_certificates", func(b []byte) (uint, error) {
				var v models.InternshipCertificate
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.User = models.User{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"internship_documents", snapshot.Data["internship_documents"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "internship_documents", func(b []byte) (uint, error) {
				var v models.InternshipDocument
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.User = models.User{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"certificate_issuance_logs", snapshot.Data["certificate_issuance_logs"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "certificate_issuance_logs", func(b []byte) (uint, error) {
				var v models.CertificateIssuanceLog
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"employee_home_locations", snapshot.Data["employee_home_locations"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "employee_home_locations", func(b []byte) (uint, error) {
				var v models.EmployeeHomeLocation
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Employee = models.Employee{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"attendance_records", snapshot.Data["attendance_records"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "attendance_records", func(b []byte) (uint, error) {
				var v models.AttendanceRecord
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Employee = models.Employee{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"leave_requests", snapshot.Data["leave_requests"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "leave_requests", func(b []byte) (uint, error) {
				var v models.LeaveRequest
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Employee = models.Employee{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"leave_quotas", snapshot.Data["leave_quotas"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "leave_quotas", func(b []byte) (uint, error) {
				var v models.LeaveQuota
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Employee = models.Employee{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"work_schedules", snapshot.Data["work_schedules"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "work_schedules", func(b []byte) (uint, error) {
				var v models.WorkSchedule
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.Employee = models.Employee{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"office_locations", snapshot.Data["office_locations"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "office_locations", func(b []byte) (uint, error) {
				var v models.OfficeLocation
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"holidays", snapshot.Data["holidays"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "holidays", func(b []byte) (uint, error) {
				var v models.Holiday
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"notifications", snapshot.Data["notifications"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "notifications", func(b []byte) (uint, error) {
				var v models.Notification
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				v.User = models.User{}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
		{"notification_settings", snapshot.Data["notification_settings"], func(r json.RawMessage, m string) (int, error) {
			return restoreRows(tx, r, m, "notification_settings", func(b []byte) (uint, error) {
				var v models.NotificationSetting
				if err := json.Unmarshal(b, &v); err != nil {
					return 0, err
				}
				return v.ID, saveRestoreRow(tx, &v, m)
			})
		}},
	}
	for _, collection := range collections {
		if len(collection.rows) == 0 || string(collection.rows) == "null" {
			continue
		}
		n, e := collection.restore(collection.rows, mode)
		if e != nil {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Restore gagal pada " + collection.key + ": " + e.Error(), "rollback": true})
		}
		counts[collection.key] = n
	}
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Restore gagal. Tidak ada perubahan data yang diterapkan.", "rollback": true})
	}
	userID, _ := c.Locals("user_id").(uint)
	utils.LogAction(userID, "RESTORE", "Backup", 0, fmt.Sprintf("Restore backup %s dengan mode %s; %v", file.Filename, mode, counts))
	return c.JSON(fiber.Map{"message": "Restore berhasil", "mode": mode, "restored": counts, "skipped": 0, "conflicts": 0, "failed": 0})
}

func restoreRows(tx *gorm.DB, raw json.RawMessage, mode, table string, decode func([]byte) (uint, error)) (int, error) {
	var rows []json.RawMessage
	if err := json.Unmarshal(raw, &rows); err != nil {
		return 0, fmt.Errorf("data %s bukan array", table)
	}
	count := 0
	for _, row := range rows {
		id, err := decode(row)
		if err != nil {
			return 0, err
		}
		if id == 0 {
			return 0, fmt.Errorf("ID %s tidak valid", table)
		}
		count++
	}
	return count, nil
}
func saveRestoreRow(tx *gorm.DB, value any, mode string) error {
	modelValue := reflect.ValueOf(value).Elem()
	id := modelValue.FieldByName("Model").FieldByName("ID").Uint()
	// Use a separate destination for the lookup. Querying into value would
	// overwrite the backup row with the database row before Save was called.
	existing := reflect.New(modelValue.Type()).Interface()
	err := tx.Unscoped().First(existing, id).Error
	if err == nil {
		if mode == "add" {
			return nil
		}
		// A soft-deleted row still owns its primary key. Clear DeletedAt so
		// Save updates that physical row instead of attempting an INSERT.
		deletedAt := modelValue.FieldByName("Model").FieldByName("DeletedAt")
		if deletedAt.IsValid() && deletedAt.CanSet() {
			deletedAt.Set(reflect.Zero(deletedAt.Type()))
		}
		return tx.Save(value).Error
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}
	return tx.Create(value).Error
}
func clearRestoreTables(tx *gorm.DB) error {
	// Keep users and audit logs intact so restore cannot break the audit trail
	// or the self-referencing manager foreign key. User rows are upserted later.
	if err := tx.Model(&models.User{}).Where("project_id IS NOT NULL").Update("project_id", nil).Error; err != nil {
		return err
	}
	for _, value := range []any{&models.AttendanceRecord{}, &models.LeaveRequest{}, &models.LeaveQuota{}, &models.WorkSchedule{}, &models.EmployeeHomeLocation{}, &models.Notification{}, &models.InternshipDocument{}, &models.InternshipCertificate{}, &models.CertificateIssuanceLog{}, &models.CompanyEvent{}, &models.Employee{}, &models.Project{}, &models.Division{}, &models.Position{}, &models.WorkType{}, &models.OfficeLocation{}, &models.Holiday{}, &models.NotificationSetting{}} {
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(value).Error; err != nil {
			return err
		}
	}
	return nil
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
	if role != models.RoleHRD {
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
	if role != models.RoleHRD {
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
		if setting.TipeNotifikasi == "" || (setting.Role != models.RoleHRD && setting.Role != models.RoleKaryawan && setting.Role != models.RoleMagang && setting.Role != models.RoleManajer) {
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
