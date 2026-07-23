package middleware

import (
	"strings"

	"absensi-golan-backend/config"
	"absensi-golan-backend/pkg/jwt"
	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/gofiber/fiber/v2"
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

		// Check Redis Blacklist
		if config.RedisClient != nil {
			val, _ := config.RedisClient.Get(config.Ctx, "blacklist:"+tokenStr).Result()
			if val == "true" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token has been revoked (Logged out)"})
			}
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("role", claims.Role)
		return c.Next()
	}
}
