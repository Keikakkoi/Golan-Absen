package handlers

import (
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
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

func TestIsEligibleForCutiAtExactCutoff(t *testing.T) {
	joined := time.Date(2026, 2, 20, 0, 0, 0, 0, jakartaLocation)
	employee := models.Employee{TanggalBergabung: joined}

	if !isEligibleForCuti(employee, joined.AddDate(0, 3, 0), 3) {
		t.Fatal("employee should be eligible exactly on the cutoff date")
	}
}
