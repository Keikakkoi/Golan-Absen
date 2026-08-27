package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
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
	Data []struct {
		ID          string `json:"id"`
		Date        string `json:"date"`
		Name        string `json:"name"`
		Type        string `json:"type"`
		Joint       int    `json:"is_joint_leave"`
		Description string `json:"description"`
		Source      string `json:"source"`
	} `json:"data"`
}

// SyncNationalHolidays fetches only an explicitly requested year. Missing or
// unreachable source data never deletes the last known calendar.
func SyncNationalHolidays(c *fiber.Ctx) error {
	year := c.QueryInt("year", time.Now().In(jakartaLocation).Year())
	result, err := syncNationalHolidays(year)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Kalender nasional tahun tersebut belum tersedia atau sumber tidak dapat diakses.", "year": year, "detail": err.Error()})
	}
	return c.JSON(result)
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
	if year < 2000 || year > 2100 {
		return nil, fmt.Errorf("tahun tidak valid")
	}
	cfg := config.LoadConfig()
	endpoint := fmt.Sprintf(cfg.NationalHolidayURL, year)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if cfg.NationalHolidayAPIKey != "" {
		req.Header.Set("x-api-key", cfg.NationalHolidayAPIKey)
	}
	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("source returned %s", resp.Status)
	}
	var payload nationalHolidayPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Data == nil {
		return nil, fmt.Errorf("calendar data unavailable")
	}
	now := time.Now().In(jakartaLocation)
	created, updated := 0, 0
	for _, item := range payload.Data {
		date, err := time.ParseInLocation("2006-01-02", item.Date, jakartaLocation)
		if err != nil {
			continue
		}
		typ := "national"
		if item.Joint == 1 || strings.Contains(strings.ToLower(item.Type), "joint") || strings.Contains(strings.ToLower(item.Type), "cuti") {
			typ = "joint_leave"
		}
		name := item.Name
		if name == "" {
			name = item.Description
		}
		if name == "" {
			continue
		}
		source := item.Source
		if source == "" {
			source = "SKB 3 Menteri / API Indonesia"
		}
		externalID := item.ID
		if externalID == "" {
			externalID = fmt.Sprintf("%s:%s:%s", source, typ, item.Date)
		}
		var h models.Holiday
		// Find is intentional here: a new external ID is expected during the
		// first synchronization and must not produce noisy "record not found"
		// error logs.
		lookup := config.DB.Where("external_id = ?", externalID).Limit(1).Find(&h)
		if lookup.RowsAffected == 0 {
			lookup = config.DB.Where("tanggal = ? AND type = ?", date.Format("2006-01-02"), typ).Limit(1).Find(&h)
		}
		if lookup.RowsAffected == 0 {
			h = models.Holiday{Tanggal: date, Keterangan: name, Type: typ, Source: source, ExternalID: externalID, SyncedAt: &now}
			if err := config.DB.Create(&h).Error; err != nil {
				return nil, err
			}
			created++
		} else {
			if err := config.DB.Model(&h).Updates(map[string]any{"tanggal": date, "keterangan": name, "type": typ, "source": source, "external_id": externalID, "synced_at": now}).Error; err != nil {
				return nil, err
			}
			updated++
		}
	}
	return fiber.Map{"year": year, "created": created, "updated": updated, "synced_at": now, "source": endpoint}, nil
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
