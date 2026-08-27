package handlers

import (
	"strconv"
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
	return db.Create(&models.LeaveQuota{EmployeeID: employee.ID, Tahun: year, JenisCuti: models.LeaveTypeCuti, SisaKuota: 12}).Error
}

func workReportDeadline(record models.AttendanceRecord, schedule models.WorkSchedule, setting models.GeneralSetting) time.Time {
	return scheduleEndTime(schedule, record.Tanggal).Add(time.Duration(setting.BatasLaporanSetelahCheckoutMenit) * time.Minute)
}

func getWorkReportSchedule(employeeID uint, date time.Time) (models.WorkSchedule, bool) {
	resolved := ResolveEffectiveSchedule(employeeID, date)
	return resolved.Schedule, resolved.Source != "system_fallback"
}

func missingWorkReportRows(employeeIDs []uint, now time.Time) []fiber.Map {
	if len(employeeIDs) == 0 {
		return []fiber.Map{}
	}
	setting := getGeneralSetting()
	var records []models.AttendanceRecord
	config.DB.Preload("Employee.User").Where("employee_id IN ? AND jam_masuk IS NOT NULL AND jam_pulang IS NOT NULL", employeeIDs).Find(&records)
	if len(records) == 0 {
		return []fiber.Map{}
	}
	var reports []models.WorkReport
	config.DB.Where("employee_id IN ?", employeeIDs).Find(&reports)
	hasReport := make(map[string]bool, len(reports))
	for _, report := range reports {
		hasReport[workReportKey(report.EmployeeID, report.Tanggal)] = true
	}
	rows := make([]fiber.Map, 0)
	for _, record := range records {
		schedule, assigned := getWorkReportSchedule(record.EmployeeID, record.Tanggal)
		if !assigned {
			continue
		}
		deadline := workReportDeadline(record, schedule, setting)
		if now.Before(deadline) || hasReport[workReportKey(record.EmployeeID, record.Tanggal)] {
			continue
		}
		name := "-"
		if record.Employee.User != nil {
			name = record.Employee.User.Nama
		}
		rows = append(rows, fiber.Map{
			"employee_id":    record.EmployeeID,
			"nama":           name,
			"tanggal":        record.Tanggal.Format("2006-01-02"),
			"deadline":       deadline.Format(time.RFC3339),
			"deadline_label": deadline.Format("02 Jan 2006 15:04"),
		})
	}
	return rows
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
			if hasAtt {
				schedule, assigned := getWorkReportSchedule(emp.ID, d)
				if !assigned {
					continue
				}
				deadline = workReportDeadline(attRecord, schedule, setting)
			} else {
				schedule, assigned := getWorkReportSchedule(emp.ID, d)
				if !assigned {
					continue
				}
				deadline = scheduleEndTime(schedule, d).Add(time.Duration(setting.BatasLaporanSetelahCheckoutMenit) * time.Minute)
			}

			if now.After(deadline) {
				autoReport := models.WorkReport{
					EmployeeID:        emp.ID,
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
