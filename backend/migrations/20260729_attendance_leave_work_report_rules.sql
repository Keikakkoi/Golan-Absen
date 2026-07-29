-- Configurable attendance, leave eligibility, and work-report compliance rules.
-- The API also runs GORM AutoMigrate on startup; this file is for installations
-- that apply versioned SQL migrations separately.

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS late_duration_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_checkout_missing BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE attendance_records SET is_late = TRUE WHERE status = 'Terlambat' AND is_late = FALSE;
UPDATE attendance_records
SET late_duration_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (jam_masuk - ((tanggal + TIME '09:00:00') AT TIME ZONE 'Asia/Jakarta'))) / 60))::INTEGER
WHERE status = 'Terlambat' AND jam_masuk IS NOT NULL AND late_duration_minutes = 0;

ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS jenis_izin VARCHAR(50);
UPDATE leave_requests SET jenis_izin = 'Lainnya' WHERE jenis_izin IN ('Izin', 'Izin Darurat', 'Izin (Keperluan Pribadi)');
UPDATE leave_requests SET jenis_izin = 'Cuti' WHERE jenis_izin IN ('Cuti Tahunan', 'Cuti');
UPDATE leave_requests SET jenis_izin = 'Sakit' WHERE jenis_izin = 'Sakit';

ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS is_late_submission BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS general_settings (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    minimum_masa_kerja_cuti_bulan INTEGER NOT NULL DEFAULT 3,
    batas_laporan_setelah_checkout_jam INTEGER NOT NULL DEFAULT 1
);

INSERT INTO general_settings (created_at, updated_at, minimum_masa_kerja_cuti_bulan, batas_laporan_setelah_checkout_jam)
SELECT NOW(), NOW(), 3, 1
WHERE NOT EXISTS (SELECT 1 FROM general_settings);

CREATE TABLE IF NOT EXISTS work_report_attachments (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    work_report_id BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(80) NOT NULL,
    file_size BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_is_late ON attendance_records(is_late);
CREATE INDEX IF NOT EXISTS idx_attendance_records_is_checkout_missing ON attendance_records(is_checkout_missing);
CREATE INDEX IF NOT EXISTS idx_work_report_attachments_report_id ON work_report_attachments(work_report_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_is_late_submission ON work_reports(is_late_submission);
