package handlers

import (
	"testing"
	"time"
)

func TestSortAlphaDetailsByDateUsesRawDateDescending(t *testing.T) {
	location := time.FixedZone("WIB", 7*60*60)
	details := []AlphaDetail{
		{Tanggal: time.Date(2026, time.October, 15, 0, 0, 0, 0, location)},
		{Tanggal: time.Date(2026, time.September, 7, 0, 0, 0, 0, location)},
		{Tanggal: time.Date(2026, time.October, 16, 0, 0, 0, 0, location)},
		{Tanggal: time.Date(2025, time.December, 31, 0, 0, 0, 0, location)},
	}

	sortAlphaDetailsByDate(details)

	want := []string{"2026-10-16", "2026-10-15", "2026-09-07", "2025-12-31"}
	for i, detail := range details {
		if got := detail.Tanggal.Format("2006-01-02"); got != want[i] {
			t.Fatalf("details[%d] date = %s, want %s", i, got, want[i])
		}
	}
}
