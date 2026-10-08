const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const E = require('../workspace/automation-engine.js');
function seed() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/data.js'), 'utf8'), box);
  const state = structuredClone(box.window.OCD_DEMO_SEED);
  E.ensure(state); E.sync(state); E.ingest(state);
  return state;
}
const jobOf = (s, kind) => s.automation.jobs.find(j => j.kind === kind);
const reviewed = (job, extra = {}) => ({ ...job.draft, sourceReviewed: true, areaReviewed: true, ...extra });
const cancelReview = j => reviewed(j, { charge: 'with-charge', code: 'NSDH', policyReviewed: true });

test('routing assigns owners and deduplicates repeated source IDs across reload', () => {
  const s = seed(), count = s.automation.jobs.length;
  assert.equal(jobOf(s, 'finance-query').owner, 'Bookkeeper');
  assert.equal(jobOf(s, 'finance-query').priority, 'Urgent');
  assert.equal(E.ingest(s).created, 0);
  assert.equal(s.automation.jobs.length, count);
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(E.ingest(restored).created, 0);
  assert.equal(restored.automation.jobs.length, count);
});

test('participant onboarding blocks missing/invalid DOB, area and unreviewed evidence', () => {
  const s = seed(), j = jobOf(s, 'participant');
  assert.throws(() => E.approve(s, j.id, reviewed(j, { dob: '' })), /date of birth/);
  assert.throws(() => E.approve(s, j.id, reviewed(j, { dob: '1981-02-31' })), /date of birth/);
  assert.throws(() => E.approve(s, j.id, reviewed(j, { areaReviewed: false })), /area/);
  assert.throws(() => E.approve(s, j.id, reviewed(j, { sourceReviewed: false })), /source/);
  assert.equal(s.automation.remote.participants.length, 3);
});

test('native creation cannot update projections or close onboarding before read-back and Xero check', () => {
  const s = seed(), j = jobOf(s, 'participant');
  E.approve(s, j.id, reviewed(j));
  E.native(s, j.id);
  assert.equal(j.status, 'verifying'); assert.equal(s.participants.length, 3);
  assert.equal(s.automation.remote.participants.length, 4);
  assert.throws(() => E.accounting(s, j.id, { checked: true, reference: 'XERO', note: 'Checked' }), /Verify/);
  E.verify(s, j.id);
  assert.equal(s.participants.length, 4); assert.equal(j.stage, 'accounting');
  assert.throws(() => E.accounting(s, j.id, { checked: true, reference: '', note: 'Checked' }), /reference/);
  E.accounting(s, j.id, { checked: true, reference: 'DEMO-XERO-CONTACT', note: 'Linked sample contact reviewed' });
  assert.equal(j.status, 'completed'); assert.equal(j.accounting.demo, true);
});

test('employee onboarding leaves screening and payroll separate', () => {
  const s = seed(), j = jobOf(s, 'employee');
  E.approve(s, j.id, reviewed(j)); E.native(s, j.id); E.verify(s, j.id);
  const worker = s.workers.find(w => w.email === 'noah.reed@example.com');
  assert.equal(worker.approved, false); assert.deepEqual(worker.days, []);
  assert.equal(j.stage, 'accounting'); assert.equal(j.status, 'manual_action_required');
});

test('existing email forces a reviewed match instead of duplicate creation', () => {
  const s = seed(), j = jobOf(s, 'participant');
  s.automation.remote.participants[0].email = j.draft.email;
  assert.throws(() => E.approve(s, j.id, reviewed(j)), /existing record/);
  E.approve(s, j.id, reviewed(j, { matchId: 'PAR-101' })); E.native(s, j.id); E.verify(s, j.id);
  assert.equal(s.automation.remote.participants.length, 3);
});

test('cancellation requires exact charge/scope approval and never changes other occurrences', () => {
  const s = seed(), j = jobOf(s, 'cancel');
  assert.throws(() => E.approve(s, j.id, reviewed(j)), /billing treatment/);
  assert.throws(() => E.approve(s, j.id, cancelReview({ ...j, draft: { ...j.draft, scope: 'series' } })), /scope/);
  const other = structuredClone(s.bookings.find(b => b.id === 'BKG-501'));
  E.approve(s, j.id, cancelReview(j)); E.native(s, j.id);
  assert.equal(s.bookings.find(b => b.id === j.targetId).status, 'Confirmed');
  E.verify(s, j.id);
  assert.equal(s.bookings.find(b => b.id === j.targetId).status, 'Cancelled');
  assert.deepEqual(s.bookings.find(b => b.id === 'BKG-501'), other);
});

test('group attendance and financially locked cancellations require human native handling', () => {
  for (const changes of [{ participantIds: ['PAR-101', 'PAR-102'] }, { invoiced: true }, { approved: true }]) {
    const s = seed(), j = jobOf(s, 'cancel'), b = s.automation.remote.bookings.find(b => b.id === j.targetId);
    Object.assign(b, changes); E.approve(s, j.id, cancelReview(j));
    assert.equal(j.status, 'manual_action_required');
    assert.throws(() => E.native(s, j.id), /Approve/); assert.equal(b.status, 'Confirmed');
  }
});

test('lost write response blocks blind retry and reconciles without a second creation', () => {
  const s = seed(), j = jobOf(s, 'participant'); E.approve(s, j.id, reviewed(j));
  E.native(s, j.id, 'timeout'); assert.equal(j.status, 'reconciliation_required');
  assert.equal(s.participants.length, 3); assert.equal(s.automation.remote.participants.length, 4);
  assert.throws(() => E.native(s, j.id), /reconciliation/);
  assert.throws(() => E.reopen(s, j.id), /reconcile/);
  const restored = JSON.parse(JSON.stringify(s)); E.verify(restored, j.id);
  assert.equal(restored.automation.remote.participants.length, 4);
  assert.equal(E.get(restored, j.id).stage, 'accounting');
});

test('concurrent native edit invalidates the previous cancellation approval', () => {
  const s = seed(), j = jobOf(s, 'cancel'); E.approve(s, j.id, cancelReview(j));
  s.automation.remote.bookings.find(b => b.id === j.targetId).start = '10:00';
  E.native(s, j.id); assert.equal(j.status, 'needs_review'); assert.equal(j.approvedAt, undefined);
  assert.equal(s.automation.remote.bookings.find(b => b.id === j.targetId).status, 'Confirmed');
});

test('failed read-back cannot publish an unverified booking outcome or notification', () => {
  const s = seed(), j = jobOf(s, 'cancel'); E.approve(s, j.id, cancelReview(j)); E.native(s, j.id);
  s.automation.remote.bookings.find(b => b.id === j.targetId).status = 'Confirmed';
  E.verify(s, j.id); assert.equal(j.status, 'manual_action_required');
  assert.equal(s.automation.messages.length, 0); assert.equal(s.bookings.find(b => b.id === j.targetId).status, 'Confirmed');
});

test('pre-dispatch retries are bounded and never bypass native offer/worker acceptance', () => {
  const s = seed(), j = jobOf(s, 'cover');
  E.approve(s, j.id, reviewed(j, { workerId: 'WRK-01', availabilityReviewed: true }));
  E.native(s, j.id, 'network'); assert.equal(j.stage, 'offer'); assert.equal(j.status, 'retry_scheduled');
  E.native(s, j.id); assert.equal(j.stage, 'offer_readback'); assert.equal(s.coverOffers.length, 0);
  E.verify(s, j.id); assert.equal(j.stage, 'worker_acceptance');
  assert.equal(s.bookings.find(b => b.id === j.targetId).workerId, 'WRK-02');
  const other = seed(), cancelled = jobOf(other, 'cancel'); E.approve(other, cancelled.id, cancelReview(cancelled));
  E.native(other, cancelled.id, 'network'); E.native(other, cancelled.id, 'network'); E.native(other, cancelled.id, 'network');
  assert.equal(cancelled.status, 'manual_action_required'); assert.equal(cancelled.attempts, 3);
});

test('cover requires the selected worker response then native assignment read-back', () => {
  const s = seed(), j = jobOf(s, 'cover');
  E.approve(s, j.id, reviewed(j, { workerId: 'WRK-01', availabilityReviewed: true })); E.native(s, j.id); E.verify(s, j.id);
  const offer = s.coverOffers.find(o => o.automationJobId === j.id);
  assert.throws(() => E.workerResponse(s, offer.id, 'WRK-03', true), /this worker/);
  assert.throws(() => E.approve(s, j.id, reviewed(j, { communication: 'Contacted' })), /new review/);
  E.workerResponse(s, offer.id, 'WRK-01', true);
  E.approve(s, j.id, reviewed(j, { communication: 'Office agreed the replacement with participant' })); E.native(s, j.id);
  assert.equal(s.bookings.find(b => b.id === j.targetId).workerId, 'WRK-02');
  E.verify(s, j.id); assert.equal(s.bookings.find(b => b.id === j.targetId).workerId, 'WRK-01');
  assert.equal(j.status, 'completed');
});

test('non-expiring documents require explicit evidence and verified date clearing', () => {
  const s = seed(), j = E.document(s, 'WDC-04');
  assert.throws(() => E.approve(s, j.id, reviewed(j, { expires: '', note: 'Checked' })), /expiry/);
  E.approve(s, j.id, reviewed(j, { noExpiration: true, note: 'Original induction acknowledgement has no expiry' })); E.native(s, j.id);
  assert.equal(s.workerDocs.find(d => d.id === 'WDC-04').status, 'Expired');
  E.verify(s, j.id); const d = s.workerDocs.find(d => d.id === 'WDC-04');
  assert.equal(d.expires, ''); assert.equal(d.noExpiration, true); assert.equal(d.status, 'Valid');
});

test('returned agreement stays unsigned until checked native filing is read back', () => {
  const s = seed(), j = jobOf(s, 'file');
  assert.throws(() => E.approve(s, j.id, reviewed(j)), /signature/);
  E.approve(s, j.id, reviewed(j, { fileReviewed: true })); E.native(s, j.id);
  assert.equal(s.agreements.find(a => a.id === j.targetId).status, 'Awaiting signature');
  E.verify(s, j.id); assert.equal(s.agreements.find(a => a.id === j.targetId).status, 'Signed');
  assert.match(j.verifiedId, /^DEMO-SC-/);
});

test('bookkeeping exposes missing notes/scope and refreshes changed native evidence without duplicate cases', () => {
  const s = seed(); E.run(s, 'invoices', { partial: true });
  assert.equal(s.automation.lastReport.complete, false);
  assert.equal(jobOf(s, 'partial-report').status, 'needs_review');
  const report = s.automation.jobs.find(j => j.kind === 'finance' && j.targetId === 'BKG-498');
  assert.match(report.source.body, /progress note missing/);
  const count = s.automation.jobs.length;
  const v = s.visits.find(v => v.bookingId === 'BKG-498'); v.note = 'Completed'; v.tasks = 'Laundry'; v.goals = 'Completed household tasks';
  E.captureCare(s, v.bookingId); E.run(s, 'invoices', { partial: true });
  assert.equal(s.automation.jobs.length, count);
  assert.doesNotMatch(report.source.body, /progress note missing/);
  assert.equal(s.feeProposals.length, 0);
});

test('delivery failure and retry are separate from the verified native mutation, without duplicate recipient messages', () => {
  const s = seed(), j = jobOf(s, 'cancel'); E.approve(s, j.id, cancelReview(j)); E.native(s, j.id); E.verify(s, j.id);
  const m = s.automation.messages[0]; assert.equal(m.status, 'pending');
  E.deliver(s, m.id, true); assert.equal(s.updates.filter(u => u.messageId === m.id).length, 0);
  E.deliver(s, m.id); assert.equal(s.updates.filter(u => u.messageId === m.id).length, 1);
  assert.throws(() => E.deliver(s, m.id), /already delivered/);
  assert.equal(j.attempts, 1); assert.equal(m.to, 'client:PAR-101');
  assert.doesNotMatch(m.detail, /note|dob|1981|Medical appointment/);
});

test('new booking requires native worker acceptance and verification, not only participant agreement', () => {
  const s = seed(); s.bookings.push({ id: 'BKG-900', participantId: 'PAR-101', workerId: 'WRK-01', date: '2026-10-09', start: '10:00', end: '12:00', service: 'Domestic assistance', recurrence: 'One-off', status: 'Proposed' });
  const j = E.bookingProposal(s, 'BKG-900');
  assert.throws(() => E.approve(s, j.id, reviewed(j, { participantAgreed: true })), /worker acceptance/);
  E.approve(s, j.id, reviewed(j, { participantAgreed: true, workerAccepted: true })); E.native(s, j.id);
  assert.equal(s.bookings.find(b => b.id === 'BKG-900').status, 'Proposed');
  E.verify(s, j.id); assert.equal(s.bookings.find(b => b.id === 'BKG-900').status, 'Confirmed');
});

test('fresh native eligibility and roster conflicts invalidate approval before dispatch', () => {
  for (const change of ['screening', 'overlap']) {
    const s = seed(), j = jobOf(s, 'cover');
    E.approve(s, j.id, reviewed(j, { workerId: 'WRK-01', availabilityReviewed: true }));
    if (change === 'screening') s.automation.remote.workers.find(w => w.id === 'WRK-01').approved = false;
    else s.automation.remote.bookings.push({ ...structuredClone(s.automation.remote.bookings.find(b => b.id === j.targetId)), id: 'BKG-CONCURRENT', workerId: 'WRK-01', status: 'Confirmed' });
    E.native(s, j.id);
    assert.equal(j.status, 'needs_review');
    assert.equal(s.automation.remote.offers.filter(o => o.automationJobId === j.id).length, 0);
    assert.equal(j.attempts, 0);
  }
});

test('changed new-booking proposal invalidates approval and verification checks exact occurrence fields', () => {
  for (const phase of ['before-dispatch', 'before-readback']) {
    const s = seed(); s.bookings.push({ id: 'BKG-900', participantId: 'PAR-101', workerId: 'WRK-01', date: '2026-10-09', start: '10:00', end: '12:00', service: 'Domestic assistance', recurrence: 'One-off', status: 'Proposed' });
    const j = E.bookingProposal(s, 'BKG-900');
    E.approve(s, j.id, reviewed(j, { participantAgreed: true, workerAccepted: true }));
    if (phase === 'before-dispatch') {
      s.bookings.find(b => b.id === j.targetId).start = '09:30'; E.native(s, j.id);
      assert.equal(j.status, 'needs_review'); assert.equal(j.attempts, 0);
    } else {
      E.native(s, j.id); s.automation.remote.bookings.find(b => b.id === j.targetId).start = '09:30'; E.verify(s, j.id);
      assert.equal(j.status, 'manual_action_required');
      assert.equal(s.bookings.find(b => b.id === j.targetId).status, 'Proposed');
      assert.equal(s.automation.messages.length, 0);
    }
  }
});

test('malformed attendance and impossible review dates stay visible as exceptions', () => {
  const s = seed(), v = s.automation.remote.visits.find(v => v.bookingId === 'BKG-498');
  for (const time of ['25:00', '09:90', '9:', ':30', '']) {
    v.clockIn = time; E.run(s, 'invoices');
    assert.match(s.automation.jobs.find(j => j.kind === 'finance' && j.targetId === v.bookingId).source.body, /Actual clock times are missing\/invalid/);
  }
  assert.throws(() => E.run(s, 'payroll', { from: '2026-02-31', to: '2026-03-05' }), /valid inclusive/);
});

test('real server enquiries are excluded from the fictional ShiftCare adapter', () => {
  const s = seed(); s.enquiries.push({ id: 'REAL-REQUEST', serverRecord: true });
  assert.throws(() => E.intake(s, 'REAL-REQUEST'), /fictional records/);
  assert.equal(E.catalog.length, 14);
});

test('arrival snapshots require consent and current assignment, and withdraw stale estimates', () => {
  const box = { window: {} }; vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/maps.js'), 'utf8'), box);
  const maps = box.window.OCD_MAPS, s = seed(), b = s.bookings.find(b => b.id === 'BKG-501'), clock = Date.now();
  s.journeys[b.id] = { workerId: b.workerId, date: b.date, start: b.start, phase: 'en-route', progress: 0.25, durationSeconds: 960, updatedAt: clock };
  assert.equal(maps.snapshot(s, b, clock).phase, 'not-started');
  s.journeys[b.id].consent = true; assert.equal(maps.snapshot(s, b, clock).phase, 'en-route');
  assert.equal(maps.snapshot(s, b, clock + 120001).phase, 'stale');
  b.workerId = 'WRK-03'; assert.equal(maps.snapshot(s, b, clock).phase, 'not-started');
  maps.reconcileJourneys(s); assert.equal(s.journeys[b.id], undefined);
});

test('participant home withdraws stale ETA instead of presenting the schedule as an arrival', () => {
  const box = { window: {} }; vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/maps.js'), 'utf8'), box);
  const s = seed(), b = s.bookings.find(b => b.id === 'BKG-501');
  s.journeys[b.id] = { workerId: b.workerId, date: b.date, start: b.start, consent: true, phase: 'en-route', progress: 0.25, durationSeconds: 960, updatedAt: Date.now() - 120001 };
  const html = box.window.OCD_MAPS.summary(s, b);
  assert.match(html, /data-arrival-time>ETA unavailable</);
  assert.ok(!html.includes(`Scheduled ${b.start}`));
});
