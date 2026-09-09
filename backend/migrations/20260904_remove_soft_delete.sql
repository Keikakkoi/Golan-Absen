-- Remove the legacy soft-delete storage after the application no longer
-- exposes restore/force-delete operations and all models use permanent CRUD
-- deletion. This migration is idempotent for existing installations.
DROP INDEX IF EXISTS idx_one_pending_home_location_request;
DROP INDEX IF EXISTS idx_regular_schedule_day;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'attendance_records', 'audit_logs', 'company_events', 'departments',
    'divisions', 'employee_home_locations', 'employees', 'general_settings',
    'helpdesk_contacts', 'holidays', 'internship_certificates', 'leave_quota',
    'leave_requests', 'notification_settings', 'notifications', 'office_locations',
    'permissions', 'positions', 'push_subscriptions', 'role_permissions', 'users',
    'work_report_attachments', 'work_report_columns', 'work_reports',
    'work_schedules', 'work_types', 'projects', 'password_reset_challenges',
    'code_generators', 'home_location_change_requests',
    'regular_work_schedules', 'employee_home_location_histories',
    'approval_delegations', 'leave_approval_histories', 'certificate_issuance_logs',
    'internship_documents'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I DROP COLUMN IF EXISTS deleted_at', table_name);
  END LOOP;
END $$;
