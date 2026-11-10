const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const XLSX = require('xlsx');
const {
  buildDevicesWorkbook, getConfig, pruneOldBackups, DUMP_PATTERN, WORKBOOK_PATTERN
} = require('../scripts/backup');

const DAY_MS = 24 * 60 * 60 * 1000;

const sheetRows = (workbook) =>
  XLSX.utils.sheet_to_json(workbook.Sheets.Devices, { header: 1, defval: '' });

test('workbook has readable headers, values, filter, and working status', () => {
  const workbook = buildDevicesWorkbook([{
    mac_address: '00:11:22:33:44:55',
    location_site: 'Site A',
    working_status: 'Bad',
    utilization_week_7: '42.5',
    infra_tickets: 3,
    updated_at: new Date(2026, 10, 10, 9, 5, 7),
    brand_new_column: 'extra',
  }]);
  const [header, row] = sheetRows(workbook);

  assert.equal(header[0], 'MAC Address');
  assert.equal(row[header.indexOf('Location')], 'Site A');
  assert.equal(row[header.indexOf('Working Status')], 'Bad');
  assert.equal(row[header.indexOf('Utilization (Week 7)')], 42.5);
  assert.equal(row[header.indexOf('Updated At')], '2026-11-10 09:05:07');
  assert.equal(row[header.indexOf('Model Name')], '');
  assert.equal(row[header.indexOf('brand_new_column')], 'extra');
  assert.match(workbook.Sheets.Devices['!autofilter'].ref, /^A1:[A-Z]+2$/);
});

test('formula-looking values stay plain text', () => {
  const workbook = buildDevicesWorkbook([{ mac_address: 'x', model_name: '=1+1' }]);
  const cell = workbook.Sheets.Devices.C2;
  assert.equal(cell.t, 's');
  assert.equal(cell.f, undefined);
});

test('workbook with no devices still contains headers', () => {
  const [header, ...rows] = sheetRows(buildDevicesWorkbook([]));
  assert.equal(header[0], 'MAC Address');
  assert.equal(rows.length, 0);
});

test('config defaults and rejects invalid retention', () => {
  assert.equal(getConfig({}).retentionDays, 30);
  assert.equal(getConfig({ BACKUP_RETENTION_DAYS: '0' }).retentionDays, 30);
  assert.equal(getConfig({ BACKUP_RETENTION_DAYS: 'abc' }).retentionDays, 30);
  assert.equal(getConfig({ BACKUP_RETENTION_DAYS: '14' }).retentionDays, 14);
  assert.equal(getConfig({ BACKUP_DIR: '/data/backups' }).backupDir, path.resolve('/data/backups'));
});

test('pruning removes only old matching files and always keeps the newest seven', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
  try {
    const now = Date.now();
    const create = (name, ageDays) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, 'x');
      const time = new Date(now - ageDays * DAY_MS);
      fs.utimesSync(file, time, time);
    };

    for (let day = 0; day < 40; day++) {
      create(`device-inventory_202601${String(day).padStart(2, '0')}_020000.dump`, day);
    }
    create('notes.txt', 365);
    create('device-inventory_20260101_020000.dump.partial', 365);

    const removed = pruneOldBackups(dir, DUMP_PATTERN, 30, now);
    assert.equal(removed.length, 9);
    assert.ok(fs.existsSync(path.join(dir, 'notes.txt')));
    assert.ok(fs.existsSync(path.join(dir, 'device-inventory_20260101_020000.dump.partial')));
    assert.equal(fs.readdirSync(dir).filter((name) => DUMP_PATTERN.test(name)).length, 31);

    // A long outage must never delete everything
    const later = now + 365 * DAY_MS;
    pruneOldBackups(dir, DUMP_PATTERN, 30, later);
    assert.equal(fs.readdirSync(dir).filter((name) => DUMP_PATTERN.test(name)).length, 7);
    assert.ok(WORKBOOK_PATTERN.test('devices_20260101_020000.xlsx'));
    assert.ok(!WORKBOOK_PATTERN.test('devices_latest.xlsx'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
