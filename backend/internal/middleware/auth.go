package middleware

import (
	"fmt"
	"strings"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/pkg/jwt"
	"github.com/gofiber/fiber/v2"
	gojwt "github.com/golang-jwt/jwt/v5"
)

func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		cfg := config.LoadConfig()

		claims := &jwt.Claims{}
		token, err := gojwt.ParseWithClaims(tokenStr, claims, func(token *gojwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token"})
		}

		// Check Redis Blacklist & Single Active Session
		if config.RedisClient != nil {
			val, _ := config.RedisClient.Get(config.Ctx, "blacklist:"+tokenStr).Result()
			if val == "true" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token has been revoked (Logged out or logged in on another device)"})
			}

			sessionKey := fmt.Sprintf("active_session:%d", claims.UserID)
			activeToken, err := config.RedisClient.Get(config.Ctx, sessionKey).Result()
			if err == nil && activeToken != "" && activeToken != tokenStr {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token has been replaced by a newer session"})
			}
		}

		// The token is used to authenticate the user, but its role may be stale
		// after an administrator changes the account. Resolve the current role
		// from the database so authorization does not randomly return 403 until
		// the user logs in again.
		var user models.User
		if err := config.DB.Select("id", "role", "status").First(&user, claims.UserID).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User account not found"})
		}
		if strings.TrimSpace(user.Status) != "" && !strings.EqualFold(strings.TrimSpace(user.Status), "aktif") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User account is inactive"})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("role", user.Role)
		return c.Next()
	}
}

// RequireRoles is the backend counterpart of the frontend role guard. It is
// intentionally applied to every role-specific route so hiding a menu cannot
// be mistaken for authorization.
func RequireRoles(roles ...models.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		current, ok := c.Locals("role").(models.Role)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Role is missing"})
		}
		for _, allowed := range roles {
			if current == allowed {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied for this role"})
	}
}
