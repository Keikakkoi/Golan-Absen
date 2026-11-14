package handlers

import (
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

func SetupHolidayRoutes(router fiber.Router) {
	holidays := router.Group("/holidays", middleware.Protected())
	holidays.Get("/", GetAllHolidays)
	holidays.Get("/availability", GetHolidayAvailability)

	admin := router.Group("/admin/holidays", middleware.Protected(), middleware.RequireRoles(models.RoleHRD))
	admin.Post("/", CreateHoliday)
	admin.Put("/:id", UpdateHoliday)
	admin.Delete("/:id", DeleteHoliday)
	admin.Post("/sync", SyncNationalHolidays)
}

func GetAllHolidays(c *fiber.Ctx) error {
	var holidays []models.Holiday
	query := config.DB.Order("tanggal asc")
	if year := c.QueryInt("year", 0); year > 0 {
		query = query.Where("EXTRACT(YEAR FROM tanggal) = ?", year)
	}
	if err := query.Find(&holidays).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch holidays"})
	}
	return c.JSON(holidays)
}

func CreateHoliday(c *fiber.Ctx) error {
	var input struct {
		Tanggal    string `json:"tanggal"`
		Keterangan string `json:"keterangan"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	tanggal, err := time.Parse(time.RFC3339, input.Tanggal)
	if err != nil {
		tanggal, err = time.Parse("2006-01-02", input.Tanggal)
	}
	if err != nil || input.Keterangan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal dan keterangan wajib diisi"})
	}
	h := &models.Holiday{Tanggal: normalizeHolidayDate(tanggal), Keterangan: input.Keterangan, Type: "company", Source: "PT GOLAN"}

	if err := config.DB.Create(&h).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create holiday"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "Holiday", h.ID, "Created holiday: "+h.Keterangan)

	return c.Status(fiber.StatusCreated).JSON(h)
}

func UpdateHoliday(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var h models.Holiday
	if err := config.DB.First(&h, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Holiday not found"})
	}

	var input struct {
		Tanggal    string `json:"tanggal"`
		Keterangan string `json:"keterangan"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	tanggal, err := time.Parse(time.RFC3339, input.Tanggal)
	if err != nil {
		tanggal, err = time.Parse("2006-01-02", input.Tanggal)
	}
	if err != nil || input.Keterangan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal dan keterangan wajib diisi"})
	}
	h.Tanggal = normalizeHolidayDate(tanggal)
	h.Keterangan = input.Keterangan
	if h.Type != "company" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Hari libur nasional/cuti bersama dikelola melalui sinkronisasi."})
	}

	if err := config.DB.Save(&h).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update holiday"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "UPDATE", "Holiday", h.ID, "Updated holiday: "+h.Keterangan)

	return c.JSON(h)
}

type nationalHolidayPayload struct {
	Data json.RawMessage `json:"data"`
}

type nationalHolidayItem struct {
	ID              string          `json:"id"`
	Date            string          `json:"date"`
	Name            string          `json:"name"`
	Type            string          `json:"type"`
	Joint           json.RawMessage `json:"is_joint_leave"`
	Description     string          `json:"description"`
	Source          string          `json:"source"`
	HolidayDate     string          `json:"holiday_date"`
	HolidayName     string          `json:"holiday_name"`
	JointHoliday    json.RawMessage `json:"is_joint_holiday"`
	NationalHoliday json.RawMessage `json:"is_national_holiday"`
}

type syncedNationalHoliday struct {
	ID         string
	Date       time.Time
	DateText   string
	Name       string
	Type       string
	Source     string
	ExternalID string
}

type nationalHolidayFetchResult struct {
	Items    []syncedNationalHoliday
	Endpoint string
	Skipped  int
	Warnings []string
}

type historicalNationalHolidayYear struct {
	Year   int                   `json:"year"`
	Source string                `json:"source"`
	Data   []nationalHolidayItem `json:"data"`
}

// The remote providers do not consistently retain older SKB calendars. Keep
// the published historical dates in the application so a provider returning
// an empty calendar does not make a valid past year look unavailable.
//
//go:embed data/national_holidays_historical.json
var historicalNationalHolidayData []byte

var (
	historicalNationalHolidayOnce sync.Once
	historicalNationalHolidayMap  map[int]historicalNationalHolidayYear
	historicalNationalHolidayErr  error
)

type nationalHolidaySyncErrorKind string

const (
	syncErrorInvalidYear       nationalHolidaySyncErrorKind = "invalid_year"
	syncErrorSourceUnavailable nationalHolidaySyncErrorKind = "source_unavailable"
	syncErrorTimeout           nationalHolidaySyncErrorKind = "timeout"
	syncErrorAPI               nationalHolidaySyncErrorKind = "api_error"
	syncErrorCalendarMissing   nationalHolidaySyncErrorKind = "calendar_unavailable"
	syncErrorInvalidResponse   nationalHolidaySyncErrorKind = "invalid_response"
	syncErrorPersistence       nationalHolidaySyncErrorKind = "persistence_error"
)

type nationalHolidaySyncError struct {
	Kind   nationalHolidaySyncErrorKind
	Detail string
}

func (e *nationalHolidaySyncError) Error() string {
	return e.Detail
}

func newNationalHolidaySyncError(kind nationalHolidaySyncErrorKind, detail string) error {
	return &nationalHolidaySyncError{Kind: kind, Detail: detail}
}

// SyncNationalHolidays fetches only an explicitly requested year. Missing or
// unreachable source data never deletes the last known calendar.
func SyncNationalHolidays(c *fiber.Ctx) error {
	year := time.Now().In(jakartaLocation).Year()
	if rawYear := strings.TrimSpace(c.Query("year")); rawYear != "" {
		parsedYear, err := strconv.Atoi(rawYear)
		if err != nil {
			return writeNationalHolidaySyncError(c, parsedYear, newNationalHolidaySyncError(syncErrorInvalidYear, "tahun kalender harus berupa angka"))
		}
		year = parsedYear
	}
	result, err := syncNationalHolidays(year)
	if err != nil {
		return writeNationalHolidaySyncError(c, year, err)
	}
	return c.JSON(result)
}

func writeNationalHolidaySyncError(c *fiber.Ctx, year int, err error) error {
	status := fiber.StatusBadGateway
	code := string(syncErrorSourceUnavailable)
	message := fmt.Sprintf("Sumber kalender nasional tahun %d tidak dapat diakses. Data lama tetap dipertahankan.", year)

	var syncErr *nationalHolidaySyncError
	if errors.As(err, &syncErr) {
		code = string(syncErr.Kind)
		switch syncErr.Kind {
		case syncErrorInvalidYear:
			status = fiber.StatusBadRequest
			message = "Tahun kalender tidak valid. Gunakan tahun antara 2000 dan 2100."
		case syncErrorTimeout:
			status = fiber.StatusGatewayTimeout
			message = fmt.Sprintf("Sumber kalender nasional timeout untuk tahun %d. Data lama tetap dipertahankan.", year)
		case syncErrorAPI:
			message = fmt.Sprintf("API kalender nasional mengembalikan error untuk tahun %d. Data lama tetap dipertahankan.", year)
		case syncErrorCalendarMissing:
			status = fiber.StatusNotFound
			message = fmt.Sprintf("Data kalender nasional untuk tahun %d belum tersedia. Data lama tetap dipertahankan.", year)
		case syncErrorInvalidResponse:
			message = fmt.Sprintf("Respons API kalender nasional untuk tahun %d tidak sesuai format. Data lama tetap dipertahankan.", year)
		case syncErrorPersistence:
			status = fiber.StatusInternalServerError
			message = fmt.Sprintf("Data kalender nasional tahun %d gagal disimpan. Data lama tetap dipertahankan.", year)
		}
	}

	return c.Status(status).JSON(fiber.Map{
		"error":  message,
		"code":   code,
		"year":   year,
		"detail": err.Error(),
	})
}

// EnsureNationalHolidayCalendar refreshes the current and next year. It is
// deliberately best-effort: an unavailable provider cannot remove or disable
// an already stored calendar.
func EnsureNationalHolidayCalendar() {
	now := time.Now().In(jakartaLocation)
	for _, year := range []int{now.Year(), now.Year() + 1} {
		if _, err := syncNationalHolidays(year); err != nil {
			// The availability endpoint exposes the missing year to admins.
			continue
		}
	}
}

func syncNationalHolidays(year int) (fiber.Map, error) {
	return syncNationalHolidaysWithClient(year, &http.Client{Timeout: 12 * time.Second})
}

func syncNationalHolidaysWithClient(year int, client *http.Client) (fiber.Map, error) {
	if year < 2000 || year > 2100 {
		return nil, newNationalHolidaySyncError(syncErrorInvalidYear, "tahun tidak valid")
	}
	fetched, err := fetchNationalHolidayCalendar(year, client)
	if err != nil {
		return nil, err
	}
	now := time.Now().In(jakartaLocation)
	created, updated := 0, 0
	tx := config.DB.Begin()
	if tx.Error != nil {
		return nil, newNationalHolidaySyncError(syncErrorPersistence, tx.Error.Error())
	}
	for _, item := range fetched.Items {
		var h models.Holiday
		// Find is intentional here: a new external ID is expected during the
		// first synchronization and must not produce noisy "record not found"
		// error logs.
		lookup := tx.Where("external_id = ? AND type IN ?", item.ExternalID, []string{"national", "joint_leave"}).Limit(1).Find(&h)
		if lookup.RowsAffected == 0 {
			lookup = tx.Where("tanggal = ? AND type = ?", item.DateText, item.Type).Limit(1).Find(&h)
		}
		if lookup.Error != nil {
			tx.Rollback()
			return nil, newNationalHolidaySyncError(syncErrorPersistence, lookup.Error.Error())
		}
		if lookup.RowsAffected == 0 {
			h = models.Holiday{Tanggal: item.Date, Keterangan: item.Name, Type: item.Type, Source: item.Source, ExternalID: item.ExternalID, SyncedAt: &now}
			if err := tx.Create(&h).Error; err != nil {
				tx.Rollback()
				return nil, newNationalHolidaySyncError(syncErrorPersistence, err.Error())
			}
			created++
		} else {
			if err := tx.Model(&h).Updates(map[string]any{"tanggal": item.Date, "keterangan": item.Name, "type": item.Type, "source": item.Source, "external_id": item.ExternalID, "synced_at": now}).Error; err != nil {
				tx.Rollback()
				return nil, newNationalHolidaySyncError(syncErrorPersistence, err.Error())
			}
			updated++
		}
	}
	if err := tx.Commit().Error; err != nil {
		return nil, newNationalHolidaySyncError(syncErrorPersistence, err.Error())
	}
	warnings := fetched.Warnings
	if warnings == nil {
		warnings = []string{}
	}
	return fiber.Map{
		"year":      year,
		"created":   created,
		"updated":   updated,
		"skipped":   fetched.Skipped,
		"synced_at": now,
		"source":    fetched.Endpoint,
		"warnings":  warnings,
	}, nil
}

func fetchNationalHolidayCalendar(year int, client *http.Client) (nationalHolidayFetchResult, error) {
	if year < 2000 || year > 2100 {
		return nationalHolidayFetchResult{}, newNationalHolidaySyncError(syncErrorInvalidYear, "tahun tidak valid")
	}
	cfg := config.LoadConfig()
	fetched, err := fetchNationalHolidayCalendarFromURL(year, cfg.NationalHolidayURL, client, cfg.NationalHolidayAPIKey)
	if err == nil {
		return fetched, nil
	}

	// The primary SKB mirror currently covers only newer years. Historical
	// years must still be synchronizable, so retry only the explicit
	// "calendar unavailable" result against the configured historical source.
	var syncErr *nationalHolidaySyncError
	primaryCalendarMissing := errors.As(err, &syncErr) && syncErr.Kind == syncErrorCalendarMissing
	if primaryCalendarMissing && strings.TrimSpace(cfg.NationalHolidayFallbackURL) != "" {
		fallback, fallbackErr := fetchNationalHolidayCalendarFromURL(year, cfg.NationalHolidayFallbackURL, client, cfg.NationalHolidayAPIKey)
		if fallbackErr == nil {
			return fallback, nil
		}
		var fallbackSyncErr *nationalHolidaySyncError
		if !errors.As(fallbackErr, &fallbackSyncErr) || fallbackSyncErr.Kind != syncErrorCalendarMissing {
			return nationalHolidayFetchResult{}, fallbackErr
		}
		err = fallbackErr
	}

	// Both configured providers explicitly reported that the calendar is
	// missing. Only then use the bundled historical dataset. Network failures,
	// timeouts, and malformed responses remain visible as their actual cause.
	if primaryCalendarMissing {
		if historical, historicalErr := fetchNationalHolidayCalendarFromHistoricalDataset(year); historicalErr == nil {
			return historical, nil
		}
	}
	return nationalHolidayFetchResult{}, err
}

func fetchNationalHolidayCalendarFromURL(year int, sourceURL string, client *http.Client, apiKey string) (nationalHolidayFetchResult, error) {
	endpoint := fmt.Sprintf(sourceURL, year)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorSourceUnavailable, "konfigurasi URL sumber kalender tidak valid")
	}
	req.Header.Set("Accept", "application/json")
	if apiKey != "" {
		req.Header.Set("x-api-key", apiKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		var netErr net.Error
		if errors.As(err, &netErr) && netErr.Timeout() {
			return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorTimeout, err.Error())
		}
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorSourceUnavailable, err.Error())
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorCalendarMissing, "sumber tidak menyediakan kalender untuk tahun tersebut")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorAPI, fmt.Sprintf("source returned %s", resp.Status))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorInvalidResponse, err.Error())
	}
	rawItems, err := decodeNationalHolidayItems(body)
	if err != nil {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorInvalidResponse, err.Error())
	}
	if rawItems == nil {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorCalendarMissing, "calendar data unavailable")
	}
	if len(rawItems) == 0 {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorCalendarMissing, "calendar data unavailable")
	}
	return normalizeNationalHolidayItems(year, rawItems, endpoint)
}

func normalizeNationalHolidayItems(year int, rawItems []nationalHolidayItem, endpoint string) (nationalHolidayFetchResult, error) {
	items := make([]syncedNationalHoliday, 0, len(rawItems))
	warnings := make([]string, 0)
	skipped := 0
	for _, rawItem := range rawItems {
		dateText := strings.TrimSpace(rawItem.Date)
		if dateText == "" {
			dateText = strings.TrimSpace(rawItem.HolidayDate)
		}
		date, err := time.ParseInLocation("2006-01-02", dateText, jakartaLocation)
		if err != nil || date.Year() != year {
			return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorInvalidResponse, "tanggal kalender tidak valid atau tidak sesuai tahun yang diminta")
		}
		name := strings.TrimSpace(rawItem.Name)
		if name == "" {
			name = strings.TrimSpace(rawItem.HolidayName)
		}
		if name == "" {
			name = strings.TrimSpace(rawItem.Description)
		}
		jointRaw := rawItem.Joint
		if len(jointRaw) == 0 {
			jointRaw = rawItem.JointHoliday
		}
		joint, err := parseJointLeave(jointRaw)
		if err != nil {
			return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorInvalidResponse, "field is_joint_leave tidak sesuai format")
		}
		typ := "national"
		lowerType := strings.ToLower(rawItem.Type)
		if joint || strings.Contains(lowerType, "joint") || strings.Contains(lowerType, "cuti") {
			typ = "joint_leave"
		}
		if name == "" {
			if typ == "joint_leave" {
				name = "Cuti Bersama"
				warnings = append(warnings, fmt.Sprintf("Nama kosong pada item cuti bersama tanggal %s; digunakan nama default Cuti Bersama.", dateText))
			} else {
				skipped++
				warnings = append(warnings, fmt.Sprintf("Item kalender tanggal %s dilewati karena nama hari libur kosong.", dateText))
				continue
			}
		}
		source := strings.TrimSpace(rawItem.Source)
		if source == "" {
			source = "SKB 3 Menteri / API Indonesia"
		}
		externalID := strings.TrimSpace(rawItem.ID)
		if externalID == "" {
			externalID = fmt.Sprintf("%s:%s:%s", source, typ, dateText)
		}
		items = append(items, syncedNationalHoliday{ID: rawItem.ID, Date: date, DateText: date.Format("2006-01-02"), Name: name, Type: typ, Source: source, ExternalID: externalID})
	}
	if len(items) == 0 {
		return nationalHolidayFetchResult{Endpoint: endpoint, Skipped: skipped, Warnings: warnings}, newNationalHolidaySyncError(syncErrorCalendarMissing, "calendar data tidak memiliki item valid")
	}
	return nationalHolidayFetchResult{Items: items, Endpoint: endpoint, Skipped: skipped, Warnings: warnings}, nil
}

func fetchNationalHolidayCalendarFromHistoricalDataset(year int) (nationalHolidayFetchResult, error) {
	historicalNationalHolidayOnce.Do(func() {
		var entries []historicalNationalHolidayYear
		if err := json.Unmarshal(historicalNationalHolidayData, &entries); err != nil {
			historicalNationalHolidayErr = err
			return
		}
		historicalNationalHolidayMap = make(map[int]historicalNationalHolidayYear, len(entries))
		for _, entry := range entries {
			historicalNationalHolidayMap[entry.Year] = entry
		}
	})
	endpoint := fmt.Sprintf("local://national-holidays/%d", year)
	if historicalNationalHolidayErr != nil {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorInvalidResponse, historicalNationalHolidayErr.Error())
	}
	entry, ok := historicalNationalHolidayMap[year]
	if !ok || len(entry.Data) == 0 {
		return nationalHolidayFetchResult{Endpoint: endpoint}, newNationalHolidaySyncError(syncErrorCalendarMissing, "dataset historis lokal tidak menyediakan kalender untuk tahun tersebut")
	}
	for i := range entry.Data {
		if strings.TrimSpace(entry.Data[i].Source) == "" {
			entry.Data[i].Source = entry.Source
		}
	}
	return normalizeNationalHolidayItems(year, entry.Data, endpoint)
}

func decodeNationalHolidayItems(body []byte) ([]nationalHolidayItem, error) {
	trimmed := strings.TrimSpace(string(body))
	if trimmed == "" || trimmed == "null" {
		return nil, nil
	}
	if strings.HasPrefix(trimmed, "[") {
		var items []nationalHolidayItem
		if err := json.Unmarshal(body, &items); err != nil {
			return nil, fmt.Errorf("field data harus berupa array kalender: %w", err)
		}
		return items, nil
	}

	var payload nationalHolidayPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("respons API harus berupa object kalender: %w", err)
	}
	if len(payload.Data) == 0 || string(payload.Data) == "null" {
		return nil, nil
	}
	var rawItems []nationalHolidayItem
	if err := json.Unmarshal(payload.Data, &rawItems); err != nil {
		return nil, fmt.Errorf("field data harus berupa array kalender")
	}
	return rawItems, nil
}

func parseJointLeave(raw json.RawMessage) (bool, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return false, nil
	}
	var flag bool
	if err := json.Unmarshal(raw, &flag); err == nil {
		return flag, nil
	}
	var number int
	if err := json.Unmarshal(raw, &number); err == nil {
		return number != 0, nil
	}
	return false, fmt.Errorf("invalid joint leave flag")
}

func normalizeHolidayDate(value time.Time) time.Time {
	local := value.In(jakartaLocation)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, jakartaLocation)
}

func GetHolidayAvailability(c *fiber.Ctx) error {
	year := c.QueryInt("year", time.Now().In(jakartaLocation).Year())
	var count int64
	config.DB.Model(&models.Holiday{}).Where("EXTRACT(YEAR FROM tanggal) = ? AND type IN ?", year, []string{"national", "joint_leave"}).Count(&count)
	return c.JSON(fiber.Map{"year": year, "available": count > 0, "count": count})
}

// IsCalendarHoliday is shared by punching, reconciliation, reports and leave rules.
func IsCalendarHoliday(date time.Time) (models.Holiday, bool) {
	var h models.Holiday
	date = normalizeHolidayDate(date)
	err := config.DB.Where("tanggal = ? AND type IN ?", date.Format("2006-01-02"), []string{"national", "joint_leave", "company"}).Order("CASE type WHEN 'national' THEN 1 WHEN 'joint_leave' THEN 2 ELSE 3 END").First(&h).Error
	return h, err == nil
}

func holidayError(h models.Holiday) string {
	switch h.Type {
	case "national":
		return "Hari ini merupakan hari libur nasional dan absensi tidak dapat dilakukan."
	case "joint_leave":
		return "Hari ini merupakan cuti bersama dan absensi tidak dapat dilakukan."
	default:
		return "Hari ini merupakan hari libur khusus perusahaan dan absensi tidak dapat dilakukan."
	}
}

func DeleteHoliday(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var h models.Holiday
	if err := config.DB.First(&h, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Holiday not found"})
	}
	if h.Type != "company" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Hari libur nasional/cuti bersama tidak dapat dihapus manual. Gunakan sinkronisasi kalender."})
	}
	if err := config.DB.Delete(&h).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete holiday"})
	}
	utils.LogAction(c.Locals("user_id").(uint), "DELETE", "Holiday", h.ID, "Deleted holiday: "+h.Keterangan)

	return c.JSON(fiber.Map{"message": "Holiday deleted successfully"})
}
