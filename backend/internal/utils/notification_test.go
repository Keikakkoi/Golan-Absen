package utils

import (
	"regexp"
	"testing"

	"absensi-golan-backend/internal/models"
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestCreateAttendanceNotificationRespectsWFHSetting(t *testing.T) {
	tests := []struct {
		name       string
		inApp      bool
		wantInsert bool
	}{
		{name: "active", inApp: true, wantInsert: true},
		{name: "inactive", inApp: false, wantInsert: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			defer db.Close()
			gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{})
			if err != nil {
				t.Fatal(err)
			}

			mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "notification_settings" WHERE tipe_notifikasi = $1 AND role = $2 ORDER BY "notification_settings"."id" LIMIT 1`)).
				WithArgs("Kehadiran WFH", models.RoleHRD).
				WillReturnRows(sqlmock.NewRows([]string{"id", "is_in_app_enabled"}).AddRow(1, tt.inApp))
			if tt.wantInsert {
				mock.ExpectBegin()
				mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "notifications"`)).WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(10))
				mock.ExpectCommit()
			}

			err = CreateAttendanceNotification(gormDB, 7, models.RoleHRD, "Kehadiran WFH", "Kehadiran WFH Karyawan", "Nama; Jenis: WFH; Status: Hadir", 42)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestCreateAttendanceNotificationTreatsDuplicateAsAlreadyDelivered(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	gormDB, err := gorm.Open(postgres.New(postgres.Config{Conn: db}), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "notification_settings"`)).WillReturnRows(sqlmock.NewRows([]string{"id", "is_in_app_enabled"}).AddRow(1, true))
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "notifications"`)).WillReturnError(assertDuplicateError{})
	mock.ExpectRollback()

	if err := CreateAttendanceNotification(gormDB, 7, models.RoleHRD, "Kehadiran WFH", "Kehadiran WFH Karyawan", "message", 42); err != nil {
		t.Fatalf("duplicate should be treated as delivered: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

type assertDuplicateError struct{}

func (assertDuplicateError) Error() string { return "duplicate key value violates unique constraint" }
