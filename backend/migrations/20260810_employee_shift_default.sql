UPDATE employees SET shift_kerja = 'Reguler' WHERE shift_kerja IS NULL OR BTRIM(shift_kerja) = '';
ALTER TABLE employees ALTER COLUMN shift_kerja SET DEFAULT 'Reguler';
ALTER TABLE employees ALTER COLUMN shift_kerja SET NOT NULL;
