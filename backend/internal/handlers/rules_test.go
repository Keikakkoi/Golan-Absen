package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

func TestIsEligibleForCutiUsesCalendarMonths(t *testing.T) {
	joined := time.Date(2026, 1, 31, 0, 0, 0, 0, jakartaLocation)
	employee := models.Employee{TanggalBergabung: joined}

	if isEligibleForCuti(employee, time.Date(2026, 4, 29, 0, 0, 0, 0, jakartaLocation), 3) {
		t.Fatal("employee should not be eligible before the calendar cutoff")
	}
	if !isEligibleForCuti(employee, time.Date(2026, 5, 1, 0, 0, 0, 0, jakartaLocation), 3) {
		t.Fatal("employee should be eligible on or after the calendar cutoff")
	}
}

func TestGeneralSettingUsesConfiguredQuotaDefault(t *testing.T) {
	setting := getGeneralSettingFrom(nil)
	if setting.DefaultCutiQuotaHari != defaultCutiQuotaHari {
		t.Fatalf("default cuti quota = %d, want %d", setting.DefaultCutiQuotaHari, defaultCutiQuotaHari)
	}
}

func TestEnsureDefaultCutiQuotaWithoutDatabaseIsSafe(t *testing.T) {
	if err := ensureDefaultCutiQuota(nil, 42, 2026, 15); err != nil {
		t.Fatalf("ensureDefaultCutiQuota(nil) returned error: %v", err)
	}
}

func TestIsEligibleForCutiAtExactCutoff(t *testing.T) {
	joined := time.Date(2026, 2, 20, 0, 0, 0, 0, jakartaLocation)
	employee := models.Employee{TanggalBergabung: joined}

	if !isEligibleForCuti(employee, joined.AddDate(0, 3, 0), 3) {
		t.Fatal("employee should be eligible exactly on the cutoff date")
	}
}

func TestWorkReportDeadlineUsesConfiguredShiftEndAndTolerance(t *testing.T) {
	date := time.Date(2026, 9, 18, 0, 0, 0, 0, jakartaLocation)
	checkIn := time.Date(2026, 9, 18, 8, 0, 0, 0, jakartaLocation)
	record := models.AttendanceRecord{Tanggal: date, JamMasuk: &checkIn}
	schedule := models.WorkSchedule{JamMulai: "08:00", JamSelesai: "17:00"}
	setting := models.GeneralSetting{BatasLaporanSetelahCheckoutMenit: 60}

	deadline := workReportDeadline(record, schedule, setting)
	want := time.Date(2026, 9, 18, 18, 0, 0, 0, jakartaLocation)
	if !deadline.Equal(want) {
		t.Fatalf("deadline = %s, want %s", deadline, want)
	}
	if deadline.Before(time.Date(2026, 9, 18, 17, 0, 0, 0, jakartaLocation)) {
		t.Fatal("submission must remain possible at shift end")
	}
}

func TestWorkReportDeadlineSupportsOvernightConfiguredShift(t *testing.T) {
	date := time.Date(2026, 9, 18, 0, 0, 0, 0, jakartaLocation)
	record := models.AttendanceRecord{Tanggal: date}
	schedule := models.WorkSchedule{JamMulai: "22:00", JamSelesai: "06:00"}
	deadline := workReportDeadline(record, schedule, models.GeneralSetting{BatasLaporanSetelahCheckoutMenit: 60})
	want := time.Date(2026, 9, 19, 7, 0, 0, 0, jakartaLocation)
	if !deadline.Equal(want) {
		t.Fatalf("overnight deadline = %s, want %s", deadline, want)
	}
}

func TestMissingWorkReportSelectsOnlyNewestWarning(t *testing.T) {
	firstDate := time.Date(2026, 8, 24, 0, 0, 0, 0, jakartaLocation)
	newestDate := time.Date(2026, 9, 2, 0, 0, 0, 0, jakartaLocation)
	first, _ := selectLatestMissingWorkReport(nil, time.Time{}, fiber.Map{"tanggal": "2026-08-24"}, firstDate)
	newest, selectedDate := selectLatestMissingWorkReport(first, firstDate, fiber.Map{"tanggal": "2026-09-02"}, newestDate)
	if newest["tanggal"] != "2026-09-02" || !selectedDate.Equal(newestDate) {
		t.Fatalf("newest warning = %#v at %s, want 2026-09-02", newest, selectedDate)
	}
	kept, keptDate := selectLatestMissingWorkReport(newest, newestDate, fiber.Map{"tanggal": "2026-08-31"}, time.Date(2026, 8, 31, 0, 0, 0, 0, jakartaLocation))
	if kept["tanggal"] != "2026-09-02" || !keptDate.Equal(newestDate) {
		t.Fatalf("older warning replaced the newest warning: %#v", kept)
	}
}
