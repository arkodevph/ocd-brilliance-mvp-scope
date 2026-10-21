import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectTravel,
  travelContext,
  reviewTravel,
} from '../frontend/features/travel-checker/engine.mjs';
const seed = () => {
  const state = {
    bookings: [
      {
        id: 'B1',
        participantId: 'P1',
        workerId: 'W1',
        date: '2026-10-21',
        start: '10:00',
        end: '12:00',
        status: 'Confirmed',
        service: 'Support',
      },
    ],
    participants: [
      {
        id: 'P1',
        address: 'Woodvale, WA',
        suburb: 'Woodvale',
        location: { coordinates: [115, -31] },
      },
    ],
    workers: [{ id: 'W1', dispatchLocation: { coordinates: [116, -32] } }, { id: 'W2' }],
    routeEstimates: [],
    feeProposals: [{ id: 'F1', amount: 25 }],
  };
  state.routeEstimates.push({
    id: 'RTE-1',
    bookingId: 'B1',
    destination: 'Woodvale, WA',
    origin: 'Office',
    distance: 12,
    duration: 20,
    source: 'Map fixture',
    travelContext: travelContext(state, 'B1'),
  });
  return state;
};
const review = (state, extra = {}) =>
  reviewTravel(state, {
    bookingId: 'B1',
    token: inspectTravel(state)[0].token,
    distance: 12,
    duration: 20,
    source: 'Reviewed route reference',
    note: 'Worker and route checked',
    checked: true,
    ...extra,
  });
test('unchanged estimates are current; scans do not mutate records', () => {
  const s = seed(),
    before = JSON.stringify(s);
  assert.deepEqual(inspectTravel(s)[0].reasons, []);
  assert.equal(JSON.stringify(s), before);
});
test('worker, dispatch, address, coordinates and booking changes flag the saved numbers', () => {
  for (const [edit, match] of [
    [(s) => (s.bookings[0].workerId = 'W2'), /Worker/],
    [(s) => (s.workers[0].dispatchLocation.coordinates = [117, -33]), /dispatch/],
    [(s) => (s.participants[0].address = 'Kingsley, WA'), /address/],
    [(s) => (s.participants[0].location.coordinates = [118, -34]), /map location/],
    [(s) => (s.bookings[0].start = '11:00'), /Booking/],
    [(s) => (s.bookings[0].date = '2026-10-22'), /Booking/],
    [(s) => (s.bookings[0].status = 'Cancelled'), /status/],
  ]) {
    const s = seed();
    edit(s);
    assert.match(inspectTravel(s)[0].reasons.join(' '), match);
  }
});
test('legacy estimates and invalid kilometres/minutes remain visible for review', () => {
  for (const value of [-1, NaN, Infinity, undefined]) {
    const s = seed();
    delete s.routeEstimates[0].travelContext;
    s.routeEstimates[0].distance = value;
    assert.equal(inspectTravel(s)[0].reasons.length, 2);
  }
  const s = seed();
  s.routeEstimates[0].duration = 0;
  assert.match(inspectTravel(s)[0].reasons.join(' '), /invalid/);
});
test('preceding visit changes and insufficient driving gaps are flagged', () => {
  const s = seed();
  s.bookings.push({ ...s.bookings[0], id: 'B0', start: '09:00', end: '09:50' });
  assert.match(inspectTravel(s)[0].reasons.join(' '), /preceding visit/);
  assert.match(inspectTravel(s)[0].reasons.join(' '), /exceeds/);
  assert.throws(() => review(s), /does not fit/);
  review(s, {
    scheduleRiskAcknowledged: true,
    note: 'Office agreed to reschedule; follow-up recorded.',
  });
  assert.deepEqual(inspectTravel(s)[0].reasons, []);
  s.bookings[1].end = '09:55';
  assert.match(inspectTravel(s)[0].reasons.join(' '), /preceding|changed schedule/);
});
test('a checked review retains history, clears the exact issue and reopens after another edit', () => {
  const s = seed();
  s.bookings[0].workerId = 'W2';
  const old = structuredClone(s.routeEstimates[0]),
    fees = structuredClone(s.feeProposals);
  const r = review(s, { distance: 15, duration: 25 });
  assert.equal(r.review.previousEstimateId, 'RTE-1');
  assert.deepEqual(s.routeEstimates[0], old);
  assert.deepEqual(s.feeProposals, fees);
  assert.deepEqual(inspectTravel(s)[0].reasons, []);
  const restored = JSON.parse(JSON.stringify(s));
  restored.participants[0].address = 'New address';
  assert.match(inspectTravel(restored)[0].reasons.join(' '), /address/);
});
test('stale forms, missing evidence and invalid measurements cannot clear a flag', () => {
  const s = seed(),
    token = inspectTravel(s)[0].token;
  s.bookings[0].workerId = 'W2';
  assert.throws(() => review(s, { token }), /changed/);
  for (const bad of [
    { distance: -1 },
    { duration: NaN },
    { distance: 2, duration: 0 },
    { source: '' },
    { note: ' ' },
    { checked: false },
  ])
    assert.throws(() => review(s, bad));
  assert.equal(s.routeEstimates.length, 1);
});
test('missing participant or booking records remain flagged and cannot be approved', () => {
  const s = seed();
  s.participants = [];
  assert.match(inspectTravel(s)[0].reasons.join(' '), /unavailable/);
  assert.throws(() => review(s), /Restore/);
  s.bookings = [];
  assert.match(inspectTravel(s)[0].reasons[0], /no longer exists/);
  assert.throws(() => review(s), /changed/);
});
test('the latest estimate supersedes earlier values without erasing them', () => {
  const s = seed();
  const r = review(s);
  assert.equal(inspectTravel(s).length, 1);
  assert.equal(inspectTravel(s)[0].estimate.id, r.id);
  assert.equal(s.routeEstimates.length, 2);
});
