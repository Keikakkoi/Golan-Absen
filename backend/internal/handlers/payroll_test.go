package handlers

import (
	"bytes"
	"compress/zlib"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"absensi-golan-backend/internal/models"
	"github.com/gofiber/fiber/v2"
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

func TestSendPayrollPDFAddsTakeHomePaySubtitleAndKeepsAmount(t *testing.T) {
	pdf := renderPayrollPDFForTest(t, testPayroll(1))
	text := extractPDFText(pdf)

	if !strings.Contains(text, "Take Home Pay") {
		t.Fatal("expected Take Home Pay label in PDF")
	}
	if !strings.Contains(text, takeHomePaySubtitle) {
		t.Fatalf("expected %q in PDF", takeHomePaySubtitle)
	}
	if !strings.Contains(text, "Rp4.500.000") {
		t.Fatal("expected the stored Take Home Pay amount in PDF")
	}
	if !bytes.Contains(pdf, []byte("/MediaBox [0 0 595.28 841.89]")) {
		t.Fatal("expected an A4 PDF page")
	}
	if pages := bytes.Count(pdf, []byte("/Type /Page\n")); pages != 1 {
		t.Fatalf("expected one page for a normal slip, got %d", pages)
	}
}

func TestSendPayrollPDFPaginatesLongItemListsWithoutDroppingFooter(t *testing.T) {
	payroll := testPayroll(28)
	payroll.Notes = strings.Repeat("Catatan payroll panjang untuk pengujian layout. ", 10)
	pdf := renderPayrollPDFForTest(t, payroll)
	text := extractPDFText(pdf)

	if !strings.Contains(text, takeHomePaySubtitle) {
		t.Fatalf("expected %q in long PDF", takeHomePaySubtitle)
	}
	if !strings.Contains(text, "Catatan payroll panjang") || !strings.Contains(text, "Disetujui oleh:") || !strings.Contains(text, "Diterima oleh:") {
		t.Fatal("expected footer text in long PDF")
	}
	if pages := bytes.Count(pdf, []byte("/Type /Page\n")); pages < 2 {
		t.Fatalf("expected long slip to paginate, got %d page(s)", pages)
	}
}

func renderPayrollPDFForTest(t *testing.T, payroll *models.Payroll) []byte {
	t.Helper()
	app := fiber.New()
	app.Get("/payroll.pdf", func(c *fiber.Ctx) error {
		return sendPayrollPDF(c, payroll)
	})
	response, err := app.Test(httptest.NewRequest(http.MethodGet, "/payroll.pdf", nil))
	if err != nil {
		t.Fatalf("requesting payroll PDF: %v", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("reading payroll PDF: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d: %s", response.StatusCode, body)
	}
	return body
}

func extractPDFText(pdf []byte) string {
	var text bytes.Buffer
	for offset := 0; offset < len(pdf); {
		streamStart := bytes.Index(pdf[offset:], []byte("stream"))
		if streamStart < 0 {
			break
		}
		streamStart += offset + len("stream")
		if streamStart < len(pdf) && pdf[streamStart] == '\r' {
			streamStart++
		}
		if streamStart < len(pdf) && pdf[streamStart] == '\n' {
			streamStart++
		}
		streamEnd := bytes.Index(pdf[streamStart:], []byte("endstream"))
		if streamEnd < 0 {
			break
		}
		streamEnd += streamStart
		reader, err := zlib.NewReader(bytes.NewReader(pdf[streamStart:streamEnd]))
		if err == nil {
			_, _ = io.Copy(&text, reader)
			_ = reader.Close()
		} else {
			text.Write(pdf[streamStart:streamEnd])
		}
		offset = streamEnd + len("endstream")
	}
	return text.String()
}

func testPayroll(itemCount int) *models.Payroll {
	items := make([]models.PayrollItem, 0, itemCount)
	for i := 0; i < itemCount; i++ {
		itemType := "income"
		if i%2 == 1 {
			itemType = "deduction"
		}
		items = append(items, models.PayrollItem{Type: itemType, Name: "Komponen payroll " + strconv.Itoa(i+1), Amount: int64((i + 1) * 10000)})
	}
	date := time.Date(2026, time.October, 31, 0, 0, 0, 0, time.UTC)
	return &models.Payroll{
		PeriodeBulan:         time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC),
		PayrollCutoffStart:   time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC),
		PayrollCutoffEnd:     date,
		PaymentDate:          date,
		EmployeeNameSnapshot: "Ayu",
		EmployeeCodeSnapshot: "GDK-007",
		PositionSnapshot:     "Staf",
		DivisionSnapshot:     "Operasional",
		TotalHariKerja:       22,
		TotalIncome:          5000000,
		TotalDeduction:       500000,
		TakeHomePay:          4500000,
		Notes:                "Slip payroll test",
		ApprovedByName:       "HRD",
		ApprovedByPosition:   "HRD",
		ReceivedByName:       "Ayu",
		ReceivedByPosition:   "Staf",
		Items:                items,
	}
}
