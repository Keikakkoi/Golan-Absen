package handlers

import (
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newRestoreTestDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{SkipDefaultTransaction: true})
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

const auditLogRestoreRow = `{"ID":1,"CreatedAt":"2026-01-01T00:00:00Z","UpdatedAt":"2026-01-01T00:00:00Z","UserID":7,"User":{"ID":7,"Nama":"nested user"},"Action":"LOGIN","TableName":"users","RecordID":7,"ChangesDetail":"restored"}`

func TestRestoreGenericCollectionAuditLogsAddSkipsExistingID(t *testing.T) {
	db, mock := newRestoreTestDB(t)
	mock.ExpectQuery(`SELECT \* FROM "audit_logs"`).WithArgs(uint(1)).WillReturnRows(
		sqlmock.NewRows([]string{"id"}).AddRow(1),
	)

	collection := restoreGenericCollection(db, "audit_logs", []byte("["+auditLogRestoreRow+"]"))
	count, err := collection.restore(collection.rows, "add")
	if err != nil || count != 1 {
		t.Fatalf("audit log add restore failed: count=%d err=%v", count, err)
	}
}

func TestRestoreGenericCollectionAuditLogsOverwriteUpdatesExistingID(t *testing.T) {
	db, mock := newRestoreTestDB(t)
	mock.ExpectQuery(`SELECT \* FROM "audit_logs"`).WithArgs(uint(1)).WillReturnRows(
		sqlmock.NewRows([]string{"id"}).AddRow(1),
	)
	mock.ExpectExec(`UPDATE "audit_logs"`).WillReturnResult(sqlmock.NewResult(1, 1))

	collection := restoreGenericCollection(db, "audit_logs", []byte("["+auditLogRestoreRow+"]"))
	count, err := collection.restore(collection.rows, "overwrite")
	if err != nil || count != 1 {
		t.Fatalf("audit log overwrite restore failed: count=%d err=%v", count, err)
	}
}

func TestRestoreGenericCollectionAuditLogsFailureRollsBack(t *testing.T) {
	db, mock := newRestoreTestDB(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT \* FROM "audit_logs"`).WithArgs(uint(1)).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectQuery(`INSERT INTO "audit_logs"`).WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectRollback()

	collection := restoreGenericCollection(db, "audit_logs", []byte("["+auditLogRestoreRow+`,"invalid"]`))
	err := db.Transaction(func(tx *gorm.DB) error {
		transactionCollection := restoreGenericCollection(tx, "audit_logs", collection.rows)
		_, err := transactionCollection.restore(transactionCollection.rows, "overwrite")
		return err
	})
	if err == nil {
		t.Fatal("invalid audit log must fail the restore")
	}
}

func TestRestoreGenericCollectionSupportsAuditLogs(t *testing.T) {
	db, mock := newRestoreTestDB(t)
	collection := restoreGenericCollection(db, "audit_logs", []byte("["+auditLogRestoreRow+"]"))
	if collection.key != "audit_logs" {
		t.Fatalf("audit_logs is not registered for generic restore: %q", collection.key)
	}
	mock.ExpectQuery(`SELECT \* FROM "audit_logs"`).WithArgs(uint(1)).WillReturnRows(
		sqlmock.NewRows([]string{"id"}).AddRow(1),
	)
	mock.ExpectExec(`UPDATE "audit_logs"`).WillReturnResult(sqlmock.NewResult(1, 1))
	if _, err := collection.restore(collection.rows, "full"); err != nil {
		t.Fatalf("full mode should be accepted for audit_logs: %v", err)
	}
}

func TestRequestedBackupModules(t *testing.T) {
	modules, tables, err := requestedBackupModules("karyawan,organisasi-jabatan")
	if err != nil || len(modules) != 2 || !tables["users"] || !tables["employees"] || !tables["divisions"] || !tables["positions"] {
		t.Fatalf("selected modules were not expanded safely: modules=%v tables=%v err=%v", modules, tables, err)
	}
	if _, _, err = requestedBackupModules("modul-tidak-ada"); err == nil {
		t.Fatal("unknown module must be rejected")
	}
}

func TestRemoveSensitiveBackupFields(t *testing.T) {
	data, err := removeSensitiveBackupFields([]byte(`{"data":{"users":[{"PasswordHash":"$2a$10$bcrypt-hash","Password":"plain","password_hash":"legacy","ResetPasswordToken":"token","ApiSecret":"secret","Credential":"credential","Nama":"Admin"}]}}`))
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	if !strings.Contains(text, `"PasswordHash":"$2a$10$bcrypt-hash"`) || strings.Contains(text, "plain") || strings.Contains(text, "legacy") || strings.Contains(text, "token") || strings.Contains(text, "secret") || strings.Contains(text, "credential") || !strings.Contains(text, "Admin") {
		t.Fatalf("sensitive fields were not scrubbed: %s", text)
	}
}

func TestRestoredPasswordHash(t *testing.T) {
	const existing = "$2a$10$old-bcrypt-hash"
	if got := restoredPasswordHash("", existing); got != existing {
		t.Fatalf("empty backup hash must preserve existing hash: got %q", got)
	}
	if got := restoredPasswordHash("   ", existing); got != existing {
		t.Fatalf("whitespace backup hash must preserve existing hash: got %q", got)
	}
	const replacement = "$2a$10$new-bcrypt-hash"
	if got := restoredPasswordHash(replacement, existing); got != replacement {
		t.Fatalf("non-empty backup hash must replace existing hash: got %q", got)
	}
	if got := restoredPasswordHash("", ""); got != "" {
		t.Fatalf("empty existing hash must remain empty when no backup hash exists: got %q", got)
	}
}
