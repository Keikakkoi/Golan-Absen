-- Additive location contract. Existing WFH/office rows and attendance
-- history are intentionally left untouched.
CREATE TABLE IF NOT EXISTS alternative_locations (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    user_id BIGINT NOT NULL,
    nama_lokasi VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meter DOUBLE PRECISION NOT NULL DEFAULT 100,
    metode_validasi VARCHAR(30) NOT NULL DEFAULT 'radius',
    status_approval VARCHAR(20) NOT NULL DEFAULT 'pending',
    status_aktif VARCHAR(20) NOT NULL DEFAULT 'inactive',
    rejection_reason TEXT,
    approved_by BIGINT NULL,
    rejected_by BIGINT NULL,
    approved_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_alternative_locations_user_id ON alternative_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_alternative_locations_status_approval ON alternative_locations (status_approval);
CREATE INDEX IF NOT EXISTS idx_alternative_locations_status_aktif ON alternative_locations (status_aktif);
CREATE INDEX IF NOT EXISTS idx_alternative_locations_deleted_at ON alternative_locations (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alternative_locations_user_name_active
    ON alternative_locations (user_id, LOWER(BTRIM(nama_lokasi)))
    WHERE deleted_at IS NULL;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alternative_locations_user_id_fkey') THEN
        ALTER TABLE alternative_locations ADD CONSTRAINT alternative_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alternative_locations_approved_by_fkey') THEN
        ALTER TABLE alternative_locations ADD CONSTRAINT alternative_locations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alternative_locations_rejected_by_fkey') THEN
        ALTER TABLE alternative_locations ADD CONSTRAINT alternative_locations_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES users(id);
    END IF;
END $$;
ALTER TABLE alternative_locations DROP CONSTRAINT IF EXISTS alternative_locations_coordinates_check;
ALTER TABLE alternative_locations ADD CONSTRAINT alternative_locations_coordinates_check CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND (latitude <> 0 OR longitude <> 0) AND radius_meter BETWEEN 1 AND 10000);
ALTER TABLE alternative_locations DROP CONSTRAINT IF EXISTS alternative_locations_status_check;
ALTER TABLE alternative_locations ADD CONSTRAINT alternative_locations_status_check CHECK (status_approval IN ('pending', 'approved', 'rejected') AND status_aktif IN ('active', 'inactive'));
ALTER TABLE alternative_locations DROP CONSTRAINT IF EXISTS alternative_locations_validation_method_check;
ALTER TABLE alternative_locations ADD CONSTRAINT alternative_locations_validation_method_check CHECK (metode_validasi IN ('radius'));

CREATE TABLE IF NOT EXISTS field_locations (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    nama_lokasi VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meter DOUBLE PRECISION NOT NULL DEFAULT 100,
    metode_validasi VARCHAR(30) NOT NULL DEFAULT 'radius',
    status_aktif VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by BIGINT NULL,
    updated_by BIGINT NULL
);
CREATE INDEX IF NOT EXISTS idx_field_locations_status_aktif ON field_locations (status_aktif);
CREATE INDEX IF NOT EXISTS idx_field_locations_deleted_at ON field_locations (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_locations_name_active
    ON field_locations (LOWER(BTRIM(nama_lokasi)))
    WHERE deleted_at IS NULL;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'field_locations_created_by_fkey') THEN
        ALTER TABLE field_locations ADD CONSTRAINT field_locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'field_locations_updated_by_fkey') THEN
        ALTER TABLE field_locations ADD CONSTRAINT field_locations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;
END $$;
ALTER TABLE field_locations DROP CONSTRAINT IF EXISTS field_locations_coordinates_check;
ALTER TABLE field_locations ADD CONSTRAINT field_locations_coordinates_check CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND (latitude <> 0 OR longitude <> 0) AND radius_meter BETWEEN 1 AND 10000);
ALTER TABLE field_locations DROP CONSTRAINT IF EXISTS field_locations_status_check;
ALTER TABLE field_locations ADD CONSTRAINT field_locations_status_check CHECK (status_aktif IN ('active', 'inactive'));
ALTER TABLE field_locations DROP CONSTRAINT IF EXISTS field_locations_validation_method_check;
ALTER TABLE field_locations ADD CONSTRAINT field_locations_validation_method_check CHECK (metode_validasi IN ('radius'));

ALTER TABLE work_types ADD COLUMN IF NOT EXISTS canonical_type VARCHAR(30);
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS field_location_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_work_types_canonical_type ON work_types (canonical_type);
CREATE INDEX IF NOT EXISTS idx_work_types_field_location_id ON work_types (field_location_id);

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS tipe_kerja_canonical VARCHAR(30);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS alternative_location_id BIGINT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS field_location_id BIGINT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS location_name_snapshot VARCHAR(100);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS location_address_snapshot TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS location_latitude_snapshot DOUBLE PRECISION;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS location_longitude_snapshot DOUBLE PRECISION;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS location_radius_snapshot DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS idx_attendance_records_alternative_location_id ON attendance_records (alternative_location_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_field_location_id ON attendance_records (field_location_id);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_types_field_location_id_fkey') THEN
        ALTER TABLE work_types ADD CONSTRAINT work_types_field_location_id_fkey FOREIGN KEY (field_location_id) REFERENCES field_locations(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_records_alternative_location_id_fkey') THEN
        ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_alternative_location_id_fkey FOREIGN KEY (alternative_location_id) REFERENCES alternative_locations(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_records_field_location_id_fkey') THEN
        ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_field_location_id_fkey FOREIGN KEY (field_location_id) REFERENCES field_locations(id);
    END IF;
END $$;

-- New canonical values are backfilled only where the legacy name is
-- unambiguous. Dinas Luar and custom types retain their old behavior.
UPDATE work_types SET canonical_type = 'wfo'
 WHERE canonical_type IS NULL AND LOWER(BTRIM(nama)) = 'wfo';
UPDATE work_types SET canonical_type = 'wfh'
 WHERE canonical_type IS NULL AND LOWER(BTRIM(nama)) = 'wfh';

