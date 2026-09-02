package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	auditutils "absensi-golan-backend/internal/utils"
	"absensi-golan-backend/pkg/jwt"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"log"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token   string      `json:"token"`
	Role    models.Role `json:"role"`
	Name    string      `json:"name"`
	Divisi  string      `json:"divisi"`
	Jabatan string      `json:"jabatan"`
}

const passwordResetOTPValidity = 5 * time.Minute
const passwordResetMaxAttempts = 5

func isHRD(c *fiber.Ctx) bool {
	role, ok := c.Locals("role").(models.Role)
	return ok && role == models.RoleHRD
}

func SetupAuthRoutes(router fiber.Router) {
	auth := router.Group("/auth")
	auth.Post("/login", Login)
	auth.Post("/logout", middleware.Protected(), Logout)
	auth.Post("/forgot-password", ForgotPassword)
	auth.Post("/forgot-password/resend", ResendPasswordOTP)
	auth.Post("/verify-password-otp", VerifyPasswordOTP)
	auth.Post("/reset-password", ResetPassword)
}

func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email dan password wajib diisi"})
	}

	var user models.User
	if err := config.DB.Preload("Employee.Division").Preload("Employee.Position").Where("LOWER(email) = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	if config.RedisClient != nil {
		sessionKey := fmt.Sprintf("active_session:%d", user.ID)
		oldToken, err := config.RedisClient.Get(config.Ctx, sessionKey).Result()
		if err == nil && oldToken != "" {
			config.RedisClient.Set(config.Ctx, "blacklist:"+oldToken, "true", 24*time.Hour)
		}
	}

	token, err := jwt.GenerateToken(&user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	if config.RedisClient != nil {
		sessionKey := fmt.Sprintf("active_session:%d", user.ID)
		config.RedisClient.Set(config.Ctx, sessionKey, token, 24*time.Hour)
	}

	auditutils.LogAction(user.ID, "LOGIN", "User", user.ID, "User berhasil login")

	divisi := "Belum Ditentukan"
	if user.Employee.Division.NamaDivisi != "" {
		divisi = user.Employee.Division.NamaDivisi
	}

	jabatan := "Belum Ditentukan"
	if user.Employee.Position.NamaJabatan != "" {
		jabatan = user.Employee.Position.NamaJabatan
	}

	return c.JSON(LoginResponse{
		Token:   token,
		Role:    user.Role,
		Name:    user.Nama,
		Divisi:  divisi,
		Jabatan: jabatan,
	})
}

func Logout(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Missing token"})
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

	// Set to Redis Blacklist for remaining TTL or fixed 24h
	if config.RedisClient != nil {
		config.RedisClient.Set(config.Ctx, "blacklist:"+tokenStr, "true", 24*time.Hour)
	}
	if userID, ok := c.Locals("user_id").(uint); ok {
		auditutils.LogAction(userID, "LOGOUT", "User", userID, "User berhasil logout")
		if config.RedisClient != nil {
			sessionKey := fmt.Sprintf("active_session:%d", userID)
			config.RedisClient.Del(config.Ctx, sessionKey)
		}
	}

	return c.JSON(fiber.Map{"message": "Logged out successfully"})
}

func ForgotPassword(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email wajib diisi"})
	}
	parsedEmail, emailErr := mail.ParseAddress(req.Email)
	if emailErr != nil || parsedEmail.Address != req.Email {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format email tidak valid"})
	}

	var user models.User
	if err := config.DB.Where("LOWER(email) = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Email tidak terdaftar"})
	}
	return issuePasswordResetOTP(c, user)
}

func issuePasswordResetOTP(c *fiber.Ctx, user models.User) error {
	code, err := randomOTP()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat kode OTP"})
	}
	reset := models.PasswordResetChallenge{UserID: user.ID, Email: user.Email, OTPHash: hashSecret(code), ExpiresAt: time.Now().Add(passwordResetOTPValidity), MaxAttempts: passwordResetMaxAttempts}
	// Only the newest challenge can be used.
	config.DB.Model(&models.PasswordResetChallenge{}).Where("user_id = ? AND used_at IS NULL", user.ID).Updates(map[string]interface{}{"used_at": time.Now()})
	if err := config.DB.Create(&reset).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan permintaan OTP"})
	}
	cfg := config.LoadConfig()
	if cfg.SMTPHost == "" || cfg.SMTPFrom == "" {
		if cfg.AppEnv != "development" {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Layanan email belum dikonfigurasi"})
		}
		return c.JSON(fiber.Map{"message": "Kode OTP berhasil dibuat. Periksa email Anda.", "email": maskEmail(user.Email), "mock_otp": code})
	}
	if err := sendPasswordResetEmail(cfg, user, code); err != nil {
		log.Printf("password reset OTP email failed for %s: %v", user.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengirim kode OTP ke email"})
	}
	return c.JSON(fiber.Map{"message": "Kode OTP telah dikirim ke email Anda.", "email": maskEmail(user.Email)})
}

func ResendPasswordOTP(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	parsedEmail, emailErr := mail.ParseAddress(req.Email)
	if emailErr != nil || parsedEmail.Address != req.Email {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format email tidak valid"})
	}
	var user models.User
	if err := config.DB.Where("LOWER(email) = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Email tidak terdaftar"})
	}
	var latest models.PasswordResetChallenge
	if config.DB.Where("user_id = ? AND used_at IS NULL", user.ID).Order("id DESC").First(&latest).Error == nil && time.Since(latest.CreatedAt) < time.Minute {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Tunggu 1 menit sebelum meminta kode OTP baru"})
	}
	return issuePasswordResetOTP(c, user)
}

func sendPasswordResetEmail(cfg *config.Config, user models.User, code string) error {
	if cfg.SMTPHost == "" || cfg.SMTPFrom == "" {
		return fmt.Errorf("SMTP belum dikonfigurasi")
	}

	message := strings.Join([]string{
		"To: " + user.Email,
		"Subject: Kode OTP Pemulihan Akun Golan",
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		"Halo " + user.Nama + ",",
		"",
		"Kode OTP pemulihan akun Anda adalah: " + code,
		"",
		"Kode ini berlaku selama 5 menit dan hanya dapat digunakan sekali.",
	}, "\r\n")

	var auth smtp.Auth
	if cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)
	}
	return smtp.SendMail(net.JoinHostPort(cfg.SMTPHost, cfg.SMTPPort), auth, cfg.SMTPFrom, []string{user.Email}, []byte(message))
}

func VerifyPasswordOTP(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.OTP = strings.TrimSpace(req.OTP)
	if len(req.OTP) != 6 || !isDigits(req.OTP) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Kode OTP harus terdiri dari 6 digit"})
	}
	var challenge models.PasswordResetChallenge
	if err := config.DB.Where("LOWER(email) = ? AND used_at IS NULL", req.Email).Order("id DESC").First(&challenge).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Kode OTP tidak valid atau sudah digunakan"})
	}
	if challenge.Attempts >= challenge.MaxAttempts {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Batas percobaan OTP terlampaui. Minta kode baru."})
	}
	if time.Now().After(challenge.ExpiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Kode OTP sudah kedaluwarsa. Minta kode baru."})
	}
	if hashSecret(req.OTP) != challenge.OTPHash {
		config.DB.Model(&challenge).UpdateColumn("attempts", challenge.Attempts+1)
		if challenge.Attempts+1 >= challenge.MaxAttempts {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Batas percobaan OTP terlampaui. Minta kode baru."})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Kode OTP salah"})
	}
	token, err := randomSecret()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat token pemulihan"})
	}
	now := time.Now()
	challenge.VerifiedAt = &now
	challenge.ResetTokenHash = hashSecret(token)
	expiry := now.Add(10 * time.Minute)
	challenge.ResetTokenExpiresAt = &expiry
	if err := config.DB.Save(&challenge).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memproses verifikasi OTP"})
	}
	return c.JSON(fiber.Map{"message": "OTP berhasil diverifikasi.", "reset_token": token})
}

func ResetPassword(c *fiber.Ctx) error {
	var req struct {
		Token       string `json:"reset_token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	req.Token = strings.TrimSpace(req.Token)
	if req.Token == "" || !validPassword(req.NewPassword) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token dan password minimal 8 karakter dengan huruf besar, huruf kecil, dan angka wajib diisi"})
	}

	var challenge models.PasswordResetChallenge
	if err := config.DB.Where("reset_token_hash = ? AND verified_at IS NOT NULL AND used_at IS NULL", hashSecret(req.Token)).First(&challenge).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token pemulihan tidak valid atau sudah digunakan"})
	}
	if challenge.ResetTokenExpiresAt == nil || time.Now().After(*challenge.ResetTokenExpiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token pemulihan sudah kedaluwarsa"})
	}
	var user models.User
	if err := config.DB.First(&user, challenge.UserID).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Akun tidak ditemukan"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	user.PasswordHash = string(hashed)
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&user).Error; err != nil {
			return err
		}
		now := time.Now()
		return tx.Model(&challenge).Updates(map[string]interface{}{"used_at": now, "reset_token_hash": ""}).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan password baru"})
	}

	return c.JSON(fiber.Map{"message": "Password berhasil diubah. Silakan login kembali."})
}

func hashSecret(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
func randomSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
func randomOTP() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", (uint32(b[0])<<24|uint32(b[1])<<16|uint32(b[2])<<8|uint32(b[3]))%1000000), nil
}
func isDigits(value string) bool {
	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
func validPassword(value string) bool {
	if len(value) < 8 {
		return false
	}
	var upper, lower, digit bool
	for _, r := range value {
		upper = upper || r >= 'A' && r <= 'Z'
		lower = lower || r >= 'a' && r <= 'z'
		digit = digit || r >= '0' && r <= '9'
	}
	return upper && lower && digit
}
func maskEmail(email string) string {
	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 {
		return ""
	}
	local := parts[0]
	if len(local) <= 2 {
		return "*" + "@" + parts[1]
	}
	return local[:2] + strings.Repeat("*", len(local)-2) + "@" + parts[1]
}
