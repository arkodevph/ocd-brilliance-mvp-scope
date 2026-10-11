const assert = require('node:assert/strict');
const test = require('node:test');
const rules = require('../workspace/booking-rules.js');
const E = require('../workspace/automation-engine.js');
const fs = require('node:fs');
const vm = require('node:vm');
function seed() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/data.js'), 'utf8'), box);
  return structuredClone(box.window.OCD_DEMO_SEED);
}
const visit = { service: 'Nursing', date: '2026-10-12', start: '10:00', end: '12:00' };
test('skills filter before distance, and unknown distances remain eligible but rank last', () => {
  const s = seed(), p = s.participants[0];
  const nurse = s.workers.find(w => w.id === 'WRK-03');
  const cleaner = { ...s.workers[1], services: ['Nursing'], dispatchLocation: p.location };
  const unknown = { ...nurse, id: 'unknown', name: 'Unknown distance', dispatchLocation: undefined };
  const near = { ...nurse, id: 'near', name: 'Near nurse', dispatchLocation: p.location };
  const matches = rules.candidates([cleaner, unknown, nurse, near], visit, p);
  assert.deepEqual(matches.map(match => match.worker.id), ['near', 'WRK-03', 'unknown']);
  assert.equal(matches[0].distanceKm, 0);
  assert.equal(matches[2].distanceKm, null);
  assert.match(rules.assignmentIssue(cleaner, visit), /skills/);
  assert.equal(rules.distanceKm([181, 0], [0, 0]), null);
});
test('assignment checks approval, days, additional skills, clocks and overlap', () => {
  const nurse = seed().workers[2];
  assert.match(rules.assignmentIssue({ ...nurse, approved: false }, visit), /approval/);
  assert.match(rules.assignmentIssue(nurse, { ...visit, date: '2026-10-14' }), /unavailable/);
  assert.match(rules.assignmentIssue(nurse, { ...visit, requiredSkills: ['wound-care'] }), /wound-care/);
  assert.match(rules.assignmentIssue(nurse, { ...visit, date: '2026-02-30' }), /valid/);
  assert.match(rules.assignmentIssue(nurse, { ...visit, end: '09:00' }), /valid/);
  const existing = { ...visit, id: 'existing', workerId: nurse.id, status: 'Confirmed' };
  assert.match(rules.assignmentIssue(nurse, visit, [existing]), /another booking/);
  assert.equal(rules.assignmentIssue(nurse, { ...visit, start: '12:00', end: '13:00' }, [existing]), '');
  assert.equal(rules.assignmentIssue(nurse, visit, [{ ...existing, status: 'Cancelled' }]), '');
});
test('same as before uses only the latest completed booking belonging to that client', () => {
  const bookings = [
    { id: 'old', participantId: 'own', date: '2026-10-01', start: '09:00', status: 'Completed' },
    { id: 'latest', participantId: 'own', date: '2026-10-02', start: '09:00', status: 'Completed' },
    { id: 'future', participantId: 'own', date: '2026-10-15', start: '09:00', status: 'Confirmed' },
    { id: 'other', participantId: 'other', date: '2026-10-08', start: '09:00', status: 'Completed' }
  ];
  const snapshot = JSON.stringify(bookings);
  assert.equal(rules.previousBooking(bookings, 'own').id, 'latest');
  assert.equal(rules.previousBooking(bookings, 'none'), null);
  assert.equal(JSON.stringify(bookings), snapshot);
});
test('native assignment review cannot bypass required skills with a modified selection', () => {
  const s = seed(); E.ensure(s);
  const booking = s.bookings.find(b => b.id === 'BKG-502');
  booking.service = 'Nursing';
  s.automation.remote.bookings.find(b => b.id === booking.id).service = 'Nursing';
  s.automation.remote.workers.find(w => w.id === 'WRK-01').services.push('Nursing');
  const job = E.cover(s, booking.id);
  assert.throws(() => E.approve(s, job.id, { ...job.draft, workerId: 'WRK-01', sourceReviewed: true, availabilityReviewed: true }), /skills/);
  assert.equal(booking.workerId, 'WRK-02');
});
