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

func TestRegularScheduleResolverUsesSaturdayHours(t *testing.T) {
	date := time.Date(2026, 9, 19, 9, 0, 0, 0, jakartaLocation) // Saturday
	got := resolveRegularForTest(models.RegularWorkSchedule{DayOfWeek: 6, IsWorkingDay: true, StartTime: "07:00", EndTime: "12:00"}, date)
	if got.StartTime != "07:00" || got.EndTime != "12:00" || !got.IsWorkingDay {
		t.Fatalf("Saturday must use its own configured hours: %#v", got)
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

func TestEffectiveScheduleUsesEmployeeSpecificDateAndIgnoresFutureRows(t *testing.T) {
	employeeID := uint(2)
	globalDate := time.Date(2026, 10, 1, 0, 0, 0, 0, jakartaLocation)
	specificDate := time.Date(2026, 10, 8, 0, 0, 0, 0, jakartaLocation)
	futureDate := time.Date(2026, 10, 9, 0, 0, 0, 0, jakartaLocation)
	schedules := []models.WorkSchedule{
		{Model: models.Model{ID: 10}, NamaShift: "Global", JamMulai: "09:00", JamSelesai: "17:00", Tanggal: &globalDate},
		{Model: models.Model{ID: 11}, EmployeeID: &employeeID, NamaShift: "khusus", JamMulai: "10:00", JamSelesai: "16:00", Tanggal: &specificDate},
		{Model: models.Model{ID: 12}, EmployeeID: &employeeID, NamaShift: "Malam", JamMulai: "22:00", JamSelesai: "06:00", Tanggal: &futureDate},
	}
	before, ok := selectEffectiveCustomSchedule(schedules, employeeID, time.Date(2026, 10, 7, 0, 0, 0, 0, jakartaLocation))
	if !ok || before.NamaShift != "Global" {
		t.Fatalf("future employee-specific row must not win before its effective date: %#v", before)
	}
	active, ok := selectEffectiveCustomSchedule(schedules, employeeID, time.Date(2026, 10, 8, 0, 0, 0, 0, jakartaLocation))
	if !ok || active.NamaShift != "khusus" {
		t.Fatalf("employee-specific row must win on its effective date: %#v", active)
	}
}

func TestEffectiveScheduleMetadataSupportsConfiguredSpecialShift(t *testing.T) {
	date := time.Date(2026, 10, 8, 0, 0, 0, 0, jakartaLocation)
	schedule := models.WorkSchedule{Model: models.Model{ID: 24}, NamaShift: "khusus", JamMulai: "10:00", JamSelesai: "16:00", Tanggal: &date}
	got := effectiveFromWorkSchedule(schedule, 2, scheduleSourceEmployeeSpecific, date)
	if got.EmployeeID != 2 || got.ScheduleID != 24 || got.ShiftName != "khusus" || got.Source != scheduleSourceEmployeeSpecific || got.StartTime != "10:00" || got.EndTime != "16:00" || got.IsOvernight {
		t.Fatalf("unexpected effective schedule metadata: %#v", got)
	}
}

func TestEffectiveScheduleMetadataMarksOvernightShift(t *testing.T) {
	date := time.Date(2026, 10, 8, 0, 0, 0, 0, jakartaLocation)
	schedule := models.WorkSchedule{Model: models.Model{ID: 25}, NamaShift: "Shift Malam", JamMulai: "22:00", JamSelesai: "06:00", Tanggal: &date}
	got := effectiveFromWorkSchedule(schedule, 2, scheduleSourceEmployeeSpecific, date)
	if !got.IsOvernight {
		t.Fatalf("overnight schedule should be marked as overnight: %#v", got)
	}
}

func TestLegacyShiftPagiRegulerIsTreatedAsRegular(t *testing.T) {
	if !isRegularShiftName(" Shift Pagi Reguler ") {
		t.Fatal("legacy Shift Pagi Reguler must be treated as the regular schedule")
	}
	if isRegularShiftName("Shift Pagi") || isRegularShiftName("Shift Siang") || isRegularShiftName("Shift Malam") {
		t.Fatal("custom shifts must remain distinct from the regular schedule")
	}
}

func TestExpandProfileSchedulesCreatesOneRowPerWorkday(t *testing.T) {
	schedules := expandProfileSchedules([]models.WorkSchedule{{NamaShift: "Shift Malam", HariKerja: "[1,2,3,4,5,6]", JamMulai: "18:23", JamSelesai: "23:00"}})
	if len(schedules) != 6 {
		t.Fatalf("expected six profile rows, got %d", len(schedules))
	}
	for index, schedule := range schedules {
		wantDay := index + 1
		if len(schedule.WorkDays()) != 1 || schedule.WorkDays()[0] != wantDay || schedule.JamMulai != "18:23" || schedule.JamSelesai != "23:00" {
			t.Fatalf("unexpected expanded row %d: %#v", index, schedule)
		}
	}
}
