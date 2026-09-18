package handlers

import (
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const (
	defaultMinimumMasaKerjaCutiBulan        = 3
	defaultBatasLaporanSetelahCheckoutMenit = 60
)

func getGeneralSetting() models.GeneralSetting {
	setting := models.GeneralSetting{
		MinimumMasaKerjaCutiBulan:        defaultMinimumMasaKerjaCutiBulan,
		BatasLaporanSetelahCheckoutMenit: defaultBatasLaporanSetelahCheckoutMenit,
	}
	if config.DB == nil || config.DB.First(&setting).Error != nil {
		return setting
	}
	if setting.MinimumMasaKerjaCutiBulan < 0 {
		setting.MinimumMasaKerjaCutiBulan = defaultMinimumMasaKerjaCutiBulan
	}
	// Preserve the legacy value for databases that have not run the new migration.
	if setting.BatasLaporanSetelahCheckoutMenit <= 0 && setting.BatasLaporanSetelahCheckoutJam > 0 {
		setting.BatasLaporanSetelahCheckoutMenit = setting.BatasLaporanSetelahCheckoutJam * 60
	}
	if setting.BatasLaporanSetelahCheckoutMenit < 0 {
		setting.BatasLaporanSetelahCheckoutMenit = defaultBatasLaporanSetelahCheckoutMenit
	}
	return setting
}

func isEligibleForCuti(employee models.Employee, asOf time.Time, minimumMonths int) bool {
	cutoff, ok := cutiAvailabilityDate(employee, minimumMonths)
	if !ok {
		return false
	}
	return !asOf.In(jakartaLocation).Before(cutoff)
}

func cutiAvailabilityDate(employee models.Employee, minimumMonths int) (time.Time, bool) {
	if employee.TanggalBergabung.IsZero() || minimumMonths < 0 {
		return time.Time{}, false
	}
	return employee.TanggalBergabung.In(jakartaLocation).AddDate(0, minimumMonths, 0), true
}

// ensureCutiQuota creates only a missing current-year quota for an eligible
// employee. Existing or used quotas are never modified.
func ensureCutiQuota(db *gorm.DB, employee models.Employee, year int, asOf time.Time, minimumMonths int) error {
	if db == nil || !isEligibleForCuti(employee, asOf, minimumMonths) {
		return nil
	}
	var quota models.LeaveQuota
	result := db.Where("employee_id = ? AND tahun = ? AND jenis_cuti = ?", employee.ID, year, models.LeaveTypeCuti).First(&quota)
	if result.Error == nil {
		return nil
	}
	if result.Error != gorm.ErrRecordNotFound {
		return result.Error
	}
	return db.Create(&models.LeaveQuota{EmployeeID: &employee.ID, Tahun: year, JenisCuti: models.LeaveTypeCuti, SisaKuota: 12}).Error
}

func workReportDeadline(record models.AttendanceRecord, schedule models.WorkSchedule, setting models.GeneralSetting) time.Time {
	return scheduleEndTime(schedule, record.Tanggal).Add(time.Duration(setting.BatasLaporanSetelahCheckoutMenit) * time.Minute)
}

// findAttendanceForReport returns only a real check-in. A row created for an
// Alpha/leave status is not sufficient to unlock a work report.
func findAttendanceForReport(employeeID uint, date time.Time) (models.AttendanceRecord, bool) {
	var record models.AttendanceRecord
	if config.DB == nil {
		return record, false
	}
	result := config.DB.Where("employee_id = ? AND tanggal = ? AND jam_masuk IS NOT NULL", employeeID, date.Format("2006-01-02")).First(&record)
	return record, result.Error == nil && record.JamMasuk != nil
}

func workReportSubmissionDeadline(employeeID uint, date time.Time) (time.Time, bool) {
	record, attended := findAttendanceForReport(employeeID, date)
	if !attended {
		return time.Time{}, false
	}
	schedule, assigned := getWorkReportSchedule(employeeID, date)
	if !assigned {
		return time.Time{}, false
	}
	return workReportDeadline(record, schedule, getGeneralSetting()), true
}

func validateWorkReportSubmission(employeeID uint, date, now time.Time) *fiber.Error {
	deadline, ok := workReportSubmissionDeadline(employeeID, date)
	if !ok {
		return fiber.NewError(fiber.StatusUnprocessableEntity, "Belum ada absensi masuk atau shift aktif untuk tanggal laporan ini.")
	}
	if now.After(deadline) {
		return fiber.NewError(fiber.StatusUnprocessableEntity, "Batas pengisian laporan untuk absensi ini telah lewat.")
	}
	return nil
}

func getWorkReportSchedule(employeeID uint, date time.Time) (models.WorkSchedule, bool) {
	resolved := ResolveEffectiveSchedule(employeeID, date)
	return resolved.Schedule, resolved.Source != "system_fallback"
}

func missingWorkReportRows(employeeIDs []uint, now time.Time) []fiber.Map {
	_ = now // Warning visibility is attendance-based; deadline is enforced on save.
	if len(employeeIDs) == 0 {
		return []fiber.Map{}
	}
	setting := getGeneralSetting()
	var records []models.AttendanceRecord
	config.DB.Preload("Employee.User").Where("employee_id IN ? AND jam_masuk IS NOT NULL", employeeIDs).Order("tanggal DESC").Order("id DESC").Find(&records)
	if len(records) == 0 {
		return []fiber.Map{}
	}
	var reports []models.WorkReport
	config.DB.Where("employee_id IN ?", employeeIDs).Find(&reports)
	hasReport := make(map[string]bool, len(reports))
	for key := range workReportStatusMap(reports) {
		parts := strings.SplitN(key, "_", 2)
		if len(parts) == 2 {
			hasReport[parts[0]+":"+parts[1]] = true
		}
	}
	// The dashboard is intentionally a single actionable reminder. Keep the
	// most recent missing date; older missed days remain available in history.
	var latestDate time.Time
	var latestRow fiber.Map
	for _, record := range records {
		if record.EmployeeID == nil {
			continue
		}
		employeeID := *record.EmployeeID
		schedule, assigned := getWorkReportSchedule(employeeID, record.Tanggal)
		if !assigned {
			continue
		}
		deadline := workReportDeadline(record, schedule, setting)
		// The dashboard warning starts immediately after a successful check-in
		// and remains until a real report/logbook is saved. The deadline only
		// controls whether a new submission is accepted by the write endpoints.
		if hasReport[workReportKey(employeeID, record.Tanggal)] {
			continue
		}
		name := "-"
		if record.Employee.User != nil {
			name = record.Employee.User.Nama
		}
		row := fiber.Map{
			"employee_id":    employeeID,
			"nama":           name,
			"tanggal":        record.Tanggal.Format("2006-01-02"),
			"deadline":       deadline.Format(time.RFC3339),
			"deadline_label": deadline.Format("02 Jan 2006 15:04"),
		}
		latestRow, latestDate = selectLatestMissingWorkReport(latestRow, latestDate, row, record.Tanggal)
	}
	if latestRow == nil {
		return []fiber.Map{}
	}
	return []fiber.Map{latestRow}
}

func selectLatestMissingWorkReport(current fiber.Map, currentDate time.Time, candidate fiber.Map, candidateDate time.Time) (fiber.Map, time.Time) {
	if current == nil || candidateDate.After(currentDate) {
		return candidate, candidateDate
	}
	return current, currentDate
}

func workReportKey(employeeID uint, date time.Time) string {
	return timeKey(employeeID, date)
}

func timeKey(employeeID uint, date time.Time) string {
	return strconv.FormatUint(uint64(employeeID), 10) + ":" + date.In(jakartaLocation).Format("2006-01-02")
}

func missingWorkReportRowsForEmployee(employeeID uint, now time.Time) []fiber.Map {
	return missingWorkReportRows([]uint{employeeID}, now)
}

func EnsureDailyWorkReportsAutoCreated(db *gorm.DB, now time.Time) {
	if db == nil {
		return
	}
	var employees []models.Employee
	if err := db.Preload("User").Find(&employees).Error; err != nil {
		return
	}

	// Backfill existing empty reports that have blank/null/Menunggu status_sesuai
	db.Model(&models.WorkReport{}).
		Where("(status_sesuai IS NULL OR status_sesuai = '' OR status_sesuai = 'Menunggu') AND (tugas = '' OR tugas IS NULL) AND (judul = '' OR judul IS NULL) AND (deskripsi_kegiatan = '' OR deskripsi_kegiatan IS NULL)").
		Update("status_sesuai", "tidak membuat laporan kerja")

	setting := getGeneralSetting()

	for _, emp := range employees {
		if emp.User == nil {
			continue
		}
		role := emp.User.Role
		if role != models.RoleKaryawan && role != models.RoleManajer && role != models.RoleMagang {
			continue
		}

		var startDate time.Time
		if role == models.RoleMagang {
			if emp.User.InternshipStartDate != nil && !emp.User.InternshipStartDate.IsZero() {
				startDate = *emp.User.InternshipStartDate
			} else {
				startDate = emp.User.CreatedAt
			}
		} else {
			if !emp.TanggalBergabung.IsZero() {
				startDate = emp.TanggalBergabung
			} else {
				startDate = emp.User.CreatedAt
			}
		}

		// Restrict lookback window up to 60 days
		minAllowed := now.AddDate(0, 0, -60)
		if startDate.Before(minAllowed) {
			startDate = minAllowed
		}

		startDate = startDate.Truncate(24 * time.Hour)
		today := now.Truncate(24 * time.Hour)

		var existingReports []models.WorkReport
		db.Where("employee_id = ? AND tanggal BETWEEN ? AND ?", emp.ID, startDate, today).Find(&existingReports)
		reportMap := make(map[string]bool)
		for _, r := range existingReports {
			reportMap[r.Tanggal.Format("2006-01-02")] = true
		}
		var deletedReports []models.WorkReportDeletion
		db.Where("employee_id = ? AND tanggal BETWEEN ? AND ?", emp.ID, startDate, today).Find(&deletedReports)
		for _, deleted := range deletedReports {
			reportMap[deleted.Tanggal.Format("2006-01-02")] = true
		}

		var attendances []models.AttendanceRecord
		db.Where("employee_id = ? AND tanggal BETWEEN ? AND ?", emp.ID, startDate, today).Find(&attendances)
		attMap := make(map[string]models.AttendanceRecord)
		for _, a := range attendances {
			attMap[a.Tanggal.Format("2006-01-02")] = a
		}

		for d := startDate; !d.After(today); d = d.AddDate(0, 0, 1) {
			dateStr := d.Format("2006-01-02")
			if reportMap[dateStr] {
				continue
			}

			attRecord, hasAtt := attMap[dateStr]
			var deadline time.Time
			if hasAtt && attRecord.JamMasuk != nil {
				schedule, assigned := getWorkReportSchedule(emp.ID, d)
				if !assigned {
					continue
				}
				deadline = workReportDeadline(attRecord, schedule, setting)
			} else {
				// A report can only be missing for a day on which the employee
				// actually checked in. Do not create markers for no-attendance days.
				continue
			}

			if now.After(deadline) {
				autoReport := models.WorkReport{
					EmployeeID:        &emp.ID,
					Tanggal:           d,
					Tugas:             "",
					Judul:             "",
					DeskripsiKegiatan: "",
					RealisasiKegiatan: "",
					Kendala:           "",
					StatusSesuai:      "tidak membuat laporan kerja",
					StatusLogbook:     "submitted",
					IsLateSubmission:  true,
				}
				db.Create(&autoReport)
				reportMap[dateStr] = true
			}
		}
	}
}
