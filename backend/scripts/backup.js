#!/usr/bin/env node

/**
 * Back up the Device Portal database.
 *   - Full PostgreSQL dump (custom format, restorable with pg_restore) -> <BACKUP_DIR>/db/
 *   - Readable devices-only Excel workbook                             -> <BACKUP_DIR>/devices/
 *
 * Usage:  node scripts/backup.js
 * Env:    BACKUP_DIR (default: <project root>/backups), BACKUP_RETENTION_DAYS (default: 30)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const XLSX = require('xlsx');

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_LOCK_MS = 6 * 60 * 60 * 1000;
const MIN_BACKUPS_TO_KEEP = 7;

const DUMP_PATTERN = /^device-inventory_\d{8}_\d{6}\.dump$/;
const WORKBOOK_PATTERN = /^devices_\d{8}_\d{6}\.xlsx$/;

// [database column, spreadsheet header]; any additional columns are appended as-is
const DEVICE_COLUMNS = [
  ['mac_address', 'MAC Address'],
  ['model_name', 'Model Name'],
  ['model_alias', 'Model Alias'],
  ['model_type', 'Model Type'],
  ['device_type', 'Device Type'],
  ['cats_type', 'CATS Type'],
  ['vendor', 'Vendor'],
  ['rack', 'Rack'],
  ['location_scope', 'Location Scope'],
  ['location_site', 'Location'],
  ['placement_type', 'Placement Type'],
  ['team_name', 'Primary Team'],
  ['current_team', 'Current Team'],
  ['usage_purpose', 'Usage Purpose'],
  ['primary_owner', 'Primary Owner'],
  ['current_user', 'Current User'],
  ['working_status', 'Working Status'],
  ['utilization_week_7', 'Utilization (Week 7)'],
  ['utilization_week_8', 'Utilization (Week 8)'],
  ['automation_filter', 'Automation Filter'],
  ['infra_tickets', 'Infra Tickets'],
  ['device_repurpose', 'Device Repurpose'],
  ['created_at', 'Created At'],
  ['updated_at', 'Updated At'],
];

// pg returns NUMERIC columns as strings; store them as real numbers in Excel
const NUMERIC_COLUMNS = new Set(['utilization_week_7', 'utilization_week_8']);

const log = (message) => console.log(`${new Date().toISOString()} ${message}`);

const pad = (n) => String(n).padStart(2, '0');

const formatTimestamp = (date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
  `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const formatDateTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const getConfig = (env = process.env) => {
  const retentionDays = parseInt(env.BACKUP_RETENTION_DAYS, 10);
  return {
    backupDir: path.resolve(env.BACKUP_DIR || path.join(__dirname, '../../backups')),
    retentionDays: retentionDays >= 1 ? retentionDays : 30,
  };
};

const formatCell = (key, value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDateTime(value);
  if (NUMERIC_COLUMNS.has(key)) {
    const number = Number(value);
    return Number.isNaN(number) ? value : number;
  }
  return value;
};

const buildDevicesWorkbook = (rows) => {
  const knownKeys = DEVICE_COLUMNS.map(([key]) => key);
  const extraKeys = rows.length
    ? Object.keys(rows[0]).filter((key) => !knownKeys.includes(key))
    : [];
  const columns = [...DEVICE_COLUMNS, ...extraKeys.map((key) => [key, key])];

  const header = columns.map(([, title]) => title);
  const data = rows.map((row) => columns.map(([key]) => formatCell(key, row[key])));

  const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
  sheet['!cols'] = header.map((title, col) => {
    let width = title.length;
    for (const row of data) width = Math.max(width, String(row[col]).length);
    return { wch: Math.min(width + 2, 40) };
  });
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length, c: columns.length - 1 } }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Devices');
  return workbook;
};

const pruneOldBackups = (dir, pattern, retentionDays, now = Date.now()) => {
  const files = fs.readdirSync(dir)
    .filter((name) => pattern.test(name))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const removed = [];
  files.slice(MIN_BACKUPS_TO_KEEP).forEach(({ name, mtime }) => {
    if (now - mtime > retentionDays * DAY_MS) {
      fs.unlinkSync(path.join(dir, name));
      removed.push(name);
    }
  });
  return removed;
};

const acquireLock = (dir) => {
  const lockFile = path.join(dir, '.backup.lock');
  const create = () => fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx', mode: 0o600 });
  try {
    create();
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (Date.now() - fs.statSync(lockFile).mtimeMs < STALE_LOCK_MS) {
      throw new Error('Another backup appears to be running (lock file exists)');
    }
    fs.unlinkSync(lockFile);
    create();
  }
  return () => fs.rmSync(lockFile, { force: true });
};

const runTool = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      reject(error.code === 'ENOENT'
        ? new Error(`${command} not found; install the PostgreSQL client tools`)
        : error);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });
  });

const backupDatabase = async (dir, stamp) => {
  const finalPath = path.join(dir, `device-inventory_${stamp}.dump`);
  const partialPath = `${finalPath}.partial`;
  const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD };

  try {
    await runTool('pg_dump', [
      '--format=custom',
      '--no-password',
      '--host', process.env.DB_HOST,
      '--port', process.env.DB_PORT || '5432',
      '--username', process.env.DB_USER,
      '--file', partialPath,
      process.env.DB_NAME,
    ], env);
    // Confirms the archive is complete and readable before it replaces anything
    await runTool('pg_restore', ['--list', partialPath], env);
    fs.chmodSync(partialPath, 0o600);
    fs.renameSync(partialPath, finalPath);
  } finally {
    fs.rmSync(partialPath, { force: true });
  }
  return finalPath;
};

const backupDevicesWorkbook = async (dir, stamp) => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
  });

  let rows;
  try {
    ({ rows } = await pool.query('SELECT * FROM devices ORDER BY mac_address'));
  } finally {
    await pool.end();
  }

  const buffer = XLSX.write(buildDevicesWorkbook(rows), { type: 'buffer', bookType: 'xlsx' });
  const finalPath = path.join(dir, `devices_${stamp}.xlsx`);
  const latestPath = path.join(dir, 'devices_latest.xlsx');
  const partialPath = `${finalPath}.partial`;
  const latestPartialPath = `${latestPath}.partial`;

  try {
    fs.writeFileSync(partialPath, buffer, { mode: 0o600 });
    fs.renameSync(partialPath, finalPath);
    fs.copyFileSync(finalPath, latestPartialPath);
    fs.chmodSync(latestPartialPath, 0o600);
    fs.renameSync(latestPartialPath, latestPath);
  } finally {
    fs.rmSync(partialPath, { force: true });
    fs.rmSync(latestPartialPath, { force: true });
  }
  return { finalPath, count: rows.length };
};

async function main() {
  const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  const { backupDir, retentionDays } = getConfig();
  const dbDir = path.join(backupDir, 'db');
  const devicesDir = path.join(backupDir, 'devices');
  [backupDir, dbDir, devicesDir].forEach((dir) => fs.mkdirSync(dir, { recursive: true, mode: 0o700 }));

  const releaseLock = acquireLock(backupDir);
  const stamp = formatTimestamp(new Date());
  let failures = 0;

  try {
    try {
      const file = await backupDatabase(dbDir, stamp);
      log(`Database backup created: ${file}`);
      const removed = pruneOldBackups(dbDir, DUMP_PATTERN, retentionDays);
      if (removed.length > 0) log(`Removed ${removed.length} expired database backup(s)`);
    } catch (error) {
      failures++;
      console.error(`${new Date().toISOString()} Database backup FAILED: ${error.message}`);
    }

    try {
      const { finalPath, count } = await backupDevicesWorkbook(devicesDir, stamp);
      log(`Devices workbook created: ${finalPath} (${count} devices)`);
      const removed = pruneOldBackups(devicesDir, WORKBOOK_PATTERN, retentionDays);
      if (removed.length > 0) log(`Removed ${removed.length} expired devices workbook(s)`);
    } catch (error) {
      failures++;
      console.error(`${new Date().toISOString()} Devices workbook export FAILED: ${error.message}`);
    }
  } finally {
    releaseLock();
  }

  if (failures > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${new Date().toISOString()} Backup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { buildDevicesWorkbook, getConfig, pruneOldBackups, DUMP_PATTERN, WORKBOOK_PATTERN };
