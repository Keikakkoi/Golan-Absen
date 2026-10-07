-- Keep Manager review and HRD/Admin validation independent. The historical
-- fields (status_sesuai, reviewed_by, review_notes, rejection_reason) remain
-- untouched and continue to be exposed for older clients.
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS manager_review_status VARCHAR(20);
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS manager_reviewed_by BIGINT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMP;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS manager_review_notes TEXT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS manager_rejection_reason TEXT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS admin_validation_status VARCHAR(20);
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS admin_validated_by BIGINT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS admin_validated_at TIMESTAMP;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;

-- Existing canonical reports were historically sent directly to HRD/Admin.
-- Preserve their decision as the admin decision and do not invent a Manager
-- approval. Historical internship logbooks retain status_logbook as the
-- Manager-compatible decision.
UPDATE work_reports wr
SET manager_review_status = CASE
    WHEN COALESCE(NULLIF(BTRIM(wr.report_kind), ''), 'work_report') = 'legacy_logbook'
         AND LOWER(COALESCE(NULLIF(BTRIM(wr.status_logbook), ''), 'submitted')) = 'approved' THEN 'approved'
    WHEN COALESCE(NULLIF(BTRIM(wr.report_kind), ''), 'work_report') = 'legacy_logbook'
         AND LOWER(COALESCE(NULLIF(BTRIM(wr.status_logbook), ''), 'submitted')) = 'rejected' THEN 'rejected'
    WHEN COALESCE(NULLIF(BTRIM(wr.report_kind), ''), 'work_report') = 'legacy_logbook'
         AND LOWER(COALESCE(NULLIF(BTRIM(wr.status_logbook), ''), 'submitted')) = 'submitted' THEN 'pending'
    ELSE 'not_required'
END
WHERE wr.manager_review_status IS NULL OR BTRIM(wr.manager_review_status) = '';

UPDATE work_reports
SET admin_validation_status = CASE
    WHEN LOWER(BTRIM(COALESCE(status_sesuai, ''))) = 'sesuai' THEN 'approved'
    WHEN LOWER(BTRIM(COALESCE(status_sesuai, ''))) IN ('tidak sesuai', 'ditolak', 'minta perbaikan', 'minta_perbaikan') THEN 'rejected'
    WHEN manager_review_status = 'approved' THEN 'pending'
    ELSE 'not_required'
END
WHERE admin_validation_status IS NULL OR BTRIM(admin_validation_status) = '';

-- Legacy logbooks from people without a resolvable Manager go straight to
-- HRD/Admin. TeamID is the same fallback used by the application router.
UPDATE work_reports wr
SET manager_review_status = 'not_required'
FROM employees e
JOIN users u ON u.id = e.user_id
WHERE wr.employee_id = e.id
  AND wr.manager_review_status = 'pending'
  AND COALESCE(NULLIF(BTRIM(wr.report_kind), ''), 'work_report') = 'legacy_logbook'
  AND LOWER(COALESCE(NULLIF(BTRIM(wr.status_logbook), ''), 'submitted')) = 'submitted'
  AND NOT EXISTS (
      SELECT 1 FROM users m
      WHERE m.role = 'MANAJER' AND m.status = 'aktif'
        AND (m.id = u.manager_id OR (u.manager_id IS NULL AND BTRIM(COALESCE(u.team_id, '')) <> '' AND m.team_id = u.team_id))
  );

-- Karyawan reports always enter the Manager queue. A missing Manager is left
-- pending (and therefore cannot be validated by HRD/Admin) until the
-- organization assigns one; historical final decisions remain untouched.
UPDATE work_reports wr
SET manager_review_status = 'pending',
    admin_validation_status = 'not_required'
FROM employees e
JOIN users u ON u.id = e.user_id
WHERE wr.employee_id = e.id
  AND u.role = 'Karyawan'
  AND COALESCE(NULLIF(BTRIM(wr.report_kind), ''), 'work_report') = 'work_report'
  AND LOWER(COALESCE(NULLIF(BTRIM(wr.status_laporan), ''), 'submitted')) = 'submitted'
  AND LOWER(BTRIM(COALESCE(wr.status_sesuai, ''))) NOT IN ('sesuai', 'tidak sesuai', 'ditolak', 'minta perbaikan', 'minta_perbaikan')
;

UPDATE work_reports
SET admin_validation_status = 'pending'
WHERE admin_validation_status = 'not_required'
  AND manager_review_status <> 'pending'
  AND LOWER(COALESCE(NULLIF(BTRIM(status_laporan), ''), 'submitted')) = 'submitted'
  AND LOWER(BTRIM(COALESCE(status_sesuai, ''))) NOT IN ('sesuai', 'tidak sesuai', 'ditolak', 'minta perbaikan', 'minta_perbaikan', 'tidak membuat laporan kerja');

UPDATE work_reports
SET manager_reviewed_by = reviewed_by,
    manager_reviewed_at = reviewed_at,
    manager_review_notes = review_notes,
    manager_rejection_reason = CASE WHEN rejection_source = 'manager' THEN rejection_reason ELSE '' END
WHERE manager_review_status IN ('approved', 'rejected')
  AND manager_reviewed_by IS NULL
  AND (rejection_source = 'manager' OR COALESCE(NULLIF(BTRIM(report_kind), ''), 'work_report') = 'legacy_logbook');

UPDATE work_reports
SET admin_validated_by = COALESCE(admin_validated_by, rejected_by),
    admin_validated_at = COALESCE(admin_validated_at, rejected_at),
    admin_rejection_reason = COALESCE(NULLIF(admin_rejection_reason, ''), CASE WHEN admin_validation_status = 'rejected' THEN rejection_reason ELSE '' END)
WHERE admin_validation_status IN ('approved', 'rejected')
  AND admin_validated_by IS NULL
  AND (LOWER(BTRIM(COALESCE(status_sesuai, ''))) IN ('sesuai', 'tidak sesuai', 'ditolak', 'minta perbaikan', 'minta_perbaikan') OR rejection_source IN ('admin', 'hrd'));

UPDATE work_reports
SET admin_validated_by = rejected_by,
    admin_validated_at = rejected_at,
    admin_rejection_reason = rejection_reason
WHERE admin_validation_status = 'rejected'
  AND admin_validated_by IS NULL
  AND rejection_source IN ('admin', 'hrd');

ALTER TABLE work_reports ALTER COLUMN manager_review_status SET DEFAULT 'not_required';
ALTER TABLE work_reports ALTER COLUMN manager_review_status SET NOT NULL;
ALTER TABLE work_reports ALTER COLUMN admin_validation_status SET DEFAULT 'not_required';
ALTER TABLE work_reports ALTER COLUMN admin_validation_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_reports_manager_review_status ON work_reports(manager_review_status);
CREATE INDEX IF NOT EXISTS idx_work_reports_admin_validation_status ON work_reports(admin_validation_status);
CREATE INDEX IF NOT EXISTS idx_work_reports_manager_reviewed_by ON work_reports(manager_reviewed_by);
CREATE INDEX IF NOT EXISTS idx_work_reports_admin_validated_by ON work_reports(admin_validated_by);
