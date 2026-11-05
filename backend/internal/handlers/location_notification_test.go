package handlers

import (
	"errors"
	"regexp"
	"strings"
	"testing"
	"time"

	"absensi-golan-backend/config"
	"absensi-golan-backend/internal/models"
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newLocationNotificationTestDB(t *testing.T) (sqlmock.Sqlmock, func()) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("create sqlmock: %v", err)
	}
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	if err != nil {
		_ = sqlDB.Close()
		t.Fatalf("open sqlmock gorm db: %v", err)
	}
	previous := config.DB
	config.DB = db
	return mock, func() {
		config.DB = previous
		_ = sqlDB.Close()
	}
}

func expectInAppNotification(t *testing.T, mock sqlmock.Sqlmock, role models.Role, notificationID uint) {
	t.Helper()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "notification_settings" WHERE tipe_notifikasi = $1 AND role = $2 ORDER BY "notification_settings"."id" LIMIT 1`)).
		WithArgs(sqlmock.AnyArg(), role).
		WillReturnRows(sqlmock.NewRows([]string{"id", "is_in_app_enabled"}).AddRow(1, true))
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "notifications"`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(notificationID))
	mock.ExpectCommit()
}

func TestAlternativeLocationSubmissionNotifiesEveryHRDOnly(t *testing.T) {
	mock, cleanup := newLocationNotificationTestDB(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE role = $1`)).
		WithArgs(models.RoleHRD).
		WillReturnRows(sqlmock.NewRows([]string{"id", "nama", "email", "role"}).
			AddRow(10, "HRD Satu", "hrd1@example.com", models.RoleHRD).
			AddRow(11, "HRD Dua", "hrd2@example.com", models.RoleHRD))
	expectInAppNotification(t, mock, models.RoleHRD, 101)
	expectInAppNotification(t, mock, models.RoleHRD, 102)

	notifyAlternativeLocationSubmission(models.AlternativeLocation{Model: models.Model{ID: 7}}, models.User{Model: models.Model{ID: 42}, Nama: "Pemohon"})
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestAlternativeLocationDecisionNotificationTargetsOwnerAndIncludesRejectionReason(t *testing.T) {
	decidedAt := time.Date(2026, 11, 5, 10, 30, 0, 123, time.FixedZone("Asia/Jakarta", 7*60*60))
	row := models.AlternativeLocation{
		Model:           models.Model{ID: 7},
		UserID:          42,
		User:            models.User{Model: models.Model{ID: 42}, Role: models.RoleKaryawan},
		NamaLokasi:      "Rumah",
		RejectionReason: "Koordinat tidak sesuai",
		RejectedAt:      &decidedAt,
	}
	title, message, key, ok := alternativeLocationDecisionNotificationPayload(row, false)
	if !ok || title != "Pengajuan Lokasi Alternatif Ditolak" || !strings.Contains(message, "Rumah") || !strings.Contains(message, "Koordinat tidak sesuai") {
		t.Fatalf("unexpected rejection notification payload: title=%q message=%q key=%q", title, message, key)
	}
	if want := "alternative-location-decision:7:rejected:" + decidedAt.Format(time.RFC3339Nano); key != want {
		t.Fatalf("unexpected rejection idempotency key: got %q want %q", key, want)
	}

	mock, cleanup := newLocationNotificationTestDB(t)
	defer cleanup()
	expectInAppNotification(t, mock, models.RoleKaryawan, 103)
	notifyAlternativeLocationDecision(row, false)
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}

	approvedAt := decidedAt.Add(time.Minute)
	approvedRow := row
	approvedRow.RejectionReason = ""
	approvedRow.RejectedAt = nil
	approvedRow.ApprovedAt = &approvedAt
	title, message, key, ok = alternativeLocationDecisionNotificationPayload(approvedRow, true)
	if !ok || title != "Pengajuan Lokasi Alternatif Disetujui" || !strings.Contains(message, "Rumah") || !strings.Contains(message, "dapat digunakan untuk check-in") {
		t.Fatalf("unexpected approval notification payload: title=%q message=%q key=%q", title, message, key)
	}
	if want := "alternative-location-decision:7:approved:" + approvedAt.Format(time.RFC3339Nano); key != want {
		t.Fatalf("unexpected approval idempotency key: got %q want %q", key, want)
	}

	mock, cleanup = newLocationNotificationTestDB(t)
	defer cleanup()
	expectInAppNotification(t, mock, models.RoleKaryawan, 104)
	notifyAlternativeLocationDecision(approvedRow, true)
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestAlternativeLocationNotificationFailureIsBestEffort(t *testing.T) {
	mock, cleanup := newLocationNotificationTestDB(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE role = $1`)).
		WithArgs(models.RoleHRD).
		WillReturnError(gorm.ErrInvalidDB)

	// A notification lookup failure must be swallowed so the saved business
	// operation remains successful, matching the handler's best-effort contract.
	notifyAlternativeLocationSubmission(models.AlternativeLocation{Model: models.Model{ID: 7}}, models.User{Nama: "Pemohon"})
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestAlternativeLocationDecisionRetryDoesNotCreateDuplicate(t *testing.T) {
	decidedAt := time.Date(2026, 11, 5, 11, 0, 0, 0, time.UTC)
	row := models.AlternativeLocation{
		Model:      models.Model{ID: 8},
		UserID:     42,
		User:       models.User{Role: models.RoleMagang},
		NamaLokasi: "Kos",
		ApprovedAt: &decidedAt,
	}
	mock, cleanup := newLocationNotificationTestDB(t)
	defer cleanup()
	expectInAppNotification(t, mock, models.RoleMagang, 105)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "notification_settings" WHERE tipe_notifikasi = $1 AND role = $2 ORDER BY "notification_settings"."id" LIMIT 1`)).
		WithArgs(sqlmock.AnyArg(), models.RoleMagang).
		WillReturnRows(sqlmock.NewRows([]string{"id", "is_in_app_enabled"}).AddRow(1, true))
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "notifications"`)).
		WillReturnError(errors.New("duplicate key value violates unique constraint"))
	mock.ExpectRollback()

	notifyAlternativeLocationDecision(row, true)
	notifyAlternativeLocationDecision(row, true)
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
