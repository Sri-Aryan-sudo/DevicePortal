-- ============================================================
-- Seed: create default ADMIN user
-- ============================================================
-- Password: "Admin@1234" hashed with bcrypt (12 rounds).
-- CHANGE THIS PASSWORD immediately after first login.
--
-- To generate a new hash:
--   node -e "require('bcrypt').hash('YourNewPassword',12).then(h=>console.log(h))"
-- ============================================================

INSERT INTO users (ntid, email, password_hash, role, full_name, is_active)
VALUES (
  'admin',
  'admin@deviceportal.local',
  '$2b$12$LJ3m4ys4ZzWnIEhRxU0jcuXSTGMz5K75.lVJPFqxAo/YdPCIcnMsq',
  'ADMIN',
  'System Administrator',
  true
)
ON CONFLICT (ntid) DO NOTHING;
