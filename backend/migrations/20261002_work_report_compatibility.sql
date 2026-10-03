-- Introduce an explicit discriminator without removing any legacy logbook
-- columns or changing the meaning of historical status_logbook values.
ALTER TABLE work_reports
    ADD COLUMN IF NOT EXISTS report_kind VARCHAR(30);

-- Before this migration, internship submissions were written through the
-- /internship/logbooks workflow and employee reports through /work-reports.
-- Classify existing MAGANG rows as legacy so their review history remains
-- readable through the compatibility adapter.
UPDATE work_reports wr
SET report_kind = 'legacy_logbook'
FROM employees e
JOIN users u ON u.id = e.user_id
WHERE wr.employee_id = e.id
  AND (wr.report_kind IS NULL OR BTRIM(wr.report_kind) = '')
  AND u.role = 'MAGANG'
  AND LOWER(COALESCE(NULLIF(BTRIM(wr.status_logbook), ''), 'submitted'))
      IN ('draft', 'submitted', 'approved', 'rejected');

UPDATE work_reports
SET report_kind = 'work_report'
WHERE report_kind IS NULL OR BTRIM(report_kind) = '';

ALTER TABLE work_reports
    ALTER COLUMN report_kind SET DEFAULT 'work_report',
    ALTER COLUMN report_kind SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_reports_report_kind
    ON work_reports(report_kind);
