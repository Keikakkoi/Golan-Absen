package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
)

func TestWorkReportStatusMapIsScopedToEmployeeAndDate(t *testing.T) {
	employee7, employee8 := uint(7), uint(8)
	reports := []models.WorkReport{
		{EmployeeID: &employee7, Tanggal: time.Date(2024, time.February, 5, 0, 0, 0, 0, time.UTC)},
		{EmployeeID: &employee8, Tanggal: time.Date(2024, time.February, 5, 0, 0, 0, 0, time.UTC)},
	}
	status := workReportStatusMap(reports)
	if !status["7_2024-02-05"] || !status["8_2024-02-05"] {
		t.Fatal("reports should be indexed by employee and exact date")
	}
	if status["7_2024-02-06"] {
		t.Fatal("a report must not mark a different date as reported")
	}
	placeholder := []models.WorkReport{{EmployeeID: &employee7, Tanggal: time.Date(2024, time.February, 6, 0, 0, 0, 0, time.UTC), StatusSesuai: "tidak membuat laporan kerja"}}
	if workReportStatusMap(placeholder)["7_2024-02-06"] {
		t.Fatal("automatic missing-report markers must not count as submitted reports")
	}
}

func TestIsWorkReportLocked(t *testing.T) {
	tests := []struct {
		status string
		locked bool
	}{
		{status: "Sesuai", locked: true},
		{status: " sesuai ", locked: true},
		{status: "Tidak membuat laporan kerja", locked: true},
		{status: "tidak membuat laporan kerja", locked: true},
		{status: "Tidak Sesuai", locked: false},
		{status: "Menunggu", locked: false},
		{status: "", locked: false},
	}
	for _, test := range tests {
		if got := isWorkReportLocked(test.status); got != test.locked {
			t.Errorf("isWorkReportLocked(%q) = %v, want %v", test.status, got, test.locked)
		}
	}
}
