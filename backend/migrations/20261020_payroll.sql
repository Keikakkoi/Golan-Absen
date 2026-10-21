CREATE TABLE IF NOT EXISTS payrolls (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    periode_bulan DATE NOT NULL,
    payroll_cutoff_start DATE NOT NULL,
    payroll_cutoff_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    employee_name_snapshot VARCHAR(100) NOT NULL,
    employee_code_snapshot VARCHAR(40) NOT NULL,
    nik_snapshot VARCHAR(50),
    position_snapshot VARCHAR(100),
    division_snapshot VARCHAR(100),
    total_hari_kerja INTEGER NOT NULL CHECK (total_hari_kerja >= 0),
    company_name_snapshot VARCHAR(150) NOT NULL,
    company_phone_snapshot VARCHAR(40),
    total_income BIGINT NOT NULL DEFAULT 0 CHECK (total_income >= 0),
    total_deduction BIGINT NOT NULL DEFAULT 0 CHECK (total_deduction >= 0),
    take_home_pay BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    approved_by_name VARCHAR(100),
    approved_by_position VARCHAR(100),
    received_by_name VARCHAR(100),
    received_by_position VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    published_at TIMESTAMP NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    updated_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payroll_employee_period UNIQUE (employee_id, periode_bulan),
    CONSTRAINT ck_payroll_status CHECK (status IN ('Draft', 'Published', 'Dibatalkan'))
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id BIGSERIAL PRIMARY KEY,
    payroll_id BIGINT NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'deduction')),
    name VARCHAR(100) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payroll_status ON payrolls(status);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_date ON payrolls(payment_date);
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll_type ON payroll_items(payroll_id, type);
