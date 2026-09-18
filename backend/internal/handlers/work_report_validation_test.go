package handlers

import "testing"

func TestValidateRealisasiKegiatan(t *testing.T) {
	valid := []string{"0%", "20%", "50%", "100%"}
	for _, value := range valid {
		if err := validateRealisasiKegiatan(value, true); err != nil {
			t.Errorf("expected %q to be valid: %v", value, err)
		}
	}

	invalid := []string{"selesai", "seratus persen", "abc", "50 persen", "20%%", "101%", "-1%", ""}
	for _, value := range invalid {
		if err := validateRealisasiKegiatan(value, true); err == nil {
			t.Errorf("expected %q to be invalid", value)
		}
	}
	if err := validateRealisasiKegiatan("", false); err != nil {
		t.Fatalf("empty value should be allowed for partial updates: %v", err)
	}
}
