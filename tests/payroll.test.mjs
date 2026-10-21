import test from 'node:test';
import assert from 'node:assert/strict';
import {
  payrollSources,
  approvePayrollSource,
  preparePayroll,
  payrollDraftIssues,
  addPayrollAdjustment,
  removePayrollAdjustment,
  payrollTotals,
  reviewPayrollDraft,
  payrollExport,
} from '../frontend/features/payroll/engine.mjs';
const seed = () => ({
  workers: [
    { id: 'W1', name: 'Elena' },
    { id: 'W2', name: 'Sam' },
  ],
  participants: [{ id: 'P1', address: 'Woodvale' }],
  bookings: [
    {
      id: 'B1',
      workerId: 'W1',
      participantId: 'P1',
      date: '2026-10-05',
      start: '09:00',
      end: '11:00',
      service: 'Support',
      status: 'Completed',
    },
  ],
  visits: [
    {
      id: 'V1',
      bookingId: 'B1',
      clockIn: '09:04',
      clockOut: '11:02',
      status: 'Reviewed',
      corrections: [],
      note: 'Sensitive clinical note',
    },
  ],
  routeEstimates: [{ bookingId: 'B1', distance: 500 }],
  feeProposals: [{ id: 'F1', amount: 99 }],
});
const approve = (s, extra = {}) =>
  approvePayrollSource(s, {
    bookingId: 'B1',
    token: payrollSources(s, '2026-10-05', '2026-10-05')[0].token,
    breakMinutes: 8,
    actualKm: 5.25,
    hoursReference: 'Timesheet V1',
    mileageReference: 'Approved log',
    note: 'Office checked actual mileage',
    checked: true,
    by: 'Reviewer',
    ...extra,
  });
const prepare = (s) => preparePayroll(s, '2026-10-01', '2026-10-14');
const review = (s, id) =>
  reviewPayrollDraft(s, id, { checked: true, note: 'Checked payroll evidence', by: 'Bookkeeper' });
test('only explicitly approved completed visits enter the draft; route estimates are not actual mileage', () => {
  const s = seed(),
    before = structuredClone(s.feeProposals);
  let d = prepare(s);
  assert.equal(d.lines.length, 0);
  assert.equal(d.issues.length, 1);
  assert.throws(() => review(s, d.id), /approval/);
  approve(s);
  d = prepare(s);
  assert.equal(d.lines.length, 1);
  assert.equal(d.lines[0].minutes, 110);
  assert.equal(d.lines[0].actualKm, 5.25);
  assert.deepEqual(s.feeProposals, before);
});
test('missing, unreviewed, duplicate, overnight and invalid visit records remain exceptions', () => {
  for (const edit of [
    (s) => (s.visits = []),
    (s) => (s.visits[0].status = 'Ready for review'),
    (s) => s.visits.push({ ...s.visits[0], id: 'V2' }),
    (s) => (s.visits[0].clockOut = '01:00'),
    (s) => (s.visits[0].clockIn = '25:00'),
    (s) => (s.workers = []),
  ]) {
    const s = seed();
    edit(s);
    assert.ok(prepare(s).issues.length);
    assert.throws(() => approve(s));
  }
});
test('zero mileage needs explicit evidence and breaks/numbers need validation', () => {
  const s = seed();
  for (const bad of [
    { breakMinutes: -1 },
    { breakMinutes: 118 },
    { breakMinutes: 0.5 },
    { actualKm: -1 },
    { actualKm: NaN },
    { hoursReference: '' },
    { mileageReference: '' },
    { note: '' },
    { checked: false },
  ])
    assert.throws(() => approve(s, bad));
  approve(s, { actualKm: 0, mileageReference: 'Worker confirmed no mileage' });
  assert.equal(prepare(s).lines[0].actualKm, 0);
});
test('source edits invalidate approval and reviewed export; refreshed approval and draft restore the workflow', () => {
  const s = seed();
  approve(s);
  const d = prepare(s);
  review(s, d.id);
  assert.equal(payrollExport(s, d.id).length, 1);
  s.visits[0].clockOut = '11:32';
  assert.ok(payrollDraftIssues(s, d).length);
  assert.throws(() => payrollExport(s, d.id), /current draft/);
  approve(s);
  assert.ok(payrollDraftIssues(s, d).length);
  const updated = prepare(s);
  assert.equal(updated.id, d.id);
  assert.equal(updated.status, 'Draft');
  assert.ok(updated.history.length);
  review(s, d.id);
  assert.equal(payrollExport(s, d.id)[0][8], '2.33');
});
test('worker/address changes require fresh approval and stale modal tokens are rejected', () => {
  const s = seed();
  const token = payrollSources(s, '2026-10-01', '2026-10-14')[0].token;
  s.bookings[0].workerId = 'W2';
  assert.throws(() => approve(s, { token }), /changed/);
  approve(s);
  const d = prepare(s);
  assert.equal(d.lines[0].workerId, 'W2');
  s.participants[0].address = 'Kingsley';
  assert.ok(payrollDraftIssues(s, d).length);
});
test('hours, mileage and signed AUD adjustments total separately with references and approval', () => {
  const s = seed();
  approve(s);
  const d = prepare(s);
  for (const [kind, value] of [
    ['hours', 0.5],
    ['mileage', -1.25],
    ['amount', 25.35],
    ['amount', -5.1],
  ])
    addPayrollAdjustment(s, d.id, {
      workerId: 'W1',
      date: '2026-10-05',
      kind,
      value,
      reference: 'Approved correction',
      reason: 'Checked adjustment',
      checked: true,
    });
  const totals = payrollTotals(d)[0];
  assert.equal(totals.minutes, 140);
  assert.equal(totals.km, 4);
  assert.equal(totals.amount, 20.25);
  review(s, d.id);
  const rows = payrollExport(s, d.id);
  assert.equal(rows.length, 5);
  assert.ok(!JSON.stringify(rows).includes('Sensitive clinical'));
  assert.throws(() => addPayrollAdjustment(s, d.id, {}), /Refresh/);
});
test('adjustments reject invalid units, worker, dates, zero and absent evidence', () => {
  const s = seed(),
    d = prepare(s);
  const valid = {
    workerId: 'W1',
    date: '2026-10-05',
    kind: 'amount',
    value: 5,
    reference: 'Ref',
    reason: 'Reason',
    checked: true,
  };
  for (const bad of [
    { workerId: 'missing' },
    { date: '2026-10-30' },
    { date: '2026-02-30' },
    { kind: 'salary' },
    { value: 0 },
    { value: Infinity },
    { value: 0.001 },
    { reference: '' },
    { reason: '' },
    { checked: false },
  ])
    assert.throws(() => addPayrollAdjustment(s, d.id, { ...valid, ...bad }));
  const a = addPayrollAdjustment(s, d.id, valid);
  removePayrollAdjustment(s, d.id, a.id);
  assert.equal(d.adjustments.length, 0);
  assert.equal(d.history.at(-1).adjustment.id, a.id);
});
test('dates are validated, cancelled visits are excluded, repeated preparation reuses the draft', () => {
  const s = seed();
  assert.throws(() => preparePayroll(s, '2026-02-30', '2026-03-02'));
  assert.throws(() => preparePayroll(s, '2026-10-11', '2026-10-01'));
  const d = prepare(s);
  assert.equal(prepare(s).id, d.id);
  assert.equal(s.payroll.drafts.length, 1);
  s.bookings[0].status = 'Cancelled';
  assert.equal(prepare(s).lines.length, 0);
  assert.throws(() => review(s, d.id), /No approved/);
});
test('new completed visits, cancellation and new approvals invalidate a saved draft across reload', () => {
  const s = seed();
  approve(s);
  const d = prepare(s);
  review(s, d.id);
  const restored = JSON.parse(JSON.stringify(s));
  restored.bookings.push({ ...restored.bookings[0], id: 'B2' });
  assert.ok(payrollDraftIssues(restored, restored.payroll.drafts[0]).length);
  s.bookings[0].status = 'Cancelled';
  assert.throws(() => payrollExport(s, d.id));
});
test('reviewed overlapping drafts cannot include the same visit twice', () => {
  const s = seed();
  approve(s);
  const d = prepare(s);
  review(s, d.id);
  const overlap = preparePayroll(s, '2026-10-05', '2026-10-05');
  assert.match(payrollDraftIssues(s, overlap).join(' '), /another reviewed/);
  assert.throws(() => review(s, overlap.id), /overlapping/);
});

test('spreadsheet exports neutralize formula-like evidence and keep signed numeric adjustments', () => {
  const s = seed();
  approve(s, { hoursReference: '=BAD()', mileageReference: '@external', note: '+command' });
  const d = prepare(s);
  addPayrollAdjustment(s, d.id, {
    workerId: 'W1',
    date: '2026-10-05',
    kind: 'amount',
    value: -10,
    reference: '-formula',
    reason: '=bad',
    checked: true,
  });
  review(s, d.id);
  const rows = payrollExport(s, d.id);
  assert.equal(rows[0][11], "'=BAD()");
  assert.equal(rows[0][12], "'@external");
  assert.equal(rows[1][10], '-10.00');
  assert.equal(rows[1][11], "'-formula");
});
