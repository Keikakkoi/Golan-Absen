ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS hari_kerja TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]';
UPDATE work_schedules SET hari_kerja = '[1,2,3,4,5,6]' WHERE hari_kerja IS NULL OR BTRIM(hari_kerja) = '' OR hari_kerja = '[]';
