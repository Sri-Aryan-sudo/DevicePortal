#!/usr/bin/env node

/**
 * Run the main schema migration against the database.
 * Usage:  node scripts/migrate.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const schemaPath = path.join(__dirname, '../migrations/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Applying schema.sql …');
  await pool.query(sql);
  console.log('Schema applied successfully.');

  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
