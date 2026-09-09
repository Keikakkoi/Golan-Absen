-- Employee lifecycle support.  The API uses explicit transactions; these
-- columns retain report context when an employee is permanently removed.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schema_version varchar(20) NOT NULL DEFAULT 'current-v1';
ALTER TABLE users ADD COLUMN IF NOT EXISTS schema_version varchar(20) NOT NULL DEFAULT 'current-v1';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS employee_name_snapshot varchar(100);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS employee_code_snapshot varchar(40);
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS employee_name_snapshot varchar(100);
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS employee_code_snapshot varchar(40);
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS employee_name_snapshot varchar(100);
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS employee_code_snapshot varchar(40);

-- Option B needs nullable references. Existing rows remain unchanged.
ALTER TABLE attendance_records ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE leave_requests ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE leave_quota ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE work_reports ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE employee_home_locations ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE home_location_change_requests ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE employee_home_location_histories ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE work_schedules ALTER COLUMN employee_id DROP NOT NULL;
