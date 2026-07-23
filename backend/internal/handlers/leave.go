package handlers

import (
	"context"
	"fmt"
	"path/filepath"
	"strconv"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/middleware"
	"absensi-golan-backend/internal/models"
	"absensi-golan-backend/internal/utils"
	"absensi-golan-backend/pkg/minio"

	"github.com/gofiber/fiber/v2"
	miniogo "github.com/minio/minio-go/v7"
)

func SetupLeaveRoutes(router fiber.Router) {
	leave := router.Group("/leave", middleware.Protected())
	leave.Post("/", SubmitLeaveRequest)
	leave.Get("/", GetMyLeaveRequests)

	admin := router.Group("/admin/leave", middleware.Protected())
	admin.Get("/", GetAllLeaveRequests)
	admin.Get("/:id", GetLeaveRequestDetail)
	admin.Put("/:id/approve", ApproveRejectLeaveRequest)
}

func GetLeaveRequestDetail(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}
	var request models.LeaveRequest
	if err := config.DB.Preload("Employee.User").Preload("Employee.Department").Preload("Employee.Position").First(&request, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Leave request not found"})
	}
	return c.JSON(request)
}

func SubmitLeaveRequest(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	jenisIzin := c.FormValue("jenis_izin")
	tanggalMulaiStr := c.FormValue("tanggal_mulai")
	tanggalSelesaiStr := c.FormValue("tanggal_selesai")
	alasan := c.FormValue("alasan")
	if jenisIzin == "" || alasan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Jenis izin dan alasan wajib diisi"})
	}

	tglMulai, err := time.Parse("2006-01-02", tanggalMulaiStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tanggal_mulai format"})
	}

	tglSelesai, err := time.Parse("2006-01-02", tanggalSelesaiStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tanggal_selesai format"})
	}
	if tglSelesai.Before(tglMulai) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tanggal selesai tidak boleh lebih awal dari tanggal mulai"})
	}

	var lampiranURL string
	file, err := c.FormFile("lampiran")
	if err == nil && file != nil {
		src, err := file.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process file"})
		}
		defer src.Close()

		fileName := fmt.Sprintf("leave-%s-%d%s", employee.NIK, time.Now().Unix(), filepath.Ext(file.Filename))
		ctx := context.Background()
		_, err = minio.Client.PutObject(ctx, minio.BucketName, fileName, src, file.Size, miniogo.PutObjectOptions{
			ContentType: file.Header.Get("Content-Type"),
		})

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to upload file"})
		}

		cfg := config.LoadConfig()
		lampiranURL = fmt.Sprintf("http://%s/%s/%s", cfg.MinIOEndpoint, minio.BucketName, fileName)
	}

	leaveReq := models.LeaveRequest{
		EmployeeID:     employee.ID,
		JenisIzin:      jenisIzin,
		TanggalMulai:   tglMulai,
		TanggalSelesai: tglSelesai,
		Alasan:         alasan,
		LampiranURL:    lampiranURL,
		Status:         models.LeaveStatusPending,
	}

	if err := config.DB.Create(&leaveReq).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save leave request"})
	}
	utils.LogAction(userID, "CREATE", "LeaveRequest", leaveReq.ID, fmt.Sprintf("Pengajuan %s oleh %s", jenisIzin, employee.NIK))

	var hrdUsers []models.User
	if err := config.DB.Where("role = ?", models.RoleHRD).Find(&hrdUsers).Error; err == nil {
		for _, hrd := range hrdUsers {
			_ = utils.CreateNotification(config.DB, hrd.ID, models.RoleHRD, "Pengajuan Izin", "Pengajuan Izin Baru", fmt.Sprintf("Ada pengajuan %s baru dari %s", jenisIzin, employee.NIK))
		}
	}
	WsHub.Broadcast <- fiber.Map{"event": "leave_request_created"}

	return c.JSON(fiber.Map{
		"message": "Leave request submitted successfully",
		"data":    leaveReq,
	})
}

func GetMyLeaveRequests(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var employee models.Employee
	if err := config.DB.Where("user_id = ?", userID).First(&employee).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Employee profile not found"})
	}

	var requests []models.LeaveRequest
	if err := config.DB.Where("employee_id = ?", employee.ID).Order("created_at desc").Find(&requests).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leave requests"})
	}

	return c.JSON(requests)
}

func GetAllLeaveRequests(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var requests []models.LeaveRequest
	if err := config.DB.Preload("Employee.User").Order("created_at desc").Find(&requests).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch leave requests"})
	}

	return c.JSON(requests)
}

func ApproveRejectLeaveRequest(c *fiber.Ctx) error {
	role := c.Locals("role").(models.Role)
	if role != models.RoleHRD && role != models.RolePimpinan {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	adminID := c.Locals("user_id").(uint)

	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var req struct {
		Status string `json:"status"` // "Approved" or "Rejected"
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	var leaveReq models.LeaveRequest
	if err := config.DB.Preload("Employee.User").First(&leaveReq, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Leave request not found"})
	}

	if leaveReq.Status != models.LeaveStatusPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Request already processed"})
	}

	newStatus := models.LeaveStatus(req.Status)
	if newStatus != models.LeaveStatusApproved && newStatus != models.LeaveStatusRejected {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	leaveReq.Status = newStatus
	leaveReq.ApprovedBy = &adminID

	tx := config.DB.Begin()

	if err := tx.Save(&leaveReq).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update leave request"})
	}

	if newStatus == models.LeaveStatusApproved {
		// Update leave quota
		if leaveReq.JenisIzin == "Cuti Tahunan" {
			days := int(leaveReq.TanggalSelesai.Sub(leaveReq.TanggalMulai).Hours()/24) + 1

			var quota models.LeaveQuota
			if err := tx.Where("employee_id = ? AND jenis_cuti = ? AND tahun = ?", leaveReq.EmployeeID, "Cuti Tahunan", leaveReq.TanggalMulai.Year()).First(&quota).Error; err == nil {
				quota.SisaKuota -= days
				tx.Save(&quota)
			} else {
				quota = models.LeaveQuota{
					EmployeeID: leaveReq.EmployeeID,
					JenisCuti:  "Cuti Tahunan",
					Tahun:      leaveReq.TanggalMulai.Year(),
					SisaKuota:  12 - days,
				}
				tx.Create(&quota)
			}
		}

		// Sync Attendance Records for the leave period
		var attStatus models.AttendanceStatus
		if leaveReq.JenisIzin == "Cuti Tahunan" {
			attStatus = models.StatusCuti
		} else {
			attStatus = models.StatusIzin
		}

		for curr := leaveReq.TanggalMulai; !curr.After(leaveReq.TanggalSelesai); curr = curr.AddDate(0, 0, 1) {
			var attRecord models.AttendanceRecord
			err := tx.Where("employee_id = ? AND tanggal = ?", leaveReq.EmployeeID, curr).First(&attRecord).Error
			if err == nil {
				attRecord.Status = attStatus
				tx.Save(&attRecord)
			} else {
				attRecord = models.AttendanceRecord{
					EmployeeID: leaveReq.EmployeeID,
					Tanggal:    curr,
					Status:     attStatus,
				}
				tx.Create(&attRecord)
			}
		}
	}

	if err := utils.CreateNotification(tx, leaveReq.Employee.UserID, models.RoleKaryawan, "Status Pengajuan", "Status Pengajuan Izin", fmt.Sprintf("Pengajuan %s Anda telah %s", leaveReq.JenisIzin, string(newStatus))); err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create notification"})
	}

	tx.Commit()
	WsHub.Broadcast <- fiber.Map{"event": "leave_status_updated"}

	utils.LogAction(adminID, "UPDATE", "LeaveRequest", leaveReq.ID, fmt.Sprintf("Admin %s leave request for %s", newStatus, leaveReq.Employee.NIK))

	return c.JSON(fiber.Map{"message": "Leave request processed successfully", "status": newStatus})
}
