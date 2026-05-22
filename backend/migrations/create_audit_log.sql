-- Device Audit Log Table
-- Tracks field-level changes to device records

CREATE TABLE IF NOT EXISTS device_audit_log (
  id SERIAL PRIMARY KEY,
  mac_address VARCHAR(17) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  updated_by VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by device
CREATE INDEX IF NOT EXISTS idx_audit_mac_address ON device_audit_log (mac_address);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_audit_updated_at ON device_audit_log (updated_at DESC);

-- Composite index for device + time queries
CREATE INDEX IF NOT EXISTS idx_audit_mac_time ON device_audit_log (mac_address, updated_at DESC);
