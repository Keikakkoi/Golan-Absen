-- Keep manager and admin notes separate on leave requests.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS admin_note_by BIGINT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS admin_note_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_note_by ON leave_requests (admin_note_by);

-- Unified note shown in approval lists. Legacy manager_notes/admin_notes are
-- retained so existing clients and audit data remain compatible.
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS catatan TEXT;
UPDATE leave_requests
SET catatan = COALESCE(NULLIF(manager_notes, ''), NULLIF(admin_notes, ''), NULLIF(notes, ''), '')
WHERE COALESCE(catatan, '') = '';
