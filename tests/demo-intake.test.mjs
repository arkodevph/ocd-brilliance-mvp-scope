import assert from 'node:assert/strict';
import test from 'node:test';
import { demoIntakeRequest, readDemoIntakes } from '../workspace/demo-intake.mjs';

const source = 'Full name: Alex Demo\nEmail: alex@example.test\nService: Domestic assistance\nSuburb: Joondalup\nPostcode: 6027';
function setup() {
  const cache = new Map();
  const storage = { getItem: key => cache.get(key) || null, setItem: (key, value) => cache.set(key, value) };
  let sequence = 0;
  const request = (action, input) => demoIntakeRequest(action, input, storage, () => String(++sequence));
  return { storage, request };
}

test('demo extracts, caches documents, restores records and detects duplicates without server storage', () => {
  const { storage, request } = setup();
  const preview = request('draft-preview', { text: source });
  assert.equal(preview.draft.fields.name, 'Alex Demo');
  assert.deepEqual(preview.issues, []);
  const input = { ...preview.draft.fields, sourceText: source, idempotencyKey: 'demo-submit',
    originalDocument: { name: 'sample.pdf', type: 'application/pdf', data: 'JVBERi0=' } };
  const { record } = request('draft', input);
  assert.match(record.id, /^DEMO-/);
  assert.deepEqual(readDemoIntakes(storage)[0].onboarding.originalDocument, input.originalDocument);
  assert.equal(request('draft', input).record.id, record.id);
  assert.equal(readDemoIntakes(storage).length, 1);
  assert.equal(request('draft-preview', { text: source }).duplicate.id, record.id);
});

test('cached reviews require source confirmation and protect against stale edits', () => {
  const { request, storage } = setup();
  const { draft } = request('draft-preview', { text: source });
  const { record } = request('draft', { ...draft.fields, sourceText: source, idempotencyKey: 'review' });
  const input = { ...record, status: 'Reviewing', sourceReviewed: false };
  assert.throws(() => request('draft-review', input), /Compare/);
  const reviewed = request('draft-review', { ...input, sourceReviewed: true }).record;
  assert.equal(readDemoIntakes(storage)[0].status, 'Reviewing');
  assert.ok(reviewed.onboarding.reviewedAt);
  assert.throws(() => request('draft-review', { ...input, sourceReviewed: true }), /changed/);
});

test('cache failures are reported and malformed cache does not prevent demo checks', () => {
  const storage = { getItem: () => '{broken', setItem: () => { throw new Error('Quota'); } };
  assert.deepEqual(readDemoIntakes(storage), []);
  assert.throws(() => demoIntakeRequest('draft', { sourceText: source }, storage, () => 'test'), /cache is full or unavailable/);
});
