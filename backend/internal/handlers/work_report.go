package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"mime/multipart"
	"path/filepath"
	"regexp"
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
	"gorm.io/gorm"
)

func SetupWorkReportRoutes(api fiber.Router) {
	reportGroup := api.Group("/work-reports")
	reportGroup.Use(middleware.Protected())

	reportGroup.Get("/columns", GetWorkReportColumns)

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

func GetWorkReports(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	EnsureDailyWorkReportsAutoCreated(config.DB, attendanceNow())
	userID := c.Locals("user_id").(uint)
	userRole := string(c.Locals("role").(models.Role))

	reports := make([]models.WorkReport, 0)
	// Count is executed before Find by the pagination helper, so the model
	// must be explicit instead of relying on Find to infer it from reports.
	query := config.DB.Model(&models.WorkReport{}).Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("Attachments").Order("tanggal desc").Order("work_reports.id desc")

	if userRole != string(models.RoleHRD) {
		var emp models.Employee
		if err := config.DB.Where("user_id = ?", userID).First(&emp).Error; err == nil {
			query = query.Where("employee_id = ?", emp.ID)
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "Employee not found"})
		}
	} else {
		// HRD/Admin must never receive employee-owned filling drafts. Empty or
		// NULL values are legacy rows and continue to behave as Submitted.
		query = query.Where("LOWER(COALESCE(NULLIF(BTRIM(work_reports.status_laporan), ''), 'submitted')) <> ? AND LOWER(COALESCE(NULLIF(BTRIM(work_reports.status_logbook), ''), 'submitted')) <> ?", "draft", "draft")
		empID := c.Query("employee_id")
		if empID != "" {
			query = query.Where("employee_id = ?", empID)
		}
		if projectID := c.Query("project_id"); projectID != "" {
			query = query.Where("employee_id IN (SELECT employees.id FROM employees JOIN users ON users.id = employees.user_id WHERE users.project_id = ?)", projectID)
		}
	}

	startDate := strings.TrimSpace(c.Query("start_date"))
	endDate := strings.TrimSpace(c.Query("end_date"))
	if startDate != "" {
		if _, parseErr := time.Parse("2006-01-02", startDate); parseErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start_date; expected YYYY-MM-DD"})
		}
		query = query.Where("tanggal >= ?", startDate)
	}
	if endDate != "" {
		if _, parseErr := time.Parse("2006-01-02", endDate); parseErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end_date; expected YYYY-MM-DD"})
		}
		query = query.Where("tanggal <= ?", endDate)
	}
	if startDate != "" && endDate != "" && startDate > endDate {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "start_date must be on or before end_date"})
	}

	if hasPaginationQuery(c) {
		if err := paginatedQuery(c, query, &reports); err != nil {
			log.Printf("work reports pagination failed: user_id=%d role=%s start_date=%q end_date=%q employee_id=%q: %v", userID, userRole, startDate, endDate, c.Query("employee_id"), err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to paginate reports"})
		}
		return nil
	}
	if err := query.Find(&reports).Error; err != nil {
		log.Printf("work reports query failed: user_id=%d role=%s start_date=%q end_date=%q employee_id=%q: %v", userID, userRole, startDate, endDate, c.Query("employee_id"), err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}

	return c.JSON(reports)
}

func CreateWorkReport(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var emp models.Employee
	if err := config.DB.Preload("User").Preload("Division").Where("user_id = ?", userID).First(&emp).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Employee not found"})
	}

	input, files, err := parseWorkReportInput(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	statusLaporan := normalizeWorkReportStatus(input.StatusLaporan)
	if err := validateWorkReportCompleteness(input, emp.Division.NamaDivisi, statusLaporan == "submitted"); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := validateRealisasiKegiatan(input.RealisasiKegiatan, statusLaporan == "submitted"); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	t, err := time.ParseInLocation("2006-01-02", input.Tanggal, jakartaLocation)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid date format"})
	}
	if _, ok := getWorkReportSchedule(emp.ID, t); !ok {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Tidak ada shift aktif atau jadwal shift untuk tanggal laporan ini. Hubungi admin untuk penjadwalan shift."})
	}
	if err := validateWorkReportSubmission(emp.ID, t, attendanceNow()); err != nil {
		return c.Status(err.Code).JSON(fiber.Map{"error": err.Message})
	}

	var existing models.WorkReport
	if config.DB.Where("employee_id = ? AND tanggal = ?", emp.ID, t).First(&existing).Error == nil {
		wasSubmitted := normalizeWorkReportStatus(existing.StatusLaporan) == "submitted"
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
			"status_laporan":       statusLaporan,
			// Regular work reports are not internship logbooks. Keep the
			// separate logbook status Submitted so the shared Draft rule does
			// not classify a normal report as an internship Draft.
			"status_logbook":     "submitted",
			"is_late_submission": existing.IsLateSubmission || isLateWorkReportSubmission(emp.ID, t),
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
		if statusLaporan == "submitted" && !wasSubmitted {
			WsHub.Broadcast <- fiber.Map{"event": "new_work_report"}
			var hrdUsers []models.User
			if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
				name := "Karyawan"
				if emp.User != nil {
					name = emp.User.Nama
				}
				for _, user := range hrdUsers {
					utils.CreateNotification(config.DB, user.ID, models.RoleHRD, "Laporan Kerja", "Laporan Kerja Baru", fmt.Sprintf("Ada laporan kerja baru dari %s pada tanggal %s", name, existing.Tanggal.Format("02-01-2006")))
				}
			}
		}
		return c.JSON(existing)
	}

	report := models.WorkReport{
		EmployeeID:         &emp.ID,
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
		StatusLaporan:      statusLaporan,
		StatusLogbook:      "submitted",
		IsLateSubmission:   isLateWorkReportSubmission(emp.ID, t),
	}

	if err := config.DB.Create(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create work report"})
	}
	if err := saveWorkReportAttachments(report.ID, emp.NIK, files); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("Attachments").First(&report, report.ID)
	if statusLaporan == "submitted" {
		WsHub.Broadcast <- fiber.Map{"event": "new_work_report"}
	}

	// Drafts do not enter HR validation or trigger a new-report notification.
	if statusLaporan == "submitted" {
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
			if report.EmployeeID == nil || *report.EmployeeID != emp.ID {
				return c.Status(403).JSON(fiber.Map{"error": "Not your report"})
			}
		}
		if isWorkReportLocked(report.StatusSesuai) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Laporan dengan status Sesuai atau Tidak membuat laporan kerja tidak dapat diubah"})
		}
	}

	input, files, err := parseWorkReportInput(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := deleteRequestedWorkReportAttachments(c, report.ID); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	statusLaporan := normalizeWorkReportStatus(input.StatusLaporan)
	if input.StatusLaporan == "" && input.Status == "" {
		statusLaporan = normalizeWorkReportStatus(report.StatusLaporan)
	}
	if userRole != string(models.RoleHRD) {
		if err := validateWorkReportCompleteness(input, report.Employee.Division.NamaDivisi, statusLaporan == "submitted"); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		if err := validateRealisasiKegiatan(input.RealisasiKegiatan, statusLaporan == "submitted"); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}
	if userRole != string(models.RoleHRD) && report.EmployeeID != nil {
		targetDate := report.Tanggal
		if input.Tanggal != "" {
			parsed, parseErr := time.ParseInLocation("2006-01-02", input.Tanggal, jakartaLocation)
			if parseErr != nil {
				return c.Status(400).JSON(fiber.Map{"error": "Invalid date format"})
			}
			targetDate = parsed
		}
		if err := validateWorkReportSubmission(*report.EmployeeID, targetDate, attendanceNow()); err != nil {
			return c.Status(err.Code).JSON(fiber.Map{"error": err.Message})
		}
	}

	updates := map[string]interface{}{}

	if input.Tanggal != "" {
		if t, err := time.ParseInLocation("2006-01-02", input.Tanggal, jakartaLocation); err == nil {
			updates["tanggal"] = t
		}
	}
	if strings.HasPrefix(strings.ToLower(c.Get("Content-Type")), "multipart/form-data") && userRole != string(models.RoleHRD) {
		// FormData represents the complete employee form, so empty values must
		// also be persisted when a draft is edited and a field is cleared.
		updates["tugas"] = input.Tugas
		updates["judul"] = input.Judul
		updates["deskripsi_kegiatan"] = input.DeskripsiKegiatan
		updates["realisasi_kegiatan"] = input.RealisasiKegiatan
		updates["kendala"] = input.Kendala
		updates["rencana_minggu_depan"] = input.RencanaMingguDepan
		updates["link_artikel"] = input.LinkArtikel
		updates["catatan_tambahan"] = input.CatatanTambahan
		updates["custom_fields"] = input.CustomFields
		updates["status_laporan"] = statusLaporan
		updates["status_logbook"] = "submitted"
	} else if input.StatusLaporan != "" && userRole != string(models.RoleHRD) {
		updates["status_laporan"] = statusLaporan
		updates["status_logbook"] = "submitted"
	}

	var statusChanged bool
	wasSubmitted := normalizeWorkReportStatus(report.StatusLaporan) == "submitted"

	if userRole == string(models.RoleHRD) {
		input.StatusSesuai = normalizeAdminValidationStatus(input.StatusSesuai)
		if (input.StatusSesuai != "" || input.AdminNotes != nil) &&
			(normalizeWorkReportStatus(report.StatusLaporan) == "draft" || strings.ToLower(strings.TrimSpace(report.StatusLogbook)) == "draft") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Draft belum dapat divalidasi sebelum dikirim"})
		}
		if input.AdminNotes != nil {
			notes := strings.TrimSpace(*input.AdminNotes)
			now := time.Now()
			updates["admin_notes"] = notes
			updates["admin_note_by"] = userID
			updates["admin_note_at"] = now
		}
		if input.StatusSesuai == "Tidak Sesuai" {
			reason, reasonErr := normalizeRejectionReason(input.RejectionReason)
			if reasonErr != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": reasonErr.Error()})
			}
			updates["rejection_reason"] = reason
			updates["rejected_by"] = userID
			now := time.Now()
			updates["rejected_at"] = now
			updates["rejection_source"] = "admin"
		}
		if input.StatusSesuai != "" && input.StatusSesuai != report.StatusSesuai {
			updates["status_sesuai"] = input.StatusSesuai
			updates["validasi_oleh_hr"] = true
			statusChanged = true
		}
	}
	if userRole != string(models.RoleHRD) && statusLaporan == "submitted" && report.StatusSesuai == "Minta Perbaikan" {
		updates["status_sesuai"] = ""
		updates["validasi_oleh_hr"] = false
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
	if userRole != string(models.RoleHRD) && statusLaporan == "submitted" && !wasSubmitted {
		WsHub.Broadcast <- fiber.Map{"event": "new_work_report"}
		var hrdUsers []models.User
		if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
			name := report.EmployeeNameSnapshot
			if name == "" && report.Employee.User != nil {
				name = report.Employee.User.Nama
			}
			if name == "" {
				name = "Karyawan"
			}
			for _, user := range hrdUsers {
				utils.CreateNotification(config.DB, user.ID, models.RoleHRD, "Laporan Kerja", "Laporan Kerja Baru", fmt.Sprintf("Ada laporan kerja baru dari %s pada tanggal %s", name, report.Tanggal.Format("02-01-2006")))
			}
		}
	}

	// Notify the employee if HRD updated their report
	if statusChanged && report.Employee.UserID != 0 {
		message := fmt.Sprintf("Laporan kerja Anda tanggal %s telah diperbarui menjadi: %s", report.Tanggal.Format("02-01-2006"), input.StatusSesuai)
		if input.StatusSesuai == "Tidak Sesuai" {
			message += ". Alasan penolakan: " + strings.TrimSpace(input.RejectionReason)
		}
		utils.CreateNotification(config.DB, report.Employee.UserID, models.RoleKaryawan, "Laporan Kerja", "Status Laporan Diperbarui", message)
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
		if err := config.DB.Where("user_id = ?", c.Locals("user_id").(uint)).First(&employee).Error; err != nil || report.EmployeeID == nil || *report.EmployeeID != employee.ID {
			return c.Status(403).JSON(fiber.Map{"error": "Not your report"})
		}
		if isWorkReportLocked(report.StatusSesuai) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Laporan dengan status Sesuai atau Tidak membuat laporan kerja tidak dapat dihapus"})
		}
	}
	if report.EmployeeID == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Report tidak memiliki karyawan"})
	}
	attachments, err := deleteWorkReportData(config.DB, report.ID, *report.EmployeeID, report.Tanggal)
	if err != nil {
		log.Printf("work report deletion failed: report_id=%d: %v", report.ID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to delete report: %v", err)})
	}
	for _, attachment := range attachments {
		if attachment.StorageKey == "" || minio.Client == nil {
			continue
		}
		if err := minio.Client.RemoveObject(context.Background(), minio.BucketName, attachment.StorageKey, miniogo.RemoveObjectOptions{}); err != nil {
			// The database deletion is already committed. Keep the API successful and
			// log orphan cleanup failures so they can be retried operationally.
			log.Printf("work report attachment storage cleanup failed: report_id=%d storage_key=%q: %v", report.ID, attachment.StorageKey, err)
		}
	}
	return c.JSON(fiber.Map{"message": "Report deleted successfully"})
}

func isWorkReportLocked(status string) bool {
	normalized := strings.ToLower(strings.TrimSpace(status))
	return normalized == "sesuai" || normalized == "tidak membuat laporan kerja"
}

// normalizeAdminValidationStatus removes the retired HRD workflow state. The
// Manager logbook workflow uses status_logbook and is intentionally unaffected.
func normalizeAdminValidationStatus(status string) string {
	normalized := strings.ToLower(strings.TrimSpace(status))
	if normalized == "minta perbaikan" || normalized == "minta_perbaikan" {
		return "Tidak Sesuai"
	}
	return status
}

// deleteWorkReportData removes the dependent rows before the report row. The
// caller performs storage cleanup only after this transaction commits.
func deleteWorkReportData(db *gorm.DB, reportID uint, employeeID uint, tanggal time.Time) ([]models.WorkReportAttachment, error) {
	var attachments []models.WorkReportAttachment
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("work_report_id = ?", reportID).Find(&attachments).Error; err != nil {
			return fmt.Errorf("load attachments: %w", err)
		}
		// Use an explicit statement so the dependent-row delete remains
		// unambiguous with older database schemas and legacy columns.
		result := tx.Exec("DELETE FROM work_report_attachments WHERE work_report_id = ?", reportID)
		if result.Error != nil {
			return fmt.Errorf("delete attachments: %w", result.Error)
		}
		if result.RowsAffected < int64(len(attachments)) {
			return fmt.Errorf("delete attachments: expected at least %d rows, deleted %d", len(attachments), result.RowsAffected)
		}
		if err := tx.Exec(`INSERT INTO work_report_deletions (created_at, updated_at, employee_id, tanggal)
			VALUES (NOW(), NOW(), ?, ?)
			ON CONFLICT (employee_id, tanggal) DO NOTHING`, employeeID, tanggal).Error; err != nil {
			return fmt.Errorf("record report deletion: %w", err)
		}
		if err := tx.Delete(&models.WorkReport{}, reportID).Error; err != nil {
			return fmt.Errorf("delete report: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return attachments, nil
}

func GetWorkReportCompliance(c *fiber.Ctx) error {
	c.Set(fiber.HeaderCacheControl, "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	userID := c.Locals("user_id").(uint)
	userRole := string(c.Locals("role").(models.Role))

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
		endDate = time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.Local).Format("2006-01-02")
	}
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start_date; expected YYYY-MM-DD"})
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end_date; expected YYYY-MM-DD"})
	}
	if start.After(end) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "start_date must be on or before end_date"})
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

	var reports []models.WorkReport
	repQuery := config.DB.Where("tanggal BETWEEN ? AND ?", startDate, endDate)
	if userRole == string(models.RoleHRD) {
		// Drafts remain visible to their owner, but never participate in the
		// HRD compliance/validation read model.
		repQuery = repQuery.Where("LOWER(COALESCE(NULLIF(BTRIM(status_laporan), ''), 'submitted')) <> ? AND LOWER(COALESCE(NULLIF(BTRIM(status_logbook), ''), 'submitted')) <> ?", "draft", "draft")
	}
	if empID != 0 {
		repQuery = repQuery.Where("employee_id = ?", empID)
	}
	if err := repQuery.Find(&reports).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch work report status"})
	}

	reportMap := workReportStatusMap(reports)
	complianceStatusMap := workReportComplianceStatusMap(reports)

	type ComplianceResult struct {
		EmployeeID uint   `json:"employee_id"`
		Tanggal    string `json:"tanggal"`
		HasReport  bool   `json:"has_report"`
		IsAttended bool   `json:"is_attended"`
		Status     string `json:"status"`
	}

	var results []ComplianceResult
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		key := fmt.Sprintf("%d_%s", empID, dateStr)

		results = append(results, ComplianceResult{
			EmployeeID: empID,
			Tanggal:    dateStr,
			HasReport:  reportMap[key],
			Status:     complianceStatusMap[key],
			// Compliance is intentionally based only on a work report. Attendance
			// must never make a date green (or change its reporting status).
			IsAttended: false,
		})
		if results[len(results)-1].Status == "" {
			results[len(results)-1].Status = "missing"
		}
	}

	return c.JSON(results)
}

func workReportStatusMap(reports []models.WorkReport) map[string]bool {
	status := make(map[string]bool)
	for _, report := range reports {
		// The rules job creates an empty marker row for a missed deadline.
		// That marker is evidence of a missing report, not a submitted report.
		if strings.EqualFold(strings.TrimSpace(report.StatusSesuai), "tidak membuat laporan kerja") {
			continue
		}
		// Drafts are intentionally absent from compliance. Empty status values
		// are treated as legacy submitted rows for backward compatibility.
		if strings.EqualFold(strings.TrimSpace(report.StatusLaporan), "draft") || strings.EqualFold(strings.TrimSpace(report.StatusLogbook), "draft") {
			continue
		}
		if report.EmployeeID != nil {
			status[fmt.Sprintf("%d_%s", *report.EmployeeID, report.Tanggal.Format("2006-01-02"))] = true
		}
	}
	return status
}

func workReportComplianceStatusMap(reports []models.WorkReport) map[string]string {
	status := make(map[string]string)
	priority := map[string]int{"missing": 0, "draft": 1, "submitted": 2, "needs_improvement": 3, "validated": 4}
	for _, report := range reports {
		if report.EmployeeID == nil {
			continue
		}
		key := fmt.Sprintf("%d_%s", *report.EmployeeID, report.Tanggal.Format("2006-01-02"))
		current := "submitted"
		if strings.EqualFold(strings.TrimSpace(report.StatusSesuai), "tidak membuat laporan kerja") {
			current = "missing"
		} else if strings.EqualFold(strings.TrimSpace(report.StatusLaporan), "draft") || strings.EqualFold(strings.TrimSpace(report.StatusLogbook), "draft") {
			current = "draft"
		} else {
			switch strings.ToLower(strings.TrimSpace(report.StatusSesuai)) {
			case "sesuai":
				current = "validated"
			case "tidak sesuai", "minta perbaikan":
				current = "needs_improvement"
			}
		}
		if priority[current] >= priority[status[key]] {
			status[key] = current
		}
	}
	return status
}

type workReportInput struct {
	Tanggal            string  `json:"tanggal"`
	Tugas              string  `json:"tugas"`
	Judul              string  `json:"judul"`
	DeskripsiKegiatan  string  `json:"deskripsi_kegiatan"`
	RealisasiKegiatan  string  `json:"realisasi_kegiatan"`
	Kendala            string  `json:"kendala"`
	RencanaMingguDepan string  `json:"rencana_minggu_depan"`
	LinkArtikel        string  `json:"link_artikel"`
	CatatanTambahan    string  `json:"catatan_tambahan"`
	CustomFields       string  `json:"custom_fields"`
	StatusSesuai       string  `json:"status_sesuai"`
	StatusLaporan      string  `json:"status_laporan"`
	Status             string  `json:"status"`
	StatusLogbook      string  `json:"status_logbook"`
	RejectionReason    string  `json:"rejection_reason"`
	AdminNotes         *string `json:"admin_notes"`
}

const realisasiKegiatanError = "Realisasi kegiatan harus berupa angka persentase antara 0% sampai 100%, contoh: 20%, 50%, atau 100%."

var realisasiKegiatanPattern = regexp.MustCompile(`^(100|[1-9]?\d)%$`)

func validateRealisasiKegiatan(value string, required bool) error {
	if value == "" && !required {
		return nil
	}
	if !realisasiKegiatanPattern.MatchString(value) {
		return fmt.Errorf("%s", realisasiKegiatanError)
	}
	return nil
}

func requiresWorkReportTitle(division string) bool {
	switch strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(division)), " ")) {
	case "golan nusantara", "golan education":
		return true
	default:
		return false
	}
}

func validateWorkReportCompleteness(input workReportInput, division string, submitted bool) error {
	if !submitted {
		return nil
	}
	if strings.TrimSpace(input.Tugas) == "" || strings.TrimSpace(input.DeskripsiKegiatan) == "" {
		return fmt.Errorf("tugas dan deskripsi kegiatan wajib diisi saat laporan dikirim")
	}
	if requiresWorkReportTitle(division) && strings.TrimSpace(input.Judul) == "" {
		return fmt.Errorf("judul wajib diisi untuk divisi Golan Nusantara dan Golan Education")
	}
	return nil
}

func normalizeWorkReportStatus(value string) string {
	status := strings.ToLower(strings.TrimSpace(value))
	if status == "draft" {
		return "draft"
	}
	return "submitted"
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
		input.RejectionReason = c.FormValue("rejection_reason")
		input.StatusLaporan = c.FormValue("status_laporan")
		input.Status = c.FormValue("status")
		form, err := c.MultipartForm()
		if err != nil {
			return input, nil, err
		}
		if values, ok := form.Value["admin_notes"]; ok {
			notes := ""
			if len(values) > 0 {
				notes = values[0]
			}
			input.AdminNotes = &notes
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

func deleteRequestedWorkReportAttachments(c *fiber.Ctx, reportID uint) error {
	raw := strings.TrimSpace(c.FormValue("delete_attachment_ids"))
	if raw == "" {
		return nil
	}
	var ids []uint
	if err := json.Unmarshal([]byte(raw), &ids); err != nil {
		return fmt.Errorf("daftar screenshot yang dihapus tidak valid")
	}
	for _, id := range ids {
		var attachment models.WorkReportAttachment
		if err := config.DB.Where("id = ? AND work_report_id = ?", id, reportID).First(&attachment).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				continue
			}
			return fmt.Errorf("gagal mencari screenshot")
		}
		if err := config.DB.Delete(&attachment).Error; err != nil {
			return fmt.Errorf("gagal menghapus screenshot")
		}
		if attachment.StorageKey != "" && minio.Client != nil {
			if err := minio.Client.RemoveObject(context.Background(), minio.BucketName, attachment.StorageKey, miniogo.RemoveObjectOptions{}); err != nil {
				log.Printf("attachment cleanup failed: %v", err)
			}
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
