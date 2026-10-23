package handlers

import (
	"testing"

	"absensi-golan-backend/internal/models"
)

func TestPayrollFilterNumber(t *testing.T) {
	month, err := payrollFilterNumber("10", "bulan", 1, 12)
	if err != nil || month == nil || *month != 10 {
		t.Fatalf("expected month 10, got %v, %v", month, err)
	}
	if _, err := payrollFilterNumber("13", "bulan", 1, 12); err == nil {
		t.Fatal("expected month above 12 to be rejected")
	}
	if year, err := payrollFilterNumber("", "tahun", 1900, 9999); err != nil || year != nil {
		t.Fatalf("expected empty year to be ignored, got %v, %v", year, err)
	}
}

func TestValidatePayrollInputRequiresWholeWorkDaysAndIncome(t *testing.T) {
	workDays := 0
	input := &payrollInput{
		EmployeeID:         1,
		PeriodeBulan:       "2026-10",
		PayrollCutoffStart: "2026-10-01",
		PayrollCutoffEnd:   "2026-10-31",
		PaymentDate:        "2026-10-31",
		TotalHariKerja:     &workDays,
		Items:              []payrollItemInput{{Type: "income", Name: "Gaji pokok", Amount: 100}},
	}
	if _, _, _, _, err := validatePayrollInput(input); err != nil {
		t.Fatalf("expected zero work days to be accepted, got %v", err)
	}
	input.Items[0].Name = ""
	if _, _, _, _, err := validatePayrollInput(input); err == nil {
		t.Fatal("expected empty item name to be rejected")
	}
}

func TestValidatePayrollInputRejectsInvalidDatesAndNegativeAmounts(t *testing.T) {
	workDays := 22
	input := &payrollInput{
		EmployeeID:         1,
		PeriodeBulan:       "2026-10",
		PayrollCutoffStart: "2026-11-01",
		PayrollCutoffEnd:   "2026-10-31",
		PaymentDate:        "2026-10-31",
		TotalHariKerja:     &workDays,
		Items:              []payrollItemInput{{Type: "income", Name: "Gaji pokok", Amount: -1}},
	}
	if _, _, _, _, err := validatePayrollInput(input); err == nil {
		t.Fatal("expected invalid cut-off and negative amount to be rejected")
	}
}

func TestRupiahUsesWholeRupiahSeparators(t *testing.T) {
	if got := rupiah(20000000); got != "Rp20.000.000" {
		t.Fatalf("unexpected Rupiah format: %s", got)
	}
	if got := rupiah(-1); got != "-Rp1" {
		t.Fatalf("unexpected negative Rupiah format: %s", got)
	}
}

func TestNormalizePayrollCompanySnapshotUsesServerOwnedCode(t *testing.T) {
	payroll := &models.Payroll{}

	normalizePayrollCompanySnapshot(payroll)

	if payroll.CompanyNameSnapshot != "PT Golan Digital Kreatif" {
		t.Fatalf("unexpected company name: %q", payroll.CompanyNameSnapshot)
	}
	if payroll.CompanyPhoneSnapshot != "02145678" {
		t.Fatalf("unexpected company code: %q", payroll.CompanyPhoneSnapshot)
	}
}
