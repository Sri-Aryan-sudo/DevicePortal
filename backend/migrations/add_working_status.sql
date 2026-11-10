ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS working_status VARCHAR(7) NOT NULL DEFAULT 'Unknown'
    CONSTRAINT devices_working_status_check
    CHECK (working_status IN ('Good', 'Bad', 'Unknown'));
