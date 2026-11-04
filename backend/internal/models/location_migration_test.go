package models

import (
	"os"
	"strings"
	"testing"
)

func TestLocationMigrationIsAdditiveAndRerunnable(t *testing.T) {
	sqlBytes, err := os.ReadFile("../../migrations/20261103_alternative_and_field_locations.sql")
	if err != nil {
		t.Fatalf("read location migration: %v", err)
	}
	sql := strings.ToLower(string(sqlBytes))
	for _, statement := range []string{
		"create table if not exists alternative_locations",
		"create table if not exists field_locations",
		"create unique index if not exists idx_alternative_locations_user_name_active",
		"create unique index if not exists idx_field_locations_name_active",
		"alter table work_types add column if not exists canonical_type",
		"alter table attendance_records add column if not exists alternative_location_id",
		"attendance_records_alternative_location_id_fkey",
		"attendance_records_field_location_id_fkey",
		"alternative_locations_validation_method_check",
		"field_locations_validation_method_check",
		"deleted_at",
	} {
		if !strings.Contains(sql, statement) {
			t.Errorf("migration is missing additive contract %q", statement)
		}
	}
	for _, destructive := range []string{"drop table", "delete from attendance_records", "truncate attendance_records"} {
		if strings.Contains(sql, destructive) {
			t.Errorf("migration must not contain destructive history operation %q", destructive)
		}
	}
}
