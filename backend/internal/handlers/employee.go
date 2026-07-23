package handlers

import (
	"encoding/csv"
	"fmt"
	"io"
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
	Nama              string      `json:"nama"`
	Email             string      `json:"email"`
	Password          string      `json:"password"`
	Role              models.Role `json:"role"`
	Status            string      `json:"status"`
	NIK               string      `json:"nik"`
	DepartmentID      uint        `json:"department_id"`
	PositionID        uint        `json:"position_id"`
	TanggalBergabung  string      `json:"tanggal_bergabung"` // YYYY-MM-DD
	HomeLatitude      float64     `json:"home_latitude"`
	HomeLongitude     float64     `json:"home_longitude"`
	HomeGoogleMapsURL string      `json:"home_google_maps_url"`
}

func SetupEmployeeRoutes(router fiber.Router) {
	employee := router.Group("/employee", middleware.Protected())
	employee.Get("/profile", GetProfile)
	employee.Put("/profile", UpdateMyProfile)

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
	if err := config.DB.Preload("Employee").Preload("Employee.Department").Preload("Employee.Position").Preload("Employee.HomeLocation").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(user)
}

func UpdateMyProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req struct {
		Nama        string `json:"nama"`
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

func GetAllEmployees(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var users []models.User
	// Also get the HRD/Pimpinan if needed, but for now we list all Karyawan
	if err := config.DB.Preload("Employee").Preload("Employee.Department").Preload("Employee.Position").Preload("Employee.HomeLocation").Find(&users).Error; err != nil {
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
	if err := config.DB.Preload("Employee").Preload("Employee.Department").Preload("Employee.Position").Preload("Employee.HomeLocation").First(&user, c.Params("id")).Error; err != nil {
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
	if err := resolveEmployeeHomeLocation(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	tglGabung, _ := time.Parse("2006-01-02", req.TanggalBergabung)

	tx := config.DB.Begin()

	user := models.User{
		Nama:         req.Nama,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
		Status:       req.Status,
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
	}

	employee := models.Employee{
		UserID:           user.ID,
		NIK:              req.NIK,
		DepartmentID:     req.DepartmentID,
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
	if err := resolveEmployeeHomeLocation(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tx := config.DB.Begin()

	var user models.User
	if err := tx.Preload("Employee").First(&user, id).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	user.Nama = req.Nama
	user.Email = req.Email
	user.Role = req.Role
	user.Status = req.Status

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
		user.Employee.DepartmentID = req.DepartmentID
		user.Employee.PositionID = req.PositionID
		user.Employee.TanggalBergabung = tglGabung
		user.Employee.HomeLatitude = req.HomeLatitude
		user.Employee.HomeLongitude = req.HomeLongitude

		if err := tx.Save(&user.Employee).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update employee"})
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
			DepartmentID:     req.DepartmentID,
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
	required := []string{"nik", "nama", "email", "password", "department_id", "position_id", "tanggal_bergabung"}
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
		departmentID, errDept := strconv.ParseUint(value("department_id"), 10, 32)
		positionID, errPosition := strconv.ParseUint(value("position_id"), 10, 32)
		joined, errDate := time.Parse("2006-01-02", value("tanggal_bergabung"))
		if value("nik") == "" || value("nama") == "" || value("email") == "" || value("password") == "" || errDept != nil || errPosition != nil || errDate != nil {
			errors = append(errors, fmt.Sprintf("Baris %d: data wajib atau format angka/tanggal tidak valid", rowNumber))
			continue
		}
		role := models.Role(value("role"))
		if role == "" {
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
		employee := models.Employee{UserID: user.ID, NIK: value("nik"), DepartmentID: uint(departmentID), PositionID: uint(positionID), TanggalBergabung: joined, HomeLatitude: homeLat, HomeLongitude: homeLng}
		if err = tx.Create(&employee).Error; err != nil {
			tx.Rollback()
			errors = append(errors, fmt.Sprintf("Baris %d: NIK/departemen/jabatan tidak valid", rowNumber))
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
