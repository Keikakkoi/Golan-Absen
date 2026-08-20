-- Manager-first leave workflow. GORM also applies these changes on startup.
ALTER TABLE leave_requests ALTER COLUMN status TYPE VARCHAR(40);
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS manager_approved_by BIGINT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS manager_notes TEXT;
UPDATE leave_requests SET status = 'pending_manager_approval'
WHERE status = 'Pending' AND EXISTS (
  SELECT 1 FROM employees e JOIN users u ON u.id = e.user_id
  WHERE e.id = leave_requests.employee_id AND u.role IN ('Karyawan', 'MAGANG')
);
UPDATE leave_requests SET status = 'pending_hrd_approval'
WHERE status = 'Pending' AND EXISTS (
  SELECT 1 FROM employees e JOIN users u ON u.id = e.user_id
  WHERE e.id = leave_requests.employee_id AND u.role = 'MANAJER'
);
