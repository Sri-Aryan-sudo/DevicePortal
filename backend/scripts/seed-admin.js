#!/usr/bin/env node

/**
 * Seed the initial ADMIN user into the database.
 * Usage:  node scripts/seed-admin.js
 *
 * Reads DB credentials from ../.env (same as the app).
 * The default password is "Admin@1234" — change after first login.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const ntid = 'admin';
  const email = 'admin@deviceportal.local';
  const password = 'Admin@1234';
  const role = 'ADMIN';
  const fullName = 'System Administrator';

  const hash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (ntid, email, password_hash, role, full_name, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (ntid) DO NOTHING
     RETURNING user_id`,
    [ntid, email, hash, role, fullName]
  );

  if (result.rows.length > 0) {
    console.log(`Admin user created (user_id=${result.rows[0].user_id}).`);
    console.log('Default credentials:  admin / Admin@1234');
    console.log('>>> Change this password immediately after first login. <<<');
  } else {
    console.log('Admin user already exists — skipped.');
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
