package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv            string
	AppPort           string
	JWTSecret         string
	DBHost            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBPort            string
	RedisHost         string
	RedisPort         string
	RedisPassword     string
	MinIOEndpoint     string
	MinIORootUser     string
	MinIORootPassword string
	MinIOUseSSL       bool
	MinIOBucketName   string
	SMTPHost          string
	SMTPPort          string
	SMTPUser          string
	SMTPPassword      string
	SMTPFrom          string
	FrontendURL       string
	VAPIDPublicKey    string
	VAPIDPrivateKey   string
	VAPIDSubject      string
}

func LoadConfig() *Config {
	err := godotenv.Load("../.env")
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	return &Config{
		AppEnv:            getEnv("APP_ENV", "development"),
		AppPort:           getEnv("APP_PORT", "8080"),
		JWTSecret:         getEnv("JWT_SECRET", "secret"),
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBUser:            getEnv("DB_USER", "postgres"),
		DBPassword:        getEnv("DB_PASSWORD", "postgres"),
		DBName:            getEnv("DB_NAME", "absensi_golan"),
		DBPort:            getEnv("DB_PORT", "5432"),
		RedisHost:         getEnv("REDIS_HOST", "localhost"),
		RedisPort:         getEnv("REDIS_PORT", "6379"),
		RedisPassword:     getEnv("REDIS_PASSWORD", ""),
		MinIOEndpoint:     getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIORootUser:     getEnv("MINIO_ROOT_USER", "admin"),
		MinIORootPassword: getEnv("MINIO_ROOT_PASSWORD", "admin123"),
		MinIOUseSSL:       getEnvAsBool("MINIO_USE_SSL", false),
		MinIOBucketName:   getEnv("MINIO_BUCKET_NAME", "golan-attendance"),
		SMTPHost:          getEnv("SMTP_HOST", ""),
		SMTPPort:          getEnv("SMTP_PORT", "587"),
		SMTPUser:          getEnv("SMTP_USER", ""),
		SMTPPassword:      getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:          getEnv("SMTP_FROM", ""),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:4200"),
		VAPIDPublicKey:    getEnv("VAPID_PUBLIC_KEY", ""),
		VAPIDPrivateKey:   getEnv("VAPID_PRIVATE_KEY", ""),
		VAPIDSubject:      getEnv("VAPID_SUBJECT", "mailto:admin@example.com"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvAsBool(key string, fallback bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		return value == "true"
	}
	return fallback
}
