package handlers

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"absensi-golan-backend/pkg/minio"

	"github.com/gofiber/fiber/v2"
	miniogo "github.com/minio/minio-go/v7"
)

func SetupWorkReportRoutes(api fiber.Router) {
	reportGroup := api.Group("/work-reports")
	reportGroup.Use(middleware.Protected())

	reportGroup.Get("/columns", GetWorkReportColumns)
	reportGroup.Post("/columns", CreateWorkReportColumn)
	reportGroup.Put("/columns/:id", UpdateWorkReportColumn)
	reportGroup.Delete("/columns/:id", DeleteWorkReportColumn)

	reportGroup.Get("/compliance", GetWorkReportCompliance)
	reportGroup.Get("/deadline", GetWorkReportDeadline)
	reportGroup.Get("/", GetWorkReports)
	reportGroup.Post("/", CreateWorkReport)
	reportGroup.Put("/:id", UpdateWorkReport)
	reportGroup.Delete("/:id", DeleteWorkReport)
}

func GetWorkReportColumns(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	var columns []models.WorkReportColumn
	userRole := string(c.Locals("role").(models.Role))

	query := config.DB.Order("urutan asc")
	if userRole != string(models.RoleHRD) {
		query = query.Where("aktif = ?", true)
	}

	if err := query.Find(&columns).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch columns"})
	}

	return c.JSON(columns)
}

func CreateWorkReportColumn(c *fiber.Ctx) error {
	if role := c.Locals("role").(models.Role); role != models.RoleHRD {
		return c.Status(403).JSON(fiber.Map{"error": "Only HRD can manage report columns"})
	}
	var input struct {
		NamaKolom  string `json:"nama_kolom"`
		TipeInput  string `json:"tipe_input"`
		Opsi       string `json:"opsi"`
		Aktif      bool   `json:"aktif"`
		WajibDiisi bool   `json:"wajib_diisi"`
		Urutan     int    `json:"urutan"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	column := models.WorkReportColumn{
		NamaKolom:  input.NamaKolom,
		TipeInput:  input.TipeInput,
		Opsi:       input.Opsi,
		Aktif:      input.Aktif,
		WajibDiisi: input.WajibDiisi,
		Urutan:     input.Urutan,
	}

	if err := config.DB.Create(&column).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create column"})
	}

	return c.JSON(column)
}

func UpdateWorkReportColumn(c *fiber.Ctx) error {
	if role := c.Locals("role").(models.Role); role != models.RoleHRD {
		return c.Status(403).JSON(fiber.Map{"error": "Only HRD can manage report columns"})
	}
	id := c.Params("id")
	var column models.WorkReportColumn
	if err := config.DB.First(&column, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Column not found"})
	}

	var input struct {
		NamaKolom  string `json:"nama_kolom"`
		TipeInput  string `json:"tipe_input"`
		Opsi       string `json:"opsi"`
		Aktif      bool   `json:"aktif"`
		WajibDiisi bool   `json:"wajib_diisi"`
		Urutan     int    `json:"urutan"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	config.DB.Model(&column).Updates(input)
	return c.JSON(column)
}

func DeleteWorkReportColumn(c *fiber.Ctx) error {
	if role := c.Locals("role").(models.Role); role != models.RoleHRD {
		return c.Status(403).JSON(fiber.Map{"error": "Only HRD can manage report columns"})
	}
	id := c.Params("id")
	if err := config.DB.Delete(&models.WorkReportColumn{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete column"})
	}
	return c.JSON(fiber.Map{"message": "Column deleted successfully"})
}

func GetWorkReports(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	EnsureDailyWorkReportsAutoCreated(config.DB, attendanceNow())
	userID := c.Locals("user_id").(uint)
	userRole := string(c.Locals("role").(models.Role))

	var reports []models.WorkReport
	query := config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("Attachments").Order("tanggal desc")

	if userRole != string(models.RoleHRD) {
		var emp models.Employee
		if err := config.DB.Where("user_id = ?", userID).First(&emp).Error; err == nil {
			query = query.Where("employee_id = ?", emp.ID)
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "Employee not found"})
		}
	} else {
		empID := c.Query("employee_id")
		if empID != "" {
			query = query.Where("employee_id = ?", empID)
		}
		if projectID := c.Query("project_id"); projectID != "" {
			query = query.Where("employee_id IN (SELECT employees.id FROM employees JOIN users ON users.id = employees.user_id WHERE users.project_id = ?)", projectID)
		}
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate != "" && endDate != "" {
		query = query.Where("tanggal BETWEEN ? AND ?", startDate, endDate)
	}

	if err := query.Find(&reports).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}

	return c.JSON(reports)
}

func CreateWorkReport(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var emp models.Employee
	if err := config.DB.Preload("User").Where("user_id = ?", userID).First(&emp).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Employee not found"})
	}

	input, files, err := parseWorkReportInput(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	t, err := time.Parse("2006-01-02", input.Tanggal)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid date format"})
	}
	if _, ok := getWorkReportSchedule(emp.ID, t); !ok {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Tidak ada shift aktif atau jadwal shift untuk tanggal laporan ini. Hubungi admin untuk penjadwalan shift."})
	}

	statusLogbook := "submitted"
	var existing models.WorkReport
	if config.DB.Where("employee_id = ? AND tanggal = ?", emp.ID, t).First(&existing).Error == nil {
		updates := map[string]interface{}{
			"tugas":                input.Tugas,
			"judul":                input.Judul,
			"deskripsi_kegiatan":   input.DeskripsiKegiatan,
			"realisasi_kegiatan":   input.RealisasiKegiatan,
			"kendala":              input.Kendala,
			"rencana_minggu_depan": input.RencanaMingguDepan,
			"link_artikel":         input.LinkArtikel,
			"catatan_tambahan":     input.CatatanTambahan,
			"custom_fields":        input.CustomFields,
			"status_logbook":       statusLogbook,
			"is_late_submission":   existing.IsLateSubmission || isLateWorkReportSubmission(emp.ID, t),
		}
		if existing.StatusSesuai == "tidak membuat laporan kerja" {
			updates["status_sesuai"] = ""
		}
		if err := config.DB.Model(&existing).Updates(updates).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update work report"})
		}
		if len(files) > 0 {
			saveWorkReportAttachments(existing.ID, emp.NIK, files)
		}
		config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("Attachments").First(&existing, existing.ID)
		return c.JSON(existing)
	}

	report := models.WorkReport{
		EmployeeID:         emp.ID,
		Tanggal:            t,
		Tugas:              input.Tugas,
		Judul:              input.Judul,
		DeskripsiKegiatan:  input.DeskripsiKegiatan,
		RealisasiKegiatan:  input.RealisasiKegiatan,
		Kendala:            input.Kendala,
		RencanaMingguDepan: input.RencanaMingguDepan,
		LinkArtikel:        input.LinkArtikel,
		CatatanTambahan:    input.CatatanTambahan,
		CustomFields:       input.CustomFields,
		StatusLogbook:      statusLogbook,
		IsLateSubmission:   isLateWorkReportSubmission(emp.ID, t),
	}

	if err := config.DB.Create(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create work report"})
	}
	if err := saveWorkReportAttachments(report.ID, emp.NIK, files); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("Attachments").First(&report, report.ID)
	WsHub.Broadcast <- fiber.Map{"event": "new_work_report"}

	// Notify HRD about the new work report
	var hrdUsers []models.User
	if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
		nama := "Karyawan"
		if emp.User != nil {
			nama = emp.User.Nama
		}
		for _, u := range hrdUsers {
			utils.CreateNotification(config.DB, u.ID, models.RoleHRD, "Laporan Kerja", "Laporan Kerja Baru", fmt.Sprintf("Ada laporan kerja baru dari %s pada tanggal %s", nama, report.Tanggal.Format("02-01-2006")))
		}
	}

	return c.JSON(report)
}

func UpdateWorkReport(c *fiber.Ctx) error {
	id := c.Params("id")
	var report models.WorkReport
	if err := config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").First(&report, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Work report not found"})
	}

	userRole := string(c.Locals("role").(models.Role))
	userID := c.Locals("user_id").(uint)

	if userRole != string(models.RoleHRD) {
		var emp models.Employee
		if err := config.DB.Where("user_id = ?", userID).First(&emp).Error; err == nil {
			if report.EmployeeID != emp.ID {
				return c.Status(403).JSON(fiber.Map{"error": "Not your report"})
			}
		}
	}

	input, files, err := parseWorkReportInput(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	updates := map[string]interface{}{}

	if input.Tanggal != "" {
		if t, err := time.Parse("2006-01-02", input.Tanggal); err == nil {
			updates["tanggal"] = t
		}
	}
	if input.Tugas != "" {
		updates["tugas"] = input.Tugas
	}
	if input.Judul != "" {
		updates["judul"] = input.Judul
	}
	if input.DeskripsiKegiatan != "" {
		updates["deskripsi_kegiatan"] = input.DeskripsiKegiatan
	}
	if input.RealisasiKegiatan != "" {
		updates["realisasi_kegiatan"] = input.RealisasiKegiatan
	}
	if input.Kendala != "" {
		updates["kendala"] = input.Kendala
	}
	if input.RencanaMingguDepan != "" {
		updates["rencana_minggu_depan"] = input.RencanaMingguDepan
	}
	if input.LinkArtikel != "" {
		updates["link_artikel"] = input.LinkArtikel
	}
	if input.CatatanTambahan != "" {
		updates["catatan_tambahan"] = input.CatatanTambahan
	}
	if input.CustomFields != "" {
		updates["custom_fields"] = input.CustomFields
	}

	var statusChanged bool

	if userRole == string(models.RoleHRD) {
		if input.StatusSesuai != "" && input.StatusSesuai != report.StatusSesuai {
			updates["status_sesuai"] = input.StatusSesuai
			updates["validasi_oleh_hr"] = true
			statusChanged = true
		}
	}

	if err := config.DB.Model(&report).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update report"})
	}
	if len(files) > 0 {
		if err := saveWorkReportAttachments(report.ID, report.Employee.NIK, files); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	}
	config.DB.Preload("Attachments").First(&report, report.ID)

	// Notify the employee if HRD updated their report
	if statusChanged && report.Employee.UserID != 0 {
		utils.CreateNotification(config.DB, report.Employee.UserID, models.RoleKaryawan, "Laporan Kerja", "Status Laporan Diperbarui", fmt.Sprintf("Laporan kerja Anda tanggal %s telah diperbarui menjadi: %s", report.Tanggal.Format("02-01-2006"), input.StatusSesuai))
	}

	return c.JSON(report)
}

func DeleteWorkReport(c *fiber.Ctx) error {
	id := c.Params("id")
	var report models.WorkReport
	if err := config.DB.First(&report, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Report not found"})
	}
	role := string(c.Locals("role").(models.Role))
	if role != string(models.RoleHRD) {
		var employee models.Employee
		if err := config.DB.Where("user_id = ?", c.Locals("user_id").(uint)).First(&employee).Error; err != nil || report.EmployeeID != employee.ID {
			return c.Status(403).JSON(fiber.Map{"error": "Not your report"})
		}
	}
	if err := config.DB.Delete(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete report"})
	}
	return c.JSON(fiber.Map{"message": "Report deleted successfully"})
}

func GetWorkReportCompliance(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	userRole := string(c.Locals("role").(models.Role))

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
		endDate = now.Format("2006-01-02")
	}

	var emp models.Employee
	var empID uint

	if userRole != string(models.RoleHRD) {
		if err := config.DB.Where("user_id = ?", userID).First(&emp).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Employee not found"})
		}
		empID = emp.ID
	} else {
		eID := c.Query("employee_id")
		if eID != "" {
			id, _ := strconv.Atoi(eID)
			empID = uint(id)
		}
	}

	var attendances []models.AttendanceRecord
	attQuery := config.DB.Where("tanggal BETWEEN ? AND ?", startDate, endDate).Where("status != ?", "Alpha")
	if empID != 0 {
		attQuery = attQuery.Where("employee_id = ?", empID)
	}
	attQuery.Order("tanggal ASC").Find(&attendances)

	var reports []models.WorkReport
	repQuery := config.DB.Where("tanggal BETWEEN ? AND ?", startDate, endDate)
	if empID != 0 {
		repQuery = repQuery.Where("employee_id = ?", empID)
	}
	repQuery.Find(&reports)

	reportMap := make(map[string]bool)
	for _, r := range reports {
		key := fmt.Sprintf("%d_%s", r.EmployeeID, r.Tanggal.Format("2006-01-02"))
		reportMap[key] = true
	}

	type ComplianceResult struct {
		EmployeeID uint   `json:"employee_id"`
		Tanggal    string `json:"tanggal"`
		HasReport  bool   `json:"has_report"`
		IsAttended bool   `json:"is_attended"`
	}

	var results []ComplianceResult
	attendedMap := make(map[string]bool)
	for _, a := range attendances {
		attendedMap[a.Tanggal.Format("2006-01-02")] = true
	}

	start, _ := time.Parse("2006-01-02", startDate)
	end, _ := time.Parse("2006-01-02", endDate)

	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		key := fmt.Sprintf("%d_%s", empID, dateStr)

		results = append(results, ComplianceResult{
			EmployeeID: empID,
			Tanggal:    dateStr,
			HasReport:  reportMap[key],
			IsAttended: attendedMap[dateStr],
		})
	}

	return c.JSON(results)
}

type workReportInput struct {
	Tanggal            string `json:"tanggal"`
	Tugas              string `json:"tugas"`
	Judul              string `json:"judul"`
	DeskripsiKegiatan  string `json:"deskripsi_kegiatan"`
	RealisasiKegiatan  string `json:"realisasi_kegiatan"`
	Kendala            string `json:"kendala"`
	RencanaMingguDepan string `json:"rencana_minggu_depan"`
	LinkArtikel        string `json:"link_artikel"`
	CatatanTambahan    string `json:"catatan_tambahan"`
	CustomFields       string `json:"custom_fields"`
	StatusSesuai       string `json:"status_sesuai"`
	Status             string `json:"status"`
	StatusLogbook      string `json:"status_logbook"`
}

func parseWorkReportInput(c *fiber.Ctx) (workReportInput, []*multipart.FileHeader, error) {
	var input workReportInput
	contentType := strings.ToLower(c.Get("Content-Type"))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		input.Tanggal = c.FormValue("tanggal")
		input.Tugas = c.FormValue("tugas")
		input.Judul = c.FormValue("judul")
		input.DeskripsiKegiatan = c.FormValue("deskripsi_kegiatan")
		input.RealisasiKegiatan = c.FormValue("realisasi_kegiatan")
		input.Kendala = c.FormValue("kendala")
		input.RencanaMingguDepan = c.FormValue("rencana_minggu_depan")
		input.LinkArtikel = c.FormValue("link_artikel")
		input.CatatanTambahan = c.FormValue("catatan_tambahan")
		input.CustomFields = c.FormValue("custom_fields")
		input.StatusSesuai = c.FormValue("status_sesuai")
		input.Status = c.FormValue("status")
		if input.Status == "" {
			input.Status = c.FormValue("status_logbook")
		}
		form, err := c.MultipartForm()
		if err != nil {
			return input, nil, err
		}
		files := form.File["screenshots"]
		if len(files) == 0 {
			files = form.File["screenshots[]"]
		}
		if len(files) > 3 {
			return input, nil, fmt.Errorf("maksimal 3 screenshot per laporan")
		}
		for _, file := range files {
			if file.Size > 5*1024*1024 {
				return input, nil, fmt.Errorf("ukuran setiap screenshot maksimal 5MB")
			}
			if !isAllowedScreenshot(file) {
				return input, nil, fmt.Errorf("screenshot hanya boleh JPG, PNG, atau WEBP")
			}
		}
		return input, files, nil
	}
	if err := c.BodyParser(&input); err != nil {
		return input, nil, err
	}
	if input.Status == "" && input.StatusLogbook != "" {
		input.Status = input.StatusLogbook
	}
	return input, nil, nil
}

func isAllowedScreenshot(file *multipart.FileHeader) bool {
	mimeType := strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type")))
	if mimeType == "image/jpeg" || mimeType == "image/png" || mimeType == "image/webp" {
		return true
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp"
}

func saveWorkReportAttachments(reportID uint, nik string, files []*multipart.FileHeader) error {
	var existingCount int64
	config.DB.Model(&models.WorkReportAttachment{}).Where("work_report_id = ?", reportID).Count(&existingCount)
	if existingCount+int64(len(files)) > 3 {
		return fmt.Errorf("maksimal 3 screenshot per laporan")
	}
	for _, file := range files {
		src, err := file.Open()
		if err != nil {
			return fmt.Errorf("gagal memproses screenshot")
		}
		key := fmt.Sprintf("%s-work-report-%d-%d%s", nik, reportID, time.Now().UnixNano(), filepath.Ext(file.Filename))
		_, uploadErr := minio.Client.PutObject(context.Background(), minio.BucketName, key, src, file.Size, miniogo.PutObjectOptions{ContentType: file.Header.Get("Content-Type")})
		src.Close()
		if uploadErr != nil {
			return fmt.Errorf("gagal menyimpan screenshot")
		}
		cfg := config.LoadConfig()
		url := fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, minio.BucketName, key)
		attachment := models.WorkReportAttachment{WorkReportID: reportID, FileURL: url, StorageKey: key, FileName: file.Filename, MimeType: file.Header.Get("Content-Type"), FileSize: file.Size}
		if err := config.DB.Create(&attachment).Error; err != nil {
			return fmt.Errorf("gagal menyimpan metadata screenshot")
		}
	}
	return nil
}

func isLateWorkReportSubmission(employeeID uint, date time.Time) bool {
	setting := getGeneralSetting()
	now := attendanceNow()
	schedule, assigned := getWorkReportSchedule(employeeID, date)
	if !assigned {
		return false
	}
	var record models.AttendanceRecord
	if config.DB.Where("employee_id = ? AND tanggal = ?", employeeID, date.Format("2006-01-02")).First(&record).Error == nil {
		deadline := workReportDeadline(record, schedule, setting)
		return now.After(deadline)
	}
	deadline := scheduleEndTime(schedule, date).Add(time.Duration(setting.BatasLaporanSetelahCheckoutMenit) * time.Minute)
	return now.After(deadline)
}

// GetWorkReportDeadline exposes the authoritative WIB deadline used on submit.
func GetWorkReportDeadline(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Employee not found"})
	}
	dateText := c.Query("date")
	if dateText == "" {
		dateText = attendanceNow().Format("2006-01-02")
	}
	date, err := time.ParseInLocation("2006-01-02", dateText, jakartaLocation)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal harus berformat YYYY-MM-DD"})
	}
	schedule, assigned := getWorkReportSchedule(employee.ID, date)
	if !assigned {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Tidak ada shift aktif atau jadwal shift untuk tanggal laporan ini. Hubungi admin untuk penjadwalan shift."})
	}
	setting := getGeneralSetting()
	deadline := scheduleEndTime(schedule, date).Add(time.Duration(setting.BatasLaporanSetelahCheckoutMenit) * time.Minute)
	now := attendanceNow()
	return c.JSON(fiber.Map{
		"work_date": date.Format("2006-01-02"), "shift_name": schedule.NamaShift,
		"shift_end":         scheduleEndTime(schedule, date).Format("15:04"),
		"tolerance_minutes": setting.BatasLaporanSetelahCheckoutMenit,
		"deadline":          deadline.Format(time.RFC3339), "deadline_label": deadline.Format("02 Jan 2006 15:04 WIB"),
		"status": map[bool]string{true: "terlambat", false: "tepat_waktu"}[now.After(deadline)],
	})
}
