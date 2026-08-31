package handlers

import (
	"strings"
	"testing"
)

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
