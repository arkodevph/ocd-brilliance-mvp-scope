const assert = require('node:assert/strict');
const test = require('node:test');
const presentation = require('../workspace/client-presentation.js');
const engine = require('../workspace/automation-engine.js');

test('seven business areas cover each operational workflow once, with arrival as the fourteenth', () => {
  const mapped = presentation.areas.flatMap(a => a.workflows);
  assert.equal(presentation.areas.length, 7);
  assert.equal(new Set(mapped).size, mapped.length);
  assert.deepEqual([...mapped].sort(), engine.catalog.filter(w => w.id !== 'W14').map(w => w.id).sort());
  assert.equal(engine.catalog.length, 14);
});

test('capacity estimates preserve missing inputs and explicit zero', () => {
  assert.equal(presentation.estimate({ volume: '', manualMinutes: 20, assistedMinutes: 8 }).ready, false);
  assert.equal(presentation.estimate({ volume: 40, manualMinutes: null, assistedMinutes: 8 }).ready, false);
  assert.deepEqual(presentation.estimate({ volume: 0, manualMinutes: 20, assistedMinutes: 8 }), { ready: true, hours: 0, costEquivalent: null });
  assert.deepEqual(presentation.estimate({ volume: 40, manualMinutes: 20, assistedMinutes: 8, hourlyRate: 35 }), { ready: true, hours: 8, costEquivalent: 280 });
});

test('estimates expose additional effort and reject invalid or overflowing assumptions', () => {
  assert.deepEqual(presentation.estimate({ volume: 40, manualMinutes: 8, assistedMinutes: 20, hourlyRate: 35 }), { ready: true, hours: -8, costEquivalent: -280 });
  for (const value of [-1, Infinity, 'invalid', true, {}, Number.MAX_SAFE_INTEGER + 1]) assert.equal(presentation.estimate({ volume: value, manualMinutes: 20, assistedMinutes: 8 }).ready, false);
  assert.equal(presentation.estimate({ volume: Number.MAX_SAFE_INTEGER, manualMinutes: 20, assistedMinutes: 8 }).ready, false);
  assert.equal(presentation.estimate({ volume: 40, manualMinutes: 20, assistedMinutes: 8, hourlyRate: '' }).costEquivalent, null);
});

test('scorecard comparisons respect favourable direction without converting blanks into results', () => {
  assert.equal(presentation.comparison('', 0).ready, false);
  assert.deepEqual(presentation.comparison(20, 8), { ready: true, change: -12, improvement: true });
  assert.deepEqual(presentation.comparison(50, 80, 'higher'), { ready: true, change: 30, improvement: true });
  assert.deepEqual(presentation.comparison(80, 50, 'higher'), { ready: true, change: -30, improvement: false });
  assert.deepEqual(presentation.comparison(0, 0), { ready: true, change: 0, improvement: false });
});

function response() {
  const args = { title: 'Synthetic action', description: 'Test only', assignee_id: 42, due_date: '2026-10-08', priority: 'low', verification_method: 'self_attestation' };
  return {
    captureHash: 'current',
    capture: {
      source: { method: 'mcp', authenticated: true }, capturedAt: '2026-10-07T06:00:00Z', account: { id: '123', timeZone: 'Australia/Sydney' },
      receipts: [{ status: 'passed', tool: 'list_shifts', complete: true }], data: { shifts: [{ id: 'sensitive-shift', note: 'PRIVATE CARE TEXT' }], participants: [{ name: 'PRIVATE NAME' }], staff: [] },
      proof: { status: 'verified', createdId: '11', proposal: { tool: 'create_action_item', args }, readback: { tool: 'get_action_item', id: '11', title: args.title, description: args.description, assigneeId: '42', dueDate: args.due_date, priority: args.priority, verificationMethod: args.verification_method, verifiedAt: '2026-10-07T06:01:00Z', status: 'Open' } }
    },
    runs: [{ sourceHash: 'old', account: { id: '123' }, findings: [1, 2] }, { sourceHash: 'current', account: { id: 'other' }, findings: [1] }, { sourceHash: 'current', account: { id: '123' }, findings: [1, 2, 3] }]
  };
}

test('evidence summary requires authenticated native evidence and matching independent read-back', () => {
  const value = response();
  const summary = presentation.evidenceSummary(value);
  assert.equal(summary.nativeVerified, true);
  assert.equal(summary.findings, 3);
  assert.equal(summary.shifts, 1);
  assert.equal(JSON.stringify(summary).includes('PRIVATE'), false);
  value.capture.proof.readback.description = 'Unexpected change';
  assert.equal(presentation.evidenceSummary(value).nativeVerified, false);
  value.capture.source.authenticated = false;
  assert.equal(presentation.evidenceSummary(value).available, false);
  value.capture.source = { method: 'fixture', authenticated: true };
  assert.equal(presentation.evidenceSummary(value).nativeVerified, false);
  assert.equal(presentation.evidenceSummary({ capture: null }).available, false);
});

test('reports distinguish assumptions, observations and historical proof without copying account records', () => {
  const value = response();
  const report = presentation.buildReport({ date: '2026-10-08', estimateBasis: 'illustrative', estimate: { volume: 40, manualMinutes: 20, assistedMinutes: 8, hourlyRate: 35 }, evidence: presentation.evidenceSummary(value), baselinePeriod: 'Example baseline', score: { cover: { baseline: 50, pilot: 80 } }, rawCapture: value.capture, credentials: 'PRIVATE PASSWORD' });
  assert.match(report, /Illustrative example; not client measurements/);
  assert.match(report, /8 staff hours per month/);
  assert.match(report, /not a cash-saving/);
  assert.match(report, /not independently verified/);
  assert.match(report, /dated capture, not a live connection check/);
  assert.match(report, /one supervised native action/);
  assert.match(report, /Cover accepted before deadline.*50.*80.*30/);
  for (const privateValue of ['PRIVATE', 'sensitive-shift', 'Synthetic action', 'Test only']) assert.equal(report.includes(privateValue), false);
  const absent = presentation.buildReport({ evidence: presentation.evidenceSummary({ capture: null }) });
  assert.match(absent, /No authenticated account evidence/);
  assert.match(absent, /required inputs are missing or invalid/);
  assert.doesNotMatch(absent, /One approved administrative follow-up/);
});

test('fixture captures and unrelated saved runs cannot become evidence in the client report', () => {
  const value = response(); value.runs = value.runs.slice(0, 2);
  assert.equal(presentation.evidenceSummary(value).findings, null);
  value.capture.source.method = 'fixture';
  const report = presentation.buildReport({ evidence: presentation.evidenceSummary(value) });
  assert.match(report, /sample workflow is not proof/);
  assert.doesNotMatch(report, /One approved administrative follow-up/);
});
