CREATE TABLE IF NOT EXISTS home_location_change_requests (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(), deleted_at TIMESTAMP,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  old_address TEXT, old_latitude DOUBLE PRECISION, old_longitude DOUBLE PRECISION, old_radius_meter DOUBLE PRECISION, old_google_maps_url TEXT,
  new_address TEXT NOT NULL, new_latitude DOUBLE PRECISION NOT NULL, new_longitude DOUBLE PRECISION NOT NULL, new_radius_meter DOUBLE PRECISION NOT NULL, new_google_maps_url TEXT,
  effective_date DATE NOT NULL, reason TEXT NOT NULL, attachment_url TEXT, attachment_name VARCHAR(255),
  status VARCHAR(30) NOT NULL, reviewed_by BIGINT REFERENCES users(id), reviewed_at TIMESTAMP, rejection_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_home_location_requests_employee ON home_location_change_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_home_location_requests_status ON home_location_change_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_home_location_request ON home_location_change_requests(employee_id) WHERE status = 'Menunggu Persetujuan' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS employee_home_location_histories (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(), deleted_at TIMESTAMP,
  employee_id BIGINT NOT NULL REFERENCES employees(id), request_id BIGINT REFERENCES home_location_change_requests(id), changed_by BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(30) NOT NULL, effective_date DATE NOT NULL,
  old_address TEXT, new_address TEXT, old_latitude DOUBLE PRECISION, old_longitude DOUBLE PRECISION, new_latitude DOUBLE PRECISION, new_longitude DOUBLE PRECISION,
  old_radius_meter DOUBLE PRECISION, new_radius_meter DOUBLE PRECISION, new_google_maps_url TEXT, notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_home_location_history_employee_date ON employee_home_location_histories(employee_id, effective_date);
