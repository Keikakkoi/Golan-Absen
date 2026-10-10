package handlers

import (
	"strings"
	"testing"
)

func validCompanyEventInput() companyEventInput {
	return companyEventInput{
		Tanggal: "2026-10-10", JamMulai: "08:00", JamSelesai: "09:00",
		Judul: "Rapat koordinasi", Tipe: "rapat", Deskripsi: "Catatan event", Lokasi: "Ruang rapat",
	}
}

func TestCompanyEventTextLimitsAcceptBoundaryValues(t *testing.T) {
	input := validCompanyEventInput()
	input.Judul = strings.Repeat("a", companyEventTitleMaxLength)
	input.Lokasi = strings.Repeat("b", companyEventLocationMaxLength)
	input.Deskripsi = strings.Repeat("c", companyEventDescriptionMaxLength)

	if _, err := input.toModel(); err != nil {
		t.Fatalf("boundary values should be accepted: %v", err)
	}
}

func TestCompanyEventTextLimitsRejectLongFields(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*companyEventInput)
		want   string
	}{
		{"judul panjang dengan spasi", func(input *companyEventInput) { input.Judul = strings.Repeat("kata panjang ", 20) }, "Judul event maksimal 150 karakter"},
		{"judul satu kata sangat panjang", func(input *companyEventInput) { input.Judul = strings.Repeat("a", companyEventTitleMaxLength+1) }, "Judul event maksimal 150 karakter"},
		{"lokasi panjang", func(input *companyEventInput) { input.Lokasi = strings.Repeat("Lokasi ", 30) }, "Lokasi maksimal 150 karakter"},
		{"deskripsi panjang", func(input *companyEventInput) { input.Deskripsi = strings.Repeat("Catatan ", 300) }, "Deskripsi/catatan maksimal 2000 karakter"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validCompanyEventInput()
			test.mutate(&input)
			if _, err := input.toModel(); err == nil || err.Error() != test.want {
				t.Fatalf("expected %q, got %v", test.want, err)
			}
		})
	}
}

func TestCompanyEventTextLimitsRejectAllLongFieldsTogether(t *testing.T) {
	input := validCompanyEventInput()
	input.Judul = strings.Repeat("a", companyEventTitleMaxLength+1)
	input.Lokasi = strings.Repeat("b", companyEventLocationMaxLength+1)
	input.Deskripsi = strings.Repeat("c", companyEventDescriptionMaxLength+1)

	if _, err := input.toModel(); err == nil || err.Error() != "Judul event maksimal 150 karakter" {
		t.Fatalf("expected title validation to be reported first, got %v", err)
	}
}
