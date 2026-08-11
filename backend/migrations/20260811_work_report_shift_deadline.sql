-- Global work-report tolerance is stored in minutes so it supports 30, 60,
-- 120, and other minute-level values without code changes.
ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS batas_laporan_setelah_checkout_menit INTEGER NOT NULL DEFAULT 60;

UPDATE general_settings
SET batas_laporan_setelah_checkout_menit = batas_laporan_setelah_checkout_jam * 60
WHERE batas_laporan_setelah_checkout_menit = 60
  AND batas_laporan_setelah_checkout_jam IS NOT NULL;
