package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"strings"
	"time"
)

type EffectiveSchedule struct {
	EmployeeID            uint                `json:"employee_id"`
	ScheduleID            uint                `json:"schedule_id"`
	ShiftName             string              `json:"shift_name"`
	Source                string              `json:"source"`
	EffectiveDate         *time.Time          `json:"effective_date,omitempty"`
	StartTime             string              `json:"start_time"`
	EndTime               string              `json:"end_time"`
	LateToleranceMinutes  int                 `json:"late_tolerance_minutes"`
	EarlyToleranceMinutes int                 `json:"early_tolerance_minutes"`
	IsWorkingDay          bool                `json:"is_working_day"`
	IsOvernight           bool                `json:"is_overnight"`
	Schedule              models.WorkSchedule `json:"-"`
}

var regularDayNames = []string{"", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"}

func weekdayJakarta(date time.Time) int {
	w := int(date.In(jakartaLocation).Weekday())
	if w == 0 {
		return 7
	}
	return w
}

func scheduleFromRegular(day models.RegularWorkSchedule) models.WorkSchedule {
	working := day.IsWorkingDay && strings.TrimSpace(day.StartTime) != "" && strings.TrimSpace(day.EndTime) != ""
	return models.WorkSchedule{NamaShift: "Reguler", JamMulai: day.StartTime, JamSelesai: day.EndTime, ToleransiTerlambatMenit: day.LateToleranceMinutes, ToleransiAbsenAwalMenit: day.EarlyToleranceMinutes, HariKerja: func() string {
		if working {
			return "[" + itoa(day.DayOfWeek) + "]"
		}
		return "[]"
	}()}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	b := []byte{}
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	return string(b)
}

const (
	scheduleSourceEmployeeSpecific = "employee_specific"
	scheduleSourceGlobal           = "global_schedule"
	scheduleSourceAssignment       = "employee_assignment"
	scheduleSourceRegular          = "regular_default"
	scheduleSourceFallback         = "system_fallback"
)

// ResolveEffectiveSchedule is the single source of truth for an employee's
// schedule on a business date. A WorkSchedule date is an inclusive effective
// date: the newest eligible row is used from that date until a newer row takes
// over. Future rows are never selected.
func ResolveEffectiveSchedule(employeeID uint, date time.Time) EffectiveSchedule {
	date = scheduleDateOnly(date)
	var schedules []models.WorkSchedule
	baseShift := ""
	if config.DB != nil {
		var employee models.Employee
		if config.DB.Select("id", "shift_kerja").First(&employee, employeeID).Error == nil {
			baseShift = strings.TrimSpace(employee.ShiftKerja)
		}
		config.DB.Where("employee_id = ? OR employee_id IS NULL", employeeID).Find(&schedules)
	}
	if selected, ok := selectEffectiveCustomSchedule(schedules, employeeID, date); ok {
		source := scheduleSourceGlobal
		if selected.EmployeeID != nil {
			source = scheduleSourceEmployeeSpecific
		}
		return effectiveFromWorkSchedule(selected, employeeID, source, date)
	}

	// An employee label is only usable when a matching, valid schedule
	// configuration exists. The label itself never supplies working hours.
	if assigned, ok := selectAssignmentSchedule(schedules, baseShift, employeeID, date); ok {
		return effectiveFromWorkSchedule(assigned, employeeID, scheduleSourceAssignment, date)
	}

	var regular models.RegularWorkSchedule
	if config.DB != nil && config.DB.Where("day_of_week = ?", weekdayJakarta(date)).First(&regular).Error == nil {
		s := scheduleFromRegular(regular)
		return effectiveFromWorkSchedule(s, employeeID, scheduleSourceRegular, date)
	}
	fallback := models.WorkSchedule{NamaShift: "Reguler", JamMulai: defaultStartTime, JamSelesai: defaultEndTime, ToleransiTerlambatMenit: defaultGraceMinutes, HariKerja: "[1,2,3,4,5,6]"}
	return effectiveFromWorkSchedule(fallback, employeeID, scheduleSourceFallback, date)
}

func resolveRegularForTest(day models.RegularWorkSchedule, date time.Time) EffectiveSchedule {
	return effectiveFromWorkSchedule(scheduleFromRegular(day), 0, scheduleSourceRegular, date)
}

func effectiveFromWorkSchedule(s models.WorkSchedule, employeeID uint, source string, date time.Time) EffectiveSchedule {
	// A shift-specific value wins, including an explicit zero. Only a nil
	// value falls back to the general setting.
	if s.ToleransiAbsenAwalMenit == nil {
		fallback := getGeneralSetting().ToleransiAbsenAwalMenit
		s.ToleransiAbsenAwalMenit = &fallback
	}
	working := s.IsWorkingDay(date)
	if source == scheduleSourceRegular {
		working = s.HariKerja != "[]"
	}
	start, startErr := time.Parse("15:04:05", normalizeScheduleClock(s.JamMulai))
	end, endErr := time.Parse("15:04:05", normalizeScheduleClock(s.JamSelesai))
	shiftName := s.NamaShift
	if source == scheduleSourceFallback {
		// A fallback is an internal safety value, not an explicit Reguler
		// assignment. Callers can therefore render unavailable data as "-".
		shiftName = ""
	}
	var effectiveDate *time.Time
	if s.Tanggal != nil {
		value := scheduleDateOnly(*s.Tanggal)
		effectiveDate = &value
	} else {
		value := scheduleDateOnly(date)
		effectiveDate = &value
	}
	return EffectiveSchedule{
		EmployeeID:            employeeID,
		ScheduleID:            s.ID,
		ShiftName:             shiftName,
		Source:                source,
		EffectiveDate:         effectiveDate,
		StartTime:             s.JamMulai,
		EndTime:               s.JamSelesai,
		LateToleranceMinutes:  s.ToleransiTerlambatMenit,
		EarlyToleranceMinutes: *s.ToleransiAbsenAwalMenit,
		IsWorkingDay:          working,
		IsOvernight:           startErr == nil && endErr == nil && end.Before(start),
		Schedule:              s,
	}
}

func normalizeScheduleClock(v string) string {
	v = strings.TrimSpace(v)
	if len(v) == 5 {
		v += ":00"
	}
	return v
}

func selectEffectiveCustomSchedule(schedules []models.WorkSchedule, employeeID uint, date time.Time) (models.WorkSchedule, bool) {
	var selected models.WorkSchedule
	found := false
	for _, s := range schedules {
		specific := s.EmployeeID != nil && *s.EmployeeID == employeeID
		if s.EmployeeID != nil && !specific || scheduleStartsAfter(s.Tanggal, date) {
			continue
		}
		if isRegularShiftName(s.NamaShift) {
			continue
		}
		if !found || (specific && selected.EmployeeID == nil) || (specific == (selected.EmployeeID != nil) && scheduleDateAfter(s, selected)) {
			selected = s
			found = true
		}
	}
	return selected, found
}

// selectEffectiveSchedule is retained as a small compatibility wrapper for
// existing resolver tests and older internal callers. New code should use the
// public ResolveEffectiveSchedule result instead of selecting raw rows.
func selectEffectiveSchedule(schedules []models.WorkSchedule, employeeID uint, date time.Time) (models.WorkSchedule, bool) {
	return selectEffectiveCustomSchedule(schedules, employeeID, scheduleDateOnly(date))
}

func selectAssignmentSchedule(schedules []models.WorkSchedule, shiftName string, employeeID uint, date time.Time) (models.WorkSchedule, bool) {
	if shiftName == "" || isRegularShiftName(shiftName) {
		return models.WorkSchedule{}, false
	}
	var selected models.WorkSchedule
	found := false
	for _, schedule := range schedules {
		if schedule.EmployeeID != nil && *schedule.EmployeeID != employeeID || scheduleStartsAfter(schedule.Tanggal, date) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(schedule.NamaShift), shiftName) || !validScheduleHours(schedule) {
			continue
		}
		if !found || scheduleDateAfter(schedule, selected) {
			selected = schedule
			found = true
		}
	}
	return selected, found
}

func validScheduleHours(schedule models.WorkSchedule) bool {
	if strings.TrimSpace(schedule.JamMulai) == "" || strings.TrimSpace(schedule.JamSelesai) == "" {
		return false
	}
	start, startErr := time.Parse("15:04:05", normalizeScheduleClock(schedule.JamMulai))
	end, endErr := time.Parse("15:04:05", normalizeScheduleClock(schedule.JamSelesai))
	return startErr == nil && endErr == nil && !start.Equal(end)
}

func scheduleDateOnly(value time.Time) time.Time {
	value = value.In(jakartaLocation)
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, jakartaLocation)
}

func scheduleStartsAfter(value *time.Time, date time.Time) bool {
	return value != nil && scheduleDateOnly(*value).After(scheduleDateOnly(date))
}

func scheduleDateAfter(candidate, current models.WorkSchedule) bool {
	if candidate.Tanggal == nil {
		return current.Tanggal == nil && candidate.ID > current.ID
	}
	if current.Tanggal == nil {
		return true
	}
	candidateDate := scheduleDateOnly(*candidate.Tanggal)
	currentDate := scheduleDateOnly(*current.Tanggal)
	return candidateDate.After(currentDate) || candidateDate.Equal(currentDate) && candidate.ID > current.ID
}

func isRegularShiftName(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))
	// "Shift Pagi Reguler" was created by an older seeder. Treat only that
	// exact legacy label as regular so it cannot reappear in the shift list or
	// override the weekly regular schedule. Other custom shift names remain
	// unaffected.
	return strings.HasPrefix(normalized, "reguler") || normalized == "shift pagi reguler"
}
