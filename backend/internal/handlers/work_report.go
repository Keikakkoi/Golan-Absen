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
	reportGroup := api.Group("/work-reports", middleware.Protected(), middleware.RequireRoles(models.RoleKaryawan, models.RoleManajer, models.RoleMagang, models.RoleHRD))

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
		if userIDFilter := strings.TrimSpace(c.Query("user_id")); userIDFilter != "" {
			parsedUserID, parseErr := strconv.ParseUint(userIDFilter, 10, 64)
			if parseErr != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user_id"})
			}
			query = query.Where("employee_id IN (SELECT id FROM employees WHERE user_id = ?)", parsedUserID)
		}
		if roleFilter := strings.TrimSpace(c.Query("role")); roleFilter != "" {
			role := models.Role(roleFilter)
			if !models.IsValidRole(role) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
			}
			query = query.Where("employee_id IN (SELECT employees.id FROM employees JOIN users ON users.id = employees.user_id WHERE users.role = ?)", role)
		}
		if status := strings.ToLower(strings.TrimSpace(c.Query("status"))); status != "" {
			if status == "draft" {
				// Admin validation inbox intentionally excludes drafts. Keep the
				// response empty instead of allowing drafts into this read model.
				query = query.Where("1 = 0")
			} else if !isValidAdminWorkReportStatus(status) || status == "draft" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid work report status"})
			} else {
				query = applyWorkReportAdminStatusFilter(query, status)
			}
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
		if err := paginatedQuery(c, query, &reports, func() {
			normalizeWorkReportAttachmentURLs(reports)
		}); err != nil {
			log.Printf("work reports pagination failed: user_id=%d role=%s start_date=%q end_date=%q employee_id=%q: %v", userID, userRole, startDate, endDate, c.Query("employee_id"), err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to paginate reports"})
		}
		return nil
	}
	if err := query.Find(&reports).Error; err != nil {
		log.Printf("work reports query failed: user_id=%d role=%s start_date=%q end_date=%q employee_id=%q: %v", userID, userRole, startDate, endDate, c.Query("employee_id"), err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reports"})
	}
	normalizeWorkReportAttachmentURLs(reports)

	return c.JSON(reports)
}

// normalizeWorkReportAttachmentURLs keeps legacy database values unchanged
// while returning URLs that a browser can actually request in production.
func normalizeWorkReportAttachmentURLs(reports []models.WorkReport) {
	for reportIndex := range reports {
		for attachmentIndex := range reports[reportIndex].Attachments {
			reports[reportIndex].Attachments[attachmentIndex].FileURL = minio.RewriteObjectURL(
				reports[reportIndex].Attachments[attachmentIndex].FileURL,
			)
		}
	}
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
	statusInput := input.StatusLaporan
	if strings.TrimSpace(statusInput) == "" {
		statusInput = input.Status
	}
	statusLaporan := normalizeWorkReportStatus(statusInput)
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

	// Check the existing row before the generic submission deadline. A rejected
	// report is a special revision action: its original report date, rather than
	// the request timestamp or a client-supplied replacement date, is the date
	// that controls whether the revision is allowed.
	var existing models.WorkReport
	existingErr := config.DB.Preload("Employee.User").Where("employee_id = ? AND tanggal = ?", emp.ID, t).First(&existing).Error
	if existingErr == nil && isWorkReportRevisionSubmission(existing, statusLaporan) && !isWorkReportRevisionDateAllowed(existing.Tanggal, attendanceNow()) {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": workReportRevisionDateError(existing.Tanggal)})
	}
	if err := validateWorkReportSubmission(emp.ID, t, attendanceNow()); err != nil {
		return c.Status(err.Code).JSON(fiber.Map{"error": err.Message})
	}

	if existingErr == nil {
		if models.IsWorkReportNoReport(existing) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Status no_report tidak memiliki aksi edit atau submit"})
		}
		actorRole := ""
		if emp.User != nil {
			actorRole = string(emp.User.Role)
		}
		recoveringLegacyDraft := isRecoverableLegacyDraft(existing, actorRole, true)
		if existing.ReportKind == models.WorkReportKindLegacyLogbook && !recoveringLegacyDraft {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Riwayat logbook lama sudah diajukan. Gunakan endpoint kompatibilitas untuk melihat detailnya."})
		}
		wasSubmitted := !isWorkReportDraft(existing)
		isRevisionSubmission := isWorkReportRevisionSubmission(existing, statusLaporan)
		revisionSource := existing.RejectionSource
		updates := map[string]interface{}{
			"deskripsi_kegiatan":   input.DeskripsiKegiatan,
			"realisasi_kegiatan":   input.RealisasiKegiatan,
			"kendala":              input.Kendala,
			"rencana_minggu_depan": input.RencanaMingguDepan,
			"link_artikel":         input.LinkArtikel,
			"catatan_tambahan":     input.CatatanTambahan,
			"custom_fields":        input.CustomFields,
			"status_laporan":       statusLaporan,
			"report_kind":          models.WorkReportKindCanonical,
			"is_late_submission":   existing.IsLateSubmission || isLateWorkReportSubmission(emp.ID, t),
		}
		if !recoveringLegacyDraft {
			// Regular work reports are not internship logbooks. Keep the
			// separate logbook status Submitted so the shared Draft rule does
			// not classify a normal report as an internship Draft.
			updates["status_logbook"] = "submitted"
		}
		for key, value := range workReportTitleUpdates(input) {
			updates[key] = value
		}
		if existing.StatusSesuai == "tidak membuat laporan kerja" {
			updates["status_sesuai"] = ""
		}
		if isRevisionSubmission {
			// A rejected report keeps its rejection audit fields, but its active
			// review state must return to pending when the employee resubmits it.
			updates["status_sesuai"] = ""
			updates["validasi_oleh_hr"] = false
		}
		if statusLaporan == "submitted" && (isRevisionSubmission || !wasSubmitted) {
			rejectedBy := ""
			if isRevisionSubmission {
				rejectedBy = existing.RejectionSource
			}
			managerStatus, adminStatus, workflowErr := workReportSubmissionWorkflow(emp, rejectedBy, isRevisionSubmission)
			if workflowErr != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to resolve report approval workflow"})
			}
			// An HRD/Admin resubmission keeps the Manager approval that was
			// already recorded. Do not manufacture a new Manager approval while
			// the employee is submitting a revision.
			if !isAdminWorkReportRejectionSource(rejectedBy) || !isRevisionSubmission {
				updates["manager_review_status"] = managerStatus
			}
			updates["admin_validation_status"] = adminStatus
			updates["admin_validated_by"] = nil
			updates["admin_validated_at"] = nil
		}
		if statusLaporan == "draft" {
			updates["manager_review_status"] = models.WorkReportDecisionNotRequired
			updates["admin_validation_status"] = models.WorkReportDecisionNotRequired
		}
		if err := config.DB.Model(&existing).Updates(updates).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update work report"})
		}
		if len(files) > 0 {
			saveWorkReportAttachments(existing.ID, emp.NIK, files)
		}
		config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("Attachments").First(&existing, existing.ID)
		message := "Laporan kerja disimpan melalui endpoint canonical"
		if recoveringLegacyDraft {
			message = "Draft legacy_logbook dipulihkan menjadi work_report melalui endpoint canonical"
		}
		_ = utils.LogAction(userID, "UPDATE", "WorkReport", existing.ID, message)
		if statusLaporan == "submitted" && (isRevisionSubmission || !wasSubmitted) {
			WsHub.Broadcast <- fiber.Map{"event": "new_work_report"}
			if isRevisionSubmission {
				if strings.EqualFold(strings.TrimSpace(revisionSource), "manager") {
					notifyWorkReportManagers(emp, existing)
				} else {
					notifyWorkReportRevision(existing)
				}
			} else {
				if managerIDs, _ := workReportManagerIDs(emp); len(managerIDs) > 0 {
					notifyWorkReportManagers(emp, existing)
				} else {
					notifyNewWorkReport(emp, existing)
				}
			}
		}
		return c.JSON(existing)
	}

	report := models.WorkReport{
		ReportKind:         models.WorkReportKindCanonical,
		EmployeeID:         &emp.ID,
		Tanggal:            t,
		JudulTugas:         input.JudulTugas,
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
	if statusLaporan == "submitted" {
		managerStatus, adminStatus, workflowErr := workReportSubmissionWorkflow(emp, "", false)
		if workflowErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to resolve report approval workflow"})
		}
		report.ManagerReviewStatus = managerStatus
		report.AdminValidationStatus = adminStatus
	} else {
		report.ManagerReviewStatus = models.WorkReportDecisionNotRequired
		report.AdminValidationStatus = models.WorkReportDecisionNotRequired
	}

	if err := config.DB.Create(&report).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create work report"})
	}
	if err := saveWorkReportAttachments(report.ID, emp.NIK, files); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	config.DB.Preload("Employee").Preload("Employee.User").Preload("Employee.Division").Preload("Employee.Position").Preload("Attachments").First(&report, report.ID)
	_ = utils.LogAction(userID, "CREATE", "WorkReport", report.ID, "Laporan kerja dibuat melalui endpoint canonical")
	if statusLaporan == "submitted" {
		WsHub.Broadcast <- fiber.Map{"event": "new_work_report"}
	}

	// Drafts do not enter HR validation or trigger a new-report notification.
	if statusLaporan == "submitted" {
		if managerIDs, _ := workReportManagerIDs(emp); len(managerIDs) > 0 {
			notifyWorkReportManagers(emp, report)
		} else {
			notifyNewWorkReport(emp, report)
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
	if models.IsWorkReportNoReport(report) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Status no_report tidak memiliki aksi edit atau submit"})
	}

	userRole := string(c.Locals("role").(models.Role))
	userID := c.Locals("user_id").(uint)
	recoveringLegacyDraft := false
	// HRD may update validation for legacy internship rows through this shared
	// endpoint. Employee filling/editing remains restricted to the compatibility
	// endpoint, but a validation decision must be persisted for every workflow.

	if userRole != string(models.RoleHRD) {
		var emp models.Employee
		if err := config.DB.Where("user_id = ?", userID).First(&emp).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Report ownership could not be verified"})
		}
		ownsReport := ownsWorkReport(report.EmployeeID, emp.ID)
		if !ownsReport {
			return c.Status(403).JSON(fiber.Map{"error": "Not your report"})
		}
		if !canUseCanonicalWorkReportMutation(report, userRole, ownsReport) {
			if report.ReportKind == models.WorkReportKindLegacyLogbook {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Riwayat logbook lama hanya dapat dipulihkan jika masih Draft dan belum memiliki riwayat review"})
			}
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Laporan dengan status Sesuai atau Tidak membuat laporan kerja tidak dapat diubah"})
		}
		recoveringLegacyDraft = isRecoverableLegacyDraft(report, userRole, ownsReport)
	}

	input, files, err := parseWorkReportInput(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := deleteRequestedWorkReportAttachments(c, report.ID); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	statusInput := input.StatusLaporan
	if strings.TrimSpace(statusInput) == "" {
		statusInput = input.Status
	}
	statusLaporan := normalizeWorkReportStatus(statusInput)
	if input.StatusLaporan == "" && input.Status == "" {
		if recoveringLegacyDraft {
			statusLaporan = "draft"
		} else {
			statusLaporan = normalizeWorkReportStatus(report.StatusLaporan)
		}
	}
	if userRole != string(models.RoleHRD) {
		if err := validateWorkReportCompleteness(input, report.Employee.Division.NamaDivisi, statusLaporan == "submitted"); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		if err := validateRealisasiKegiatan(input.RealisasiKegiatan, statusLaporan == "submitted"); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		if isWorkReportRevisionSubmission(report, statusLaporan) && !isWorkReportRevisionDateAllowed(report.Tanggal, attendanceNow()) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": workReportRevisionDateError(report.Tanggal)})
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
		for key, value := range workReportTitleUpdates(input) {
			updates[key] = value
		}
		updates["deskripsi_kegiatan"] = input.DeskripsiKegiatan
		updates["realisasi_kegiatan"] = input.RealisasiKegiatan
		updates["kendala"] = input.Kendala
		updates["rencana_minggu_depan"] = input.RencanaMingguDepan
		updates["link_artikel"] = input.LinkArtikel
		updates["catatan_tambahan"] = input.CatatanTambahan
		updates["custom_fields"] = input.CustomFields
		updates["status_laporan"] = statusLaporan
		if !recoveringLegacyDraft {
			updates["status_logbook"] = "submitted"
		}
	} else if statusInput != "" && userRole != string(models.RoleHRD) {
		updates["status_laporan"] = statusLaporan
		if !recoveringLegacyDraft {
			updates["status_logbook"] = "submitted"
		}
	}
	if recoveringLegacyDraft {
		updates["report_kind"] = models.WorkReportKindCanonical
	}

	var statusChanged bool
	wasSubmitted := normalizeWorkReportStatus(report.StatusLaporan) == "submitted"
	isRevisionSubmission := userRole != string(models.RoleHRD) && isWorkReportRevisionSubmission(report, statusLaporan)
	revisionSource := report.RejectionSource
	if userRole != string(models.RoleHRD) && statusLaporan == "submitted" && (isRevisionSubmission || !wasSubmitted) {
		rejectedBy := ""
		if isRevisionSubmission {
			rejectedBy = report.RejectionSource
		}
		managerStatus, adminStatus, workflowErr := workReportSubmissionWorkflow(report.Employee, rejectedBy, isRevisionSubmission)
		if workflowErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to resolve report approval workflow"})
		}
		// Preserve the Manager decision after an HRD/Admin rejection; only the
		// Manager review endpoint is allowed to create that approval.
		if !isAdminWorkReportRejectionSource(rejectedBy) || !isRevisionSubmission {
			updates["manager_review_status"] = managerStatus
		}
		updates["admin_validation_status"] = adminStatus
		updates["admin_validated_by"] = nil
		updates["admin_validated_at"] = nil
	}
	if userRole != string(models.RoleHRD) && statusLaporan == "draft" {
		updates["manager_review_status"] = models.WorkReportDecisionNotRequired
		updates["admin_validation_status"] = models.WorkReportDecisionNotRequired
	}
	if userRole == string(models.RoleHRD) {
		rawValidationStatus := strings.TrimSpace(input.StatusSesuai)
		input.StatusSesuai = normalizeAdminValidationStatus(rawValidationStatus)
		if rawValidationStatus != "" && input.StatusSesuai == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Status validasi harus Sesuai atau Tidak Sesuai"})
		}
		if (input.StatusSesuai != "" || input.AdminNotes != nil) && !adminValidationReady(report) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Laporan masih menunggu review Manager"})
		}
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
			updates["admin_rejection_reason"] = reason
		} else if input.StatusSesuai == "Sesuai" {
			updates["admin_rejection_reason"] = ""
		}
		if input.StatusSesuai != "" {
			for key, value := range adminValidationStatusUpdates(report, input.StatusSesuai) {
				updates[key] = value
			}
			updates["admin_validated_by"] = userID
			statusChanged = input.StatusSesuai != report.StatusSesuai || effectiveAdminValidationStatus(report) != map[string]models.WorkReportReviewDecision{"Sesuai": models.WorkReportDecisionApproved, "Tidak Sesuai": models.WorkReportDecisionRejected}[input.StatusSesuai]
		}
	}
	if userRole != string(models.RoleHRD) && isRevisionSubmission {
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
	message := "Laporan kerja diperbarui"
	if recoveringLegacyDraft {
		message = "Draft legacy_logbook dipulihkan menjadi work_report melalui endpoint canonical"
	}
	_ = utils.LogAction(userID, "UPDATE", "WorkReport", report.ID, message)
	if userRole != string(models.RoleHRD) && statusLaporan == "submitted" && (isRevisionSubmission || !wasSubmitted) {
		WsHub.Broadcast <- fiber.Map{"event": "new_work_report"}
		if isRevisionSubmission {
			if strings.EqualFold(strings.TrimSpace(revisionSource), "manager") {
				notifyWorkReportManagers(report.Employee, report)
			} else {
				notifyWorkReportRevision(report)
			}
		} else {
			notifyNewWorkReport(report.Employee, report)
			if report.Employee.User != nil && report.Employee.User.Role == models.RoleMagang {
				notifyWorkReportManagers(report.Employee, report)
			}
		}
	}

	// Notify the employee if HRD updated their report
	if statusChanged && report.Employee.UserID != 0 {
		message := fmt.Sprintf("Laporan kerja Anda tanggal %s telah diperbarui menjadi: %s", report.Tanggal.Format("02-01-2006"), input.StatusSesuai)
		if input.StatusSesuai == "Tidak Sesuai" {
			message += ". Alasan penolakan: " + strings.TrimSpace(input.RejectionReason)
		}
		recipientRole := models.RoleKaryawan
		if report.Employee.User != nil && models.IsValidRole(report.Employee.User.Role) {
			recipientRole = report.Employee.User.Role
		}
		utils.CreateNotification(config.DB, report.Employee.UserID, recipientRole, "Laporan Kerja", "Status Laporan Diperbarui", message)
		WsHub.Broadcast <- fiber.Map{"event": "work_report_status_updated", "user_id": report.Employee.UserID}
	}

	return c.JSON(report)
}

func DeleteWorkReport(c *fiber.Ctx) error {
	id := c.Params("id")
	var report models.WorkReport
	if err := config.DB.Preload("Employee.User").First(&report, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Report not found"})
	}
	if models.IsWorkReportNoReport(report) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Status no_report tidak memiliki aksi hapus"})
	}
	role := string(c.Locals("role").(models.Role))
	if role == string(models.RoleHRD) && report.ReportKind == models.WorkReportKindLegacyLogbook {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Record legacy_logbook hanya dapat dibaca melalui endpoint compatibility"})
	}
	if role != string(models.RoleHRD) {
		var employee models.Employee
		if err := config.DB.Where("user_id = ?", c.Locals("user_id").(uint)).First(&employee).Error; err != nil || !ownsWorkReport(report.EmployeeID, employee.ID) {
			return c.Status(403).JSON(fiber.Map{"error": "Not your report"})
		}
		ownsReport := ownsWorkReport(report.EmployeeID, employee.ID)
		if !canUseCanonicalWorkReportMutation(report, role, ownsReport) {
			if report.ReportKind == models.WorkReportKindLegacyLogbook {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Riwayat logbook lama hanya dapat dipulihkan jika masih Draft dan belum memiliki riwayat review"})
			}
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
	_ = utils.LogAction(c.Locals("user_id").(uint), "DELETE", "WorkReport", report.ID, "Laporan kerja dihapus")
	return c.JSON(fiber.Map{"message": "Report deleted successfully"})
}

func isWorkReportLocked(status string) bool {
	normalized := strings.ToLower(strings.TrimSpace(status))
	// A rejected report is intentionally editable for the employee revision
	// cycle. Only the final HRD/Admin approval and the generated no-report
	// marker are immutable.
	return normalized == "sesuai" || normalized == "tidak membuat laporan kerja"
}

func ownsWorkReport(reportEmployeeID *uint, employeeID uint) bool {
	return reportEmployeeID != nil && employeeID != 0 && *reportEmployeeID == employeeID
}

// isRecoverableLegacyDraft is intentionally narrow. It permits only an owner
// with the MAGANG role to repair a legacy row that is still a real Draft and
// has no review/rejection history. The repair is performed on the next
// canonical write, not by a mass migration.
func isRecoverableLegacyDraft(report models.WorkReport, actorRole string, ownsReport bool) bool {
	if models.IsWorkReportNoReport(report) {
		return false
	}
	if actorRole != string(models.RoleMagang) || !ownsReport || report.ReportKind != models.WorkReportKindLegacyLogbook {
		return false
	}
	if !canModifyInternshipLogbook(report.StatusLogbook) || report.ValidasiOlehHR {
		return false
	}
	if report.ReviewedBy != nil || report.ReviewedAt != nil || strings.TrimSpace(report.ReviewNotes) != "" {
		return false
	}
	if strings.TrimSpace(report.StatusSesuai) != "" || report.RejectedBy != nil || report.RejectedAt != nil || strings.TrimSpace(report.RejectionReason) != "" || strings.TrimSpace(report.RejectionSource) != "" {
		return false
	}
	return true
}

func canUseCanonicalWorkReportMutation(report models.WorkReport, actorRole string, ownsReport bool) bool {
	if models.IsWorkReportNoReport(report) {
		return false
	}
	if report.ReportKind == models.WorkReportKindLegacyLogbook {
		return isRecoverableLegacyDraft(report, actorRole, ownsReport)
	}
	if actorRole == string(models.RoleHRD) {
		return true
	}
	if !ownsReport {
		return false
	}
	// A submitted report is immutable while it is in either approval queue.
	// The employee may edit it only as a Draft or after an explicit Manager or
	// HRD/Admin rejection, which is the same repair cycle used by logbooks.
	if isWorkReportDraft(report) {
		return true
	}
	if isWorkReportLocked(report.StatusSesuai) {
		return false
	}
	return isWorkReportRejectedState(report)
}

func isWorkReportRejectedState(report models.WorkReport) bool {
	if effectiveManagerReviewStatus(report) == models.WorkReportDecisionRejected {
		return true
	}
	if effectiveAdminValidationStatus(report) == models.WorkReportDecisionRejected {
		return true
	}
	return false
}

func isWorkReportDraft(report models.WorkReport) bool {
	return models.CanonicalWorkReportStatus(report) == models.WorkReportStatusDraft
}

func isValidAdminWorkReportStatus(status string) bool {
	return status == "draft" || status == "submitted" || status == "approved" || status == "rejected"
}

func applyWorkReportAdminStatusFilter(query *gorm.DB, status string) *gorm.DB {
	legacyKind := "COALESCE(NULLIF(BTRIM(work_reports.report_kind), ''), 'work_report') = 'legacy_logbook'"
	legacyStatus := "LOWER(COALESCE(NULLIF(BTRIM(work_reports.status_logbook), ''), 'submitted'))"
	validation := "LOWER(COALESCE(NULLIF(BTRIM(work_reports.status_sesuai), ''), ''))"
	switch status {
	case "approved":
		return query.Where("NOT "+workReportNoReportCondition("work_reports.")).Where("("+validation+" = ? OR ("+legacyKind+" AND "+legacyStatus+" = ?))", "sesuai", "approved")
	case "rejected":
		return query.Where("NOT "+workReportNoReportCondition("work_reports.")).Where("("+validation+" IN ? OR ("+legacyKind+" AND "+legacyStatus+" = ?))", []string{"tidak sesuai", "minta perbaikan", "minta_perbaikan"}, "rejected")
	case "submitted":
		return query.Where("NOT "+workReportNoReportCondition("work_reports.")).Where("LOWER(COALESCE(NULLIF(BTRIM(work_reports.admin_validation_status), ''), 'pending')) = 'pending' AND LOWER(COALESCE(NULLIF(BTRIM(work_reports.manager_review_status), ''), 'not_required')) <> 'pending' AND ("+validation+" NOT IN ? AND (("+legacyKind+" AND "+legacyStatus+" = ?) OR NOT ("+legacyKind+")))", []string{"sesuai", "tidak sesuai", "minta perbaikan", "minta_perbaikan"}, "submitted")
	default:
		return query
	}
}

// workReportPendingCondition is shared by admin badges and dashboards. It
// reads the canonical filling/review fields while retaining the legacy
// logbook mapping for rows that predate report_kind.
func workReportPendingCondition(prefix string) string {
	legacyKind := "COALESCE(NULLIF(BTRIM(" + prefix + "report_kind), ''), 'work_report') = 'legacy_logbook'"
	canonicalKind := "COALESCE(NULLIF(BTRIM(" + prefix + "report_kind), ''), 'work_report') <> 'legacy_logbook'"
	legacyStatus := "LOWER(COALESCE(NULLIF(BTRIM(" + prefix + "status_logbook), ''), 'submitted'))"
	fillingStatus := "LOWER(COALESCE(NULLIF(BTRIM(" + prefix + "status_laporan), ''), 'submitted'))"
	validation := "LOWER(COALESCE(NULLIF(BTRIM(" + prefix + "status_sesuai), ''), ''))"
	reviewed := "('sesuai', 'tidak sesuai', 'ditolak', 'minta perbaikan', 'minta_perbaikan')"
	managerReview := "LOWER(COALESCE(NULLIF(BTRIM(" + prefix + "manager_review_status), ''), 'not_required'))"
	adminValidation := "LOWER(COALESCE(NULLIF(BTRIM(" + prefix + "admin_validation_status), ''), ''))"
	return "(NOT (" + workReportNoReportCondition(prefix) + ") AND (" +
		"(" + adminValidation + " = 'pending' AND " + managerReview + " <> 'pending') OR " +
		"(" + adminValidation + " = '' AND " + managerReview + " <> 'pending' AND ((" + legacyKind + " AND " + legacyStatus + " = 'submitted') OR (" + canonicalKind + " AND " + fillingStatus + " = 'submitted' AND " + validation + " NOT IN " + reviewed + ")))" +
		"))"
}

// workReportNoReportCondition mirrors the persisted signals consumed by the
// model-level mapper. It keeps aggregate queries from treating generated
// empty/marker rows as pending reports.
func workReportNoReportCondition(prefix string) string {
	marker := "LOWER(BTRIM(COALESCE(" + prefix + "status_sesuai, ''))) = '" + models.WorkReportNoReportMarker + "'"
	empty := "BTRIM(COALESCE(" + prefix + "judul_tugas, '')) = '' AND BTRIM(COALESCE(" + prefix + "judul, '')) = '' AND BTRIM(COALESCE(" + prefix + "tugas, '')) = '' AND BTRIM(COALESCE(" + prefix + "deskripsi_kegiatan, '')) = '' AND BTRIM(COALESCE(" + prefix + "realisasi_kegiatan, '')) = '' AND BTRIM(COALESCE(" + prefix + "kendala, '')) = '' AND BTRIM(COALESCE(" + prefix + "rencana_minggu_depan, '')) = '' AND BTRIM(COALESCE(" + prefix + "link_artikel, '')) = '' AND BTRIM(COALESCE(" + prefix + "catatan_tambahan, '')) = '' AND BTRIM(COALESCE(" + prefix + "custom_fields, '')) IN ('', '{}', '[]', 'null') AND NOT EXISTS (SELECT 1 FROM work_report_attachments WHERE work_report_id = " + prefix + "id)"
	return "(" + marker + " OR (" + empty + "))"
}

// normalizeAdminValidationStatus removes the retired HRD workflow state. The
// Manager logbook workflow uses status_logbook and is intentionally unaffected.
func normalizeAdminValidationStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(models.NormalizeLegacyValidationStatus(status))) {
	case "sesuai", "validasi laporan":
		return "Sesuai"
	case "tidak sesuai", "tolak laporan":
		return "Tidak Sesuai"
	default:
		return ""
	}
}

// adminValidationStatusUpdates is the single write mapping for an HRD
// decision. Legacy internship screens read status_logbook while canonical
// employee/manager screens read status_sesuai, so both must move together.
func adminValidationStatusUpdates(report models.WorkReport, status string) map[string]interface{} {
	decision := models.WorkReportDecisionApproved
	if status == "Tidak Sesuai" {
		decision = models.WorkReportDecisionRejected
	}
	now := time.Now()
	updates := map[string]interface{}{
		"status_sesuai":           status,
		"validasi_oleh_hr":        true,
		"admin_validation_status": decision,
		"admin_validated_at":      now,
	}
	// The legacy field is kept in sync only for rows that have not yet been
	// migrated to the explicit two-stage contract. Once the new Manager status
	// exists, status_logbook remains the Manager decision and must not be
	// overwritten by HRD/Admin validation.
	if report.ReportKind == models.WorkReportKindLegacyLogbook && report.ManagerReviewStatus == "" {
		updates["status_logbook"] = map[string]string{
			"Sesuai":       "approved",
			"Tidak Sesuai": "rejected",
		}[status]
	}
	return updates
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
		now := time.Now().In(jakartaLocation)
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, jakartaLocation).Format("2006-01-02")
		endDate = time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, jakartaLocation).Format("2006-01-02")
	}
	start, err := time.ParseInLocation("2006-01-02", startDate, jakartaLocation)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start_date; expected YYYY-MM-DD"})
	}
	end, err := time.ParseInLocation("2006-01-02", endDate, jakartaLocation)
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
			results[len(results)-1].Status = string(models.WorkReportStatusNoReport)
		}
	}

	return c.JSON(results)
}

func workReportStatusMap(reports []models.WorkReport) map[string]bool {
	status := make(map[string]bool)
	for _, report := range reports {
		if models.CanonicalWorkReportStatus(report) == models.WorkReportStatusNoReport || isWorkReportDraft(report) {
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
	priority := map[string]int{string(models.WorkReportStatusNoReport): 5, "draft": 1, "submitted": 2, "needs_improvement": 3, "validated": 4}
	for _, report := range reports {
		if report.EmployeeID == nil {
			continue
		}
		key := fmt.Sprintf("%d_%s", *report.EmployeeID, report.Tanggal.Format("2006-01-02"))
		canonicalStatus := models.CanonicalWorkReportStatus(report)
		current := "submitted"
		switch canonicalStatus {
		case models.WorkReportStatusNoReport:
			current = string(models.WorkReportStatusNoReport)
		case models.WorkReportStatusDraft:
			current = "draft"
		case models.WorkReportStatusApproved:
			current = "validated"
		case models.WorkReportStatusRejected:
			current = "needs_improvement"
		default:
			switch strings.ToLower(strings.TrimSpace(report.StatusSesuai)) {
			case "sesuai":
				current = "validated"
			case "tidak sesuai", "ditolak", "minta perbaikan", "minta_perbaikan":
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
	Tanggal                   string  `json:"tanggal"`
	Tugas                     string  `json:"tugas"`
	Judul                     string  `json:"judul"`
	JudulTugas                string  `json:"judul_tugas"`
	DeskripsiKegiatan         string  `json:"deskripsi_kegiatan"`
	RealisasiKegiatan         string  `json:"realisasi_kegiatan"`
	Kendala                   string  `json:"kendala"`
	RencanaMingguDepan        string  `json:"rencana_minggu_depan"`
	LinkArtikel               string  `json:"link_artikel"`
	CatatanTambahan           string  `json:"catatan_tambahan"`
	CustomFields              string  `json:"custom_fields"`
	StatusSesuai              string  `json:"status_sesuai"`
	StatusLaporan             string  `json:"status_laporan"`
	Status                    string  `json:"status"`
	StatusLogbook             string  `json:"status_logbook"`
	RejectionReason           string  `json:"rejection_reason"`
	AdminNotes                *string `json:"admin_notes"`
	CanonicalTitleProvided    bool    `json:"-"`
	LegacyTitleFieldsProvided bool    `json:"-"`
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
	if strings.TrimSpace(input.JudulTugas) == "" || strings.TrimSpace(input.DeskripsiKegiatan) == "" {
		return fmt.Errorf("judul tugas dan deskripsi kegiatan wajib diisi saat laporan dikirim")
	}
	return nil
}

func normalizeWorkReportStatus(value string) string {
	return string(models.NormalizeWorkReportFillingStatus(value))
}

// isAdminRejectedWorkReport is deliberately based on the persisted admin
// review fields. A submitted report with an empty review status is pending;
// only an explicit admin rejection can enter the revision notification path.
// Rejection audit fields are retained after resubmission, so this predicate is
// evaluated before the employee's update is applied.
func isAdminRejectedWorkReport(report models.WorkReport) bool {
	status := strings.ToLower(strings.TrimSpace(report.StatusSesuai))
	if status != "tidak sesuai" && status != "ditolak" && status != "minta perbaikan" && status != "minta_perbaikan" {
		return false
	}
	return isAdminWorkReportRejectionSource(report.RejectionSource)
}

func isAdminWorkReportRejectionSource(source string) bool {
	source = strings.ToLower(strings.TrimSpace(source))
	return source == "admin" || source == "hrd"
}

func isWorkReportRevisionSubmission(report models.WorkReport, targetStatus string) bool {
	if targetStatus != "submitted" {
		return false
	}
	return isAdminRejectedWorkReport(report) || strings.EqualFold(strings.TrimSpace(report.RejectionSource), "manager") || effectiveManagerReviewStatus(report) == models.WorkReportDecisionRejected
}

// isWorkReportRevisionDateAllowed deliberately compares date-only values in
// Asia/Jakarta. The report's Tanggal is the source of truth; CreatedAt,
// ReviewedAt, RejectedAt, and the request timestamp must not affect this rule.
func isWorkReportRevisionDateAllowed(reportDate, now time.Time) bool {
	return reportDate.In(jakartaLocation).Format("2006-01-02") == now.In(jakartaLocation).Format("2006-01-02")
}

func workReportRevisionDateError(reportDate time.Time) string {
	return fmt.Sprintf("Revisi laporan hanya dapat dilakukan pada tanggal laporan kerja (%s WIB). Tanggal laporan sudah lewat.", reportDate.In(jakartaLocation).Format("2006-01-02"))
}

func notifyNewWorkReport(employee models.Employee, report models.WorkReport) {
	var hrdUsers []models.User
	if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err != nil {
		return
	}
	name := "Karyawan"
	if employee.User != nil {
		name = employee.User.Nama
	}
	for _, user := range hrdUsers {
		_ = utils.CreateNotification(config.DB, user.ID, models.RoleHRD, "Laporan Kerja", "Laporan Kerja Baru", fmt.Sprintf("Ada laporan kerja baru dari %s pada tanggal %s", name, report.Tanggal.Format("02-01-2006")))
	}
}

func notifyWorkReportRevision(report models.WorkReport) {
	var hrdUsers []models.User
	if err := config.DB.Where("role = ? AND status = ?", models.RoleHRD, "aktif").Find(&hrdUsers).Error; err != nil {
		return
	}
	name := report.EmployeeNameSnapshot
	if name == "" && report.Employee.User != nil {
		name = report.Employee.User.Nama
	}
	if name == "" {
		name = "Karyawan"
	}
	message := fmt.Sprintf("Ada revisi laporan kerja dari %s pada tanggal %s", name, report.Tanggal.Format("02-01-2006"))
	idempotencyKey := fmt.Sprintf("work-report-revision:%d", report.ID)
	if report.RejectedAt != nil {
		idempotencyKey = fmt.Sprintf("work-report-revision:%d:%s", report.ID, report.RejectedAt.UTC().Format(time.RFC3339Nano))
	}
	for _, user := range hrdUsers {
		_ = utils.CreateWorkReportRevisionNotificationForCycle(config.DB, user.ID, models.RoleHRD, "Revisi Laporan Kerja", message, report.ID, idempotencyKey)
	}
}

// workReportTitleUpdates keeps old clients writable while ensuring the active
// canonical form only writes the additive field. Raw legacy columns are never
// touched by a canonical request.
func workReportTitleUpdates(input workReportInput) map[string]interface{} {
	if input.CanonicalTitleProvided {
		return map[string]interface{}{"judul_tugas": input.JudulTugas}
	}
	if !input.LegacyTitleFieldsProvided {
		return nil
	}
	return map[string]interface{}{
		"tugas":       input.Tugas,
		"judul":       input.Judul,
		"judul_tugas": input.JudulTugas,
	}
}

func notifyWorkReportManagers(employee models.Employee, report models.WorkReport) {
	if employee.User == nil {
		return
	}
	managerIDs, err := workReportManagerIDs(employee)
	if err != nil {
		return
	}
	name := employee.User.Nama
	for _, managerID := range managerIDs {
		_ = utils.CreateNotification(config.DB, managerID, models.RoleManajer, "Laporan Kerja", "Laporan Kerja Baru", fmt.Sprintf("Ada laporan baru dari %s pada tanggal %s", name, report.Tanggal.Format("02-01-2006")))
	}
}

func parseWorkReportInput(c *fiber.Ctx) (workReportInput, []*multipart.FileHeader, error) {
	var input workReportInput
	contentType := strings.ToLower(c.Get("Content-Type"))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		input.Tanggal = c.FormValue("tanggal")
		input.Tugas = c.FormValue("tugas")
		input.Judul = c.FormValue("judul")
		input.JudulTugas = c.FormValue("judul_tugas")
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
		input.StatusLogbook = c.FormValue("status_logbook")
		if input.Status == "" {
			input.Status = input.StatusLogbook
		}
		form, err := c.MultipartForm()
		if err != nil {
			return input, nil, err
		}
		_, input.CanonicalTitleProvided = form.Value["judul_tugas"]
		_, tugasProvided := form.Value["tugas"]
		_, judulProvided := form.Value["judul"]
		input.LegacyTitleFieldsProvided = tugasProvided || judulProvided
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
		if strings.TrimSpace(input.JudulTugas) == "" {
			input.JudulTugas = models.CombineWorkReportTitleTask(input.Judul, input.Tugas)
		}
		return input, files, nil
	}
	if err := c.BodyParser(&input); err != nil {
		return input, nil, err
	}
	var bodyFields map[string]json.RawMessage
	if err := json.Unmarshal(c.Body(), &bodyFields); err == nil {
		_, input.CanonicalTitleProvided = bodyFields["judul_tugas"]
		_, tugasProvided := bodyFields["tugas"]
		_, judulProvided := bodyFields["judul"]
		input.LegacyTitleFieldsProvided = tugasProvided || judulProvided
	}
	if input.Status == "" {
		input.Status = input.StatusLogbook
	}
	if strings.TrimSpace(input.JudulTugas) == "" {
		input.JudulTugas = models.CombineWorkReportTitleTask(input.Judul, input.Tugas)
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
		url := minio.ObjectURL(key)
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
	resolved := ResolveEffectiveSchedule(employee.ID, date)
	if resolved.Source == scheduleSourceFallback {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Tidak ada shift aktif atau jadwal shift untuk tanggal laporan ini. Hubungi admin untuk penjadwalan shift."})
	}
	schedule := resolved.Schedule
	setting := getGeneralSetting()
	deadline := scheduleEndTime(schedule, date).Add(time.Duration(setting.BatasLaporanSetelahCheckoutMenit) * time.Minute)
	now := attendanceNow()
	return c.JSON(fiber.Map{
		"work_date": date.Format("2006-01-02"), "shift_name": resolved.ShiftName,
		"employee_id": resolved.EmployeeID, "schedule_id": resolved.ScheduleID,
		"source": resolved.Source, "effective_date": resolved.EffectiveDate,
		"start_time": resolved.StartTime, "end_time": resolved.EndTime,
		"is_working_day": resolved.IsWorkingDay, "is_overnight": resolved.IsOvernight,
		"shift_end":         scheduleEndTime(schedule, date).Format("15:04"),
		"tolerance_minutes": setting.BatasLaporanSetelahCheckoutMenit,
		"deadline":          deadline.Format(time.RFC3339), "deadline_label": deadline.Format("02 Jan 2006 15:04 WIB"),
		"status": map[bool]string{true: "terlambat", false: "tepat_waktu"}[now.After(deadline)],
	})
}
