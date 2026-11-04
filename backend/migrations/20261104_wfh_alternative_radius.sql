-- One admin-controlled geofence tolerance for WFH and alternative locations.
-- Additive and rerunnable; legacy per-location radius values remain intact for
-- attendance/history compatibility but are no longer authoritative.
ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS radius_toleransi_wfh_alternatif_meter DOUBLE PRECISION NOT NULL DEFAULT 100;

UPDATE general_settings
SET radius_toleransi_wfh_alternatif_meter = 100
WHERE radius_toleransi_wfh_alternatif_meter IS NULL
   OR radius_toleransi_wfh_alternatif_meter < 1
   OR radius_toleransi_wfh_alternatif_meter > 10000;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'general_settings_wfh_alternative_radius_check'
    ) THEN
        ALTER TABLE general_settings
            ADD CONSTRAINT general_settings_wfh_alternative_radius_check
            CHECK (radius_toleransi_wfh_alternatif_meter BETWEEN 1 AND 10000);
    END IF;
END $$;
