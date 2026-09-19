package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"time"
)

// AttendanceStatistics is the shared attendance read model used by team
// statistics and dashboard charts. TotalHariKerja includes every scheduled
// working day in the selected period, including approved leave days. This
// keeps the percentage definition consistent: (Hadir + Terlambat) /
// TotalHariKerja * 100. Future calendar dates are excluded from the period.
type AttendanceStatistics struct {
	Hadir          int64
	Terlambat      int64
	IzinCuti       int64
	Alpha          int64
	BelumAbsen     int64
	TotalHariKerja int64
}

type attendanceStatisticsInput struct {
	records  map[string]models.AttendanceRecord
	leaves   map[string]models.AttendanceStatus
	holidays map[string]bool
}

func deduplicateAttendanceRecords(records []models.AttendanceRecord) []models.AttendanceRecord {
	unique := make([]models.AttendanceRecord, 0, len(records))
	indexByDate := make(map[string]int, len(records))
	for _, record := range records {
		key := ""
		if record.EmployeeID != nil {
			key = recordKey(*record.EmployeeID, record.Tanggal)
		} else {
			key = record.Tanggal.Format("2006-01-02")
		}
		index, exists := indexByDate[key]
		if !exists {
			indexByDate[key] = len(unique)
			unique = append(unique, record)
			continue
		}
		current := unique[index]
		preferRecord := (current.JamMasuk == nil && record.JamMasuk != nil) ||
			((current.JamMasuk == nil) == (record.JamMasuk == nil) && record.ID > current.ID)
		if preferRecord {
			unique[index] = record
		}
	}
	return unique
}

func loadAttendanceStatisticsInput(start, end time.Time, employees []models.Employee) attendanceStatisticsInput {
	in := attendanceStatisticsInput{
		records: map[string]models.AttendanceRecord{}, leaves: map[string]models.AttendanceStatus{}, holidays: map[string]bool{},
	}
	ids := make([]uint, 0, len(employees))
	for _, employee := range employees {
		ids = append(ids, employee.ID)
	}
	if len(ids) == 0 || config.DB == nil {
		return in
	}
	var records []models.AttendanceRecord
	config.DB.Where("employee_id IN ? AND tanggal BETWEEN ? AND ?", ids, start.Format("2006-01-02"), end.Format("2006-01-02")).Find(&records)
	records = deduplicateAttendanceRecords(records)
	for _, record := range records {
		if record.EmployeeID != nil {
			in.records[recordKey(*record.EmployeeID, record.Tanggal)] = record
		}
	}
	var holidays []models.Holiday
	config.DB.Where("tanggal BETWEEN ? AND ?", start.Format("2006-01-02"), end.Format("2006-01-02")).Find(&holidays)
	for _, holiday := range holidays {
		in.holidays[normalizeAttendanceDate(holiday.Tanggal).Format("2006-01-02")] = true
	}
	var leaves []models.LeaveRequest
	config.DB.Where("employee_id IN ? AND status IN ? AND tanggal_mulai <= ? AND tanggal_selesai >= ?", ids, approvedLeaveStatuses(), end.Format("2006-01-02"), start.Format("2006-01-02")).Find(&leaves)
	for _, leave := range leaves {
		if leave.EmployeeID == nil {
			continue
		}
		status := models.StatusIzin
		if leave.JenisIzin == models.LeaveTypeCuti {
			status = models.StatusCuti
		}
		for day := normalizeAttendanceDate(leave.TanggalMulai); !day.After(normalizeAttendanceDate(leave.TanggalSelesai)); day = day.AddDate(0, 0, 1) {
			if day.Before(start) || day.After(end) {
				continue
			}
			in.leaves[recordKey(*leave.EmployeeID, day)] = status
		}
	}
	return in
}

func approvedLeaveStatuses() []models.LeaveStatus {
	// Approved is retained for legacy rows; HRDApproved is the final status of
	// the current manager -> HRD approval workflow.
	return []models.LeaveStatus{models.LeaveStatusApproved, models.LeaveStatusHRDApproved}
}

func attendanceDayStatus(employee models.Employee, day, now time.Time, in attendanceStatisticsInput) (string, bool) {
	day = normalizeAttendanceDate(day)
	joined := normalizeAttendanceDate(employee.TanggalBergabung)
	if !joined.IsZero() && day.Before(joined) || in.holidays[day.Format("2006-01-02")] {
		return "", false
	}
	schedule := ResolveEffectiveSchedule(employee.ID, day)
	if !schedule.IsWorkingDay {
		return "", false
	}
	if record, ok := in.records[recordKey(employee.ID, day)]; ok {
		return string(record.Status), true
	}
	if status, ok := in.leaves[recordKey(employee.ID, day)]; ok {
		return string(status), true
	}
	currentBusinessDate := attendanceBusinessDate(now)
	completed := day.Before(currentBusinessDate)
	if day.Equal(currentBusinessDate) {
		completed = !now.Before(scheduleEndTime(schedule.Schedule, day))
	}
	if completed {
		return string(models.StatusAlpha), true
	}
	return "Belum Absen", true
}

func calculateAttendanceStatistics(employee models.Employee, start, end, now time.Time, in attendanceStatisticsInput) AttendanceStatistics {
	result := AttendanceStatistics{}
	last := end
	if businessDate := attendanceBusinessDate(now); last.After(businessDate) {
		last = businessDate
	}
	if last.Before(start) {
		return result
	}
	for day := start; !day.After(last); day = day.AddDate(0, 0, 1) {
		status, working := attendanceDayStatus(employee, day, now, in)
		if !working {
			continue
		}
		result.TotalHariKerja++
		switch status {
		case string(models.StatusHadir):
			result.Hadir++
		case string(models.StatusTerlambat):
			result.Terlambat++
		case string(models.StatusIzin), string(models.StatusCuti):
			result.IzinCuti++
		case string(models.StatusAlpha):
			result.Alpha++
		case "Belum Absen":
			result.BelumAbsen++
		}
	}
	return result
}

func attendancePercentage(stats AttendanceStatistics) int64 {
	if stats.TotalHariKerja == 0 {
		return 0
	}
	return (stats.Hadir + stats.Terlambat) * 100 / stats.TotalHariKerja
}

func attendanceDaySummary(employees []models.Employee, day, now time.Time, in attendanceStatisticsInput) AttendanceStatistics {
	result := AttendanceStatistics{}
	for _, employee := range employees {
		status, working := attendanceDayStatus(employee, day, now, in)
		if !working {
			continue
		}
		result.TotalHariKerja++
		switch status {
		case string(models.StatusHadir):
			result.Hadir++
		case string(models.StatusTerlambat):
			result.Terlambat++
		case string(models.StatusIzin), string(models.StatusCuti):
			result.IzinCuti++
		case string(models.StatusAlpha):
			result.Alpha++
		case "Belum Absen":
			result.BelumAbsen++
		}
	}
	return result
}

func parseStatisticsDateRange(startValue, endValue string, now time.Time) (time.Time, time.Time, error) {
	end := attendanceBusinessDate(now)
	start := end.AddDate(0, 0, -6)
	var err error
	if startValue != "" {
		start, err = time.ParseInLocation("2006-01-02", startValue, jakartaLocation)
		if err != nil {
			return start, end, err
		}
	}
	if endValue != "" {
		end, err = time.ParseInLocation("2006-01-02", endValue, jakartaLocation)
		if err != nil {
			return start, end, err
		}
	}
	if end.Before(start) {
		return start, end, fiberErrInvalidStatisticsRange{}
	}
	return start, end, nil
}

type fiberErrInvalidStatisticsRange struct{}

func (fiberErrInvalidStatisticsRange) Error() string {
	return "Sampai tanggal tidak boleh lebih kecil dari Dari tanggal"
}
