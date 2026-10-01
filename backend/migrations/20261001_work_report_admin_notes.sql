-- Separate notes written by HRD/Admin from Manager review notes.
-- This migration is idempotent for installations that apply versioned SQL.
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS admin_note_by BIGINT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS admin_note_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_work_reports_admin_note_by ON work_reports(admin_note_by);
