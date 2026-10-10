-- Approval delegations are included in admin backups and approval routing.
-- Keep this migration idempotent for deployments that apply SQL migrations
-- separately from the API's GORM AutoMigrate startup step.
CREATE TABLE IF NOT EXISTS approval_delegations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  manager_id BIGINT NOT NULL REFERENCES users(id),
  delegate_id BIGINT NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
);

CREATE INDEX IF NOT EXISTS idx_approval_delegations_manager_id
  ON approval_delegations(manager_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegate_id
  ON approval_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegations_status
  ON approval_delegations(status);
