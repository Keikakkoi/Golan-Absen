package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
)

func TestSelectEffectiveSchedulePrioritizesSpecificAndDate(t *testing.T) {
	date := time.Date(2026, 8, 10, 0, 0, 0, 0, time.UTC)
	employeeID := uint(7)
	oldSpecificDate := date.AddDate(0, 0, -2)
	globalDate := date.AddDate(0, 0, -1)
	newSpecificDate := date.AddDate(0, 0, -1)
	futureDate := date.AddDate(0, 0, 1)

	schedules := []models.WorkSchedule{
		{Model: models.Model{ID: 1}, EmployeeID: nil, Tanggal: &globalDate, NamaShift: "global"},
		{Model: models.Model{ID: 2}, EmployeeID: &employeeID, Tanggal: &oldSpecificDate, NamaShift: "old-specific"},
		{Model: models.Model{ID: 3}, EmployeeID: &employeeID, Tanggal: &newSpecificDate, NamaShift: "khusus"},
		{Model: models.Model{ID: 4}, EmployeeID: &employeeID, Tanggal: &futureDate, NamaShift: "future"},
	}

	selected, ok := selectEffectiveSchedule(schedules, employeeID, date)
	if !ok || selected.NamaShift != "khusus" {
		t.Fatalf("expected current specific schedule, got %#v (found=%v)", selected, ok)
	}
}

func TestSelectEffectiveScheduleFallsBackToGlobalAndUndated(t *testing.T) {
	date := time.Date(2026, 8, 10, 0, 0, 0, 0, time.UTC)
	global := models.WorkSchedule{NamaShift: "global", Tanggal: func() *time.Time { d := date.AddDate(0, 0, -1); return &d }()}
	selected, ok := selectEffectiveSchedule([]models.WorkSchedule{global}, 7, date)
	if !ok || selected.NamaShift != "global" {
		t.Fatalf("expected global fallback, got %#v (found=%v)", selected, ok)
	}

	selected, ok = selectEffectiveSchedule([]models.WorkSchedule{{NamaShift: "legacy"}}, 7, date)
	if !ok || selected.NamaShift != "legacy" {
		t.Fatalf("expected undated global fallback, got %#v (found=%v)", selected, ok)
	}
}
