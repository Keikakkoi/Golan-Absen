package handlers

import (
	"absensi-golan-backend/internal/models"
	"testing"
	"time"
)

func TestHolidayMessagesIdentifyCalendarType(t *testing.T) {
	cases := []struct{ typ, want string }{
		{"national", "hari libur nasional"},
		{"joint_leave", "cuti bersama"},
		{"company", "hari libur khusus perusahaan"},
	}
	for _, tc := range cases {
		if got := holidayError(models.Holiday{Type: tc.typ}); !contains(got, tc.want) {
			t.Errorf("%s: %q", tc.typ, got)
		}
	}
}

func TestNormalizeHolidayDateUsesJakartaDate(t *testing.T) {
	utc := time.Date(2026, 8, 16, 17, 30, 0, 0, time.UTC) // 17 Aug WIB
	if got := normalizeHolidayDate(utc).Format("2006-01-02"); got != "2026-08-17" {
		t.Fatalf("got %s", got)
	}
}

func contains(value, part string) bool {
	for i := 0; i+len(part) <= len(value); i++ {
		if value[i:i+len(part)] == part {
			return true
		}
	}
	return false
}
