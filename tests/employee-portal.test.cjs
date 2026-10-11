const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const portal = require('../workspace/employee-portal.js');
function seed() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/data.js'), 'utf8'), box);
  return structuredClone(box.window.OCD_DEMO_SEED);
}
test('employee demo records initialize once and preserve saved state across reload', () => {
  const state = seed(), data = portal.ensure(state);
  assert.equal(data.notifications.length, state.workers.length * 3);
  assert.equal(data.requests.length, state.workers.length * 2);
  portal.markRead(state, 'WRK-01', 'EMP-WRK-01-roster');
  const restored = JSON.parse(JSON.stringify(state));
  portal.ensure(restored);
  assert.equal(restored.employeePortal.notifications.length, data.notifications.length);
  assert.equal(restored.employeePortal.notifications.find(notice => notice.id === 'EMP-WRK-01-roster').read, true);
  assert.throws(() => portal.markRead(state, 'WRK-02', 'EMP-WRK-01-roster'), /not available/);
});
test('leave requests count weekdays and remain pending without changing balances or assigned visits', () => {
  const state = seed(), data = portal.ensure(state);
  const bookings = structuredClone(state.bookings), balances = structuredClone(data.profiles['WRK-01'].balances);
  const request = portal.requestLeave(state, 'WRK-01', { type: 'Annual leave', from: '2099-11-02', to: '2099-11-06', note: 'Family time' }, '2026-10-10');
  assert.equal(request.days, 5);
  assert.equal(request.status, 'Pending');
  assert.deepEqual(state.bookings, bookings);
  assert.deepEqual(data.profiles['WRK-01'].balances, balances);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(portal.ensure(restored).requests.find(item => item.id === request.id).note, 'Family time');
  portal.withdrawLeave(restored, 'WRK-01', request.id);
  assert.equal(restored.employeePortal.requests.find(item => item.id === request.id).status, 'Withdrawn');
  assert.deepEqual(restored.bookings, bookings);
});
test('invalid, past, weekend-only, excessive and overlapping requests are rejected', () => {
  const state = seed(), input = { type: 'Annual leave', from: '2099-11-02', to: '2099-11-03' };
  for (const value of [
    { ...input, type: 'Unknown' }, { ...input, from: '2020-01-01' },
    { ...input, to: '2099-11-01' }, { ...input, from: '2099-02-30' },
    { ...input, to: '2099-12-31' }, { ...input, note: 'a'.repeat(501) },
    { ...input, from: '2099-11-07', to: '2099-11-08' }
  ]) assert.throws(() => portal.requestLeave(state, 'WRK-01', value, '2026-10-10'));
  portal.requestLeave(state, 'WRK-01', input, '2026-10-10');
  assert.throws(() => portal.requestLeave(state, 'WRK-01', input, '2026-10-10'), /overlap/);
  assert.throws(() => portal.requestLeave(state, 'missing', input, '2026-10-10'), /employee/);
});
test('withdrawal requires the owning employee and a pending request', () => {
  const state = seed(); portal.ensure(state);
  assert.throws(() => portal.withdrawLeave(state, 'WRK-02', 'LV-WRK-01-2'), /own pending/);
  assert.throws(() => portal.withdrawLeave(state, 'WRK-01', 'LV-WRK-01-1'), /own pending/);
  portal.withdrawLeave(state, 'WRK-01', 'LV-WRK-01-2');
  assert.throws(() => portal.withdrawLeave(state, 'WRK-01', 'LV-WRK-01-2'), /own pending/);
});
