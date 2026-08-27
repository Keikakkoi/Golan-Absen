package models

import (
	"encoding/json"
	"time"
)

var DefaultWorkDays = []int{1, 2, 3, 4, 5, 6}

func (s WorkSchedule) WorkDays() []int {
	var days []int
	if s.HariKerja != "" {
		if json.Unmarshal([]byte(s.HariKerja), &days) == nil && len(days) > 0 {
			return days
		}
	}
	return append([]int(nil), DefaultWorkDays...)
}

func (s WorkSchedule) IsWorkingDay(date time.Time) bool {
	weekday := int(date.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	for _, day := range s.WorkDays() {
		if day == weekday {
			return true
		}
	}
	return false
}

func EncodeWorkDays(days []int) (string, bool) {
	seen := map[int]bool{}
	valid := make([]int, 0, len(days))
	for _, day := range days {
		if day < 1 || day > 7 || seen[day] {
			continue
		}
		seen[day] = true
		valid = append(valid, day)
	}
	if len(valid) == 0 {
		return "", false
	}
	b, _ := json.Marshal(valid)
	return string(b), true
}
