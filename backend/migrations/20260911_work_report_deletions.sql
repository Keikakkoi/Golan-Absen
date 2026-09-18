CREATE TABLE IF NOT EXISTS work_report_deletions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    employee_id BIGINT NOT NULL,
    tanggal DATE NOT NULL,
    CONSTRAINT uq_work_report_deletions_employee_date UNIQUE (employee_id, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_work_report_deletions_employee_date
    ON work_report_deletions(employee_id, tanggal);
