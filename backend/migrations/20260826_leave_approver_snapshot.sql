-- Approver routing is immutable per request. Existing rows stay untouched;
-- their historical status/approval history remains authoritative.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS assigned_approver_id BIGINT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS assigned_approver_role VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_leave_requests_assigned_approver_id ON leave_requests (assigned_approver_id);
