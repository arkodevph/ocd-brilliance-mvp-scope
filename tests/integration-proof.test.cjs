const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { sanitizeCapture, analyse, createProofStore, nativeUrl } = require('../lib/integration-proof.cjs');
const { createHandler } = require('../api/integration-proof.js');
const { sessionCookie } = require('../lib/staff-auth.cjs');

function capture() {
  return {
    version: 1, capturedAt: '2026-10-07T06:00:00Z',
    source: { method: 'mcp', authenticated: true, note: 'Synthetic test capture, not a native call.' },
    account: { id: '12345', name: 'Fixture account', timeZone: 'Australia/Sydney', role: 'admin', mcpAvailable: true, writesEnabled: true },
    range: { from: '2026-10-01', to: '2026-10-14' },
    receipts: [
      { tool: 'list_shifts', status: 'passed', complete: true, count: 2, total: 2, pages: 1 },
      { tool: 'list_progress_notes', status: 'passed', complete: true, count: 1, total: 1, pages: 1 }
    ],
    data: {
      participants: [{ id: '11', label: 'Participant 11', email: 'private@example.test', dob: '1950-01-01' }],
      staff: [{ id: '22', label: 'Staff 22' }],
      shifts: [
        { id: '101', startAt: '2026-10-04T10:00:00+11:00', endAt: '2026-10-04T18:00:00+11:00', clients: [], staff: [], url: 'https://app.shiftcare.com/users/areas/1/programs/2/shifts/101' },
        { id: '102', startAt: '2026-10-05T09:00:00+11:00', endAt: '2026-10-05T17:00:00+11:00', clients: [{ id: '11', label: 'Participant 11' }], staff: [{ id: '22', assignmentId: '9002', clockIn: null, clockOut: null }] }
      ],
      notes: [{ id: '44', shiftId: '101', createdAt: '2026-10-04T10:30:00+11:00', message: 'private-care-content' }],
      timesheets: [{ shiftId: '102', staffId: '22', date: '2026-10-05T00:00:00+11:00', itemCount: 1, pay_rate: 99 }]
    },
    gaps: ['Fixture scope only.'],
    proof: { status: 'awaiting_approval', proposal: { tool: 'create_action_item', args: { assignee_id: 22, title: 'Review test shift 101', description: 'Confirm the native outcome.', due_date: '2026-10-08', priority: 'low', verification_method: 'self_attestation' } } }
  };
}
function verified(c) {
  const args = c.proof.proposal.args;
  c.proof.status = 'verified'; c.proof.createdId = '501';
  c.proof.readback = { tool: 'get_action_item', id: '501', title: args.title, description: args.description, assigneeId: '22', dueDate: args.due_date, priority: args.priority, verificationMethod: args.verification_method, status: 'open', verifiedAt: '2026-10-07T06:01:00Z' };
  return c;
}
async function directory(t, data = capture()) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-evidence-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'shiftcare-evidence.json'), JSON.stringify(data), { mode: 0o600 });
  return dir;
}

test('evidence whitelist removes private care, contacts, rates and unsafe native URLs', () => {
  const raw = capture(); raw.credentials = 'secret-token'; raw.account.apiKey = 'secret-token';
  raw.data.shifts[0].description = 'private-care-content';
  raw.data.shifts[0].url += '?token=secret-token';
  const clean = sanitizeCapture(raw), output = JSON.stringify(clean);
  for (const privateValue of ['secret-token', 'private-care-content', 'private@example.test', '1950-01-01', 'pay_rate']) assert.ok(!output.includes(privateValue));
  assert.equal(clean.data.shifts[0].url, 'https://app.shiftcare.com/users/areas/1/programs/2/shifts/101');
  for (const url of ['javascript:alert(1)', 'https://app.shiftcare.com.evil.test/1', 'http://app.shiftcare.com/1', 'https://user:pass@app.shiftcare.com/1']) assert.equal(nativeUrl(url), '');
});

test('actual attendance never comes from the scheduled duration or timesheet items', () => {
  const report = analyse(capture());
  assert.equal(report.findings.length, 4);
  const attendance = report.findings.find(f => f.code === 'ATTENDANCE_22');
  assert.equal(attendance.owner, 'Bookkeeper'); assert.match(attendance.detail, /assignment 9002/);
  assert.match(attendance.detail, /do not establish actual delivered hours/);
  assert.match(report.findings.find(f => f.code === 'UNSTAFFED').title, /Past occurrence/);
  assert.match(report.findings.find(f => f.code === 'NOTE_SCOPE').detail, /Older or restricted notes may exist/);
});

test('unknown assignments and incomplete note pages cannot become empty-record claims', () => {
  const c = capture(); c.data.shifts[0].staff = null; c.data.shifts[0].clients = null;
  c.receipts.find(r => r.tool === 'list_progress_notes').complete = false;
  const findings = analyse(c).findings;
  assert.ok(findings.some(f => f.code === 'UNKNOWN_STAFF'));
  assert.ok(!findings.some(f => f.code === 'UNSTAFFED' || f.code === 'NOTE_SCOPE'));
  assert.match(findings.find(f => f.code === 'CLIENT_CONTEXT').detail, /not returned/);
});

test('cancelled occurrences are excluded and differing actual duration goes to review', () => {
  const c = capture(); c.data.shifts[0].cancelledAt = '2026-10-03T10:00:00+10:00';
  Object.assign(c.data.shifts[1].staff[0], { clockIn: '2026-10-05T09:00:00+11:00', clockOut: '2026-10-05T16:00:00+11:00' });
  const findings = analyse(c).findings;
  assert.ok(!findings.some(f => f.shiftId === '101'));
  assert.ok(findings.some(f => f.code === 'DURATION_22'));
  assert.ok(!findings.some(f => f.code === 'ATTENDANCE_22'));
});

test('native proof requires a separate matching get_action_item read and authenticated source', () => {
  const c = verified(capture());
  assert.equal(sanitizeCapture(c).proof.status, 'verified');
  assert.equal(sanitizeCapture(sanitizeCapture(c)).proof.status, 'verified');
  for (const key of ['id', 'title', 'description', 'assigneeId', 'dueDate', 'priority', 'verificationMethod', 'tool']) {
    const wrong = structuredClone(c); wrong.proof.readback[key] = 'different';
    assert.equal(sanitizeCapture(wrong).proof.status, 'awaiting_approval', key);
  }
  c.source.method = 'fixture'; assert.equal(sanitizeCapture(c).proof.status, 'awaiting_approval');
  c.source.method = 'mcp'; c.source.authenticated = false;
  assert.equal(sanitizeCapture(c).proof.status, 'awaiting_approval');
});

test('bounded evidence and mismatched receipt counts cannot certify complete source pages', () => {
  const c = capture();
  c.data.shifts = Array.from({ length: 201 }, (_, i) => ({ ...c.data.shifts[0], id: String(1000 + i) }));
  c.data.notes = Array.from({ length: 201 }, (_, i) => ({ id: String(i + 1), shiftId: String(1000 + i) }));
  for (const r of c.receipts) r.count = r.total = 201;
  const clean = sanitizeCapture(c);
  assert.equal(clean.data.shifts.length, 200);
  assert.ok(clean.receipts.every(r => !r.complete));
  assert.equal(analyse(clean).complete, false);
  assert.ok(!analyse(clean).findings.some(f => f.code === 'NOTE_SCOPE'));
  assert.ok(clean.gaps.some(g => /200/.test(g)));
  assert.ok(sanitizeCapture(clean).receipts.every(r => !r.complete));

  const mismatch = capture(); mismatch.receipts[1].count = mismatch.receipts[1].total = 2;
  assert.ok(!analyse(mismatch).findings.some(f => f.code === 'NOTE_SCOPE'));
});

test('proof preserves the approved priority rather than replacing it with a default', () => {
  const c = capture(); c.proof.proposal.args.priority = 'high'; verified(c);
  const clean = sanitizeCapture(c);
  assert.equal(clean.proof.proposal.args.priority, 'high');
  assert.equal(clean.proof.status, 'verified');
  c.proof.readback.priority = 'low';
  assert.equal(sanitizeCapture(c).proof.status, 'awaiting_approval');
});

test('source identity includes the capture time and account time zone', () => {
  const c = capture(), original = analyse(c).sourceHash;
  c.account.timeZone = 'Australia/Perth'; assert.notEqual(analyse(c).sourceHash, original);
  c.account.timeZone = 'Australia/Sydney'; c.capturedAt = '2026-10-08T06:00:00Z';
  assert.notEqual(analyse(c).sourceHash, original);
});

test('concurrent identical runs reuse one private persisted review across reloads', async t => {
  const dir = await directory(t), env = { WORKFLOW_DATA_DIR: dir, SHIFTCARE_ACCOUNT_ID: '12345' };
  const store = createProofStore({ env, fetchImpl: () => { throw new Error('No native call expected'); } });
  const [a, b] = await Promise.all([store.run({ source: 'mcp' }), store.run({ source: 'mcp' })]);
  assert.equal(a.run.id, b.run.id);
  // Concurrent capture reads may finish in either order; exactly one creates the run.
  assert.deepEqual([a.reused, b.reused].sort(), [false, true]);
  const reloaded = createProofStore({ env });
  assert.equal((await reloaded.status()).runs.length, 1);
  assert.equal((await reloaded.run({ source: 'mcp' })).run.id, a.run.id);
  assert.equal((await fs.stat(path.join(dir, 'integration-runs.json'))).mode & 0o777, 0o600);
});

test('later native read-back updates the original run without duplicate cases', async t => {
  const dir = await directory(t), store = createProofStore({ env: { WORKFLOW_DATA_DIR: dir } });
  const first = await store.run({ source: 'mcp' });
  await fs.writeFile(path.join(dir, 'shiftcare-evidence.json'), JSON.stringify(verified(capture())));
  const next = await store.run({ source: 'mcp' });
  assert.equal(next.run.id, first.run.id); assert.equal(next.reused, true);
  assert.equal(next.run.steps.at(-1).state, 'passed');
  assert.equal(next.run.steps.at(-2).state, 'passed');
  assert.equal((await store.status()).runs.length, 1);
});

test('invalidated native proof removes saved success on reload and replay', async t => {
  const dir = await directory(t, verified(capture())), store = createProofStore({ env: { WORKFLOW_DATA_DIR: dir } });
  const first = await store.run({ source: 'mcp' });
  assert.equal(first.run.steps.at(-1).state, 'passed');
  const changed = verified(capture()); changed.proof.readback.description = 'A different native task';
  await fs.writeFile(path.join(dir, 'shiftcare-evidence.json'), JSON.stringify(changed));
  const status = await createProofStore({ env: { WORKFLOW_DATA_DIR: dir } }).status();
  assert.equal(status.capture.proof.status, 'awaiting_approval');
  assert.notEqual(status.runs[0].steps.at(-1).state, 'passed');
  const next = await store.run({ source: 'mcp' });
  assert.equal(next.run.id, first.run.id);
  assert.notEqual(next.run.steps.at(-1).state, 'passed');
});

test('wrong account, absent capture and unconfigured hosted storage stop a review', async t => {
  const dir = await directory(t);
  await assert.rejects(createProofStore({ env: { WORKFLOW_DATA_DIR: dir, SHIFTCARE_ACCOUNT_ID: '999' } }).run({ source: 'mcp' }), e => e.code === 'ACCOUNT_MISMATCH');
  await assert.rejects(createProofStore({ env: { WORKFLOW_DATA_DIR: dir, SHIFTCARE_ACCOUNT_ID: '999' } }).status(), e => e.code === 'ACCOUNT_MISMATCH');
  await assert.rejects(createProofStore({ env: { WORKFLOW_DATA_DIR: dir, VERCEL: '1' } }).run({ source: 'mcp' }), e => e.code === 'PERSISTENCE_REQUIRED');
  await fs.unlink(path.join(dir, 'shiftcare-evidence.json'));
  await assert.rejects(createProofStore({ env: { WORKFLOW_DATA_DIR: dir } }).run({ source: 'mcp' }), e => e.code === 'NO_CAPTURE');
});

test('REST evidence is labelled separately, bounded to five pages and never writes', async t => {
  const dir = await directory(t), calls = [];
  const env = { WORKFLOW_DATA_DIR: dir, SHIFTCARE_ACCOUNT_ID: '12345', SHIFTCARE_API_KEY: 'private-api-fixture', SHIFTCARE_TIME_ZONE: 'Australia/Sydney', SHIFTCARE_API_REGION: 'au' };
  const store = createProofStore({ env, fetchImpl: async (url, options) => {
    calls.push({ url, options }); const resource = url.pathname.split('/').at(-1);
    const records = Array.from({ length: 20 }, (_, i) => resource === 'shifts' ? { id: String(100 + i), start_at: '2026-10-10T10:00:00+11:00', end_at: '2026-10-10T11:00:00+11:00', staff: [], clients: [] } : { id: String(10 + i), name: 'Private profile name', email: 'private@example.test' });
    return new Response(JSON.stringify({ [resource]: records, _metadata: { total_count: '200' } }), { headers: { 'Content-Type': 'application/json' } });
  } });
  await assert.rejects(store.run({ source: 'rest', from: '2026-10-01', to: '2026-12-01' }), e => e.code === 'INVALID_QUERY');
  assert.equal(calls.length, 0, 'Invalid date scope must not contact ShiftCare at all.');
  const result = await store.run({ source: 'rest', from: '2026-10-01', to: '2026-10-14' });
  assert.equal(calls.length, 15); assert.ok(calls.every(c => c.options.method === 'GET'));
  assert.ok(result.capture.receipts.every(r => r.pages === 5 && !r.complete)); assert.equal(result.run.complete, false);
  assert.equal(result.capture.source.method, 'rest'); assert.equal(result.capture.proof.status, 'not_run');
  assert.ok(!JSON.stringify(result).includes('private-api-fixture'));
  assert.ok(!JSON.stringify(result).includes('Private profile name'));
});

test('REST review survives reload without replacing the separately captured MCP evidence', async t => {
  const dir = await directory(t), calls = [];
  const env = { WORKFLOW_DATA_DIR: dir, SHIFTCARE_ACCOUNT_ID: '12345', SHIFTCARE_API_KEY: 'private-api-fixture', SHIFTCARE_TIME_ZONE: 'Australia/Sydney', SHIFTCARE_API_REGION: 'au' };
  const fetchImpl = async url => {
    calls.push(url.pathname);
    const resource = url.pathname.split('/').at(-1);
    return new Response(JSON.stringify({ [resource]: [], _metadata: { total_count: '0' } }), { headers: { 'Content-Type': 'application/json' } });
  };
  const store = createProofStore({ env, fetchImpl });
  const result = await store.run({ source: 'rest', from: '2026-10-01', to: '2026-10-14' });
  const reloaded = await createProofStore({ env, fetchImpl }).status();
  assert.equal(reloaded.capture.source.method, 'rest');
  assert.equal(reloaded.captureHash, result.run.sourceHash);
  assert.equal(reloaded.runs[0].id, result.run.id);
  assert.equal(calls.length, 3, 'Reload must not silently contact ShiftCare.');
  const mcp = await store.run({ source: 'mcp' });
  assert.equal(mcp.capture.source.method, 'mcp');
  assert.equal((await store.status()).capture.source.method, 'mcp');
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, 'shiftcare-evidence.json'), 'utf8')).source.method, 'mcp');
});

test('unverified and fixture captures cannot pass as authenticated MCP reads', async t => {
  const c = capture(); c.source.authenticated = false;
  const dir = await directory(t, c), store = createProofStore({ env: { WORKFLOW_DATA_DIR: dir } });
  await assert.rejects(store.run({ source: 'mcp' }), e => e.code === 'UNAUTHENTICATED_EVIDENCE');
  c.source.authenticated = true; c.source.method = 'fixture';
  await fs.writeFile(path.join(dir, 'shiftcare-evidence.json'), JSON.stringify(c));
  await assert.rejects(store.run({ source: 'mcp' }), e => e.code === 'UNAUTHENTICATED_EVIDENCE');
});

test('private evidence API requires office authentication and origin, and rejects mutations', async t => {
  const dir = await directory(t), keys = ['WORKFLOW_STAFF_EMAIL', 'WORKFLOW_STAFF_PASSWORD', 'WORKFLOW_SESSION_SECRET'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, { WORKFLOW_STAFF_EMAIL: 'office@example.test', WORKFLOW_STAFF_PASSWORD: 'fixture', WORKFLOW_SESSION_SECRET: 'test-evidence-session-secret-longer-than-32-chars' });
  const handler = createHandler({ env: { WORKFLOW_DATA_DIR: dir } });
  const server = http.createServer(handler); server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); for (const k of keys) previous[k] === undefined ? delete process.env[k] : process.env[k] = previous[k]; });
  const base = `http://127.0.0.1:${server.address().port}`;
  const cookie = sessionCookie('office@example.test', { headers: {} }).split(';')[0];
  const call = (body, headers = {}, method = body === undefined ? 'GET' : 'POST') => fetch(base, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: base, ...headers }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await call(undefined, { Cookie: '' })).status, 401);
  assert.equal((await call(undefined, { Cookie: 'ocd_staff=forged.cookie' })).status, 401);
  assert.equal((await call(undefined, { Origin: 'https://evil.example' })).status, 403);
  const status = await call(); assert.equal(status.status, 200); assert.equal(status.headers.get('cache-control'), 'no-store');
  assert.equal((await status.json()).writeAdapter, false);
  for (const action of ['approve', 'create_action_item', 'cancel_shift', 'release_pay']) assert.equal((await call({ action })).status, 422);
  for (const value of [null, [], 'bad']) assert.equal((await call(value)).status, 422);
  assert.equal((await call(undefined, {}, 'DELETE')).status, 405);
  assert.equal((await call({ action: 'run', source: 'mcp' })).status, 200);
});
