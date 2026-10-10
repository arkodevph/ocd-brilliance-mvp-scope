const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('intake is area-gated, office-owned, and requires verified handoff', async t => {
  process.env.WORKFLOW_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-workflow-'));
  process.env.SERVICE_POSTCODES = '6000,6001';
  process.env.OCD_INTAKE_RULES = JSON.stringify({ version: 'test-v1', approvedBy: 'Test office', source: 'Fictional test policy' });
  process.env.WORKFLOW_STAFF_EMAIL = 'office@example.test';
  process.env.WORKFLOW_STAFF_PASSWORD = 'test-password';
  process.env.WORKFLOW_SESSION_SECRET = 'a-test-session-secret-longer-than-32-characters';
  process.env.WORKFLOW_STAFF_ACCOUNTS = JSON.stringify([
    { email: 'office@example.test', password: 'test-password', role: 'admin', name: 'Office admin' },
    { email: 'coordinator@example.test', password: 'coordinator-password', role: 'coordinator', name: 'Mia Roberts' },
    { email: 'reader@example.test', password: 'reader-password', role: 'reader', name: 'Read only' }
  ]);
  t.after(() => { delete process.env.WORKFLOW_STAFF_ACCOUNTS; });
  const server = http.createServer(require('../api/workflow.js')).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(process.env.WORKFLOW_DATA_DIR, { recursive: true }); });
  const base = `http://127.0.0.1:${server.address().port}/api/workflow`;
  const call = async (action, method = 'GET', data, cookie) => {
    const response = await fetch(`${base}?action=${action}`, { method, headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  };
  assert.equal((await call('area&postcode=6000')).body.status, 'covered');
  assert.equal((await call('area&postcode=6999')).body.status, 'outside');
  const intake = { name: 'Jane Requester', email: 'jane@example.test', phone: '0400000000', suburb: 'Perth', postcode: '6999', service: 'Domestic assistance', notes: '', consent: true };
  assert.equal((await call('intake', 'POST', intake)).status, 422);
  intake.postcode = '6000';
  const created = await call('intake', 'POST', intake);
  assert.equal(created.status, 201);
  assert.match(created.body.id, /^REQ-/);
  assert.equal((await call('intakes')).status, 401);
  assert.equal((await call('login', 'POST', { email: 'office@example.test', password: 'wrong' })).status, 401);
  const login = await call('login', 'POST', { email: 'office@example.test', password: 'test-password' });
  assert.equal(login.status, 200);
  const cookie = login.cookie.split(';')[0];
  assert.equal((await call('owners')).status, 401);
  const owners = await call('owners', 'GET', null, cookie);
  assert.deepEqual(owners.body.owners, [
    { email: 'office@example.test', name: 'Office admin', role: 'admin' },
    { email: 'coordinator@example.test', name: 'Mia Roberts', role: 'coordinator' }
  ]);
  const records = await call('intakes', 'GET', null, cookie);
  assert.equal(records.body.records.length, 1);
  assert.equal(records.body.records[0].owner, 'office@example.test');
  assert.match(records.body.records[0].followUp, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await call('staff-intake', 'POST', { name: 'Caller', phone: '0400000001', service: 'Transport', source: 'Phone' })).status, 401);
  const logged = await call('staff-intake', 'POST', { name: 'Caller', phone: '0400000001', service: 'Transport', source: 'Phone' }, cookie);
  assert.equal(logged.status, 201);
  assert.equal(logged.body.record.owner, 'office@example.test');
  assert.equal(logged.body.record.nextAction, 'Review source and confirm missing details');
  const update = { id: created.body.id, revision: records.body.records[0].revision, owner: 'coordinator@example.test', status: 'Ready for ShiftCare', nextAction: 'Create client in ShiftCare', followUp: '2026-10-06', shiftCareId: '', postcode: '6000', suburb: 'Perth' };
  assert.equal((await call('record', 'PATCH', { ...update, id: logged.body.record.id, revision: logged.body.record.revision, postcode: '' }, cookie)).status, 422);
  assert.equal((await call('record', 'PATCH', update)).status, 401);
  assert.equal((await call('record', 'PATCH', { ...update, status: 'Entered in ShiftCare' }, cookie)).status, 422);
  assert.equal((await call('record', 'PATCH', update, cookie)).status, 422);
  assert.equal((await call('record', 'PATCH', { ...update, owner: 'Random person' }, cookie)).status, 422);
  assert.equal((await call('record', 'PATCH', { ...update, owner: 'reader@example.test' }, cookie)).status, 422);
  const reviewed = await call('draft-review', 'PATCH', { ...intake, ...update, status: 'Reviewing', sourceReviewed: true }, cookie);
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.record.owner, 'coordinator@example.test');
  let ready = await call('record', 'PATCH', { ...update, revision: reviewed.body.record.revision }, cookie);
  assert.equal(ready.status, 200);
  ready = await call('handoff-approve', 'POST', { id: update.id, revision: ready.body.record.revision, approved: true, existingPeopleChecked: true }, cookie);
  assert.equal(ready.status, 200);
  assert.equal((await call('record', 'PATCH', { ...update, revision: ready.body.record.revision, status: 'Entered in ShiftCare', shiftCareId: 'SC-123' }, cookie)).status, 422);
  const entered = await call('handoff-verify', 'PATCH', { id: update.id, revision: ready.body.record.revision, shiftCareId: 'SC-123', profileChecked: true }, cookie);
  assert.equal(entered.status, 200);
  assert.equal(entered.body.record.history.length, 5);
  assert.equal(entered.body.record.shiftCareId, 'SC-123');
  assert.equal(entered.body.record.shiftCareVerification.method, 'staff-manual');
});
