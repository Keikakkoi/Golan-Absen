-- Add the canonical display field without removing or rewriting legacy columns.
-- Separator contract: <judul> + " — " + <tugas> when both values exist.
ALTER TABLE work_reports
    ADD COLUMN IF NOT EXISTS judul_tugas VARCHAR(513);

-- Idempotent, lossless backfill. Existing judul/tugas values are retained.
UPDATE work_reports
SET judul_tugas = CASE
    WHEN BTRIM(COALESCE(judul, '')) <> '' AND BTRIM(COALESCE(tugas, '')) <> ''
        THEN BTRIM(judul) || ' — ' || BTRIM(tugas)
    WHEN BTRIM(COALESCE(judul, '')) <> ''
        THEN BTRIM(judul)
    ELSE BTRIM(COALESCE(tugas, ''))
END
WHERE BTRIM(COALESCE(judul_tugas, '')) = '';
