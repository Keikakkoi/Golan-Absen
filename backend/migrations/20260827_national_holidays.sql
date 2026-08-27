ALTER TABLE holidays ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'company';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS source VARCHAR(255);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS external_id VARCHAR(120);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;
ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_tanggal_key;
DROP INDEX IF EXISTS idx_holidays_tanggal;
DROP INDEX IF EXISTS uni_holidays_tanggal;
CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_date_type ON holidays (tanggal, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_external_id ON holidays (external_id) WHERE external_id IS NOT NULL;
