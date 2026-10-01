-- Keep the regular work-report filling state separate from the internship
-- logbook review state stored in status_logbook.
ALTER TABLE work_reports
    ADD COLUMN IF NOT EXISTS status_laporan VARCHAR(20);

-- Existing rows are historical submissions. Empty automatic marker rows remain
-- identifiable through status_sesuai and are excluded from compliance counts.
UPDATE work_reports
SET status_laporan = 'submitted'
WHERE status_laporan IS NULL OR BTRIM(status_laporan) = '';

ALTER TABLE work_reports
    ALTER COLUMN status_laporan SET DEFAULT 'submitted',
    ALTER COLUMN status_laporan SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_reports_status_laporan
    ON work_reports(status_laporan);
