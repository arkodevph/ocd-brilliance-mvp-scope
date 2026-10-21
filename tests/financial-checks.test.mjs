import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  financialFindings,
  runFinancialChecks,
  updateFinancialCase,
  trackFinancialInvoice,
} from '../frontend/features/financial-checks/engine.mjs';
import {
  approvePayrollSource,
  payrollSources,
  preparePayroll,
  reviewPayrollDraft,
} from '../frontend/features/payroll/engine.mjs';
import { financialPage, paymentTrackingForm } from '../frontend/features/financial-checks/page.mjs';
const require = createRequire(import.meta.url),
  I = require('../workspace/invoices.js');
const scope = { from: '2026-10-01', to: '2026-10-14', asOf: '2026-10-21' };
function fixture() {
  return {
    participants: [
      {
        id: 'P1',
        name: 'Client',
        billingProfile: {
          name: 'Plan manager',
          email: 'billing@example.test',
          source: 'Agreement',
          serviceCategories: { Cleaning: 'Domestic' },
        },
      },
    ],
    workers: [{ id: 'W1', name: 'Worker' }],
    bookings: [
      {
        id: 'B1',
        participantId: 'P1',
        workerId: 'W1',
        date: '2026-10-05',
        start: '09:00',
        end: '10:00',
        status: 'Completed',
        service: 'Cleaning',
      },
    ],
    visits: [
      {
        id: 'V1',
        bookingId: 'B1',
        clockIn: '09:00',
        clockOut: '10:00',
        status: 'Reviewed',
        note: 'Private clinical note',
        tasks: true,
        goals: true,
      },
    ],
    invoices: [
      {
        id: 'I1',
        participantId: 'P1',
        from: '2026-10-01',
        to: '2026-10-14',
        billingName: 'Plan manager',
        billingEmail: 'billing@example.test',
        rateSource: 'Agreement',
        status: 'Reviewed',
        lines: [
          { bookingId: 'B1', description: 'Cleaning', category: 'Domestic', hours: 1, rate: 65 },
        ],
      },
    ],
  };
}
const run = (s) => runFinancialChecks(s, scope, I);
function approve(s) {
  const r = payrollSources(s, scope.from, scope.to)[0];
  approvePayrollSource(s, {
    bookingId: 'B1',
    token: r.token,
    breakMinutes: 0,
    actualKm: 3,
    hoursReference: 'Timesheet',
    mileageReference: 'Mileage log',
    note: 'Checked',
    checked: true,
  });
}
test('real findings replace generic warnings; ready invoices are clear and unapproved payroll is blocked', () => {
  const s = fixture(),
    r = run(s);
  assert.equal(r.invoiceReady, 1);
  assert.equal(r.payrollReady, 0);
  assert.deepEqual(
    r.open.map((c) => c.kind),
    ['pay-source'],
  );
  assert.equal(JSON.stringify(r).includes('Private clinical note'), false);
});
test('uninvoiced and duplicate services are detected across all invoices', () => {
  const s = fixture();
  s.invoices = [];
  assert.ok(run(s).open.some((c) => c.kind === 'uninvoiced'));
  s.invoices = fixture().invoices;
  s.invoices.push({ ...structuredClone(s.invoices[0]), id: 'I2' });
  const r = run(s);
  assert.ok(r.open.some((c) => c.kind === 'duplicate'));
  assert.equal(r.invoiceReady, 0);
});
test('billing recipient, category and numeric defects block readiness', () => {
  const s = fixture();
  s.invoices[0].billingEmail = 'wrong@example.test';
  s.invoices[0].lines[0].rate = NaN;
  s.invoices[0].lines[0].category = 'Wrong';
  const r = run(s);
  assert.equal(r.invoiceReady, 0);
  assert.match(
    r.open.find((c) => c.kind === 'invoice').recorded,
    /Incorrect recipient[\s\S]*mismatch[\s\S]*Invalid/,
  );
});
test('source corrections resolve findings, a recurrence reopens them, reruns do not duplicate cases', () => {
  const s = fixture();
  s.invoices[0].billingEmail = 'bad@example.test';
  const first = run(s);
  const id = first.open.find((c) => c.kind === 'invoice').id;
  run(s);
  assert.equal(Object.keys(s.financialChecks.cases).length, 2);
  s.invoices[0].billingEmail = 'billing@example.test';
  assert.equal(run(s).cases.find((c) => c.id === id).status, 'Resolved');
  s.invoices[0].billingEmail = 'bad@example.test';
  assert.equal(run(s).cases.find((c) => c.id === id).status, 'Open');
  assert.equal(s.financialChecks.cases[id].history.length, 2);
});
test('time differences need evidence; explanation is invalidated by source edits', () => {
  const s = fixture();
  s.visits[0].clockOut = '10:15';
  const c = run(s).open.find((c) => c.kind === 'time');
  assert.throws(
    () =>
      updateFinancialCase(
        s,
        { id: c.id, token: c.token, owner: 'Office', note: 'Agreed one hour', explain: true },
        I,
      ),
    /evidence/,
  );
  updateFinancialCase(
    s,
    {
      id: c.id,
      token: c.token,
      owner: 'Office',
      note: 'Agreed one hour',
      explain: true,
      checked: true,
      reference: 'Client decision',
      by: 'Reviewer',
    },
    I,
  );
  assert.equal(run(s).cases.find((r) => r.id === c.id).status, 'Explained');
  assert.equal(run(s).invoiceReady, 1);
  s.visits[0].clockOut = '10:30';
  assert.equal(run(s).cases.find((r) => r.id === c.id).status, 'Open');
  assert.equal(run(s).invoiceReady, 0);
});
test('stale forms cannot change ownership or explain a changed source; non-time defects cannot be dismissed', () => {
  const s = fixture();
  const c = run(s).open[0];
  const token = c.token;
  s.visits[0].clockOut = '11:00';
  assert.throws(
    () => updateFinancialCase(s, { id: c.id, token, owner: 'Office', note: 'Next' }, I),
    /changed/,
  );
  const current = run(s).open.find((r) => r.id === c.id);
  assert.throws(
    () =>
      updateFinancialCase(
        s,
        {
          id: c.id,
          token: current.token,
          owner: 'Office',
          note: 'Ignore',
          explain: true,
          checked: true,
          reference: 'Ref',
        },
        I,
      ),
    /Only time/,
  );
});
test('approved payroll reconciles to draft, stale hours/mileage and final review are detected', () => {
  const s = fixture();
  approve(s);
  assert.ok(run(s).open.some((c) => c.title.includes('missing from a current draft')));
  const d = preparePayroll(s, scope.from, scope.to);
  assert.ok(run(s).open.some((c) => c.kind === 'pay-draft'));
  reviewPayrollDraft(s, d.id, { checked: true, note: 'Checked' });
  assert.equal(run(s).payrollReady, 1);
  s.visits[0].clockOut = '10:20';
  const r = run(s);
  assert.equal(r.payrollReady, 0);
  assert.ok(r.open.some((c) => c.kind === 'pay-source'));
});
const tracking = {
  invoiceId: 'I1',
  token: '',
  status: 'Returned',
  due: '2026-10-15',
  nextFollowup: '2026-10-22',
  externalReference: 'X-42',
  recipient: 'Manager',
  reference: 'Returned email',
  reason: 'Recipient changed',
  checked: true,
  by: 'Bookkeeper',
};
test('returned and overdue invoices use verified external evidence; paid outcome resolves without changing invoices', () => {
  const s = fixture();
  run(s);
  const original = JSON.stringify(s.invoices);
  assert.throws(() => trackFinancialInvoice(s, { ...tracking, checked: false }), /verification/);
  trackFinancialInvoice(s, tracking);
  let c = run(s).open.find((c) => c.kind === 'followup');
  assert.equal(c.title, 'Invoice was returned');
  trackFinancialInvoice(s, {
    ...tracking,
    token: JSON.stringify(s.financialChecks.tracking.I1),
    status: 'Issued',
  });
  assert.equal(run(s).open.find((c) => c.kind === 'followup').title, 'Invoice is overdue');
  assert.throws(() => trackFinancialInvoice(s, { ...tracking, status: 'Paid' }), /changed/);
  trackFinancialInvoice(s, {
    ...tracking,
    token: JSON.stringify(s.financialChecks.tracking.I1),
    status: 'Paid',
    reason: 'Payment verified',
  });
  assert.equal(run(s).cases.find((r) => r.id === c.id).status, 'Resolved');
  assert.equal(JSON.stringify(s.invoices), original);
  assert.equal(s.financialChecks.history.length, 3);
});
test('period scoping does not resolve another period; older tracked payments stay visible', () => {
  const s = fixture();
  const id = run(s).open[0].id;
  trackFinancialInvoice(s, tracking);
  const r = runFinancialChecks(s, { ...scope, from: '2026-09-01', to: '2026-09-30' }, I);
  assert.equal(r.bookings.length, 0);
  assert.equal(r.open.filter((c) => c.kind === 'followup').length, 1);
  assert.equal(s.financialChecks.cases[id].status, 'Open');
  assert.throws(() => financialFindings(s, { ...scope, from: '2026-02-30' }, I), /valid/);
});
test('charge proposals, changed route estimates and cancellation handoffs are concrete checks', () => {
  const s = fixture();
  s.feeProposals = [
    { id: 'F1', type: 'Transport', bookingId: 'B1', status: 'Proposed', amount: 10 },
  ];
  s.routeEstimates = [{ bookingId: 'B1', distance: 10, duration: 20, destination: 'Old address' }];
  s.bookings.push({ id: 'B2', date: '2026-10-06', status: 'Cancelled', cancellation: {} });
  const kinds = run(s).open.map((r) => r.kind);
  for (const kind of ['fee', 'travel', 'cancel']) assert.ok(kinds.includes(kind));
  s.feeProposals[0].status = 'Approved';
  s.bookings[1].cancellation = {
    billingEvidence: 'Approved no charge',
    travelEvidence: 'Worker did not travel',
  };
  assert.ok(run(s).cases.some((c) => c.kind === 'cancel' && c.status === 'Resolved'));
});
test('case ownership/history and tracking persist across reload; views escape user content and use native controls', () => {
  const s = fixture();
  const c = run(s).open[0];
  updateFinancialCase(
    s,
    { id: c.id, token: c.token, owner: '<img src=x>', note: 'Check timesheet' },
    I,
  );
  const restored = JSON.parse(JSON.stringify(s)),
    result = run(restored);
  const html = financialPage({ state: restored, result, pageHeader: () => '' });
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('<select'));
  assert.ok(html.includes('role="status"'));
  assert.equal(restored.financialChecks.cases[c.id].history.length, 1);
  assert.ok(paymentTrackingForm(restored).includes('External invoice reference'));
});
