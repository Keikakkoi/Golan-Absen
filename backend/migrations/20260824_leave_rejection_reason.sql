-- Require and retain an explanation whenever a leave request is rejected.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejected_by BIGINT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_leave_requests_rejected_by ON leave_requests (rejected_by);
