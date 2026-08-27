package handlers

import (
	"testing"
	"time"
)

func TestValidateHomeLocationInput(t *testing.T) {
	future := time.Now().In(jakartaLocation).AddDate(0, 0, 2).Format("2006-01-02")
	if _, err := validateHomeLocationInput(homeLocationRequestInput{Address: "Alamat", Latitude: -6.2, Longitude: 106.8, Radius: 100, EffectiveDate: future, Reason: "Pindah"}); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}
	tests := []homeLocationRequestInput{
		{Address: "", Latitude: -6.2, Longitude: 106.8, Radius: 100, EffectiveDate: future, Reason: "Pindah"},
		{Address: "Alamat", Latitude: 91, Longitude: 106.8, Radius: 100, EffectiveDate: future, Reason: "Pindah"},
		{Address: "Alamat", Latitude: -6.2, Longitude: 106.8, Radius: 0, EffectiveDate: future, Reason: "Pindah"},
	}
	for _, input := range tests {
		if _, err := validateHomeLocationInput(input); err == nil {
			t.Errorf("invalid request was accepted: %+v", input)
		}
	}
}

func TestParseEffectiveDate(t *testing.T) {
	date, err := parseEffectiveDate("2026-09-01")
	if err != nil || date.Location() != jakartaLocation || date.Format("2006-01-02") != "2026-09-01" {
		t.Fatalf("unexpected effective date: %v %v", date, err)
	}
}
