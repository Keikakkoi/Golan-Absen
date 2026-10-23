package handlers

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"github.com/go-pdf/fpdf"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const (
	defaultCompanyName  = "PT Golan Digital Kreatif"
	defaultCompanyCode  = "02145678"
	takeHomePaySubtitle = "Total pendapatan - Total pengurangan"
)

type payrollItemInput struct {
	Type      string `json:"type"`
	Name      string `json:"name"`
	Amount    int64  `json:"amount"`
	SortOrder int    `json:"sort_order"`
}

type payrollInput struct {
	EmployeeID          uint               `json:"employee_id"`
	PeriodeBulan        string             `json:"periode_bulan"`
	PayrollCutoffStart  string             `json:"payroll_cutoff_start"`
	PayrollCutoffEnd    string             `json:"payroll_cutoff_end"`
	PaymentDate         string             `json:"payment_date"`
	CompanyPhone        string             `json:"company_phone"`
	TotalHariKerja      *int               `json:"total_hari_kerja"`
	UangTransportasi    *int64             `json:"uang_transportasi"`
	BPJSKetenagakerjaan *int64             `json:"bpjs_ketenagakerjaan"`
	Notes               string             `json:"notes"`
	ApprovedByName      string             `json:"approved_by_name"`
	ApprovedByPosition  string             `json:"approved_by_position"`
	ReceivedByName      string             `json:"received_by_name"`
	ReceivedByPosition  string             `json:"received_by_position"`
	Items               []payrollItemInput `json:"items"`
}

func SetupPayrollRoutes(router fiber.Router) {
	admin := router.Group("/admin/payroll", middleware.Protected(), middleware.RequireRoles(models.RoleHRD))
	admin.Get("/", ListAdminPayroll)
	admin.Get("/attendance-days", GetPayrollAttendanceDays)
	admin.Get("/:id", GetAdminPayroll)
	admin.Post("/", CreatePayroll)
	admin.Put("/:id", UpdatePayroll)
	admin.Delete("/:id", DeletePayroll)
	admin.Post("/:id/publish", PublishPayroll)
	admin.Get("/:id/pdf", DownloadPayrollPDF)

	employee := router.Group("/employee/payroll", middleware.Protected(), middleware.RequireRoles(models.RoleKaryawan, models.RoleManajer, models.RoleMagang))
	employee.Get("/", ListEmployeePayroll)
	employee.Get("/:id", GetEmployeePayroll)
	employee.Get("/:id/pdf", DownloadEmployeePayrollPDF)
}

func parsePayrollDate(value, field string) (time.Time, error) {
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(value))
	if err != nil {
		return time.Time{}, fmt.Errorf("%s harus menggunakan format YYYY-MM-DD", field)
	}
	return parsed, nil
}

func parsePayrollPeriod(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if len(value) == 7 {
		value += "-01"
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, fmt.Errorf("periode bulan harus menggunakan format YYYY-MM")
	}
	return time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, time.UTC), nil
}

func payrollID(c *fiber.Ctx) (uint, error) {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil || id == 0 {
		return 0, fmt.Errorf("ID slip tidak valid")
	}
	return uint(id), nil
}

func validatePayrollInput(input *payrollInput) (time.Time, time.Time, time.Time, time.Time, error) {
	if input.EmployeeID == 0 {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("karyawan wajib dipilih")
	}
	period, err := parsePayrollPeriod(input.PeriodeBulan)
	if err != nil {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, err
	}
	cutoffStart, err := parsePayrollDate(input.PayrollCutoffStart, "payroll cut-off mulai")
	if err != nil {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, err
	}
	cutoffEnd, err := parsePayrollDate(input.PayrollCutoffEnd, "payroll cut-off selesai")
	if err != nil {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, err
	}
	payment, err := parsePayrollDate(input.PaymentDate, "tanggal bayar")
	if err != nil {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, err
	}
	if cutoffStart.After(cutoffEnd) {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("payroll cut-off mulai tidak boleh lebih besar dari selesai")
	}
	if input.TotalHariKerja != nil && *input.TotalHariKerja < 0 {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("total hari kerja tidak boleh negatif")
	}
	if input.UangTransportasi != nil && *input.UangTransportasi < 0 {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("uang transportasi tidak boleh negatif")
	}
	if input.BPJSKetenagakerjaan != nil && *input.BPJSKetenagakerjaan < 0 {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("BPJS Ketenagakerjaan tidak boleh negatif")
	}
	if len(input.Items) == 0 {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("minimal satu item pendapatan wajib diisi")
	}
	hasIncome := false
	for index := range input.Items {
		item := &input.Items[index]
		item.Type = strings.ToLower(strings.TrimSpace(item.Type))
		item.Name = strings.TrimSpace(item.Name)
		if item.Type != "income" && item.Type != "deduction" {
			return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("tipe item tidak valid")
		}
		if item.Name == "" {
			return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("nama item tidak boleh kosong")
		}
		if item.Amount < 0 {
			return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("nominal item tidak boleh negatif")
		}
		if item.Type == "income" {
			hasIncome = true
		}
	}
	if !hasIncome {
		return time.Time{}, time.Time{}, time.Time{}, time.Time{}, fmt.Errorf("minimal satu item pendapatan wajib diisi")
	}
	return period, cutoffStart, cutoffEnd, payment, nil
}

func payrollAttendanceDays(db *gorm.DB, employeeID uint, start, end time.Time) (int, error) {
	var records []models.AttendanceRecord
	if err := db.Where("employee_id = ? AND tanggal BETWEEN ? AND ? AND status IN ?", employeeID, start.Format("2006-01-02"), end.Format("2006-01-02"), []models.AttendanceStatus{models.StatusHadir, models.StatusTerlambat}).Find(&records).Error; err != nil {
		return 0, err
	}

	dates := make(map[string]struct{}, len(records))
	for _, record := range records {
		dates[record.Tanggal.Format("2006-01-02")] = struct{}{}
	}
	return len(dates), nil
}

func GetPayrollAttendanceDays(c *fiber.Ctx) error {
	employeeID, err := strconv.ParseUint(strings.TrimSpace(c.Query("employee_id")), 10, 32)
	if err != nil || employeeID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "employee_id wajib valid"})
	}
	start, err := parsePayrollDate(c.Query("start_date"), "payroll cut-off mulai")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	end, err := parsePayrollDate(c.Query("end_date"), "payroll cut-off selesai")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if start.After(end) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payroll cut-off mulai tidak boleh lebih besar dari selesai"})
	}
	if _, err := payrollEmployee(config.DB, uint(employeeID)); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Karyawan tidak ditemukan"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	days, err := payrollAttendanceDays(config.DB, uint(employeeID), start, end)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menghitung hari kerja dari absensi"})
	}
	return c.JSON(fiber.Map{"total_hari_kerja": days, "start_date": start.Format("2006-01-02"), "end_date": end.Format("2006-01-02")})
}

func payrollEmployee(db *gorm.DB, employeeID uint) (models.Employee, error) {
	var employee models.Employee
	err := db.Preload("User").Preload("Division").Preload("Position").First(&employee, employeeID).Error
	if err == nil && employee.User == nil {
		return employee, fmt.Errorf("akun karyawan tidak ditemukan")
	}
	if err == nil && !strings.EqualFold(strings.TrimSpace(employee.User.Status), "aktif") {
		return employee, fmt.Errorf("karyawan harus berstatus aktif")
	}
	return employee, err
}

func buildPayroll(input *payrollInput, employee models.Employee, actor uint, existing *models.Payroll) (*models.Payroll, error) {
	period, start, end, payment, err := validatePayrollInput(input)
	if err != nil {
		return nil, err
	}
	payroll := existing
	if payroll == nil {
		payroll = &models.Payroll{CreatedBy: actor}
	}
	payroll.EmployeeID = employee.ID
	payroll.UserID = employee.UserID
	payroll.PeriodeBulan = period
	payroll.PayrollCutoffStart = start
	payroll.PayrollCutoffEnd = end
	payroll.PaymentDate = payment
	payroll.EmployeeNameSnapshot = strings.TrimSpace(employee.User.Nama)
	payroll.EmployeeCodeSnapshot = strings.TrimSpace(employee.EmployeeCode)
	payroll.NIKSnapshot = strings.TrimSpace(employee.NIK)
	payroll.PositionSnapshot = strings.TrimSpace(employee.Position.NamaJabatan)
	payroll.DivisionSnapshot = strings.TrimSpace(employee.Division.NamaDivisi)
	workDays, err := payrollAttendanceDays(config.DB, employee.ID, start, end)
	if err != nil {
		return nil, fmt.Errorf("gagal menghitung total hari kerja dari absensi: %w", err)
	}
	payroll.TotalHariKerja = workDays
	normalizePayrollCompanySnapshot(payroll)
	payroll.Notes = strings.TrimSpace(input.Notes)
	payroll.ApprovedByName = strings.TrimSpace(input.ApprovedByName)
	payroll.ApprovedByPosition = strings.TrimSpace(input.ApprovedByPosition)
	payroll.ReceivedByName = strings.TrimSpace(input.ReceivedByName)
	payroll.ReceivedByPosition = strings.TrimSpace(input.ReceivedByPosition)
	payroll.UpdatedBy = actor
	payroll.UangTransportasi = payrollComponentAmount(input.UangTransportasi)
	if amount, ok := payrollInputComponentAmount(input.Items, "income", "Uang Transportasi"); ok {
		payroll.UangTransportasi = amount
	}
	payroll.BPJSKetenagakerjaan = payrollComponentAmount(input.BPJSKetenagakerjaan)
	if amount, ok := payrollInputComponentAmount(input.Items, "deduction", "BPJS Ketenagakerjaan"); ok {
		payroll.BPJSKetenagakerjaan = amount
	}
	payroll.TotalIncome, payroll.TotalDeduction = 0, 0
	for _, item := range input.Items {
		if payrollInputComponent(item, "income", "Uang Transportasi") || payrollInputComponent(item, "deduction", "BPJS Ketenagakerjaan") {
			continue
		}
		if item.Type == "income" {
			payroll.TotalIncome += item.Amount
		} else {
			payroll.TotalDeduction += item.Amount
		}
	}
	payroll.TotalIncome += payroll.UangTransportasi
	payroll.TotalDeduction += payroll.BPJSKetenagakerjaan
	payroll.TakeHomePay = payroll.TotalIncome - payroll.TotalDeduction
	if existing == nil {
		payroll.Status = "Draft"
	}
	return payroll, nil
}

func payrollComponentAmount(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

func payrollInputComponentAmount(items []payrollItemInput, itemType, name string) (int64, bool) {
	for _, item := range items {
		if payrollInputComponent(item, itemType, name) {
			return item.Amount, true
		}
	}
	return 0, false
}

func payrollInputComponent(item payrollItemInput, itemType, name string) bool {
	return item.Type == itemType && strings.EqualFold(strings.TrimSpace(item.Name), name)
}

func savePayroll(tx *gorm.DB, payroll *models.Payroll, inputs []payrollItemInput) error {
	if err := tx.Save(payroll).Error; err != nil {
		return err
	}
	if err := tx.Where("payroll_id = ?", payroll.ID).Delete(&models.PayrollItem{}).Error; err != nil {
		return err
	}
	items := make([]models.PayrollItem, 0, len(inputs))
	for index, input := range inputs {
		items = append(items, models.PayrollItem{PayrollID: payroll.ID, Type: input.Type, Name: input.Name, Amount: input.Amount, SortOrder: index})
	}
	if len(items) > 0 {
		if err := tx.Create(&items).Error; err != nil {
			return err
		}
	}
	return nil
}

func preloadPayroll(db *gorm.DB) *gorm.DB {
	return db.Preload("Items", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order asc, id asc") })
}

func ListAdminPayroll(c *fiber.Ctx) error {
	query := preloadPayroll(config.DB).Model(&models.Payroll{}).Order("periode_bulan desc, id desc")
	monthValue, err := payrollFilterNumber(c.Query("month"), "bulan", 1, 12)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	yearValue, err := payrollFilterNumber(c.Query("year"), "tahun", 1900, 9999)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if monthValue != nil && yearValue != nil {
		start := time.Date(*yearValue, time.Month(*monthValue), 1, 0, 0, 0, 0, time.UTC)
		query = query.Where("periode_bulan >= ? AND periode_bulan < ?", start, start.AddDate(0, 1, 0))
	} else if yearValue != nil {
		start := time.Date(*yearValue, time.January, 1, 0, 0, 0, 0, time.UTC)
		query = query.Where("periode_bulan >= ? AND periode_bulan < ?", start, start.AddDate(1, 0, 0))
	} else if monthValue != nil {
		query = query.Where("EXTRACT(MONTH FROM periode_bulan) = ?", *monthValue)
	}
	if employeeID := strings.TrimSpace(c.Query("employee_id")); employeeID != "" {
		query = query.Where("employee_id = ?", employeeID)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if division := strings.TrimSpace(c.Query("division")); division != "" {
		query = query.Where("LOWER(division_snapshot) LIKE LOWER(?)", "%"+division+"%")
	}
	var rows []models.Payroll
	if err := paginatedQuery(c, query, &rows, func() { normalizePayrollCompanySnapshots(rows) }); err != nil {
		if strings.Contains(err.Error(), "count") {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menghitung slip gaji"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat slip gaji"})
	}
	return nil
}

func payrollFilterNumber(value, field string, minimum, maximum int) (*int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < minimum || parsed > maximum {
		return nil, fmt.Errorf("%s filter harus berupa angka antara %d dan %d", field, minimum, maximum)
	}
	return &parsed, nil
}

func GetAdminPayroll(c *fiber.Ctx) error {
	id, err := payrollID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var payroll models.Payroll
	if err := preloadPayroll(config.DB).First(&payroll, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Slip gaji tidak ditemukan"})
	}
	normalizePayrollCompanySnapshot(&payroll)
	return c.JSON(payroll)
}

func CreatePayroll(c *fiber.Ctx) error {
	var input payrollInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data slip gaji tidak valid"})
	}
	employee, err := payrollEmployee(config.DB, input.EmployeeID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "Karyawan tidak ditemukan"})
		}
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	actor := c.Locals("user_id").(uint)
	payroll, err := buildPayroll(&input, employee, actor, nil)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	tx := config.DB.Begin()
	if err := savePayroll(tx, payroll, input.Items); err != nil {
		tx.Rollback()
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return c.Status(409).JSON(fiber.Map{"error": "Karyawan sudah memiliki slip untuk periode tersebut"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan slip gaji"})
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan slip gaji"})
	}
	_ = utils.LogAction(actor, "CREATE", "Payroll", payroll.ID, "Membuat slip gaji Draft")
	return c.Status(201).JSON(payrollWithItems(payroll, input.Items))
}

func payrollWithItems(payroll *models.Payroll, inputs []payrollItemInput) *models.Payroll {
	normalizePayrollCompanySnapshot(payroll)
	payroll.Items = make([]models.PayrollItem, 0, len(inputs))
	for index, item := range inputs {
		payroll.Items = append(payroll.Items, models.PayrollItem{PayrollID: payroll.ID, Type: item.Type, Name: item.Name, Amount: item.Amount, SortOrder: index})
	}
	return payroll
}

func UpdatePayroll(c *fiber.Ctx) error {
	id, err := payrollID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var payroll models.Payroll
	if err := config.DB.First(&payroll, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Slip gaji tidak ditemukan"})
	}
	if payroll.Status != "Draft" {
		return c.Status(409).JSON(fiber.Map{"error": "Slip Published tidak dapat diubah"})
	}
	var input payrollInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data slip gaji tidak valid"})
	}
	employee, err := payrollEmployee(config.DB, input.EmployeeID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	actor := c.Locals("user_id").(uint)
	updated, err := buildPayroll(&input, employee, actor, &payroll)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	tx := config.DB.Begin()
	if err := savePayroll(tx, updated, input.Items); err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memperbarui slip gaji"})
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memperbarui slip gaji"})
	}
	_ = utils.LogAction(actor, "UPDATE", "Payroll", id, "Memperbarui slip gaji Draft")
	return c.JSON(payrollWithItems(updated, input.Items))
}

func DeletePayroll(c *fiber.Ctx) error {
	id, err := payrollID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var payroll models.Payroll
	if err := config.DB.First(&payroll, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Slip gaji tidak ditemukan"})
	}
	if payroll.Status != "Draft" {
		return c.Status(409).JSON(fiber.Map{"error": "Slip Published tidak dapat dihapus"})
	}
	if err := config.DB.Delete(&payroll).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus slip gaji"})
	}
	actor := c.Locals("user_id").(uint)
	_ = utils.LogAction(actor, "DELETE", "Payroll", id, "Menghapus slip gaji Draft")
	return c.JSON(fiber.Map{"message": "Slip gaji dihapus"})
}

func PublishPayroll(c *fiber.Ctx) error {
	id, err := payrollID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var payroll models.Payroll
	if err := preloadPayroll(config.DB).First(&payroll, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Slip gaji tidak ditemukan"})
	}
	if payroll.Status != "Draft" {
		return c.Status(409).JSON(fiber.Map{"error": "Slip sudah diterbitkan"})
	}
	if payroll.TakeHomePay < 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Take Home Pay tidak boleh negatif saat Publish"})
	}
	normalizePayrollCompanySnapshot(&payroll)
	now := time.Now()
	payroll.Status, payroll.PublishedAt, payroll.UpdatedBy = "Published", &now, c.Locals("user_id").(uint)
	if err := config.DB.Save(&payroll).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menerbitkan slip gaji"})
	}
	_ = utils.LogAction(payroll.UpdatedBy, "PUBLISH", "Payroll", id, "Menerbitkan slip gaji")
	var recipient models.User
	if err := config.DB.Select("id", "role").First(&recipient, payroll.UserID).Error; err != nil {
		log.Printf("notification payroll publish: recipient lookup failed for payroll %d/user %d: %v", payroll.ID, payroll.UserID, err)
	} else if recipient.Role == models.RoleKaryawan || recipient.Role == models.RoleManajer || recipient.Role == models.RoleMagang {
		message := fmt.Sprintf("Slip gaji untuk periode %s telah diterbitkan dan dapat dilihat.", payroll.PeriodeBulan.Format("2006-01"))
		key := fmt.Sprintf("payroll-published:%d", payroll.ID)
		if err := utils.CreateNotificationWithIdempotencyKey(config.DB, recipient.ID, recipient.Role, "Slip Gaji", "Slip Gaji Baru", message, key); err != nil {
			log.Printf("notification payroll publish: failed for payroll %d/user %d: %v", payroll.ID, recipient.ID, err)
		}
	}
	return c.JSON(payroll)
}

func ListEmployeePayroll(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var rows []models.Payroll
	query := preloadPayroll(config.DB).Model(&models.Payroll{}).
		Where("user_id = ? AND status = ?", userID, "Published").
		Order("periode_bulan desc, id desc")
	if err := paginatedQuery(c, query, &rows, func() { normalizePayrollCompanySnapshots(rows) }); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memuat slip gaji"})
	}
	return nil
}

func getOwnedPublishedPayroll(c *fiber.Ctx) (*models.Payroll, error) {
	id, err := payrollID(c)
	if err != nil {
		return nil, err
	}
	var payroll models.Payroll
	if err := preloadPayroll(config.DB).Where("id = ? AND user_id = ? AND status = ?", id, c.Locals("user_id").(uint), "Published").First(&payroll).Error; err != nil {
		return nil, err
	}
	normalizePayrollCompanySnapshot(&payroll)
	return &payroll, nil
}
func GetEmployeePayroll(c *fiber.Ctx) error {
	payroll, err := getOwnedPublishedPayroll(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Slip gaji tidak ditemukan"})
	}
	return c.JSON(payroll)
}
func DownloadEmployeePayrollPDF(c *fiber.Ctx) error {
	payroll, err := getOwnedPublishedPayroll(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Slip gaji tidak ditemukan"})
	}
	return sendPayrollPDF(c, payroll)
}
func DownloadPayrollPDF(c *fiber.Ctx) error {
	id, err := payrollID(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	var payroll models.Payroll
	if err := preloadPayroll(config.DB).First(&payroll, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Slip gaji tidak ditemukan"})
	}
	normalizePayrollCompanySnapshot(&payroll)
	return sendPayrollPDF(c, &payroll)
}

func normalizePayrollCompanySnapshot(payroll *models.Payroll) {
	if payroll == nil {
		return
	}
	// General Settings currently has no company identity field. Keep this
	// server-owned so a blank or forged frontend value cannot reach a payslip.
	payroll.CompanyNameSnapshot = defaultCompanyName
	payroll.CompanyPhoneSnapshot = defaultCompanyCode
}

func normalizePayrollCompanySnapshots(payrolls []models.Payroll) {
	for index := range payrolls {
		normalizePayrollCompanySnapshot(&payrolls[index])
	}
}

func rupiah(value int64) string {
	if value == 0 {
		return "Rp0"
	}
	negative := value < 0
	if negative {
		value = -value
	}
	raw := strconv.FormatInt(value, 10)
	for i := len(raw) - 3; i > 0; i -= 3 {
		raw = raw[:i] + "." + raw[i:]
	}
	if negative {
		return "-Rp" + raw
	}
	return "Rp" + raw
}
func pdfText(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return value
}
func firstExisting(paths ...string) string {
	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return ""
}

func sendPayrollPDF(c *fiber.Ctx, payroll *models.Payroll) error {
	normalizePayrollCompanySnapshot(payroll)
	bytesPDF := &bytes.Buffer{}
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetTitle("Slip Gaji - "+payroll.EmployeeCodeSnapshot, false)
	pdf.SetAuthor(defaultCompanyName, false)
	pdf.AddPage()
	pdf.SetMargins(16, 14, 16)
	logo := firstExisting("/app/assets/icon_golan.png", "assets/icon_golan.png", "frontend/public/assets/icon_golan.png", "../frontend/public/assets/icon_golan.png", "icon_golan.png")
	if logo != "" {
		pdf.ImageOptions(logo, 16, 14, 20, 20, false, fpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
	}
	pdf.SetFont("Arial", "B", 12)
	pdf.SetXY(40, 15)
	pdf.CellFormat(90, 6, payroll.CompanyNameSnapshot, "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetX(40)
	pdf.CellFormat(90, 5, payroll.CompanyPhoneSnapshot, "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(128, 15)
	pdf.CellFormat(66, 6, "Slip gaji untuk bulan", "", 1, "R", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.SetX(128)
	pdf.CellFormat(66, 5, payroll.PeriodeBulan.Format("January 2006"), "", 1, "R", false, 0, "")
	pdf.SetDrawColor(220, 224, 230)
	pdf.Line(16, 40, 194, 40)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetXY(16, 47)
	pdf.Cell(178, 6, "Rincian karyawan")
	pdf.SetFont("Arial", "", 8)
	y := float64(57)
	left := [][2]string{{"Nama karyawan", payroll.EmployeeNameSnapshot}, {"ID karyawan", payroll.EmployeeCodeSnapshot}, {"Jabatan", payroll.PositionSnapshot}, {"Departemen", payroll.DivisionSnapshot}}
	right := [][2]string{{"Total hari kerja", strconv.Itoa(payroll.TotalHariKerja)}, {"Payroll cut off", payroll.PayrollCutoffStart.Format("02/01/2006") + " - " + payroll.PayrollCutoffEnd.Format("02/01/2006")}, {"Tanggal bayar", payroll.PaymentDate.Format("02/01/2006")}}
	for i := 0; i < len(left); i++ {
		pdf.SetXY(16, y)
		pdf.CellFormat(28, 5, left[i][0], "", 0, "L", false, 0, "")
		pdf.SetX(45)
		pdf.CellFormat(52, 5, pdfText(left[i][1]), "", 0, "L", false, 0, "")
		if i < len(right) {
			pdf.SetX(108)
			pdf.CellFormat(30, 5, right[i][0], "", 0, "L", false, 0, "")
			pdf.SetX(140)
			pdf.CellFormat(54, 5, pdfText(right[i][1]), "", 1, "L", false, 0, "")
		} else {
			pdf.Ln(5)
		}
		y += 6
	}
	pdf.Line(16, 84, 194, 84)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetXY(16, 91)
	pdf.Cell(178, 6, "Rincian penghasilan")
	pdf.SetFillColor(239, 242, 245)
	pdf.SetXY(16, 100)
	pdf.CellFormat(88, 8, "Pendapatan                                      Jumlah", "", 0, "L", true, 0, "")
	pdf.SetX(106)
	pdf.CellFormat(88, 8, "Pengurangan                                Jumlah", "", 1, "L", true, 0, "")
	incomes, deductions := make([]models.PayrollItem, 0), make([]models.PayrollItem, 0)
	for _, item := range payroll.Items {
		if item.Type == "income" {
			incomes = append(incomes, item)
		} else {
			deductions = append(deductions, item)
		}
	}
	// These two components are stored as named payroll columns so they remain
	// available even when the dynamic item list is edited or reordered.
	if !payrollHasComponent(incomes, "Uang Transportasi") {
		incomes = append(incomes, models.PayrollItem{Name: "Uang Transportasi", Amount: payroll.UangTransportasi})
	}
	if !payrollHasComponent(deductions, "BPJS Ketenagakerjaan") {
		deductions = append(deductions, models.PayrollItem{Name: "BPJS Ketenagakerjaan", Amount: payroll.BPJSKetenagakerjaan})
	}
	rows := len(incomes)
	if len(deductions) > rows {
		rows = len(deductions)
	}
	y = 108
	for i := 0; i < rows; i++ {
		if y > 248 {
			pdf.AddPage()
			y = 20
			pdf.SetFont("Arial", "B", 10)
			pdf.CellFormat(178, 7, "Rincian penghasilan (lanjutan)", "", 1, "L", false, 0, "")
		}
		pdf.SetFont("Arial", "", 8)
		if i < len(incomes) {
			pdf.SetXY(16, y)
			pdf.CellFormat(60, 6, pdfText(incomes[i].Name), "", 0, "L", false, 0, "")
			pdf.SetX(76)
			pdf.CellFormat(28, 6, rupiah(incomes[i].Amount), "", 0, "R", false, 0, "")
		}
		if i < len(deductions) {
			pdf.SetXY(106, y)
			pdf.CellFormat(60, 6, pdfText(deductions[i].Name), "", 0, "L", false, 0, "")
			pdf.SetX(166)
			pdf.CellFormat(28, 6, rupiah(deductions[i].Amount), "", 0, "R", false, 0, "")
		}
		y += 6
	}
	// Reserve enough space for the totals, the two-line Take Home Pay block,
	// and the footer. This keeps the footer on the same page only when the
	// actual layout has room for it.
	if y > 204 {
		pdf.AddPage()
		y = 25
	}
	pdf.SetFillColor(255, 247, 222)
	pdf.SetXY(16, y+2)
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(88, 9, "Total pendapatan", "", 0, "L", true, 0, "")
	pdf.SetX(76)
	pdf.CellFormat(28, 9, rupiah(payroll.TotalIncome), "", 0, "R", true, 0, "")
	pdf.SetX(106)
	pdf.CellFormat(88, 9, "Total pengurangan", "", 0, "L", true, 0, "")
	pdf.SetX(166)
	pdf.CellFormat(28, 9, rupiah(payroll.TotalDeduction), "", 1, "R", true, 0, "")
	y += 18
	pdf.SetFillColor(232, 245, 235)
	// Build the block as an invisible-border table: the left column has two
	// rows, while the right amount cell spans both rows.
	pdf.SetDrawColor(232, 245, 235)
	pdf.SetXY(16, y)
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(150, 10, "Take Home Pay", "1", 0, "LB", true, 0, "")
	pdf.SetFont("Arial", "", 7)
	pdf.SetXY(16, y+10)
	pdf.CellFormat(150, 10, takeHomePaySubtitle, "1", 0, "LT", true, 0, "")
	pdf.SetFont("Arial", "B", 12)
	pdf.SetXY(166, y)
	pdf.CellFormat(28, 20, rupiah(payroll.TakeHomePay), "1", 1, "R", true, 0, "")
	y += 31
	// Notes use MultiCell, so move the footer to a new page if the wrapped
	// note would otherwise run past the A4 bottom margin.
	pdf.SetFont("Arial", "", 8)
	noteLines := len(pdf.SplitLines([]byte(pdfText(payroll.Notes)), 80))
	footerContentHeight := 10
	if noteLines*5 > footerContentHeight {
		footerContentHeight = noteLines * 5
	}
	if y+7+float64(footerContentHeight) > 283 {
		pdf.AddPage()
		y = 20
	}
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(16, y)
	pdf.Cell(80, 5, "Catatan")
	pdf.Cell(50, 5, "Disetujui oleh:")
	pdf.Cell(48, 5, "Diterima oleh:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetXY(16, y+7)
	pdf.MultiCell(80, 5, pdfText(payroll.Notes), "", "L", false)
	pdf.SetXY(96, y+7)
	pdf.CellFormat(48, 5, pdfText(payroll.ApprovedByName), "", 1, "L", false, 0, "")
	pdf.SetX(96)
	pdf.CellFormat(48, 5, pdfText(payroll.ApprovedByPosition), "", 1, "L", false, 0, "")
	pdf.SetXY(144, y+7)
	pdf.CellFormat(50, 5, pdfText(payroll.ReceivedByName), "", 1, "L", false, 0, "")
	pdf.SetX(144)
	pdf.CellFormat(50, 5, pdfText(payroll.ReceivedByPosition), "", 1, "L", false, 0, "")
	if err := pdf.Output(bytesPDF); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat PDF slip gaji"})
	}
	filename := fmt.Sprintf("slip-gaji-%s-%s.pdf", strings.ReplaceAll(payroll.EmployeeCodeSnapshot, " ", "-"), payroll.PeriodeBulan.Format("2006-01"))
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	return c.Send(bytesPDF.Bytes())
}

func payrollHasComponent(items []models.PayrollItem, name string) bool {
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(item.Name), name) {
			return true
		}
	}
	return false
}
