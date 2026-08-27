CREATE TABLE IF NOT EXISTS regular_work_schedules (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    day_of_week integer NOT NULL,
    day_name varchar(20) NOT NULL,
    is_working_day boolean NOT NULL DEFAULT true,
    start_time varchar(8),
    end_time varchar(8),
    late_tolerance_minutes integer NOT NULL DEFAULT 10,
    CONSTRAINT regular_work_schedules_day_range CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT regular_work_schedules_tolerance_nonnegative CHECK (late_tolerance_minutes >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_regular_schedule_day ON regular_work_schedules(day_of_week) WHERE deleted_at IS NULL;
INSERT INTO regular_work_schedules (day_of_week, day_name, is_working_day, start_time, end_time, late_tolerance_minutes)
SELECT d, CASE d WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis' WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' ELSE 'Minggu' END,
       CASE WHEN d <= 6 THEN true ELSE false END, '09:00:00', '17:00:00', 10
FROM generate_series(1,7) d
WHERE NOT EXISTS (SELECT 1 FROM regular_work_schedules);
UPDATE regular_work_schedules r
SET start_time = COALESCE(NULLIF(w.jam_mulai, ''), r.start_time),
    end_time = COALESCE(NULLIF(w.jam_selesai, ''), r.end_time),
    late_tolerance_minutes = GREATEST(COALESCE(w.toleransi_terlambat_menit, 10), 0),
    is_working_day = CASE WHEN r.day_of_week = 7 THEN COALESCE(w.hari_kerja::jsonb @> '[7]'::jsonb, false) ELSE true END
FROM (SELECT * FROM work_schedules WHERE employee_id IS NULL AND LOWER(TRIM(nama_shift)) = 'reguler' ORDER BY id DESC LIMIT 1) w;
