package handlers

import (
	"strings"
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func TestDefaultEmployeePasswordUsesRoleAndJoinYear(t *testing.T) {
	joined := time.Date(2027, time.January, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		role models.Role
		want string
	}{
		{models.RoleKaryawan, "karyawan-2027"},
		{models.RoleMagang, "magang-2027"},
		{models.RoleManajer, "manajer-2027"},
		{models.RoleHRD, "HRD-2027"},
	}
	for _, test := range tests {
		if got := defaultEmployeePassword(test.role, joined); got != test.want {
			t.Errorf("role %s: default password = %q, want %q", test.role, got, test.want)
		}
	}
}

func TestNewEmployeePasswordIsBcryptHashAndMatchesDefault(t *testing.T) {
	joined := time.Date(2027, time.January, 15, 0, 0, 0, 0, time.UTC)
	hash, err := hashNewEmployeePassword("", models.RoleMagang, joined)
	if err != nil {
		t.Fatal(err)
	}
	if hash == "magang-2027" || len(hash) == 0 {
		t.Fatalf("password was not stored as a hash: %q", hash)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte("magang-2027")); err != nil {
		t.Fatalf("default password does not match its bcrypt hash: %v", err)
	}
}

func TestEmployeeJoinYearValidation(t *testing.T) {
	tests := []struct {
		name  string
		value string
		valid bool
	}{
		{name: "valid year", value: "2027-01-15", valid: true},
		{name: "missing value", value: "", valid: false},
		{name: "invalid date", value: "2027-02-30", valid: false},
		{name: "year is not four digit", value: "999-01-15", valid: false},
		{name: "year is too old", value: "1899-12-31", valid: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			joined, err := parseEmployeeDate(test.value)
			valid := err == nil && validEmployeeJoinYear(joined.Year())
			if valid != test.valid {
				t.Fatalf("valid = %v, want %v (err=%v)", valid, test.valid, err)
			}
		})
	}
}

func TestValidateEmployeeProfileRejectsMissingOrInvalidJoinYear(t *testing.T) {
	base := EmployeeRequest{
		Nama:             "Karyawan Uji",
		Email:            "uji@example.com",
		NIK:              "1234567890123456",
		TanggalBergabung: "2027-01-15",
	}
	if err := validateEmployeeProfile(&base); err != nil {
		t.Fatalf("valid employee profile rejected: %v", err)
	}

	for _, value := range []string{"", "2027-02-30", "999-01-15", "1899-12-31"} {
		req := base
		req.TanggalBergabung = value
		if err := validateEmployeeProfile(&req); err == nil {
			t.Fatalf("join date %q was accepted", value)
		}
	}
}

func TestValidateInternshipPeriod(t *testing.T) {
	base := EmployeeRequest{
		Role:                models.RoleMagang,
		InternshipStartDate: "2027-01-15",
		InternshipEndDate:   "2027-02-15",
	}
	if err := validateInternshipPeriod(&base); err != nil {
		t.Fatalf("valid internship period rejected: %v", err)
	}

	tests := []struct {
		name    string
		start   string
		end     string
		wantErr string
	}{
		{name: "missing start", start: "", end: "2027-02-15", wantErr: "periode magang wajib diisi"},
		{name: "missing end", start: "2027-01-15", end: "", wantErr: "periode magang wajib diisi"},
		{name: "missing both", start: "", end: "", wantErr: "periode magang wajib diisi"},
		{name: "invalid start", start: "2027-02-30", end: "2027-03-15", wantErr: "tanggal mulai magang tidak valid"},
		{name: "invalid end", start: "2027-02-15", end: "2027-02-30", wantErr: "tanggal selesai magang tidak valid"},
		{name: "end before start", start: "2027-02-15", end: "2027-01-15", wantErr: "tidak boleh lebih awal"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := base
			req.InternshipStartDate = test.start
			req.InternshipEndDate = test.end
			err := validateInternshipPeriod(&req)
			if err == nil || !strings.Contains(err.Error(), test.wantErr) {
				t.Fatalf("error = %v, want text containing %q", err, test.wantErr)
			}
		})
	}
}

func TestValidateInternshipPeriodAllowsOtherRolesWithoutDates(t *testing.T) {
	for _, role := range []models.Role{models.RoleKaryawan, models.RoleManajer, models.RoleHRD} {
		if err := validateInternshipPeriod(&EmployeeRequest{Role: role}); err != nil {
			t.Fatalf("role %s unexpectedly rejected: %v", role, err)
		}
	}
}

func TestEmployeeUpdateWithoutPasswordPreservesExistingHash(t *testing.T) {
	oldHash, err := bcrypt.GenerateFromPassword([]byte("password-lama"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatal(err)
	}

	updated, err := passwordHashForUpdate(string(oldHash), "")
	if err != nil {
		t.Fatal(err)
	}
	if updated != string(oldHash) {
		t.Fatal("empty edit password changed the existing password hash")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(updated), []byte("password-lama")); err != nil {
		t.Fatalf("existing password no longer matches after edit: %v", err)
	}
}
