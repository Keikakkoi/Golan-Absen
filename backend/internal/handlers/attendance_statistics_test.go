package handlers

import (
	"absensi-golan-backend/internal/models"
	"testing"
	"time"
)

func TestCalculateAttendanceStatisticsUsesWorkingDaysAndAlpha(t *testing.T) {
	start := time.Date(2026, 9, 14, 0, 0, 0, 0, jakartaLocation) // Monday
	now := time.Date(2026, 9, 18, 18, 0, 0, 0, jakartaLocation)
	id := uint(1)
	employee := models.Employee{Model: models.Model{ID: id}, TanggalBergabung: start}
	in := attendanceStatisticsInput{records: map[string]models.AttendanceRecord{}, leaves: map[string]models.AttendanceStatus{}, holidays: map[string]bool{}}
	for i, status := range []models.AttendanceStatus{models.StatusHadir, models.StatusHadir, models.StatusHadir, models.StatusTerlambat, models.StatusAlpha} {
		day := start.AddDate(0, 0, i)
		in.records[recordKey(id, day)] = models.AttendanceRecord{EmployeeID: &id, Tanggal: day, Status: status}
	}
	got := calculateAttendanceStatistics(employee, start, start.AddDate(0, 0, 4), now, in)
	if got.Hadir != 3 || got.Terlambat != 1 || got.Alpha != 1 || got.TotalHariKerja != 5 || attendancePercentage(got) != 80 {
		t.Fatalf("unexpected statistics: %+v, percentage=%d", got, attendancePercentage(got))
	}
}

func TestCalculateAttendanceStatisticsCountsApprovedLeaveAndRunningDay(t *testing.T) {
	start := time.Date(2026, 9, 14, 0, 0, 0, 0, jakartaLocation)
	now := time.Date(2026, 9, 16, 10, 0, 0, 0, jakartaLocation)
	id := uint(2)
	employee := models.Employee{Model: models.Model{ID: id}, TanggalBergabung: start}
	in := attendanceStatisticsInput{records: map[string]models.AttendanceRecord{}, leaves: map[string]models.AttendanceStatus{}, holidays: map[string]bool{}}
	in.records[recordKey(id, start)] = models.AttendanceRecord{EmployeeID: &id, Tanggal: start, Status: models.StatusHadir}
	in.records[recordKey(id, start.AddDate(0, 0, 1))] = models.AttendanceRecord{EmployeeID: &id, Tanggal: start.AddDate(0, 0, 1), Status: models.StatusHadir}
	in.leaves[recordKey(id, start.AddDate(0, 0, 2))] = models.StatusIzin
	got := calculateAttendanceStatistics(employee, start, start.AddDate(0, 0, 2), now, in)
	if got.Hadir != 2 || got.IzinCuti != 1 || got.Alpha != 0 || got.BelumAbsen != 0 || got.TotalHariKerja != 3 || attendancePercentage(got) != 66 {
		t.Fatalf("unexpected leave statistics: %+v, percentage=%d", got, attendancePercentage(got))
	}
}

func TestCalculateAttendanceStatisticsCountsEveryDisplayedStatus(t *testing.T) {
	start := time.Date(2026, 9, 14, 0, 0, 0, 0, jakartaLocation) // Monday
	now := time.Date(2026, 9, 19, 10, 0, 0, 0, jakartaLocation)  // Saturday, before the default shift ends
	id := uint(3)
	employee := models.Employee{Model: models.Model{ID: id}, TanggalBergabung: start}
	in := attendanceStatisticsInput{records: map[string]models.AttendanceRecord{}, leaves: map[string]models.AttendanceStatus{}, holidays: map[string]bool{}}
	for dayOffset, status := range map[int]models.AttendanceStatus{0: models.StatusHadir, 1: models.StatusTerlambat, 4: models.StatusAlpha} {
		day := start.AddDate(0, 0, dayOffset)
		in.records[recordKey(id, day)] = models.AttendanceRecord{EmployeeID: &id, Tanggal: day, Status: status}
	}
	in.leaves[recordKey(id, start.AddDate(0, 0, 2))] = models.StatusIzin
	in.leaves[recordKey(id, start.AddDate(0, 0, 3))] = models.StatusCuti

	got := calculateAttendanceStatistics(employee, start, start.AddDate(0, 0, 5), now, in)
	if got.Hadir != 1 || got.Terlambat != 1 || got.IzinCuti != 2 || got.Alpha != 1 || got.BelumAbsen != 1 || got.TotalHariKerja != 6 {
		t.Fatalf("unexpected mixed statistics: %+v", got)
	}
	if got.Hadir+got.Terlambat != 2 || attendancePercentage(got) != 33 {
		t.Fatalf("late attendance was not included in percentage: %+v, percentage=%d", got, attendancePercentage(got))
	}
}

func TestAttendanceStatisticsReturnsZeroWhenThereAreNoWorkingDays(t *testing.T) {
	start := time.Date(2026, 9, 14, 0, 0, 0, 0, jakartaLocation)
	now := time.Date(2026, 9, 20, 18, 0, 0, 0, jakartaLocation)
	id := uint(4)
	employee := models.Employee{Model: models.Model{ID: id}, TanggalBergabung: start}
	in := attendanceStatisticsInput{records: map[string]models.AttendanceRecord{}, leaves: map[string]models.AttendanceStatus{}, holidays: map[string]bool{}}
	for day := start; !day.After(start.AddDate(0, 0, 6)); day = day.AddDate(0, 0, 1) {
		in.holidays[day.Format("2006-01-02")] = true
	}
	got := calculateAttendanceStatistics(employee, start, start.AddDate(0, 0, 6), now, in)
	if got != (AttendanceStatistics{}) || attendancePercentage(got) != 0 {
		t.Fatalf("expected empty working-day statistics, got %+v, percentage=%d", got, attendancePercentage(got))
	}
}

func TestAttendanceDaySummaryAggregatesTeamByMemberAndWorkingDay(t *testing.T) {
	day := time.Date(2026, 9, 18, 0, 0, 0, 0, jakartaLocation) // Friday
	now := time.Date(2026, 9, 18, 18, 0, 0, 0, jakartaLocation)
	firstID, secondID := uint(5), uint(6)
	employees := []models.Employee{{Model: models.Model{ID: firstID}, TanggalBergabung: day}, {Model: models.Model{ID: secondID}, TanggalBergabung: day}}
	in := attendanceStatisticsInput{records: map[string]models.AttendanceRecord{}, leaves: map[string]models.AttendanceStatus{}, holidays: map[string]bool{}}
	in.records[recordKey(firstID, day)] = models.AttendanceRecord{EmployeeID: &firstID, Tanggal: day, Status: models.StatusHadir}
	in.records[recordKey(secondID, day)] = models.AttendanceRecord{EmployeeID: &secondID, Tanggal: day, Status: models.StatusTerlambat}
	got := attendanceDaySummary(employees, day, now, in)
	if got.Hadir != 1 || got.Terlambat != 1 || got.TotalHariKerja != 2 || attendancePercentage(got) != 100 {
		t.Fatalf("unexpected team summary: %+v, percentage=%d", got, attendancePercentage(got))
	}
}
