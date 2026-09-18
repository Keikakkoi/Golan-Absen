package handlers

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newWorkReportDeleteTestDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	if err != nil {
		sqlDB.Close()
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Error(err)
		}
		sqlDB.Close()
	})
	return db, mock
}

func expectWorkReportDelete(mock sqlmock.Sqlmock, reportID uint, rows *sqlmock.Rows) {
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT \* FROM "work_report_attachments" WHERE work_report_id = \$1`).
		WithArgs(reportID).WillReturnRows(rows)
	mock.ExpectExec(`DELETE FROM work_report_attachments WHERE work_report_id = \$1`).
		WithArgs(reportID).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`INSERT INTO work_report_deletions \(created_at, updated_at, employee_id, tanggal\)`).
		WithArgs(uint(7), time.Date(2026, 9, 10, 0, 0, 0, 0, time.UTC)).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(`DELETE FROM "work_reports" WHERE "work_reports"\."id" = \$1`).
		WithArgs(reportID).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
}

func TestDeleteWorkReportDataWithoutAttachments(t *testing.T) {
	db, mock := newWorkReportDeleteTestDB(t)
	expectWorkReportDelete(mock, 10, sqlmock.NewRows([]string{"id", "work_report_id", "storage_key"}))

	attachments, err := deleteWorkReportData(db, 10, 7, time.Date(2026, 9, 10, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("delete without attachments failed: %v", err)
	}
	if len(attachments) != 0 {
		t.Fatalf("expected no attachments, got %d", len(attachments))
	}
}

func TestDeleteWorkReportDataWithAttachmentsDeletesChildrenFirst(t *testing.T) {
	db, mock := newWorkReportDeleteTestDB(t)
	expectWorkReportDelete(mock, 11, sqlmock.NewRows([]string{"id", "work_report_id", "storage_key"}).
		AddRow(21, 11, "work-reports/employee/screenshot.png"))

	attachments, err := deleteWorkReportData(db, 11, 7, time.Date(2026, 9, 10, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("delete with attachments failed: %v", err)
	}
	if len(attachments) != 1 || attachments[0].StorageKey != "work-reports/employee/screenshot.png" {
		t.Fatalf("expected attachment storage key to be returned for cleanup, got %#v", attachments)
	}
}
