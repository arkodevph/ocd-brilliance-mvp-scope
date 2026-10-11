const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');
const { createShiftCareClient, configuration, shiftWindow } = require('../lib/shiftcare.cjs');
const { createHandler } = require('../api/shiftcare.js');

const credentials = { SHIFTCARE_API_REGION: 'au', SHIFTCARE_ACCOUNT_ID: '12345', SHIFTCARE_API_KEY: 'sk_test_fixture', SHIFTCARE_TIME_ZONE: 'Australia/Sydney' };
const json = (value, options) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' }, ...options });

test('office authentication protects ShiftCare credentials and reads', async t => {
  const keys = ['WORKFLOW_STAFF_EMAIL', 'WORKFLOW_STAFF_PASSWORD', 'WORKFLOW_SESSION_SECRET'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.WORKFLOW_STAFF_EMAIL = 'office@example.test';
  process.env.WORKFLOW_STAFF_PASSWORD = 'fixture-password';
  process.env.WORKFLOW_SESSION_SECRET = 'test-only-session-secret-longer-than-32-characters';
  let requests = [];
  let reply = () => json({ _metadata: { total_count: '2' }, clients: [{ id: '101', first_name: 'Alex', family_name: 'Example', dob: '1950-01-01', ndis_number: 'private-fixture', notes: 'private care details' }] });
  const env = { ...credentials };
  const handler = createHandler({ env, fetchImpl: async (url, options) => { requests.push({ url, options }); return reply(url); } });
  const workflow = require('../api/workflow.js');
  const server = http.createServer((req, res) => new URL(req.url, 'http://localhost').pathname === '/api/workflow' ? workflow(req, res) : handler(req, res));
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(query = 'action=status', cookie, method = 'GET', origin = base) {
    const response = await fetch(`${base}/api/shiftcare?${query}`, { method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) } });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  const signedCookie = session => {
    const value = Buffer.from(JSON.stringify(session)).toString('base64url');
    return `ocd_staff=${value}.${crypto.createHmac('sha256', process.env.WORKFLOW_SESSION_SECRET).update(value).digest('base64url')}`;
  };

  await t.test('rejects missing, malformed, expired, and unrelated sessions before contacting ShiftCare', async () => {
    assert.equal((await call()).status, 401);
    for (const cookie of ['ocd_staff=%ZZ', 'ocd_staff=forged.cookie', signedCookie({ email: 'office@example.test', expires: Date.now() - 1000 }), signedCookie({ email: 'another@example.test', expires: Date.now() + 60000 })]) {
      assert.equal((await call('action=clients', cookie)).status, 401);
    }
    assert.equal(requests.length, 0);
  });
  const login = await fetch(`${base}/api/workflow?action=login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'office@example.test', password: 'fixture-password' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  await t.test('status reports configuration without making a request or exposing the key', async () => {
    const status = await call('action=status', cookie);
    assert.equal(status.body.configured, true);
    assert.equal(status.body.readOnly, true);
    assert.equal(status.body.accountId, '12345');
    assert.ok(!JSON.stringify(status.body).includes(credentials.SHIFTCARE_API_KEY));
    env.SHIFTCARE_API_KEY = '';
    const pending = await call('action=status', cookie);
    assert.equal(pending.body.configured, false);
    assert.deepEqual(pending.body.missing, ['SHIFTCARE_API_KEY']);
    assert.equal((await call('action=check', cookie)).status, 503);
    env.SHIFTCARE_API_KEY = credentials.SHIFTCARE_API_KEY;
    assert.equal(requests.length, 0);
  });
  await t.test('only allows same-origin reads', async () => {
    assert.equal((await call('action=clients', cookie, 'GET', 'https://another.example')).status, 403);
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const response = await call('action=clients', cookie, method);
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET');
    }
    assert.equal((await call('action=create_client', cookie)).status, 404);
    assert.equal(requests.length, 0);
  });
  await t.test('readiness verifies each resource separately and never exposes records or enables writes', async () => {
    const before = requests.length;
    assert.equal((await call('action=readiness', cookie)).status, 422);
    assert.equal(requests.length, before);
    reply = () => json({ clients: [], staff: [], shifts: [] });
    const ready = await call('action=readiness&from=2026-10-04&to=2026-10-04', cookie);
    assert.equal(ready.status, 200);
    assert.equal(ready.body.readsReady, true);
    assert.deepEqual(ready.body.reads.map(item => [item.resource, item.connected]), [['clients', true], ['staff', true], ['shifts', true]]);
    assert.equal(ready.body.nativeWritesEnabled, false);
    assert.equal(ready.body.liveLocationEnabled, false);
    assert.equal(requests.length - before, 3);
    assert.ok(!JSON.stringify(ready.body).includes(credentials.SHIFTCARE_API_KEY));
    assert.ok(!JSON.stringify(ready.body).includes('records'));
    assert.equal(requests.find(item => item.url.pathname.endsWith('/staff')).url.searchParams.has('time_zone'), false);
    reply = url => url.pathname.endsWith('/staff') ? json({ error: credentials.SHIFTCARE_API_KEY }, { status: 403 }) : json({ clients: [], shifts: [] });
    const partial = await call('action=readiness&from=2026-10-04&to=2026-10-04', cookie);
    assert.equal(partial.body.readsReady, false);
    assert.deepEqual(partial.body.reads.map(item => [item.resource, item.connected]), [['clients', true], ['staff', false], ['shifts', true]]);
    reply = () => json({ error: credentials.SHIFTCARE_API_KEY }, { status: 403 });
    const denied = await call('action=readiness&from=2026-10-04&to=2026-10-04', cookie);
    assert.equal(denied.body.readsReady, false);
    assert.ok(denied.body.reads.every(item => item.code === 'SHIFTCARE_FORBIDDEN'));
    assert.ok(!JSON.stringify(denied.body).includes(credentials.SHIFTCARE_API_KEY));
    reply = () => json({ _metadata: { total_count: '2' }, clients: [{ id: '101', first_name: 'Alex', family_name: 'Example', dob: '1950-01-01', ndis_number: 'private-fixture', notes: 'private care details' }] });
  });
  await t.test('uses the documented regional Basic authentication and returns only necessary person fields', async () => {
    const result = await call('action=clients&per_page=1&page=2&url=https://another.example', cookie);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.records, [{ id: '101', name: 'Alex Example' }]);
    assert.deepEqual(result.body.pagination, { page: 2, perPage: 1, total: 2, hasNext: false });
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.ok(!JSON.stringify(result.body).includes('private'));
    const request = requests.at(-1);
    assert.equal(request.url.origin, 'https://api.shiftcare.com');
    assert.equal(request.url.pathname, '/api/v3/clients');
    assert.equal(request.url.searchParams.get('page'), '2');
    assert.equal(request.url.searchParams.get('include_metadata'), 'true');
    assert.equal(request.options.method, 'GET');
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.headers.Authorization, `Basic ${Buffer.from('12345:sk_test_fixture').toString('base64')}`);
    assert.equal((await call('action=check', cookie)).body.connected, true);
  });
  await t.test('bounds booking reads and includes assignments, using the account date boundaries', async () => {
    const before = requests.length;
    for (const query of ['action=shifts', 'action=shifts&from=2026-02-30&to=2026-03-01', 'action=shifts&from=2026-10-06&to=2026-10-05', 'action=shifts&from=2026-10-01&to=2026-11-01', 'action=clients&per_page=21', 'action=clients&page=0']) {
      assert.equal((await call(query, cookie)).status, 422);
    }
    assert.equal(requests.length, before);
    reply = () => json({ shifts: [{ id: '201', start_at: '2026-10-04T09:00:00+11:00', end_at: '2026-10-04T17:00:00+11:00', clients: [{ id: '101', first_name: 'Alex', family_name: 'Example', dob: '1950-01-01' }], staff: [{ id: '301', name: 'Casey Worker', worker_id: 'private-assignment' }] }] });
    const result = await call('action=shifts&from=2026-10-04&to=2026-10-04', cookie);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.records[0].clients, [{ id: '101', name: 'Alex Example' }]);
    assert.deepEqual(result.body.records[0].staff, [{ id: '301', name: 'Casey Worker' }]);
    assert.equal(result.body.pagination.total, null);
    const query = requests.at(-1).url.searchParams;
    assert.equal(query.get('from_date'), '2026-10-03T14:00:00.000Z');
    assert.equal(query.get('to_date'), '2026-10-04T12:59:59.999Z');
    assert.equal(query.get('include_staff'), 'true');
    assert.equal(query.get('include_clients'), 'true');
  });
  await t.test('reports credential failures and rate limits without forwarding sensitive upstream errors', async () => {
    reply = () => json({ error: credentials.SHIFTCARE_API_KEY }, { status: 401 });
    const denied = await call('action=clients', cookie);
    assert.equal(denied.status, 502);
    assert.equal(denied.body.code, 'SHIFTCARE_UNAUTHORIZED');
    assert.ok(!JSON.stringify(denied.body).includes(credentials.SHIFTCARE_API_KEY));
    reply = () => json({ error: 'limited' }, { status: 429, headers: { 'Retry-After': '60' } });
    const limited = await call('action=clients', cookie);
    assert.equal(limited.status, 503);
    assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal(limited.body.code, 'SHIFTCARE_RATE_LIMITED');
  });
});

test('account day windows include daylight saving and leap years', () => {
  assert.deepEqual(shiftWindow('2026-10-04', '2026-10-04', 'Australia/Sydney'), { from_date: '2026-10-03T14:00:00.000Z', to_date: '2026-10-04T12:59:59.999Z' });
  assert.deepEqual(shiftWindow('2026-04-05', '2026-04-05', 'Australia/Sydney'), { from_date: '2026-04-04T13:00:00.000Z', to_date: '2026-04-05T13:59:59.999Z' });
  assert.deepEqual(shiftWindow('2024-02-29', '2024-02-29', 'Australia/Perth'), { from_date: '2024-02-28T16:00:00.000Z', to_date: '2024-02-29T15:59:59.999Z' });
});

test('rejects arbitrary regions, paths and invalid upstream payloads', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return json({ unexpected: [] }); };
  assert.equal(configuration({ ...credentials, SHIFTCARE_API_REGION: 'https://another.example' }).configured, false);
  assert.equal(configuration({ ...credentials, SHIFTCARE_TIME_ZONE: 'Invalid/Zone' }).configured, false);
  const client = createShiftCareClient({ env: credentials, fetchImpl });
  await assert.rejects(client.list('../clients'), error => error.status === 422);
  assert.equal(calls, 0);
  await assert.rejects(client.list('clients'), error => error.code === 'INVALID_RESPONSE');
  const html = createShiftCareClient({ env: credentials, fetchImpl: async () => new Response('<html>not JSON</html>') });
  await assert.rejects(html.list('clients'), error => error.code === 'INVALID_RESPONSE');
});

test('aborts a slow read and does not persist or retry the request', async t => {
  let calls = 0;
  const server = http.createServer((_req, _res) => { calls++; });
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const client = createShiftCareClient({ env: credentials, timeoutMs: 30, fetchImpl: (_url, options) => fetch(`http://127.0.0.1:${server.address().port}`, options) });
  await assert.rejects(client.list('clients'), error => error.status === 504 && error.code === 'SHIFTCARE_TIMEOUT');
  assert.equal(calls, 1);
});
