package handlers

import (
	"encoding/csv"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type EmployeeRequest struct {
	Nama                string      `json:"nama"`
	Email               string      `json:"email"`
	Password            string      `json:"password"`
	Role                models.Role `json:"role"`
	Status              string      `json:"status"`
	NIK                 string      `json:"nik"`
	DivisionID          uint        `json:"division_id"`
	PositionID          uint        `json:"position_id"`
	TanggalBergabung    string      `json:"tanggal_bergabung"` // YYYY-MM-DD
	HomeLatitude        float64     `json:"home_latitude"`
	HomeLongitude       float64     `json:"home_longitude"`
	HomeGoogleMapsURL   string      `json:"home_google_maps_url"`
	ManagerID           *uint       `json:"manager_id"`
	TeamID              string      `json:"team_id"`
	InternshipStartDate string      `json:"internship_start_date"`
	InternshipEndDate   string      `json:"internship_end_date"`
	MentorName          string      `json:"mentor_name"`
	MentorContact       string      `json:"mentor_contact"`
	InstitutionName     string      `json:"institution_name"`
}

func SetupEmployeeRoutes(router fiber.Router) {
	employee := router.Group("/employee", middleware.Protected())
	employee.Get("/profile", GetProfile)
	employee.Put("/profile", UpdateMyProfile)
	employee.Post("/profile/photo", UploadProfilePhoto)
	employee.Put("/email", UpdateMyEmail)

	// Admin only routes
	admin := router.Group("/admin", middleware.Protected())
	admin.Get("/employees", GetAllEmployees)
	admin.Get("/employees/:id", GetEmployeeDetail)
	admin.Post("/employees", CreateEmployee)
	admin.Post("/employees/import", ImportEmployees)
	admin.Put("/employees/:id", UpdateEmployee)
	admin.Delete("/employees/:id", DeleteEmployee)
}

func GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var user models.User
	if err := config.DB.Preload("Employee").Preload("Employee.Division").Preload("Employee.Position").Preload("Employee.HomeLocation").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(user)
}

func UpdateMyProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req struct {
		Nama        string `json:"nama"`
		Email       string `json:"email"`
		Password    string `json:"password"`
		OldPassword string `json:"old_password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	tx := config.DB.Begin()

	var user models.User
	if err := tx.First(&user, userID).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	if req.Nama != "" {
		user.Nama = req.Nama
	}

	if req.Email != "" {
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		parsedEmail, err := mail.ParseAddress(req.Email)
		if err != nil || parsedEmail.Address != req.Email {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format email tidak valid"})
		}

		if !strings.EqualFold(user.Email, req.Email) {
			if req.OldPassword == "" {
				tx.Rollback()
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password saat ini wajib diisi untuk mengganti email"})
			}
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Password saat ini salah"})
			}

			var emailOwner models.User
			if err := tx.Where("LOWER(email) = ? AND id <> ?", req.Email, user.ID).First(&emailOwner).Error; err == nil {
				tx.Rollback()
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email sudah digunakan oleh akun lain"})
			} else if err != gorm.ErrRecordNotFound {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memeriksa ketersediaan email"})
			}
		}

		user.Email = req.Email
	}

	if req.Password != "" {
		if req.OldPassword == "" {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Old password is required to set a new password"})
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Incorrect old password"})
		}
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		user.PasswordHash = string(hashedPassword)
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	tx.Commit()
	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
}

// UploadProfilePhoto stores the authenticated employee's formal 3x4 profile
// photo. The red background and neat clothing are presentation requirements;
// the API validates the image format, size, and 3:4 aspect ratio.
func UploadProfilePhoto(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	file, err := c.FormFile("foto")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pas foto wajib dipilih"})
	}
	if file.Size <= 0 || file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ukuran pas foto maksimal 5 MB"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pas foto tidak dapat dibaca"})
	}
	imageConfig, _, decodeErr := image.DecodeConfig(src)
	src.Close()
	if decodeErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File harus berupa gambar JPG, PNG, atau GIF yang valid"})
	}
	if imageConfig.Width <= 0 || imageConfig.Height <= 0 || absFloat(float64(imageConfig.Width)/float64(imageConfig.Height)-0.75) > 0.05 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Rasio pas foto harus 3:4 (portrait)"})
	}

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	photoURL, err := uploadToMinIO(file, employee.NIK, "profile")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengunggah pas foto"})
	}
	if err := config.DB.Model(&employee).Update("foto_profil_url", photoURL).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan pas foto"})
	}

	utils.LogAction(userID, "UPDATE", "Employee", employee.ID, "Employee updated profile photo")
	return c.JSON(fiber.Map{"message": "Pas foto berhasil diperbarui", "foto_profil_url": photoURL})
}

func absFloat(value float64) float64 {
	if value < 0 {
		return -value
	}
	return value
}

// UpdateMyEmail changes the authenticated employee's login email directly on
// the users table. The current password is required so an active session
// alone cannot be used to silently change the account identifier.
func UpdateMyEmail(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req struct {
		Email           string `json:"email"`
		CurrentPassword string `json:"current_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Input email tidak valid"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	parsedEmail, err := mail.ParseAddress(req.Email)
	if req.Email == "" || err != nil || parsedEmail.Address != req.Email {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format email tidak valid"})
	}
	if req.CurrentPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password saat ini wajib diisi"})
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memulai perubahan email"})
	}

	var user models.User
	if err := tx.First(&user, userID).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Password saat ini salah"})
	}
	if strings.EqualFold(user.Email, req.Email) {
		tx.Rollback()
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email baru sama dengan email saat ini"})
	}

	var emailOwner models.User
	if err := tx.Where("LOWER(email) = ? AND id <> ?", req.Email, user.ID).First(&emailOwner).Error; err == nil {
		tx.Rollback()
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email sudah digunakan oleh akun lain"})
	} else if err != gorm.ErrRecordNotFound {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memeriksa ketersediaan email"})
	}

	if err := tx.Model(&models.User{}).Where("id = ?", user.ID).Update("email", req.Email).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email gagal disimpan"})
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan perubahan email"})
	}

	utils.LogAction(userID, "UPDATE", "User", user.ID, "Employee changed login email from "+user.Email+" to "+req.Email)
	user.Email = req.Email
	return c.JSON(user)
}

func GetAllEmployees(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var users []models.User
	// Also get the HRD/Pimpinan if needed, but for now we list all Karyawan
	if err := config.DB.Preload("Employee").Preload("Employee.Division").Preload("Employee.Position").Preload("Employee.HomeLocation").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch employees"})
	}

	return c.JSON(users)
}

func GetEmployeeDetail(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var user models.User
	if err := config.DB.Preload("Employee").Preload("Employee.Division").Preload("Employee.Position").Preload("Employee.HomeLocation").First(&user, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee not found"})
	}
	var quotas []models.LeaveQuota
	var locations []models.EmployeeHomeLocation
	if user.Employee.ID != 0 {
		config.DB.Where("employee_id = ?", user.Employee.ID).Order("tahun desc").Find(&quotas)
		config.DB.Where("employee_id = ?", user.Employee.ID).Find(&locations)
	}
	return c.JSON(fiber.Map{"user": user, "quotas": quotas, "home_locations": locations})
}

func CreateEmployee(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied. Only HRD can create employees."})
	}

	var req EmployeeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if !models.IsValidRole(req.Role) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}
	if err := resolveEmployeeHomeLocation(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memproses password. Silakan coba lagi."})
	}

	// Cek ketersediaan Email
	var existingUser models.User
	if err := config.DB.Where("LOWER(email) = ?", strings.ToLower(req.Email)).First(&existingUser).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email '" + req.Email + "' sudah memiliki akun. Silakan gunakan email lain untuk melanjutkan."})
	}

	// Cek ketersediaan NIK
	if req.NIK != "" {
		var existingEmp models.Employee
		if err := config.DB.Where("nik = ?", req.NIK).First(&existingEmp).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "NIK '" + req.NIK + "' sudah memiliki akun. Pastikan NIK yang dimasukkan benar."})
		}
	}

	tglGabung, _ := time.Parse("2006-01-02", req.TanggalBergabung)

	tx := config.DB.Begin()

	user := models.User{
		Nama:            req.Nama,
		Email:           req.Email,
		PasswordHash:    string(hashedPassword),
		Role:            req.Role,
		Status:          req.Status,
		ManagerID:       req.ManagerID,
		TeamID:          req.TeamID,
		MentorName:      req.MentorName,
		MentorContact:   req.MentorContact,
		InstitutionName: req.InstitutionName,
	}
	user.InternshipStartDate = parseOptionalDate(req.InternshipStartDate)
	user.InternshipEndDate = parseOptionalDate(req.InternshipEndDate)

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
	}

	employee := models.Employee{
		UserID:           user.ID,
		NIK:              req.NIK,
		DivisionID:       req.DivisionID,
		PositionID:       req.PositionID,
		TanggalBergabung: tglGabung,
		HomeLatitude:     req.HomeLatitude,
		HomeLongitude:    req.HomeLongitude,
	}

	if err := tx.Create(&employee).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create employee"})
	}
	if hasHomeLocation(req.HomeLatitude, req.HomeLongitude) {
		if err := saveEmployeeHomeLocation(tx, employee.ID, req.HomeLatitude, req.HomeLongitude, req.HomeGoogleMapsURL); err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save employee home location"})
		}
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit transaction"})
	}

	hrdID := c.Locals("user_id").(uint)
	utils.LogAction(hrdID, "CREATE", "Employee", user.ID, "Admin created new employee: "+user.Email)

	return c.Status(fiber.StatusCreated).JSON(user)
}

func UpdateEmployee(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied. Only HRD can update employees."})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var req EmployeeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if !models.IsValidRole(req.Role) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}
	if err := resolveEmployeeHomeLocation(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tx := config.DB.Begin()

	var user models.User
	if err := tx.Preload("Employee").First(&user, id).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	// Cek ketersediaan Email
	var emailOwner models.User
	if err := tx.Where("LOWER(email) = ? AND id <> ?", strings.ToLower(req.Email), id).First(&emailOwner).Error; err == nil {
		tx.Rollback()
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email '" + req.Email + "' sudah memiliki akun. Silakan gunakan email lain untuk melanjutkan."})
	}

	// Cek ketersediaan NIK
	if req.NIK != "" {
		var nikOwner models.Employee
		empIDToCheck := user.Employee.ID
		if empIDToCheck != 0 {
			if err := tx.Where("nik = ? AND id <> ?", req.NIK, empIDToCheck).First(&nikOwner).Error; err == nil {
				tx.Rollback()
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "NIK '" + req.NIK + "' sudah memiliki akun. Pastikan NIK benar."})
			}
		} else {
			if err := tx.Where("nik = ?", req.NIK).First(&nikOwner).Error; err == nil {
				tx.Rollback()
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "NIK '" + req.NIK + "' sudah memiliki akun. Pastikan NIK benar."})
			}
		}
	}

	user.Nama = req.Nama
	user.Email = req.Email
	user.Role = req.Role
	user.Status = req.Status
	user.ManagerID = req.ManagerID
	user.TeamID = req.TeamID
	user.MentorName = req.MentorName
	user.MentorContact = req.MentorContact
	user.InstitutionName = req.InstitutionName
	user.InternshipStartDate = parseOptionalDate(req.InternshipStartDate)
	user.InternshipEndDate = parseOptionalDate(req.InternshipEndDate)

	if req.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		user.PasswordHash = string(hashedPassword)
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update user"})
	}

	if user.Employee.ID != 0 {
		tglGabung, _ := time.Parse("2006-01-02", req.TanggalBergabung)
		user.Employee.NIK = req.NIK
		user.Employee.DivisionID = req.DivisionID
		user.Employee.PositionID = req.PositionID
		user.Employee.TanggalBergabung = tglGabung
		user.Employee.HomeLatitude = req.HomeLatitude
		user.Employee.HomeLongitude = req.HomeLongitude

		if err := tx.Save(&user.Employee).Error; err != nil {
			tx.Rollback()
			fmt.Println("Error saving employee:", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		if hasHomeLocation(req.HomeLatitude, req.HomeLongitude) {
			if err := saveEmployeeHomeLocation(tx, user.Employee.ID, req.HomeLatitude, req.HomeLongitude, req.HomeGoogleMapsURL); err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save employee home location"})
			}
		}
	} else if req.NIK != "" {
		// Create employee if it doesn't exist but NIK is provided
		tglGabung, _ := time.Parse("2006-01-02", req.TanggalBergabung)
		newEmp := models.Employee{
			UserID:           user.ID,
			NIK:              req.NIK,
			DivisionID:       req.DivisionID,
			PositionID:       req.PositionID,
			TanggalBergabung: tglGabung,
			HomeLatitude:     req.HomeLatitude,
			HomeLongitude:    req.HomeLongitude,
		}
		if err := tx.Create(&newEmp).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create employee details"})
		}
		if hasHomeLocation(req.HomeLatitude, req.HomeLongitude) {
			if err := saveEmployeeHomeLocation(tx, newEmp.ID, req.HomeLatitude, req.HomeLongitude, req.HomeGoogleMapsURL); err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save employee home location"})
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit transaction"})
	}

	hrdID := c.Locals("user_id").(uint)
	utils.LogAction(hrdID, "UPDATE", "Employee", user.ID, "Admin updated employee profile: "+user.Email)

	return c.JSON(user)
}

func parseOptionalDate(value string) *time.Time {
	if value == "" {
		return nil
	}
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil
	}
	return &date
}

func resolveEmployeeHomeLocation(req *EmployeeRequest) error {
	req.HomeGoogleMapsURL = strings.TrimSpace(req.HomeGoogleMapsURL)
	if req.HomeGoogleMapsURL == "" {
		return nil
	}
	lat, lng, err := utils.ResolveGoogleMapsLocationURL(req.HomeGoogleMapsURL)
	if err != nil {
		return err
	}
	req.HomeLatitude = lat
	req.HomeLongitude = lng
	return nil
}

func hasHomeLocation(latitude, longitude float64) bool {
	return latitude != 0 && longitude != 0
}

func saveEmployeeHomeLocation(tx *gorm.DB, employeeID uint, latitude, longitude float64, googleMapsURL string) error {
	var location models.EmployeeHomeLocation
	if err := tx.Where("employee_id = ?", employeeID).First(&location).Error; err != nil {
		location = models.EmployeeHomeLocation{EmployeeID: employeeID, RadiusMeter: 100}
	}
	location.LatitudeRumah = latitude
	location.LongitudeRumah = longitude
	location.GoogleMapsURL = googleMapsURL
	if location.RadiusMeter <= 0 {
		location.RadiusMeter = 100
	}
	return tx.Save(&location).Error
}

func DeleteEmployee(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied. Only HRD can delete employees."})
	}

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	tx := config.DB.Begin()

	var user models.User
	if err := tx.Preload("Employee").First(&user, id).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	if user.Employee.ID != 0 {
		if err := tx.Delete(&user.Employee).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete employee"})
		}
	}

	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete user"})
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit transaction"})
	}

	hrdID := c.Locals("user_id").(uint)
	utils.LogAction(hrdID, "DELETE", "Employee", uint(id), "Admin deleted employee data")

	return c.JSON(fiber.Map{"message": "Employee deleted successfully"})
}

func ImportEmployees(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File CSV wajib dipilih"})
	}
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".csv") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format import yang didukung adalah CSV"})
	}
	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File CSV tidak dapat dibaca"})
	}
	defer src.Close()
	reader := csv.NewReader(src)
	reader.TrimLeadingSpace = true
	header, err := reader.Read()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "CSV kosong atau header tidak valid"})
	}
	columns := make(map[string]int)
	for i, column := range header {
		columns[strings.ToLower(strings.TrimSpace(column))] = i
	}
	required := []string{"nik", "nama", "email", "password", "division_id", "position_id", "tanggal_bergabung"}
	for _, column := range required {
		if _, ok := columns[column]; !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Kolom %s wajib ada", column)})
		}
	}
	imported := 0
	errors := make([]string, 0)
	rowNumber := 1
	for {
		rowNumber++
		row, readErr := reader.Read()
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			errors = append(errors, fmt.Sprintf("Baris %d: format CSV tidak valid", rowNumber))
			continue
		}
		value := func(name string) string {
			index, ok := columns[name]
			if !ok || index >= len(row) {
				return ""
			}
			return strings.TrimSpace(row[index])
		}
		divisionID, errDept := strconv.ParseUint(value("division_id"), 10, 32)
		positionID, errPosition := strconv.ParseUint(value("position_id"), 10, 32)
		joined, errDate := time.Parse("2006-01-02", value("tanggal_bergabung"))
		if value("nik") == "" || value("nama") == "" || value("email") == "" || value("password") == "" || errDept != nil || errPosition != nil || errDate != nil {
			errors = append(errors, fmt.Sprintf("Baris %d: data wajib atau format angka/tanggal tidak valid", rowNumber))
			continue
		}
		role := models.Role(value("role"))
		if !models.IsValidRole(role) {
			role = models.RoleKaryawan
		}
		status := value("status")
		if status == "" {
			status = "aktif"
		}
		homeLat, _ := strconv.ParseFloat(value("home_latitude"), 64)
		homeLng, _ := strconv.ParseFloat(value("home_longitude"), 64)
		hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(value("password")), bcrypt.DefaultCost)
		if hashErr != nil {
			errors = append(errors, fmt.Sprintf("Baris %d: password tidak dapat diproses", rowNumber))
			continue
		}
		tx := config.DB.Begin()
		user := models.User{Nama: value("nama"), Email: value("email"), PasswordHash: string(hashedPassword), Role: role, Status: status}
		if err = tx.Create(&user).Error; err != nil {
			tx.Rollback()
			errors = append(errors, fmt.Sprintf("Baris %d: email sudah digunakan atau user gagal dibuat", rowNumber))
			continue
		}
		employee := models.Employee{UserID: user.ID, NIK: value("nik"), DivisionID: uint(divisionID), PositionID: uint(positionID), TanggalBergabung: joined, HomeLatitude: homeLat, HomeLongitude: homeLng}
		if err = tx.Create(&employee).Error; err != nil {
			tx.Rollback()
			errors = append(errors, fmt.Sprintf("Baris %d: NIK/divisi/jabatan tidak valid", rowNumber))
			continue
		}
		if err = tx.Commit().Error; err != nil {
			errors = append(errors, fmt.Sprintf("Baris %d: transaksi gagal disimpan", rowNumber))
			continue
		}
		imported++
	}
	utils.LogAction(c.Locals("user_id").(uint), "CREATE", "Employee", 0, fmt.Sprintf("Imported %d employees from CSV", imported))
	return c.JSON(fiber.Map{"message": "Import selesai", "imported": imported, "errors": errors})
}
