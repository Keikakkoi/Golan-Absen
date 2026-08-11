package handlers

import (
	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	auditutils "absensi-golan-backend/internal/utils"
	"absensi-golan-backend/pkg/jwt"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"log"
	"net"
	"net/smtp"
	"net/url"
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

func isHRD(c *fiber.Ctx) bool {
	role, ok := c.Locals("role").(models.Role)
	return ok && role == models.RoleHRD
}

func SetupAuthRoutes(router fiber.Router) {
	auth := router.Group("/auth")
	auth.Post("/login", Login)
	auth.Post("/logout", middleware.Protected(), Logout)
	auth.Post("/forgot-password", ForgotPassword)
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

	var user models.User
	if err := config.DB.Where("LOWER(email) = ?", req.Email).First(&user).Error; err != nil {
		// Do not leak existence of user, just say email sent
		return c.JSON(fiber.Map{"message": "If the email is registered, a reset link will be sent."})
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal membuat token reset"})
	}
	token := hex.EncodeToString(b)

	user.ResetPasswordToken = token
	user.ResetPasswordExpiry = time.Now().Add(1 * time.Hour)
	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan permintaan reset"})
	}

	cfg := config.LoadConfig()
	response := fiber.Map{"message": "Jika email terdaftar, link reset password akan dikirim."}
	if cfg.AppEnv == "development" {
		// Development mode exposes the token so the flow can be tested without SMTP.
		response["mock_token"] = token
	} else if err := sendPasswordResetEmail(cfg, user, token); err != nil {
		log.Printf("password reset email failed for %s: %v", user.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengirim email reset password"})
	}
	return c.JSON(response)
}

func sendPasswordResetEmail(cfg *config.Config, user models.User, token string) error {
	if cfg.SMTPHost == "" || cfg.SMTPFrom == "" {
		return fmt.Errorf("SMTP belum dikonfigurasi")
	}

	resetLink := strings.TrimRight(cfg.FrontendURL, "/") + "/reset-password?token=" + url.QueryEscape(token)
	message := strings.Join([]string{
		"To: " + user.Email,
		"Subject: Reset Password Sistem Absensi Golan",
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		"Halo " + user.Nama + ",",
		"",
		"Gunakan link berikut untuk membuat password baru:",
		resetLink,
		"",
		"Link ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.",
	}, "\r\n")

	var auth smtp.Auth
	if cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)
	}
	return smtp.SendMail(net.JoinHostPort(cfg.SMTPHost, cfg.SMTPPort), auth, cfg.SMTPFrom, []string{user.Email}, []byte(message))
}

func ResetPassword(c *fiber.Ctx) error {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}
	req.Token = strings.TrimSpace(req.Token)
	if req.Token == "" || len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token dan password minimal 8 karakter wajib diisi"})
	}

	var user models.User
	if err := config.DB.Where("reset_password_token = ?", req.Token).First(&user).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid or expired token"})
	}

	if time.Now().After(user.ResetPasswordExpiry) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token has expired"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	user.PasswordHash = string(hashed)
	user.ResetPasswordToken = ""
	user.ResetPasswordExpiry = time.Time{}
	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal menyimpan password baru"})
	}

	return c.JSON(fiber.Map{"message": "Password berhasil diubah. Silakan login kembali."})
}
