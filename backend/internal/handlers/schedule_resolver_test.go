package handlers

import (
	"absensi-golan-backend/internal/models"
	"testing"
	"time"
)

func TestRegularScheduleResolverUsesJakartaWeekdayAndDailyHours(t *testing.T) {
	date := time.Date(2026, 8, 24, 23, 30, 0, 0, jakartaLocation) // Monday
	got := resolveRegularForTest(models.RegularWorkSchedule{DayOfWeek: 1, IsWorkingDay: true, StartTime: "10:00", EndTime: "18:00", LateToleranceMinutes: 7}, date)
	if got.StartTime != "10:00" || got.EndTime != "18:00" || got.LateToleranceMinutes != 7 || !got.IsWorkingDay || got.Source != "regular_default" {
		t.Fatalf("unexpected regular schedule: %#v", got)
	}
}

func TestRegularScheduleResolverMarksInactiveDay(t *testing.T) {
	date := time.Date(2026, 8, 30, 12, 0, 0, 0, jakartaLocation) // Sunday
	got := resolveRegularForTest(models.RegularWorkSchedule{DayOfWeek: 7, IsWorkingDay: false}, date)
	if got.IsWorkingDay || got.Schedule.HariKerja != "[]" {
		t.Fatalf("inactive day should not be working: %#v", got)
	}
}

func TestCustomScheduleSelectionBeatsGlobalSchedule(t *testing.T) {
	id := uint(9)
	date := time.Date(2026, 8, 24, 12, 0, 0, 0, jakartaLocation)
	got, ok := selectEffectiveCustomSchedule([]models.WorkSchedule{{NamaShift: "Shift Pagi", JamMulai: "08:00", JamSelesai: "16:00"}, {EmployeeID: &id, NamaShift: "Shift Malam", JamMulai: "22:00", JamSelesai: "06:00"}}, id, date)
	if !ok || got.NamaShift != "Shift Malam" {
		t.Fatalf("employee-specific schedule must win: %#v", got)
	}
}
