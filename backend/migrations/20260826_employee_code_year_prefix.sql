ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code varchar(40);

-- Nullable codes are allowed for legacy rows until the application backfills
-- them from tanggal_bergabung. Active codes must remain globally unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_code
  ON employees (employee_code)
  WHERE employee_code IS NOT NULL;
