package main

import (
	"log"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/handlers"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/pkg/minio"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	cfg := config.LoadConfig()

	// Init DB
	config.ConnectDB(cfg)
	config.ConnectRedis()

	// Init MinIO
	minio.SetupMinIO(cfg)

	app := fiber.New(fiber.Config{
		BodyLimit: 10 * 1024 * 1024, // 10MB limit for image uploads
	})

	app.Use(logger.New())
	app.Use(cors.New())

	api := app.Group("/api/v1")

	// Setup Routes
	handlers.SetupAuthRoutes(api)

	// Pimpinan (Executive) routes
	executiveGroup := api.Group("/executive")
	executiveGroup.Use(middleware.Protected())
	// Role check middleware for Pimpinan can be added here
	executiveGroup.Get("/dashboard", handlers.GetExecutiveDashboard)
	executiveGroup.Get("/departments/stats", handlers.GetDepartmentStats)
	executiveGroup.Get("/departments/comparison", handlers.GetDepartmentComparison)
	executiveGroup.Get("/reports/employees", handlers.GetExecutiveReports)
	executiveGroup.Get("/reports/export", handlers.ExportExecutiveReportsCSV)

	handlers.SetupAttendanceRoutes(api)
	handlers.SetupEmployeeRoutes(api)
	handlers.SetupLeaveRoutes(api)
	handlers.SetupNotificationRoutes(api)
	handlers.SetupReportRoutes(api)
	handlers.SetupWorkTypeRoutes(api)
	handlers.SetupSettingsRoutes(api)
	handlers.SetupOrganizationRoutes(api)
	handlers.SetupHolidayRoutes(api)
	handlers.SetupRBACRoutes(api)
	handlers.SetupAdminDirectoryRoutes(api)
	handlers.SetupWebSocketRoutes(app) // Note: attaching to root app, not just /api/v1 if we want it outside, but let's keep it clean

	log.Printf("Server listening on port %s", cfg.AppPort)
	log.Fatal(app.Listen(":" + cfg.AppPort))
}
