-- Store the admin's explanation using the API/domain field name.
-- The original location migration used alasan_penolakan; preserve its data
-- while making this migration safe for both fresh and existing databases.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'alternative_locations' AND column_name = 'alasan_penolakan'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'alternative_locations' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE alternative_locations RENAME COLUMN alasan_penolakan TO rejection_reason;
    END IF;
END $$;

ALTER TABLE alternative_locations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Handle databases where both names were created during an earlier rollout.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'alternative_locations' AND column_name = 'alasan_penolakan'
    ) THEN
        UPDATE alternative_locations
        SET rejection_reason = COALESCE(NULLIF(BTRIM(rejection_reason), ''), alasan_penolakan)
        WHERE rejection_reason IS NULL OR BTRIM(rejection_reason) = '';
    END IF;
END $$;
