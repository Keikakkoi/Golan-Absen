-- Revision deadlines are calculated from rejected_at + 24 hours. These
-- columns retain the latest revision submitter while the audit table keeps
-- every rejection/revision cycle.
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS revision_submitted_by BIGINT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS revision_submitted_at TIMESTAMP;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS revision_pending BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_work_reports_revision_submitted_by
  ON work_reports(revision_submitted_by);
CREATE INDEX IF NOT EXISTS idx_work_reports_revision_pending
  ON work_reports(revision_pending);

CREATE TABLE IF NOT EXISTS work_report_revision_audits (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  work_report_id BIGINT NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
  rejected_by BIGINT,
  rejected_at TIMESTAMP,
  rejection_source VARCHAR(20) NOT NULL,
  rejection_reason TEXT NOT NULL,
  revision_submitted_by BIGINT,
  revision_submitted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_report_revision_audits_report
  ON work_report_revision_audits(work_report_id);
