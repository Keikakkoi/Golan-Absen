-- Retire the HRD "Minta Perbaikan" state. Existing records become rejected
-- without changing notes, attachments, or any other report fields.
UPDATE work_reports
SET status_sesuai = 'Tidak Sesuai'
WHERE LOWER(BTRIM(status_sesuai)) IN ('minta perbaikan', 'minta_perbaikan');
