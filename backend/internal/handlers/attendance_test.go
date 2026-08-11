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

func TestAttendanceWindowUsesConfiguredStartAndSupportsOvernightEnd(t *testing.T) {
	schedule := models.WorkSchedule{JamMulai: "20:38:00", JamSelesai: "22:00:00", ToleransiTerlambatMenit: 10}
	now := time.Date(2026, 7, 23, 9, 40, 0, 0, jakartaLocation)
	_, start, _, end, _ := attendanceWindow(now, schedule)

	if got := start.Format("15:04"); got != "20:38" {
		t.Fatalf("start: got %s, want 20:38", got)
	}
	if !now.Before(start) {
		t.Fatal("09:40 must be before a 20:38 shift start")
	}
	if got := end.Format("15:04"); got != "22:00" {
		t.Fatalf("end: got %s, want 22:00", got)
	}

	overnight := models.WorkSchedule{JamMulai: "22:00:00", JamSelesai: "06:00:00"}
	_, overnightStart, _, overnightEnd, deadline := attendanceWindow(time.Date(2026, 7, 27, 23, 0, 0, 0, jakartaLocation), overnight)
	if !overnightEnd.After(overnightStart) || overnightEnd.Day() != 28 {
		t.Fatalf("overnight end: got %v, want following day", overnightEnd)
	}
	if !deadline.After(overnightEnd) {
		t.Fatal("overnight checkout deadline must be after shift end")
	}
}

func TestOvernightScheduleDeadlineUsesFollowingDay(t *testing.T) {
	schedule := models.WorkSchedule{JamMulai: "22:00:00", JamSelesai: "06:00:00"}
	date := time.Date(2026, 7, 27, 0, 0, 0, 0, jakartaLocation)
	got := scheduleCheckoutDeadline(schedule, date)
	want := time.Date(2026, 7, 28, 7, 0, 0, 0, jakartaLocation) // 06:00 + 1 hour checkout deadline
	if !got.Equal(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func TestValidateConfiguredHomeLocationUsesGoogleMapsHomePoint(t *testing.T) {
	home := models.EmployeeHomeLocation{
		GoogleMapsURL: "https://www.google.com/maps/@-6.200000,106.800000,17z",
		LatitudeRumah: -6.200000,
		LongitudeRumah: 106.800000,
		RadiusMeter: 100,
	}

	valid, source, err := validateConfiguredHomeLocation(home, -6.200100, 106.800000)
	if err != nil || !valid || source != "rumah" {
		t.Fatalf("home point should validate WFH: valid=%v source=%s err=%v", valid, source, err)
	}

	valid, _, err = validateConfiguredHomeLocation(home, -6.210000, 106.800000)
	if err == nil || valid || err.Error() != "Lokasi berada di luar radius rumah" {
		t.Fatalf("outside home radius should fail: valid=%v err=%v", valid, err)
	}
}

func TestValidateConfiguredHomeLocationRequiresGoogleMapsLink(t *testing.T) {
	valid, source, err := validateConfiguredHomeLocation(models.EmployeeHomeLocation{
		LatitudeRumah: -6.2, LongitudeRumah: 106.8, RadiusMeter: 100,
	}, -6.2, 106.8)
	if err == nil || valid || source != "tidak_tervalidasi" || err.Error() != "Anda belum mengatur lokasi rumah untuk absensi WFH" {
		t.Fatalf("missing home link should fail as unconfigured: valid=%v source=%s err=%v", valid, source, err)
	}
}
