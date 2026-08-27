package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"strings"
	"time"
)

type EffectiveSchedule struct {
	ShiftName            string              `json:"shift_name"`
	Source               string              `json:"source"`
	StartTime            string              `json:"start_time"`
	EndTime              string              `json:"end_time"`
	LateToleranceMinutes int                 `json:"late_tolerance_minutes"`
	IsWorkingDay         bool                `json:"is_working_day"`
	IsOvernight          bool                `json:"is_overnight"`
	Schedule             models.WorkSchedule `json:"-"`
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
	return models.WorkSchedule{NamaShift: "Reguler", JamMulai: day.StartTime, JamSelesai: day.EndTime, ToleransiTerlambatMenit: day.LateToleranceMinutes, HariKerja: func() string {
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

// ResolveEffectiveSchedule enforces employee-specific > custom shift > regular > fallback.
func ResolveEffectiveSchedule(employeeID uint, date time.Time) EffectiveSchedule {
	date = date.In(jakartaLocation)
	var schedules []models.WorkSchedule
	if config.DB != nil {
		config.DB.Where("employee_id = ? OR employee_id IS NULL", employeeID).Find(&schedules)
	}
	selected, ok := selectEffectiveCustomSchedule(schedules, employeeID, date)
	if ok && !isRegularShiftName(selected.NamaShift) {
		source := "custom_shift"
		if selected.EmployeeID != nil {
			source = "employee_specific"
		}
		return effectiveFromWorkSchedule(selected, source, date)
	}
	// A legacy employee-specific row named Reguler is treated as legacy data,
	// never as a second source of regular hours.
	if ok && selected.EmployeeID != nil {
		// continue to regular configuration
	}
	var regular models.RegularWorkSchedule
	if config.DB != nil && config.DB.Where("day_of_week = ?", weekdayJakarta(date)).First(&regular).Error == nil {
		s := scheduleFromRegular(regular)
		return effectiveFromWorkSchedule(s, "regular_default", date)
	}
	fallback := models.WorkSchedule{NamaShift: "Reguler", JamMulai: defaultStartTime, JamSelesai: defaultEndTime, ToleransiTerlambatMenit: defaultGraceMinutes, HariKerja: "[1,2,3,4,5,6]"}
	return effectiveFromWorkSchedule(fallback, "system_fallback", date)
}

func resolveRegularForTest(day models.RegularWorkSchedule, date time.Time) EffectiveSchedule {
	return effectiveFromWorkSchedule(scheduleFromRegular(day), "regular_default", date)
}

func effectiveFromWorkSchedule(s models.WorkSchedule, source string, date time.Time) EffectiveSchedule {
	working := s.IsWorkingDay(date)
	if source == "regular_default" {
		working = s.HariKerja != "[]"
	}
	start, _ := time.Parse("15:04:05", normalizeScheduleClock(s.JamMulai))
	end, _ := time.Parse("15:04:05", normalizeScheduleClock(s.JamSelesai))
	return EffectiveSchedule{ShiftName: s.NamaShift, Source: source, StartTime: s.JamMulai, EndTime: s.JamSelesai, LateToleranceMinutes: s.ToleransiTerlambatMenit, IsWorkingDay: working, IsOvernight: !end.After(start), Schedule: s}
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
		if s.EmployeeID != nil && !specific || s.Tanggal != nil && s.Tanggal.In(jakartaLocation).After(date) {
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

func isRegularShiftName(name string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(name)), "reguler")
}
