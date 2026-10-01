-- Idempotent rejection audit fields for work reports and internship logbooks.
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS rejected_by BIGINT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS rejection_source VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_work_reports_rejected_by ON work_reports(rejected_by);
