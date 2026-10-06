package handlers

import (
	"strings"
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
	if got, want := deadline.Format(time.RFC3339), "2026-07-23T18:00:00+07:00"; got != want {
		t.Fatalf("regular checkout deadline date: got %s, want %s", got, want)
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
	if got, want := deadline.Format(time.RFC3339), "2026-07-28T07:00:00+07:00"; got != want {
		t.Fatalf("overnight checkout deadline: got %s, want %s", got, want)
	}
}

func TestAttendanceMessagePrioritizesNonWorkingDay(t *testing.T) {
	now := time.Date(2026, 9, 15, 23, 30, 0, 0, jakartaLocation)
	message := attendanceMessage(
		now,
		"Belum Absen",
		time.Date(2026, 9, 15, 18, 23, 0, 0, jakartaLocation),
		time.Date(2026, 9, 15, 23, 0, 0, 0, jakartaLocation),
		time.Date(2026, 9, 16, 0, 0, 0, 0, jakartaLocation),
		false,
	)
	if message != "Hari ini bukan hari kerja untuk shift Anda." {
		t.Fatalf("non-working day message: got %q", message)
	}
}

func TestAttendanceWindowUsesNextDayDeadlineForLateEveningShift(t *testing.T) {
	schedule := models.WorkSchedule{JamMulai: "18:23", JamSelesai: "23:00"}
	date := time.Date(2026, 9, 15, 0, 0, 0, 0, jakartaLocation)
	_, start, _, end, deadline := attendanceWindow(date.Add(12*time.Hour), schedule)

	if got, want := start.Format(time.RFC3339), "2026-09-15T18:23:00+07:00"; got != want {
		t.Fatalf("start: got %s, want %s", got, want)
	}
	if got, want := end.Format(time.RFC3339), "2026-09-15T23:00:00+07:00"; got != want {
		t.Fatalf("end: got %s, want %s", got, want)
	}
	if got, want := deadline.Format(time.RFC3339), "2026-09-16T00:00:00+07:00"; got != want {
		t.Fatalf("deadline: got %s, want %s", got, want)
	}
}

func TestScheduleCheckinStartUsesEarlyToleranceWithoutChangingOfficialStart(t *testing.T) {
	early := 60
	schedule := models.WorkSchedule{
		JamMulai:                "08:00:00",
		JamSelesai:              "17:00:00",
		ToleransiTerlambatMenit: 10,
		ToleransiAbsenAwalMenit: &early,
	}
	date := time.Date(2026, 7, 23, 0, 0, 0, 0, jakartaLocation)
	open := scheduleCheckinStart(schedule, date)
	if got := open.Format("15:04"); got != "07:00" {
		t.Fatalf("early check-in boundary: got %s, want 07:00", got)
	}
	_, official, lateAt, _, _ := attendanceWindow(time.Date(2026, 7, 23, 9, 0, 0, 0, jakartaLocation), schedule)
	if official.Format("15:04") != "08:00" || lateAt.Format("15:04") != "08:10" {
		t.Fatalf("early tolerance must not change official/late times: official=%s late=%s", official, lateAt)
	}
}

func TestScheduleCheckinStartTreatsZeroAsExplicitShiftValue(t *testing.T) {
	early := 0
	schedule := models.WorkSchedule{JamMulai: "08:00", ToleransiAbsenAwalMenit: &early}
	date := time.Date(2026, 7, 23, 0, 0, 0, 0, jakartaLocation)
	if got := scheduleCheckinStart(schedule, date).Format("15:04"); got != "08:00" {
		t.Fatalf("explicit zero must disable early check-in: got %s", got)
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
		GoogleMapsURL:  "https://www.google.com/maps/@-6.200000,106.800000,17z",
		LatitudeRumah:  -6.200000,
		LongitudeRumah: 106.800000,
		RadiusMeter:    100,
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

func TestShouldSendWFHAttendanceNotificationOnlyForHomeBaseWorkType(t *testing.T) {
	if !shouldSendWFHAttendanceNotification(models.WorkType{Nama: "WFH", IsHomeBase: true}) {
		t.Fatal("WFH/home-base work type should trigger Kehadiran WFH notification")
	}
	if shouldSendWFHAttendanceNotification(models.WorkType{Nama: "WFO", IsHomeBase: false}) {
		t.Fatal("non-WFH work type must not trigger Kehadiran WFH notification")
	}
}

func TestWFHAttendanceNotificationPayloadContainsRequiredDetails(t *testing.T) {
	employee := models.Employee{
		NIK: "EMP001",
		User: &models.User{
			Nama: "Budi Santoso",
		},
	}
	record := models.AttendanceRecord{
		Status: models.StatusHadir,
	}
	at := time.Date(2026, 9, 16, 8, 15, 0, 0, jakartaLocation)

	title, message := wfhAttendanceNotificationPayload(employee, record, at, "Jl. Rumah No. 10")

	if title != "Kehadiran WFH Karyawan" {
		t.Fatalf("title: got %q", title)
	}
	for _, want := range []string{"Budi Santoso", "16 Sep 2026 08:15", "Jenis: WFH", "Status: Hadir", "Jl. Rumah No. 10"} {
		if !strings.Contains(message, want) {
			t.Fatalf("message %q should contain %q", message, want)
		}
	}
}

func TestWFHAttendanceNotificationPayloadFallsBackToNIKAndDefaultLocation(t *testing.T) {
	employee := models.Employee{NIK: "EMP001"}
	record := models.AttendanceRecord{Status: models.StatusTerlambat}
	at := time.Date(2026, 9, 16, 8, 15, 0, 0, jakartaLocation)

	_, message := wfhAttendanceNotificationPayload(employee, record, at, " ")

	for _, want := range []string{"EMP001", "Status: Terlambat", "Lokasi rumah tervalidasi"} {
		if !strings.Contains(message, want) {
			t.Fatalf("message %q should contain %q", message, want)
		}
	}
}
