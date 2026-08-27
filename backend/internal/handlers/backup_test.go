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
	data, err := removeSensitiveBackupFields([]byte(`{"data":{"users":[{"PasswordHash":"hash","ResetPasswordToken":"token","Nama":"Admin"}]}}`))
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	if strings.Contains(text, "hash") || strings.Contains(text, "token") || !strings.Contains(text, "Admin") {
		t.Fatalf("sensitive fields were not scrubbed: %s", text)
	}
}
