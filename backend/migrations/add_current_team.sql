-- Migration: Add current_team column to devices table
-- The existing team_name column becomes "Primary Team" (label-only change in UI)
-- current_team is a new editable field for POC/ADMIN

ALTER TABLE devices ADD COLUMN IF NOT EXISTS current_team VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_devices_current_team ON devices (current_team);
