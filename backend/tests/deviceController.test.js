const assert = require('node:assert/strict');
const { beforeEach, mock, test } = require('node:test');

const pool = { query: mock.fn() };
const poolPath = require.resolve('../config/db');
require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: pool };
const controller = require('../controllers/deviceController');

const device = { mac_address: '00:11:22:33:44:55', working_status: 'Unknown' };

beforeEach(() => {
  pool.query.mock.resetCalls();
  pool.query.mock.mockImplementation(async (sql, params = []) => {
    if (sql.startsWith('SELECT COUNT(*)')) return { rows: [{ count: '1' }] };
    if (sql.startsWith('SELECT * FROM devices')) return { rows: [device] };
    if (sql.startsWith('UPDATE devices')) {
      return { rows: [{ ...device, working_status: params[0] }] };
    }
    if (sql.startsWith('INSERT INTO devices')) {
      return { rows: [{ ...device, working_status: params[20] }] };
    }
    return { rows: [] };
  });
});

async function request(handler, body = {}, query = {}) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  await handler({ body, query, params: { mac: device.mac_address }, user: { ntid: 'test-poc' } }, res);
  return res;
}

test('creating a device without a status defaults to Unknown', async () => {
  const res = await request(controller.createDevice, { mac_address: device.mac_address });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.working_status, 'Unknown');
  assert.equal(pool.query.mock.calls[0].arguments[1][20], 'Unknown');
});

for (const status of ['Good', 'Bad', 'Unknown']) {
  test(`creating a device accepts ${status}`, async () => {
    const res = await request(controller.createDevice, { working_status: status });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.working_status, status);
  });

  for (const handler of ['updateDevice', 'updateDeviceByPOC']) {
    test(`${handler} saves ${status} and audits only actual changes`, async () => {
      const res = await request(controller[handler], { working_status: status });
      assert.equal(res.statusCode, 200);
      assert.equal((res.body.device || res.body).working_status, status);
      const update = pool.query.mock.calls.find(call => call.arguments[0].startsWith('UPDATE devices'));
      assert.match(update.arguments[0], /working_status = \$1/);
      assert.deepEqual(update.arguments[1], [status, device.mac_address]);
      const audits = pool.query.mock.calls.filter(call => call.arguments[0].includes('INSERT INTO device_audit_log'));
      if (status === 'Unknown') {
        assert.equal(audits.length, 0);
      } else {
        assert.deepEqual(audits[0].arguments[1], [
          device.mac_address, 'working_status', 'Unknown', status, 'test-poc'
        ]);
      }
    });
  }
}

for (const invalid of ['', null, 'good', 'Broken', 1, {}, ['Good']]) {
  for (const handler of ['createDevice', 'updateDevice', 'updateDeviceByPOC']) {
    test(`${handler} rejects invalid status ${JSON.stringify(invalid)} before writing`, async () => {
      const res = await request(controller[handler], { working_status: invalid });
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.error, 'working_status must be Good, Bad, or Unknown');
      assert.equal(pool.query.mock.callCount(), 0);
    });
  }
}

for (const handler of ['updateDevice', 'updateDeviceByPOC']) {
  test(`${handler} leaves status untouched when it is omitted`, async () => {
    const res = await request(controller[handler], { current_team: 'Test Team' });
    assert.equal(res.statusCode, 200);
    const update = pool.query.mock.calls.find(call => call.arguments[0].startsWith('UPDATE devices'));
    assert.doesNotMatch(update.arguments[0], /working_status/);
  });
}

test('list endpoint filters and sorts working status with parameterized SQL', async () => {
  const res = await request(controller.getDevices, {}, {
    workingStatus: 'Bad', sortBy: 'working_status', sortOrder: 'desc'
  });
  assert.equal(res.statusCode, 200);
  const [count, list] = pool.query.mock.calls;
  assert.match(count.arguments[0], /AND working_status = \$1/);
  assert.deepEqual(count.arguments[1], ['Bad', 15, 0]);
  assert.match(list.arguments[0], /ORDER BY working_status DESC LIMIT \$2 OFFSET \$3/);
});

test('list endpoint rejects invalid status filters', async () => {
  const res = await request(controller.getDevices, {}, { workingStatus: 'Broken' });
  assert.equal(res.statusCode, 400);
  assert.equal(pool.query.mock.callCount(), 0);
});

test('filter options always include every allowed status', async () => {
  const res = await request(controller.getFilterOptions);
  assert.deepEqual(res.body.workingStatuses, ['Good', 'Bad', 'Unknown']);
});
