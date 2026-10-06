-- Toleransi absen awal controls only the earliest allowed check-in time.
-- A NULL shift value intentionally falls back to general_settings.
ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS toleransi_absen_awal_menit INTEGER NOT NULL DEFAULT 0;

ALTER TABLE work_schedules
    ADD COLUMN IF NOT EXISTS toleransi_absen_awal_menit INTEGER;

ALTER TABLE regular_work_schedules
    ADD COLUMN IF NOT EXISTS early_tolerance_minutes INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'work_schedules_early_tolerance_nonnegative'
    ) THEN
        ALTER TABLE work_schedules
            ADD CONSTRAINT work_schedules_early_tolerance_nonnegative
            CHECK (toleransi_absen_awal_menit IS NULL OR toleransi_absen_awal_menit BETWEEN 0 AND 1440);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'regular_work_schedules_early_tolerance_nonnegative'
    ) THEN
        ALTER TABLE regular_work_schedules
            ADD CONSTRAINT regular_work_schedules_early_tolerance_nonnegative
            CHECK (early_tolerance_minutes IS NULL OR early_tolerance_minutes BETWEEN 0 AND 1440);
    END IF;
END $$;
