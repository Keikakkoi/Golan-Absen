ALTER TABLE payrolls
    ADD COLUMN IF NOT EXISTS uang_transportasi BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_payroll_uang_transportasi_non_negative'
    ) THEN
        ALTER TABLE payrolls
            ADD CONSTRAINT ck_payroll_uang_transportasi_non_negative
            CHECK (uang_transportasi >= 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_payroll_bpjs_ketenagakerjaan_non_negative'
    ) THEN
        ALTER TABLE payrolls
            ADD CONSTRAINT ck_payroll_bpjs_ketenagakerjaan_non_negative
            CHECK (bpjs_ketenagakerjaan >= 0);
    END IF;
END $$;
