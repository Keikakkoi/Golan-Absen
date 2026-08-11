-- Project master data used by the employee assignment dropdown.
ALTER TABLE users ADD COLUMN IF NOT EXISTS project_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_users_project_id ON users(project_id);

CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    nama_project VARCHAR(150) NOT NULL UNIQUE,
    deskripsi TEXT,
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_projects_status_aktif ON projects(status_aktif);
