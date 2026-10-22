package handlers

import (
	"testing"
	"time"
)

func TestEmployeeJoinDateChangedComparesCalendarDate(t *testing.T) {
	date := time.Date(2026, time.August, 20, 0, 0, 0, 0, time.UTC)
	if employeeJoinDateChanged(date, date.Add(12*time.Hour)) {
		t.Fatal("same calendar date was treated as changed")
	}
	if !employeeJoinDateChanged(date, date.AddDate(1, 0, 0)) {
		t.Fatal("different year was not treated as changed")
	}
	if !employeeJoinDateChanged(time.Time{}, date) {
		t.Fatal("zero to non-zero join date was not treated as changed")
	}
}
