package handlers

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	storage "absensi-golan-backend/pkg/minio"
	"github.com/gofiber/fiber/v2"
	miniogo "github.com/minio/minio-go/v7"
	"gorm.io/gorm"
)

func SetupHomeLocationChangeRoutes(router fiber.Router) {
	router.Get("/google-maps/resolve", middleware.Protected(), ResolveGoogleMapsLocation)

	// The employee workflow lives on the profile page. Keep the approval API
	// under its existing admin namespace, but do not expose a second employee
	// page/API for home locations.
	// All employee-facing roles may request a WFH location change. The employee
	// record is resolved from the authenticated user in each handler, so callers
	// cannot submit a request for another user by changing a client-side ID.
	employee := router.Group("/employee/profile/home-location", middleware.Protected(), middleware.RequireRoles(
		models.RoleKaryawan,
		models.RoleMagang,
		models.RoleManajer,
	))
	employee.Get("/", GetMyHomeLocation)
	employee.Get("/requests", GetMyHomeLocationRequests)
	employee.Post("/requests", CreateHomeLocationRequest)

	admin := router.Group("/admin/home-location-requests", middleware.Protected(), middleware.RequireRoles(models.RoleHRD))
	admin.Get("/", GetHomeLocationRequests)
	admin.Post("/:id/approve", ApproveHomeLocationRequest)
	admin.Post("/:id/reject", RejectHomeLocationRequest)
}

// ResolveGoogleMapsLocation resolves both coordinate URLs and maps.app.goo.gl
// short links without exposing Google's redirect to the browser (which would
// be blocked by CORS). It only returns coordinates; saving still happens in
// the role-specific endpoint after validation.
func ResolveGoogleMapsLocation(c *fiber.Ctx) error {
	rawURL := strings.TrimSpace(c.Query("url"))
	latitude, longitude, err := utils.ResolveGoogleMapsLocationURL(rawURL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"latitude": latitude, "longitude": longitude})
}

type homeLocationRequestInput struct {
	Address       string  `json:"alamat_rumah" form:"alamat_rumah"`
	Latitude      float64 `json:"latitude" form:"latitude"`
	Longitude     float64 `json:"longitude" form:"longitude"`
	Radius        float64 `json:"radius_meter" form:"radius_meter"`
	EffectiveDate string  `json:"tanggal_mulai_berlaku" form:"tanggal_mulai_berlaku"`
	Reason        string  `json:"alasan" form:"alasan"`
	GoogleMapsURL string  `json:"google_maps_url" form:"google_maps_url"`
}

func effectiveHomeLocation(db *gorm.DB, employeeID uint, date time.Time) (models.EmployeeHomeLocation, error) {
	var row models.EmployeeHomeLocation
	if err := db.Where("employee_id = ?", employeeID).First(&row).Error; err != nil {
		return row, err
	}
	var history models.EmployeeHomeLocationHistory
	// EffectiveDate is a DATE in Jakarta. Normalize the comparison date before
	// formatting so callers in another server timezone cannot activate a row a
	// day early/late.
	date = date.In(jakartaLocation)
	if err := db.Where("employee_id = ? AND status = ? AND effective_date <= ?", employeeID, models.HomeLocationApproved, date.Format("2006-01-02")).Order("effective_date desc, id desc").First(&history).Error; err == nil {
		row = applyHomeLocationHistory(row, history)
	}
	return row, nil
}

func applyHomeLocationHistory(base models.EmployeeHomeLocation, history models.EmployeeHomeLocationHistory) models.EmployeeHomeLocation {
	base.AlamatRumah = history.NewAddress
	base.LatitudeRumah = history.NewLatitude
	base.LongitudeRumah = history.NewLongitude
	base.RadiusMeter = history.NewRadiusMeter
	base.GoogleMapsURL = history.NewGoogleMapsURL
	return base
}

func homeLocationIsEffective(effectiveDate, now time.Time) bool {
	date := effectiveDate.In(jakartaLocation)
	today := now.In(jakartaLocation)
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, jakartaLocation)
	todayOnly := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, jakartaLocation)
	return !dateOnly.After(todayOnly)
}

func employeeForUser(db *gorm.DB, userID uint) (models.Employee, error) {
	var employee models.Employee
	err := db.Where("user_id = ?", userID).First(&employee).Error
	return employee, err
}

func GetMyHomeLocation(c *fiber.Ctx) error {
	employee, err := employeeForUser(config.DB, c.Locals("user_id").(uint))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Data karyawan tidak ditemukan"})
	}
	location, err := effectiveHomeLocation(config.DB, employee.ID, attendanceNow())
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return c.JSON(fiber.Map{"active": nil})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat lokasi WFH"})
	}
	return c.JSON(fiber.Map{"active": location})
}

func GetMyHomeLocationRequests(c *fiber.Ctx) error {
	employee, err := employeeForUser(config.DB, c.Locals("user_id").(uint))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Data karyawan tidak ditemukan"})
	}
	var rows []models.HomeLocationChangeRequest
	err = config.DB.Preload("Reviewer").Where("employee_id = ?", employee.ID).Order("created_at desc").Find(&rows).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat riwayat pengajuan"})
	}
	type requestView struct {
		models.HomeLocationChangeRequest
		ReviewerName string `json:"reviewer_name,omitempty"`
	}
	result := make([]requestView, 0, len(rows))
	for _, row := range rows {
		name := ""
		if row.Reviewer != nil {
			name = row.Reviewer.Nama
		}
		result = append(result, requestView{HomeLocationChangeRequest: row, ReviewerName: name})
	}
	return c.JSON(result)
}

func parseEffectiveDate(value string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", strings.TrimSpace(value), jakartaLocation)
}

func validateHomeLocationInput(input homeLocationRequestInput) (time.Time, error) {
	if strings.TrimSpace(input.Address) == "" || strings.TrimSpace(input.Reason) == "" {
		return time.Time{}, fmt.Errorf("alamat dan alasan wajib diisi")
	}
	if input.Latitude < -90 || input.Latitude > 90 || input.Longitude < -180 || input.Longitude > 180 || (input.Latitude == 0 && input.Longitude == 0) {
		return time.Time{}, fmt.Errorf("koordinat tidak valid")
	}
	if input.Radius < 1 || input.Radius > 10000 {
		return time.Time{}, fmt.Errorf("radius harus antara 1 sampai 10000 meter")
	}
	date, err := parseEffectiveDate(input.EffectiveDate)
	if err != nil {
		return time.Time{}, fmt.Errorf("tanggal mulai berlaku tidak valid")
	}
	if date.Before(time.Date(time.Now().In(jakartaLocation).Year(), time.Now().In(jakartaLocation).Month(), time.Now().In(jakartaLocation).Day(), 0, 0, 0, 0, jakartaLocation)) {
		return time.Time{}, fmt.Errorf("tanggal mulai berlaku tidak boleh di masa lalu")
	}
	return date, nil
}

func CreateHomeLocationRequest(c *fiber.Ctx) error {
	employee, err := employeeForUser(config.DB, c.Locals("user_id").(uint))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Data karyawan tidak ditemukan"})
	}
	var input homeLocationRequestInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data pengajuan tidak valid"})
	}
	// Coordinates may be omitted when the employee supplies a Google Maps link;
	// use the same resolver used by the employee-management workflow.
	if strings.TrimSpace(input.GoogleMapsURL) != "" && input.Latitude == 0 && input.Longitude == 0 {
		lat, lng, resolveErr := utils.ResolveGoogleMapsLocationURL(strings.TrimSpace(input.GoogleMapsURL))
		if resolveErr != nil {
			return c.Status(400).JSON(fiber.Map{"error": resolveErr.Error()})
		}
		input.Latitude, input.Longitude = lat, lng
	}
	date, err := validateHomeLocationInput(input)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var pending int64
	if err := config.DB.Model(&models.HomeLocationChangeRequest{}).Where("employee_id = ? AND status = ?", employee.ID, models.HomeLocationPending).Count(&pending).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memeriksa pengajuan aktif"})
	}
	if pending > 0 {
		return c.Status(409).JSON(fiber.Map{"error": "Masih ada pengajuan yang menunggu persetujuan"})
	}
	old, _ := effectiveHomeLocation(config.DB, employee.ID, time.Now())
	row := models.HomeLocationChangeRequest{EmployeeID: employee.ID, OldAddress: old.AlamatRumah, OldLatitude: old.LatitudeRumah, OldLongitude: old.LongitudeRumah, OldRadiusMeter: old.RadiusMeter, OldGoogleMapsURL: old.GoogleMapsURL, NewAddress: strings.TrimSpace(input.Address), NewLatitude: input.Latitude, NewLongitude: input.Longitude, NewRadiusMeter: input.Radius, NewGoogleMapsURL: strings.TrimSpace(input.GoogleMapsURL), EffectiveDate: date, Reason: strings.TrimSpace(input.Reason), Status: models.HomeLocationPending}
	if file, fileErr := c.FormFile("lampiran"); fileErr == nil && file != nil {
		if file.Size > 5*1024*1024 || storage.Client == nil {
			return c.Status(400).JSON(fiber.Map{"error": "Lampiran maksimal 5 MB atau penyimpanan belum tersedia"})
		}
		src, openErr := file.Open()
		if openErr != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Lampiran tidak dapat dibaca"})
		}
		defer src.Close()
		key := fmt.Sprintf("home-location-%s-%d%s", employee.NIK, time.Now().UnixNano(), filepath.Ext(file.Filename))
		if _, uploadErr := storage.Client.PutObject(context.Background(), storage.BucketName, key, src, file.Size, miniogo.PutObjectOptions{ContentType: file.Header.Get("Content-Type")}); uploadErr != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal mengunggah lampiran"})
		}
		row.AttachmentName, row.AttachmentURL = file.Filename, fmt.Sprintf("http://%s/%s/%s", config.LoadConfig().MinIOEndpoint, storage.BucketName, key)
	}
	if err := config.DB.Create(&row).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan pengajuan"})
	}
	userID := c.Locals("user_id").(uint)
	_ = utils.LogAction(userID, "CREATE", "HomeLocationChangeRequest", row.ID, "Pengajuan perubahan lokasi WFH")

	// Notify every HRD account so a pending WFH location request is visible
	// in the admin notification center as soon as it is submitted.
	var hrdUsers []models.User
	if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
		for _, hrd := range hrdUsers {
			_ = utils.CreateNotification(
				config.DB,
				hrd.ID,
				models.RoleHRD,
				"Pengajuan Lokasi WFH",
				"Pengajuan Lokasi WFH Baru",
				fmt.Sprintf("Ada pengajuan perubahan lokasi WFH baru dari %s", employee.NIK),
			)
		}
	}
	return c.Status(201).JSON(row)
}

func GetHomeLocationRequests(c *fiber.Ctx) error {
	var rows []models.HomeLocationChangeRequest
	query := config.DB.Preload("Employee.User").Order("created_at desc")
	if err := query.Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat pengajuan lokasi WFH"})
	}
	// Employee is intentionally hidden from the model's default JSON output.
	// Expose the preloaded employee only for this admin listing so the existing
	// request data and approval workflow remain unchanged.
	type homeLocationRequestView struct {
		models.HomeLocationChangeRequest
		Employee struct {
			NIK  string `json:"NIK"`
			User *struct {
				Nama string `json:"Nama"`
			} `json:"User"`
		} `json:"Employee"`
	}
	data := make([]homeLocationRequestView, 0, len(rows))
	for _, row := range rows {
		view := homeLocationRequestView{HomeLocationChangeRequest: row}
		view.Employee.NIK = row.Employee.NIK
		if row.Employee.User != nil {
			view.Employee.User = &struct {
				Nama string `json:"Nama"`
			}{Nama: row.Employee.User.Nama}
		}
		data = append(data, view)
	}
	var pending int64
	config.DB.Model(&models.HomeLocationChangeRequest{}).Where("status = ?", models.HomeLocationPending).Count(&pending)
	return c.JSON(fiber.Map{"data": data, "pending_count": pending})
}

func reviewHomeLocationRequest(c *fiber.Ctx, approve bool, rejection string) error {
	var id uint
	if _, err := fmt.Sscan(c.Params("id"), &id); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID pengajuan tidak valid"})
	}
	adminID := c.Locals("user_id").(uint)
	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memulai transaksi"})
	}
	var req models.HomeLocationChangeRequest
	if err := tx.First(&req, id).Error; err != nil {
		tx.Rollback()
		return c.Status(404).JSON(fiber.Map{"error": "Pengajuan tidak ditemukan"})
	}
	if req.Status != models.HomeLocationPending {
		tx.Rollback()
		return c.Status(409).JSON(fiber.Map{"error": "Pengajuan sudah diproses"})
	}
	if !approve && strings.TrimSpace(rejection) == "" {
		tx.Rollback()
		return c.Status(400).JSON(fiber.Map{"error": "Alasan penolakan wajib diisi"})
	}
	now := time.Now().In(jakartaLocation)
	req.ReviewedBy, req.ReviewedAt = &adminID, &now
	history := models.EmployeeHomeLocationHistory{EmployeeID: req.EmployeeID, RequestID: &req.ID, ChangedBy: adminID, EffectiveDate: req.EffectiveDate, OldAddress: req.OldAddress, NewAddress: req.NewAddress, OldLatitude: req.OldLatitude, OldLongitude: req.OldLongitude, NewLatitude: req.NewLatitude, NewLongitude: req.NewLongitude, NewGoogleMapsURL: req.NewGoogleMapsURL, OldRadiusMeter: req.OldRadiusMeter, NewRadiusMeter: req.NewRadiusMeter}
	if approve {
		req.Status = models.HomeLocationApproved
		history.Status = models.HomeLocationApproved
		if err := tx.Create(&history).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan riwayat lokasi"})
		}
		if homeLocationIsEffective(req.EffectiveDate, now) {
			var active models.EmployeeHomeLocation
			if err := tx.Where("employee_id = ?", req.EmployeeID).First(&active).Error; errors.Is(err, gorm.ErrRecordNotFound) {
				active = models.EmployeeHomeLocation{EmployeeID: req.EmployeeID}
			} else if err != nil {
				tx.Rollback()
				return c.Status(500).JSON(fiber.Map{"error": "Gagal membaca lokasi aktif"})
			}
			active.LatitudeRumah, active.LongitudeRumah, active.RadiusMeter, active.AlamatRumah, active.GoogleMapsURL = req.NewLatitude, req.NewLongitude, req.NewRadiusMeter, req.NewAddress, req.NewGoogleMapsURL
			if err := tx.Save(&active).Error; err != nil {
				tx.Rollback()
				return c.Status(500).JSON(fiber.Map{"error": "Gagal mengaktifkan lokasi baru"})
			}
			// Employee.HomeLatitude/HomeLongitude are denormalized legacy fields
			// still consumed by older clients. Keep them atomic with the active row.
			if err := tx.Model(&models.Employee{}).Where("id = ?", req.EmployeeID).Updates(map[string]any{
				"home_latitude":  req.NewLatitude,
				"home_longitude": req.NewLongitude,
			}).Error; err != nil {
				tx.Rollback()
				return c.Status(500).JSON(fiber.Map{"error": "Gagal menyinkronkan lokasi karyawan"})
			}
		}
	} else {
		req.Status = models.HomeLocationRejected
		req.RejectionReason = strings.TrimSpace(rejection)
		history.Status = models.HomeLocationRejected
		history.Notes = req.RejectionReason
	}
	if err := tx.Save(&req).Error; err != nil || tx.Commit().Error != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memproses pengajuan"})
	}
	var employee models.Employee
	config.DB.Preload("User").First(&employee, req.EmployeeID)
	title := "Pengajuan lokasi WFH diperbarui"
	message := "Pengajuan perubahan lokasi WFH Anda disetujui."
	if !approve {
		message = "Pengajuan perubahan lokasi WFH Anda ditolak: " + req.RejectionReason
	}
	if employee.UserID != 0 {
		_ = utils.CreateNotification(config.DB, employee.UserID, employee.User.Role, "Status Pengajuan", title, message)
	}
	_ = utils.LogAction(adminID, "UPDATE", "HomeLocationChangeRequest", req.ID, string(req.Status))
	return c.JSON(req)
}

func ApproveHomeLocationRequest(c *fiber.Ctx) error { return reviewHomeLocationRequest(c, true, "") }
func RejectHomeLocationRequest(c *fiber.Ctx) error {
	var body struct {
		Reason string `json:"alasan_penolakan"`
	}
	_ = c.BodyParser(&body)
	return reviewHomeLocationRequest(c, false, body.Reason)
}
