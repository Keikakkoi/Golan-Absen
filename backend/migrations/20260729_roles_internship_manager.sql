-- The application runs GORM AutoMigrate on startup. This idempotent SQL file
-- documents the production migration for installations that use versioned SQL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS internship_start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS internship_end_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mentor_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mentor_contact VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_name VARCHAR(150);
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS status_logbook VARCHAR(20) DEFAULT 'draft';
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS reviewed_by BIGINT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_status_logbook ON work_reports(status_logbook);

CREATE TABLE IF NOT EXISTS internship_certificates (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    user_id BIGINT NOT NULL UNIQUE,
    issued_at DATE NOT NULL,
    certificate_no VARCHAR(80) NOT NULL UNIQUE,
    file_url TEXT,
    storage_key TEXT,
    file_name VARCHAR(255),
    mime_type VARCHAR(80),
    file_size BIGINT DEFAULT 0,
    uploaded_by BIGINT,
    uploaded_at TIMESTAMP
);

ALTER TABLE internship_certificates ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE internship_certificates ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE internship_certificates ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE internship_certificates ADD COLUMN IF NOT EXISTS mime_type VARCHAR(80);
ALTER TABLE internship_certificates ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE internship_certificates ADD COLUMN IF NOT EXISTS uploaded_by BIGINT;
ALTER TABLE internship_certificates ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP;
