-- ============================================================
-- Device Portal — Complete PostgreSQL Schema
-- Database: device-inventory
-- Generated from codebase scan on 2026-03-20
-- ============================================================
-- Execution order: users → devices → device_audit_log
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
-- Used by: authController.js (login, verifyToken, getCurrentUser, createUser, getAllUsers)
-- Columns derived from: SELECT/INSERT queries in authController.js, auth middleware

CREATE TABLE IF NOT EXISTS users (
  user_id       SERIAL PRIMARY KEY,
  ntid          VARCHAR(100) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN', 'POC', 'VIEWER')),
  full_name     VARCHAR(255),
  team_name     VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login    TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. DEVICES TABLE
-- ============================================================
-- Used by: deviceController.js, csvController.js, dataQualityController.js,
--          drillDownController.js, Python ingest.py (DB_COLUMNS)
-- Columns derived from: DB_COLUMNS in ingest.py, createDevice/updateDevice in
--          deviceController.js, normalizeDevice in csvController.js,
--          data quality queries, drill-down queries

CREATE TABLE IF NOT EXISTS devices (
  mac_address        VARCHAR(17)  PRIMARY KEY,
  model_name         VARCHAR(255),
  model_alias        VARCHAR(255),
  model_type         VARCHAR(255),
  device_type        VARCHAR(50),
  cats_type          VARCHAR(255),
  vendor             VARCHAR(255),
  rack               VARCHAR(255),
  location_scope     VARCHAR(255),
  location_site      VARCHAR(255),
  placement_type     VARCHAR(255),
  team_name          VARCHAR(255),
  usage_purpose      VARCHAR(255),
  owner_name         VARCHAR(255),
  utilization_week_7 NUMERIC,
  utilization_week_8 NUMERIC,
  automation_filter  VARCHAR(255),
  infra_tickets      INTEGER,
  device_repurpose   VARCHAR(255),
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. DEVICE AUDIT LOG TABLE
-- ============================================================
-- Used by: deviceController.js (logAuditChanges, getAuditLog)
-- Columns derived from: INSERT into device_audit_log, SELECT * from device_audit_log

CREATE TABLE IF NOT EXISTS device_audit_log (
  id           SERIAL PRIMARY KEY,
  mac_address  VARCHAR(17)  NOT NULL,
  field_name   VARCHAR(100) NOT NULL,
  old_value    TEXT,
  new_value    TEXT,
  updated_by   VARCHAR(100) NOT NULL,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

-- devices: speed up filters, search, drill-downs
CREATE INDEX IF NOT EXISTS idx_devices_device_type  ON devices (device_type);
CREATE INDEX IF NOT EXISTS idx_devices_vendor       ON devices (vendor);
CREATE INDEX IF NOT EXISTS idx_devices_team_name    ON devices (team_name);
CREATE INDEX IF NOT EXISTS idx_devices_model_type   ON devices (model_type);
CREATE INDEX IF NOT EXISTS idx_devices_location     ON devices (location_site);
CREATE INDEX IF NOT EXISTS idx_devices_created_at   ON devices (created_at);

-- device_audit_log: speed up per-device audit queries
CREATE INDEX IF NOT EXISTS idx_audit_mac_address ON device_audit_log (mac_address);
CREATE INDEX IF NOT EXISTS idx_audit_updated_at  ON device_audit_log (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_mac_time    ON device_audit_log (mac_address, updated_at DESC);
