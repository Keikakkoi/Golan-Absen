package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
)

func TestAttendanceBusinessDateResetsAtSeven(t *testing.T) {
	beforeReset := time.Date(2026, 7, 23, 6, 59, 59, 0, jakartaLocation)
	atReset := time.Date(2026, 7, 23, 7, 0, 0, 0, jakartaLocation)

	if got := attendanceBusinessDate(beforeReset).Format("2006-01-02"); got != "2026-07-22" {
		t.Fatalf("before reset: got %s, want 2026-07-22", got)
	}
	if got := attendanceBusinessDate(atReset).Format("2006-01-02"); got != "2026-07-23" {
		t.Fatalf("at reset: got %s, want 2026-07-23", got)
	}
}

func TestAttendanceWindowUsesNineTenGraceAndSixPmDeadline(t *testing.T) {
	schedule := models.WorkSchedule{JamMulai: "09:00:00", JamSelesai: "17:00:00", ToleransiTerlambatMenit: 10}
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, jakartaLocation)
	_, start, lateAt, end, deadline := attendanceWindow(now, schedule)

	if got := start.Format("15:04"); got != "09:00" {
		t.Fatalf("start: got %s, want 09:00", got)
	}
	if got := lateAt.Format("15:04"); got != "09:10" {
		t.Fatalf("late boundary: got %s, want 09:10", got)
	}
	if !time.Date(2026, 7, 23, 9, 10, 1, 0, jakartaLocation).After(lateAt) {
		t.Fatal("09:10:01 should be late")
	}
	if got := end.Format("15:04"); got != "17:00" {
		t.Fatalf("end: got %s, want 17:00", got)
	}
	if got := deadline.Format("15:04"); got != "18:00" {
		t.Fatalf("checkout deadline: got %s, want 18:00", got)
	}
}
