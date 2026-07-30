package handlers

import (
	"strconv"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

const (
	defaultMinimumMasaKerjaCutiBulan      = 3
	defaultBatasLaporanSetelahCheckoutJam = 1
)

func getGeneralSetting() models.GeneralSetting {
	setting := models.GeneralSetting{
		MinimumMasaKerjaCutiBulan:      defaultMinimumMasaKerjaCutiBulan,
		BatasLaporanSetelahCheckoutJam: defaultBatasLaporanSetelahCheckoutJam,
	}
	if config.DB == nil || config.DB.First(&setting).Error != nil {
		return setting
	}
	if setting.MinimumMasaKerjaCutiBulan < 0 {
		setting.MinimumMasaKerjaCutiBulan = defaultMinimumMasaKerjaCutiBulan
	}
	if setting.BatasLaporanSetelahCheckoutJam < 0 {
		setting.BatasLaporanSetelahCheckoutJam = defaultBatasLaporanSetelahCheckoutJam
	}
	return setting
}

func isEligibleForCuti(employee models.Employee, asOf time.Time, minimumMonths int) bool {
	if employee.TanggalBergabung.IsZero() || minimumMonths < 0 {
		return false
	}
	joined := employee.TanggalBergabung.In(jakartaLocation)
	cutoff := joined.AddDate(0, minimumMonths, 0)
	return !asOf.In(jakartaLocation).Before(cutoff)
}

func workReportDeadline(record models.AttendanceRecord, schedule models.WorkSchedule, setting models.GeneralSetting) time.Time {
	return scheduleEndTime(schedule, record.Tanggal).Add(time.Duration(setting.BatasLaporanSetelahCheckoutJam) * time.Hour)
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
		schedule := getAttendanceSchedule(record.EmployeeID, record.Tanggal)
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
