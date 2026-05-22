-- ============================================================
-- Migration: Rename owner_name → primary_owner, Add current_user
-- Date: 2026-03-23
-- ============================================================

-- Step 1: Rename owner_name to primary_owner
ALTER TABLE devices RENAME COLUMN owner_name TO primary_owner;

-- Step 2: Add current_user column (nullable)
ALTER TABLE devices ADD COLUMN "current_user" VARCHAR(255);

-- Step 3: Update audit log references (optional — historical records retain old field name)
-- No changes needed to device_audit_log; old entries keep 'owner_name' as field_name.
