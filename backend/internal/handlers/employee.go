package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/services"
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
	EmployeeCode        string      `json:"employee_code"`
	JenisKelamin        string      `json:"jenis_kelamin"`
	TempatLahir         string      `json:"tempat_lahir"`
	TanggalLahir        string      `json:"tanggal_lahir"`
	NomorTelepon        string      `json:"nomor_telepon"`
	Alamat              string      `json:"alamat"`
	FotoProfilURL       string      `json:"foto_profil_url"`
	ShiftKerja          string      `json:"shift_kerja"`
	DivisionID          uint        `json:"division_id"`
	PositionID          uint        `json:"position_id"`
	TanggalBergabung    string      `json:"tanggal_bergabung"` // YYYY-MM-DD
	HomeLatitude        float64     `json:"home_latitude"`
	HomeLongitude       float64     `json:"home_longitude"`
	HomeGoogleMapsURL   string      `json:"home_google_maps_url"`
	ManagerID           *uint       `json:"manager_id"`
	ProjectID           *uint       `json:"project_id"`
	TeamID              string      `json:"team_id"`
	InternshipStartDate string      `json:"internship_start_date"`
	InternshipEndDate   string      `json:"internship_end_date"`
	MentorName          string      `json:"mentor_name"`
	InstitutionName     string      `json:"institution_name"`
}

func validateEmployeeProfile(req *EmployeeRequest) error {
	req.Nama = strings.TrimSpace(req.Nama)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.NIK = strings.TrimSpace(req.NIK)
	if req.Nama == "" || req.Email == "" || req.NIK == "" {
		return fmt.Errorf("NIK/NIP, nama lengkap, dan email wajib diisi")
	}
	if strings.TrimSpace(req.TanggalBergabung) == "" {
		return fmt.Errorf("tanggal masuk wajib diisi")
	}
	if _, err := mail.ParseAddress(req.Email); err != nil || !strings.Contains(req.Email, "@") {
		return fmt.Errorf("format email tidak valid")
	}
	if req.JenisKelamin != "" && req.JenisKelamin != "Laki-laki" && req.JenisKelamin != "Perempuan" {
		return fmt.Errorf("jenis kelamin tidak valid")
	}
	if req.NomorTelepon != "" && !regexp.MustCompile(`^\+?[0-9][0-9 .-]{7,19}$`).MatchString(req.NomorTelepon) {
		return fmt.Errorf("format nomor telepon tidak valid")
	}
	for label, value := range map[string]string{"tanggal masuk": req.TanggalBergabung, "tanggal lahir": req.TanggalLahir} {
		if value != "" {
			if _, err := parseEmployeeDate(value); err != nil {
				return fmt.Errorf("%s harus menggunakan format DD-MM-YYYY", label)
			}
		}
	}
	if strings.HasPrefix(req.FotoProfilURL, "data:") {
		if !strings.HasPrefix(req.FotoProfilURL, "data:image/") {
			return fmt.Errorf("foto harus berupa gambar JPG, PNG, atau GIF")
		}
		parts := strings.SplitN(req.FotoProfilURL, ",", 2)
		if len(parts) != 2 {
			return fmt.Errorf("foto tidak valid")
		}
		decoded, err := base64.StdEncoding.DecodeString(parts[1])
		if err != nil || len(decoded) > 5*1024*1024 {
			return fmt.Errorf("foto harus berupa gambar maksimal 5 MB")
		}
		if err := validateProfilePhotoDimensions(decoded); err != nil {
			return err
		}
	}
	return nil
}

func parseEmployeeDate(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if date, err := time.Parse("2006-01-02", value); err == nil {
		return date, nil
	}
	return time.Parse("02-01-2006", value)
}

func parseDate(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	date, err := parseEmployeeDate(value)
	return &date, err
}

func validateEmployeeAssignments(db *gorm.DB, req *EmployeeRequest, employeeUserID uint) error {
	if req.ManagerID != nil {
		if employeeUserID != 0 && *req.ManagerID == employeeUserID {
			return fmt.Errorf("karyawan tidak dapat menjadi manajer untuk dirinya sendiri")
		}
		var manager models.User
		if err := db.Where("id = ? AND role = ? AND status = ?", *req.ManagerID, models.RoleManajer, "aktif").First(&manager).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("manager yang dipilih tidak tersedia")
			}
			return fmt.Errorf("gagal memeriksa manager")
		}
		if req.Role == models.RoleMagang {
			req.MentorName = manager.Nama
		}
	} else if req.Role == models.RoleMagang {
		req.MentorName = ""
	}
	if req.ProjectID != nil {
		var project models.Project
		if err := db.Where("id = ? AND status_aktif = ?", *req.ProjectID, true).First(&project).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("project yang dipilih tidak tersedia")
			}
			return fmt.Errorf("gagal memeriksa project")
		}
	}
	return nil
}

func SetupEmployeeRoutes(router fiber.Router) {
	employee := router.Group("/employee", middleware.Protected())
	employee.Get("/manager", middleware.RequireRoles(models.RoleKaryawan), GetEmployeeManager)
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
	admin.Put("/employees/:id/shift", UpdateEmployeeShift)
}

// GetEmployeeManager returns the active manager assigned to the authenticated
// employee. The user_id comes from the JWT; no client-supplied employee ID is
// accepted, so this endpoint cannot be used to inspect another employee's
// manager.
func GetEmployeeManager(c *fiber.Ctx) error {
	result := fiber.Map{
		"has_manager":   false,
		"manager_id":    nil,
		"name":          "",
		"photo_url":     "",
		"gender":        "",
		"phone":         "",
		"email":         "",
		"address":       "",
		"position":      "",
		"department":    "",
		"shift":         "",
		"home_location": "",
	}

	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User is missing"})
	}

	var user models.User
	if err := config.DB.Select("id", "manager_id").Where("id = ? AND role = ?", userID, models.RoleKaryawan).First(&user).Error; err != nil || user.ManagerID == nil {
		return c.JSON(result)
	}

	var manager models.User
	if err := config.DB.Where("id = ? AND role = ? AND status = ?", *user.ManagerID, models.RoleManajer, "aktif").First(&manager).Error; err != nil {
		return c.JSON(result)
	}

	var employee models.Employee
	if err := config.DB.Preload("Division").Preload("Position").Preload("HomeLocation").Where("user_id = ?", manager.ID).First(&employee).Error; err != nil {
		return c.JSON(result)
	}

	result["has_manager"] = true
	result["manager_id"] = manager.ID
	result["name"] = manager.Nama
	result["email"] = manager.Email
	result["photo_url"] = employee.FotoProfilURL
	result["gender"] = employee.JenisKelamin
	result["phone"] = employee.NomorTelepon
	result["address"] = employee.Alamat
	result["position"] = employee.Position.NamaJabatan
	result["department"] = employee.Division.NamaDivisi
	result["shift"] = employee.ShiftKerja
	if employee.HomeLocation != nil {
		result["home_location"] = employee.HomeLocation.AlamatRumah
		if employee.HomeLocation.AlamatRumah == "" {
			result["home_location"] = employee.HomeLocation.GoogleMapsURL
		}
	}

	resolved := ResolveEffectiveSchedule(employee.ID, attendanceBusinessDate(attendanceNow()))
	result["shift"] = resolved.ShiftName
	if resolved.StartTime != "" && resolved.EndTime != "" {
		result["shift"] = fmt.Sprintf("%s (%s - %s)", resolved.ShiftName, resolved.StartTime, resolved.EndTime)
	}

	return c.JSON(result)
}

func getOrCreateEmployee(userID uint) (models.Employee, error) {
	var emp models.Employee
	if err := config.DB.Where("user_id = ?", userID).Preload("User").Preload("Division").Preload("Position").First(&emp).Error; err == nil {
		return emp, nil
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return emp, err
	}

	var defaultDiv models.Division
	var defaultPos models.Position
	config.DB.First(&defaultDiv)
	config.DB.First(&defaultPos)

	nik := fmt.Sprintf("EMP-%03d", user.ID)
	emp = models.Employee{
		UserID:           user.ID,
		NIK:              nik,
		DivisionID:       defaultDiv.ID,
		PositionID:       defaultPos.ID,
		TanggalBergabung: time.Now(),
	}
	if err := config.DB.Create(&emp).Error; err != nil {
		return emp, err
	}
	_ = config.DB.Preload("User").Preload("Division").Preload("Position").First(&emp, emp.ID)
	return emp, nil
}

func GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var user models.User
	if err := config.DB.Preload("Employee").Preload("Employee.Division").Preload("Employee.Position").Preload("Employee.HomeLocation").Preload("Project").Preload("Manager").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	empID := user.Employee.ID
	if empID == 0 {
		emp, err := getOrCreateEmployee(user.ID)
		if err == nil {
			empID = emp.ID
			user.Employee = emp
		}
	}

	var schedules []models.WorkSchedule
	if empID != 0 {
		config.DB.Where("employee_id = ?", empID).Order("tanggal desc, id desc").Find(&schedules)
	}

	if len(schedules) == 0 {
		config.DB.Where("employee_id IS NULL").Order("tanggal desc, id desc").Find(&schedules)
	}

	if len(schedules) == 0 {
		today := attendanceBusinessDate(attendanceNow())
		effSchedule := getAttendanceSchedule(empID, today)
		if effSchedule.Tanggal == nil {
			effSchedule.Tanggal = &today
		}
		schedules = append(schedules, effSchedule)
	}

	return c.JSON(struct {
		models.User
		WorkSchedules      []models.WorkSchedule `json:"WorkSchedules"`
		WorkSchedulesSnake []models.WorkSchedule `json:"work_schedules"`
	}{
		User:               user,
		WorkSchedules:      schedules,
		WorkSchedulesSnake: schedules,
	})
}

func UpdateMyProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req struct {
		Nama          string  `json:"nama"`
		Email         string  `json:"email"`
		Password      string  `json:"password"`
		OldPassword   string  `json:"old_password"`
		AlamatRumah   *string `json:"alamat_rumah"`
		GoogleMapsURL *string `json:"google_maps_url"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	tx := config.DB.Begin()

	var user models.User
	if err := tx.Preload("Employee").First(&user, userID).Error; err != nil {
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

	// Home address/location is intentionally not updated here. Employees must
	// submit a HomeLocationChangeRequest and wait for HRD approval.

	tx.Commit()
	utils.LogAction(userID, "UPDATE", "User", user.ID, "User updated profile")
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
	if err := validateProfilePhotoDimensions(imageConfig); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
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

func validateProfilePhotoDimensions(value interface{}) error {
	var width, height int
	switch imageConfig := value.(type) {
	case image.Config:
		width, height = imageConfig.Width, imageConfig.Height
	case []byte:
		config, _, err := image.DecodeConfig(bytes.NewReader(imageConfig))
		if err != nil {
			return fmt.Errorf("File harus berupa gambar JPG, PNG, atau GIF yang valid")
		}
		width, height = config.Width, config.Height
	default:
		return fmt.Errorf("Pas foto harus memiliki ukuran 3x4.")
	}
	if width <= 0 || height <= 0 || width*4 != height*3 {
		return fmt.Errorf("Pas foto harus memiliki ukuran 3x4.")
	}
	return nil
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
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	if err := services.BackfillCodes(config.DB); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat employee code"})
	}

	var users []models.User
	// Include all users so HRD can manage the complete employee directory.
	if err := config.DB.Preload("Employee").Preload("Employee.Division").Preload("Employee.Position").Preload("Employee.HomeLocation").Preload("Project").Preload("Manager").Preload("Manager.Employee").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch employees"})
	}

	// WorkSchedule is the source of truth for the directory shift badge. Resolve
	// the requested date (or today) without mutating employees.shift_kerja.
	effectiveDate := attendanceBusinessDate(attendanceNow())
	if rawDate := strings.TrimSpace(c.Query("date")); rawDate != "" {
		parsed, err := time.Parse("2006-01-02", rawDate)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format date harus YYYY-MM-DD"})
		}
		effectiveDate = parsed
	}
	entries := make([]employeeDirectoryEntry, 0, len(users))
	for i := range users {
		employee := &users[i].Employee
		if employee.ID == 0 {
			entries = append(entries, employeeDirectoryEntry{User: users[i]})
			continue
		}
		resolved := ResolveEffectiveSchedule(employee.ID, effectiveDate)
		if resolved.Source != "system_fallback" {
			employee.ShiftName = strings.TrimSpace(resolved.ShiftName)
			employee.ShiftJamMulai = resolved.StartTime
			employee.ShiftJamSelesai = resolved.EndTime
			employee.ShiftKerja = employee.ShiftName
		} else {
			employee.ShiftName = "Reguler"
			employee.ShiftKerja = "Reguler"
		}
		entries = append(entries, employeeDirectoryEntry{
			User:           users[i],
			EmployeeID:     employee.ID,
			EmployeeName:   users[i].Nama,
			ShiftID:        employee.ShiftID,
			ShiftName:      employee.ShiftName,
			TanggalBerlaku: employee.ShiftTanggal,
			JamMasuk:       employee.ShiftJamMulai,
			JamPulang:      employee.ShiftJamSelesai,
		})
	}

	return c.JSON(entries)
}

type employeeDirectoryEntry struct {
	models.User
	EmployeeID     uint       `json:"employee_id,omitempty"`
	EmployeeName   string     `json:"employee_name,omitempty"`
	ShiftID        uint       `json:"shift_id,omitempty"`
	ShiftName      string     `json:"shift_name"`
	TanggalBerlaku *time.Time `json:"tanggal_berlaku,omitempty"`
	JamMasuk       string     `json:"jam_masuk,omitempty"`
	JamPulang      string     `json:"jam_pulang,omitempty"`
}

// findEffectiveSchedule applies the scheduling precedence used by the employee
// directory: employee-specific schedules beat global schedules, and the latest
// schedule effective on the selected date wins.
func findEffectiveSchedule(employeeID uint, date time.Time) (models.WorkSchedule, bool) {
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	var schedules []models.WorkSchedule
	result := config.DB.Where("employee_id = ? OR employee_id IS NULL", employeeID).Find(&schedules)
	if result.Error != nil {
		return models.WorkSchedule{}, false
	}
	return selectEffectiveSchedule(schedules, employeeID, dateOnly)
}

func selectEffectiveSchedule(schedules []models.WorkSchedule, employeeID uint, date time.Time) (models.WorkSchedule, bool) {
	var selected models.WorkSchedule
	found := false
	for _, schedule := range schedules {
		isSpecific := schedule.EmployeeID != nil && *schedule.EmployeeID == employeeID
		if schedule.EmployeeID != nil && !isSpecific {
			continue
		}
		if schedule.Tanggal != nil && schedule.Tanggal.After(date) {
			continue
		}
		if !found || (isSpecific && (selected.EmployeeID == nil || scheduleDateAfter(schedule, selected))) ||
			(!isSpecific && selected.EmployeeID == nil && scheduleDateAfter(schedule, selected)) {
			selected = schedule
			found = true
		}
	}
	return selected, found
}

func scheduleDateAfter(candidate, current models.WorkSchedule) bool {
	if candidate.Tanggal == nil {
		return false
	}
	if current.Tanggal == nil {
		return true
	}
	if candidate.Tanggal.After(*current.Tanggal) {
		return true
	}
	return candidate.Tanggal.Equal(*current.Tanggal) && candidate.ID > current.ID
}

func GetEmployeeDetail(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var user models.User
	if err := config.DB.Preload("Employee").Preload("Employee.Division").Preload("Employee.Position").Preload("Employee.HomeLocation").Preload("Project").Preload("Manager").Preload("Manager.Employee").First(&user, c.Params("id")).Error; err != nil {
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
	// Empty optional selects can arrive as 0 from the browser. PostgreSQL
	// treats 0 as a real foreign-key value, so convert it to NULL first.
	if req.ManagerID != nil && *req.ManagerID == 0 {
		req.ManagerID = nil
	}
	if req.ProjectID != nil && *req.ProjectID == 0 {
		req.ProjectID = nil
	}
	req.Nama = strings.TrimSpace(req.Nama)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Status == "" {
		req.Status = "aktif"
	}
	if err := validateEmployeeProfile(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if !models.IsValidRole(req.Role) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}
	if err := validateEmployeeAssignments(config.DB, &req, 0); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
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
	if err := config.DB.Unscoped().Where("LOWER(email) = ?", strings.ToLower(req.Email)).First(&existingUser).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email '" + req.Email + "' sudah memiliki akun. Silakan gunakan email lain untuk melanjutkan."})
	}

	// Cek ketersediaan NIK
	if req.NIK != "" {
		var existingEmp models.Employee
		if err := config.DB.Unscoped().Where("nik = ?", req.NIK).First(&existingEmp).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "NIK '" + req.NIK + "' sudah memiliki akun. Pastikan NIK yang dimasukkan benar."})
		}
	}

	tglGabung, _ := parseEmployeeDate(req.TanggalBergabung)
	tglLahir, _ := parseDate(req.TanggalLahir)

	tx := config.DB.Begin()

	user := models.User{
		Nama:            req.Nama,
		Email:           req.Email,
		PasswordHash:    string(hashedPassword),
		Role:            req.Role,
		Status:          req.Status,
		ManagerID:       req.ManagerID,
		ProjectID:       req.ProjectID,
		TeamID:          req.TeamID,
		MentorName:      req.MentorName,
		InstitutionName: req.InstitutionName,
	}
	user.InternshipStartDate = parseOptionalDate(req.InternshipStartDate)
	user.InternshipEndDate = parseOptionalDate(req.InternshipEndDate)

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		log.Printf("CreateEmployee user insert failed: %v", err)
		message := "Failed to create user. Periksa email, role, dan data akun."
		if config.LoadConfig().AppEnv == "development" {
			message += " Detail: " + err.Error()
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": message})
	}

	employee := models.Employee{
		UserID:       user.ID,
		NIK:          req.NIK,
		JenisKelamin: req.JenisKelamin, TempatLahir: req.TempatLahir, TanggalLahir: tglLahir, NomorTelepon: req.NomorTelepon, Alamat: req.Alamat, FotoProfilURL: req.FotoProfilURL, ShiftKerja: "Reguler",
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
	if err := services.AssignEmployeeCode(tx, &employee, user.Role); err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat kode karyawan berdasarkan tahun masuk. Silakan periksa tanggal masuk dan coba lagi."})
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
	if req.ManagerID != nil && *req.ManagerID == 0 {
		req.ManagerID = nil
	}
	if req.ProjectID != nil && *req.ProjectID == 0 {
		req.ProjectID = nil
	}
	if err := validateEmployeeProfile(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := validateEmployeeAssignments(config.DB, &req, uint(id)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
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
	user.ProjectID = req.ProjectID
	user.TeamID = req.TeamID
	user.MentorName = req.MentorName
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
		tglGabung, _ := parseEmployeeDate(req.TanggalBergabung)
		tglLahir, _ := parseDate(req.TanggalLahir)
		user.Employee.NIK = req.NIK
		user.Employee.JenisKelamin = req.JenisKelamin
		user.Employee.TempatLahir = req.TempatLahir
		user.Employee.TanggalLahir = tglLahir
		user.Employee.NomorTelepon = req.NomorTelepon
		user.Employee.Alamat = req.Alamat
		user.Employee.FotoProfilURL = req.FotoProfilURL
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
		manualCode := strings.TrimSpace(req.EmployeeCode)
		if manualCode != "" && manualCode != user.Employee.EmployeeCode {
			var codeOwner models.Employee
			if err := tx.Unscoped().Where("employee_code = ? AND id <> ?", manualCode, user.Employee.ID).First(&codeOwner).Error; err == nil {
				tx.Rollback()
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Kode karyawan '" + manualCode + "' sudah digunakan karyawan lain."})
			} else if err != gorm.ErrRecordNotFound {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memeriksa keunikan kode karyawan."})
			}
			user.Employee.EmployeeCode = manualCode
			if err := tx.Model(&user.Employee).Update("employee_code", manualCode).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan kode karyawan manual."})
			}
		} else if user.Employee.EmployeeCode == "" {
			if err := services.AssignEmployeeCode(tx, &user.Employee, user.Role); err != nil {
				tx.Rollback()
				return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat kode karyawan berdasarkan tahun masuk. Silakan periksa tanggal masuk dan coba lagi."})
			}
		}
		if hasHomeLocation(req.HomeLatitude, req.HomeLongitude) {
			if err := saveEmployeeHomeLocation(tx, user.Employee.ID, req.HomeLatitude, req.HomeLongitude, req.HomeGoogleMapsURL); err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save employee home location"})
			}
		}
	} else if req.NIK != "" {
		// Create employee if it doesn't exist but NIK is provided
		tglGabung, _ := parseEmployeeDate(req.TanggalBergabung)
		tglLahir, _ := parseDate(req.TanggalLahir)
		newEmp := models.Employee{
			UserID:       user.ID,
			NIK:          req.NIK,
			JenisKelamin: req.JenisKelamin, TempatLahir: req.TempatLahir, TanggalLahir: tglLahir, NomorTelepon: req.NomorTelepon, Alamat: req.Alamat, FotoProfilURL: req.FotoProfilURL, ShiftKerja: "Reguler",
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
		if err := services.AssignEmployeeCode(tx, &newEmp, user.Role); err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat employee code"})
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
		// Release the display code before soft-deleting the row. The internal ID
		// remains in history, while the code becomes available for reuse.
		if err := tx.Model(&user.Employee).Update("employee_code", nil).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to release employee code"})
		}
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
