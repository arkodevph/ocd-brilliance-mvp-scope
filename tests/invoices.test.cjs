const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const I = require('../workspace/invoices.js');
function seed() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/data.js'), 'utf8'), box);
  return structuredClone(box.window.OCD_DEMO_SEED);
}
test('invoice arithmetic rounds cents and rejects invalid amounts', () => {
  assert.equal(I.lineTotal({ hours: 2, rate: 19.99 }), 3998);
  assert.equal(I.total({ lines: [{ hours: 1.5, rate: 65 }, { hours: 2, rate: 19.99 }] }), 13748);
  for (const hours of [0, -1, 25, NaN]) assert.throws(() => I.lineTotal({ hours, rate: 65 }));
  for (const rate of [0, -1, Infinity, 10001]) assert.throws(() => I.lineTotal({ hours: 1, rate }));
});
test('invoice drafts include only uninvoiced completed visits and retain source references', () => {
  const state = seed(); I.ensure(state);
  assert.equal(state.invoices.length, 2);
  assert.ok(state.invoices.every(i => i.status === 'Draft' && i.example));
  const draft = I.create(state, { participantId: 'PAR-102', from: '2026-10-05', to: '2026-10-09', rate: 65, rateSource: 'Test agreement' });
  assert.deepEqual(draft.lines.map(l => l.bookingId), ['BKG-500']);
  assert.equal(I.total(draft), 6500);
  state.invoices.push(draft);
  assert.throws(() => I.create(state, { participantId: 'PAR-102', from: '2026-10-05', to: '2026-10-09', rate: 65, rateSource: 'Test agreement' }), /No uninvoiced/);
  assert.throws(() => I.create(state, { participantId: 'PAR-102', from: '2026-02-30', to: '2026-10-09', rate: 65, rateSource: 'Test agreement' }), /valid service period/);
  assert.throws(() => I.create(state, { participantId: 'PAR-102', from: '2026-10-09', to: '2026-10-05', rate: 65, rateSource: 'Test agreement' }), /valid service period/);
  assert.equal(I.ensure(state).length, 3);
});
