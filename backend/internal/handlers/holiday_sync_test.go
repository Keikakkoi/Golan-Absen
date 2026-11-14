package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestNationalHolidayCalendarRequestsExplicitYear2025And2027(t *testing.T) {
	requested := make([]string, 0, 2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		year := strings.TrimPrefix(r.URL.Path, "/holidays/")
		requested = append(requested, year)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"meta":{"year":%s},"data":[{"date":"%s-01-01","name":"Tahun Baru %s","type":"national_holiday","is_national":true}]}`, year, year, year)
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/holidays/%d")

	for _, year := range []int{2025, 2027} {
		fetched, err := fetchNationalHolidayCalendar(year, server.Client())
		if err != nil {
			t.Fatalf("year %d: unexpected error: %v", year, err)
		}
		if len(fetched.Items) != 1 || fetched.Items[0].Date.Year() != year {
			t.Fatalf("year %d: unexpected items: %#v", year, fetched.Items)
		}
	}

	if got, want := strings.Join(requested, ","), "2025,2027"; got != want {
		t.Fatalf("requested years = %s, want %s", got, want)
	}
}

func TestNationalHolidayCalendarUsesHistoricalFallbackFor2024(t *testing.T) {
	requestedFallbackYear := ""
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasPrefix(r.URL.Path, "/primary/"):
			fmt.Fprint(w, `{"meta":{"count":0,"year":2024},"data":[]}`)
		case strings.HasPrefix(r.URL.Path, "/fallback/"):
			requestedFallbackYear = strings.TrimPrefix(r.URL.Path, "/fallback/")
			fmt.Fprint(w, `[{"holiday_date":"2024-02-09","holiday_name":"Cuti Bersama Imlek","is_national_holiday":false,"is_joint_holiday":true},{"holiday_date":"2024-02-10","holiday_name":"Tahun Baru Imlek","is_national_holiday":true,"is_joint_holiday":false}]`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/primary/%d")
	t.Setenv("NATIONAL_HOLIDAY_FALLBACK_URL", server.URL+"/fallback/%d")

	fetched, err := fetchNationalHolidayCalendar(2024, server.Client())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if requestedFallbackYear != "2024" || !strings.Contains(fetched.Endpoint, "/fallback/2024") {
		t.Fatalf("historical fallback was not requested for 2024: year=%q endpoint=%q", requestedFallbackYear, fetched.Endpoint)
	}
	if len(fetched.Items) != 2 || fetched.Items[0].Type != "joint_leave" || fetched.Items[1].Type != "national" {
		t.Fatalf("unexpected historical items: %#v", fetched.Items)
	}
}

func TestNationalHolidayCalendarSkipsBlankNationalAndDefaultsBlankJointLeave(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"data":[
			{"holiday_date":"2021-05-12","holiday_name":"","is_national_holiday":false,"is_joint_holiday":true},
			{"holiday_date":"2021-05-13","holiday_name":"","is_national_holiday":true,"is_joint_holiday":false},
			{"holiday_date":"2021-05-14","holiday_name":"Idul Fitri","is_national_holiday":true,"is_joint_holiday":false}
		]}`)
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/holidays/%d")
	t.Setenv("NATIONAL_HOLIDAY_FALLBACK_URL", "")

	fetched, err := fetchNationalHolidayCalendar(2021, server.Client())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(fetched.Items) != 2 || fetched.Skipped != 1 {
		t.Fatalf("unexpected normalized result: %#v", fetched)
	}
	if fetched.Items[0].Name != "Cuti Bersama" || fetched.Items[0].Type != "joint_leave" {
		t.Fatalf("blank joint leave was not defaulted: %#v", fetched.Items[0])
	}
	if len(fetched.Warnings) != 2 {
		t.Fatalf("warnings = %#v, want warnings for both incomplete items", fetched.Warnings)
	}
}

func TestNationalHolidayCalendarUsesLocalHistoricalDatasetWhenProvidersReturnEmpty(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"data":[]}`)
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/primary/%d")
	t.Setenv("NATIONAL_HOLIDAY_FALLBACK_URL", server.URL+"/fallback/%d")

	for _, year := range []int{2022, 2021, 2020, 2019, 2000} {
		fetched, err := fetchNationalHolidayCalendar(year, server.Client())
		if err != nil {
			t.Fatalf("year %d: unexpected error: %v", year, err)
		}
		if fetched.Endpoint != fmt.Sprintf("local://national-holidays/%d", year) || len(fetched.Items) == 0 {
			t.Fatalf("year %d did not use local dataset: %#v", year, fetched)
		}
	}
}

func TestNationalHolidayCalendarReportsMissingDataWhenNoLocalYearExists(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"data":[]}`)
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/primary/%d")
	t.Setenv("NATIONAL_HOLIDAY_FALLBACK_URL", server.URL+"/fallback/%d")

	_, err := fetchNationalHolidayCalendar(2023, server.Client())
	assertNationalHolidaySyncErrorKind(t, err, syncErrorCalendarMissing)
}

func TestNationalHolidayCalendarAPIErrorIsClassified(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"provider unavailable"}`, http.StatusServiceUnavailable)
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/holidays/%d")

	_, err := fetchNationalHolidayCalendar(2025, server.Client())
	assertNationalHolidaySyncErrorKind(t, err, syncErrorAPI)
}

func TestNationalHolidayCalendarTimeoutIsClassified(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/holidays/%d")

	client := &http.Client{Timeout: 10 * time.Millisecond}
	_, err := fetchNationalHolidayCalendar(2025, client)
	assertNationalHolidaySyncErrorKind(t, err, syncErrorTimeout)
}

func TestNationalHolidayCalendarInvalidResponseIsClassified(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"data":{"not":"an array"}}`)
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/holidays/%d")

	_, err := fetchNationalHolidayCalendar(2025, server.Client())
	assertNationalHolidaySyncErrorKind(t, err, syncErrorInvalidResponse)
}

func TestFailedNationalHolidaySyncKeepsExistingData(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "provider unavailable", http.StatusBadGateway)
	}))
	defer server.Close()
	t.Setenv("NATIONAL_HOLIDAY_URL", server.URL+"/holidays/%d")

	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("create sqlmock: %v", err)
	}
	defer sqlDB.Close()
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlmock db: %v", err)
	}
	previousDB := config.DB
	config.DB = db
	defer func() { config.DB = previousDB }()

	// The database transaction is intentionally opened only after the complete
	// remote payload has been fetched and validated. A failed fetch therefore
	// cannot delete or update an already stored national/company holiday.
	result, err := syncNationalHolidaysWithClient(2025, server.Client())
	if result != nil {
		t.Fatalf("failed sync returned result: %#v", result)
	}
	assertNationalHolidaySyncErrorKind(t, err, syncErrorAPI)

	// A pre-existing company holiday is still readable after the failed sync;
	// no DELETE/UPDATE/transaction expectation is registered for the sync.
	mock.ExpectQuery(`SELECT .* FROM "holidays"`).WillReturnRows(sqlmock.NewRows([]string{
		"id", "created_at", "updated_at", "deleted_at", "tanggal", "keterangan", "type", "source", "external_id", "synced_at",
	}).AddRow(1, time.Now(), time.Now(), nil, time.Date(2025, 1, 1, 0, 0, 0, 0, time.Local), "Libur perusahaan", "company", "PT GOLAN", nil, nil))
	var existing models.Holiday
	if err := db.Where("tanggal = ? AND type = ?", "2025-01-01", "company").First(&existing).Error; err != nil {
		t.Fatalf("existing company holiday was not retained: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unexpected database mutation during failed sync: %v", err)
	}
}

func assertNationalHolidaySyncErrorKind(t *testing.T, err error, want nationalHolidaySyncErrorKind) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error of kind %s", want)
	}
	var syncErr *nationalHolidaySyncError
	if !errors.As(err, &syncErr) {
		t.Fatalf("error %T is not a national holiday sync error: %v", err, err)
	}
	if syncErr.Kind != want {
		t.Fatalf("error kind = %s, want %s", syncErr.Kind, want)
	}
}
