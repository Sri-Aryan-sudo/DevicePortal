#!/usr/bin/env node

/**
 * Run the main schema and incremental migrations against the database.
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
  for (const migration of ['schema.sql', 'add_working_status.sql']) {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations', migration), 'utf8');
    console.log(`Applying ${migration} ...`);
    await pool.query(sql);
  }
  console.log('Migrations applied successfully.');

  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
