package models

import (
	"testing"
	"time"
)

func TestWorkScheduleDays(t *testing.T) {
	monday := time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)
	sunday := monday.AddDate(0, 0, 6)
	legacy := WorkSchedule{}
	if !legacy.IsWorkingDay(monday) || !legacy.IsWorkingDay(monday.AddDate(0, 0, 5)) || legacy.IsWorkingDay(sunday) {
		t.Fatal("legacy schedule must default to Monday-Saturday")
	}
	sundayShift := WorkSchedule{HariKerja: "[7]"}
	if sundayShift.IsWorkingDay(monday) || !sundayShift.IsWorkingDay(sunday) {
		t.Fatal("custom schedule days were not applied")
	}
}
