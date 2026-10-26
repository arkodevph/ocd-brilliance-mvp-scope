const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');

const root = path.resolve(__dirname, '..');
const bundled = buildSync({
  entryPoints: [path.join(root, 'frontend/features/operations/model.ts')],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
});
const compiled = { exports: {} };
new Function('module', 'exports', 'require', bundled.outputFiles[0].text)(
  compiled,
  compiled.exports,
  require,
);
const M = compiled.exports;
const now = '2026-10-25T09:00:00.000Z';

function start(number) {
  let store = M.initialStore(now);
  const fixture = store.cases.find((c) => c.opportunity === number);
  store = M.transition(
    store,
    {
      type: 'create',
      opportunity: number,
      person: 'Fictional review person',
      subject: `Acceptance example ${number}`,
      source: `Original fictional source for acceptance case ${number}`,
      branch: M.BRANCHES[0],
    },
    now,
  );
  const id = store.cases[0].id;
  // Capture starts empty. These tests explicitly enter the reviewed fictional source values.
  for (const f of fixture.fields.filter((f) => f.value && !M.isComputedField(fixture, f.key)))
    store = M.transition(store, { type: 'field', id, key: f.key, value: f.value }, now);
  return { store, id };
}
function ready(store, id) {
  let c = store.cases.find((c) => c.id === id);
  if (M.definition(c.opportunity).selection === 'G')
    store = M.transition(store, { type: 'preview', id }, now);
  const fixture = M.initialStore(now).cases.find((item) => item.opportunity === c.opportunity);
  for (const f of c.fields.filter((f) => !f.value && !M.isComputedField(c, f.key)))
    store = M.transition(
      store,
      {
        type: 'field',
        id,
        key: f.key,
        value:
          fixture.fields.find((item) => item.key === f.key)?.value ||
          (f.key === 'contact' || f.key === 'recipient'
            ? 'fictional@example.test'
            : 'Fictional checked source value'),
      },
      now,
    );
  return M.transition(store, { type: 'reviewed-example', id }, now);
}
function action(store, id, type, extra = {}) {
  return M.transition(store, { type, id, ...extra }, now);
}
function get(store, id) {
  return store.cases.find((c) => c.id === id);
}
function complete(store, id) {
  store = ready(store, id);
  const c = get(store, id);
  if (c.mode === 'rules') return action(store, id, 'rule');
  if (c.mode === 'handoff')
    store = action(store, id, 'handoff', {
      reference: 'DEMO-STAFF-CHECK',
      note: 'Reviewed fictional native outcome.',
      checked: true,
    });
  else {
    store = action(store, id, 'approve');
    while (get(store, id).status === 'approved') {
      store = action(store, id, 'run');
      store = action(store, id, 'verify');
    }
  }
  for (const o of get(store, id).outcomes)
    store = action(store, id, 'outcome', {
      key: o.id,
      reference: 'DEMO-OUTCOME-CHECK',
      note: 'Required fictional outcome checked, not merely queued.',
      checked: true,
    });
  return action(store, id, 'close');
}

test('the interactive library preserves the actual 35-item feasibility scope and human boundaries', () => {
  const source = JSON.parse(
    fs.readFileSync(
      path.join(root, 'docs/automation-feasibility-2026-10-25/feasibility.json'),
      'utf8',
    ),
  ).items;
  const counts = { C1: 0, C2: 0, G: 0, L: 0 };
  for (const item of source) {
    const w = M.definition(item.number);
    counts[w.selection]++;
    for (const key of [
      'title',
      'selection',
      'level',
      'manual_boundary',
      'remaining_work_or_gate',
      'acceptance',
    ])
      assert.equal(w[key], item[key], `${item.number}: ${key}`);
  }
  assert.deepEqual(counts, { C1: 10, C2: 10, G: 5, L: 10 });
});

test('each of the 35 scenarios supports its intended bounded check, reviewed flow or native handoff', () => {
  for (let number = 1; number <= 35; number++) {
    const { store, id } = start(number);
    const done = complete(store, id);
    assert.equal(get(done, id).status, 'completed', `Process ${number}`);
    assert.equal(M.isStore(done), true, `Persisted process ${number}`);
    const c = get(done, id);
    if (M.definition(number).selection === 'L') {
      assert.equal(c.mode, 'handoff');
      assert.ok(c.effects.every((e) => e.proof === 'staff-checked'));
      assert.equal(Object.keys(done.records).filter((k) => k.startsWith(id + ':')).length, 0);
    }
  }
});

test('missing answers and unknown source evidence cannot produce an all-clear or approval', () => {
  let { store, id } = start(4);
  store = action(store, id, 'rule');
  assert.equal(get(store, id).status, 'needs-info');
  assert.match(get(store, id).ruleResult.message, /Check incomplete/);
  assert.match(M.reviewBlockers(get(store, id)).join(' '), /Preferred contact/);
  const partial = start(5);
  assert.throws(() => action(partial.store, partial.id, 'approve'), /evidence/);
  assert.equal(get(partial.store, partial.id).approval, null);
});

test('a gated workflow requires an explicit demo preview and never changes its live scope label', () => {
  let { store, id } = start(15);
  store = action(store, id, 'reviewed-example');
  assert.throws(() => action(store, id, 'approve'), /live workflow remains gated/);
  store = action(store, id, 'preview');
  store = action(store, id, 'approve');
  assert.equal(get(store, id).status, 'approved');
  assert.equal(M.definition(15).selection, 'G');
  assert.ok(store.audit.some((a) => /No account integration or live release/.test(a.event)));
});

test('a postcode outside the fictional list routes to an owned office outcome instead of automatic rejection or approval', () => {
  let { store, id } = start(1);
  store = action(store, id, 'field', { key: 'postcode', value: '9999' });
  store = ready(store, id);
  store = action(store, id, 'rule');
  assert.equal(get(store, id).status, 'follow-up');
  assert.match(get(store, id).ruleResult.message, /not automatically rejected/);
  assert.equal(get(store, id).outcomes[0].id, 'coverage-review');
  assert.throws(() => action(store, id, 'close'), /cannot close/);
});

test('an incomplete metadata scope is reported as unknown and cannot complete the document check', () => {
  let { store, id } = start(19);
  store = ready(store, id);
  store = action(store, id, 'field', { key: 'scope', value: 'Partial sample metadata' });
  store = action(store, id, 'rule');
  assert.equal(get(store, id).status, 'needs-info');
  assert.match(get(store, id).ruleResult.message, /complete set cannot be claimed/);
});

test('the ownership check derives unfinished outcomes from the current sample cases and leaves those cases open', () => {
  let { store, id } = start(33);
  store = ready(store, id);
  const unfinished = store.cases
    .filter((c) => c.id !== id && c.status !== 'completed')
    .reduce((sum, c) => sum + c.outcomes.filter((o) => o.status !== 'done').length, 0);
  const before = store.cases.filter((c) => c.id !== id).map((c) => [c.id, c.status]);
  store = action(store, id, 'rule');
  assert.match(get(store, id).ruleResult.message, new RegExp(unfinished + ' mandatory'));
  assert.deepEqual(
    store.cases.filter((c) => c.id !== id).map((c) => [c.id, c.status]),
    before,
  );
});

test('editing the exact proposal or owner invalidates approval before dispatch', () => {
  let { store, id } = start(11);
  store = ready(store, id);
  store = action(store, id, 'approve');
  store = action(store, id, 'field', { key: 'time', value: '11:00–13:00' });
  assert.equal(get(store, id).approval, null);
  assert.throws(() => action(store, id, 'run'), /Approve the exact/);
  store = action(store, id, 'approve');
  store = action(store, id, 'assign', { owner: M.OWNERS[5], dueDate: '2026-10-27' });
  assert.equal(get(store, id).approval, null);
  assert.equal(get(store, id).status, 'needs-review');
});

test('a newer source invalidates the earlier approval without dispatching anything', () => {
  let { store, id } = start(5);
  store = ready(store, id);
  store = action(store, id, 'approve');
  const revision = get(store, id).sourceRevision;
  store = action(store, id, 'stale');
  assert.equal(get(store, id).sourceRevision, revision + 1);
  assert.equal(get(store, id).approval, null);
  assert.throws(() => action(store, id, 'run'), /Approve/);
  assert.equal(Object.keys(store.records).filter((k) => k.startsWith(id + ':')).length, 0);
});

test('lost responses reconcile the existing record and cannot trigger duplicate dispatch', () => {
  let { store, id } = start(11);
  store = ready(store, id);
  store = action(store, id, 'approve');
  store = action(store, id, 'loss');
  assert.equal(get(store, id).status, 'uncertain');
  assert.throws(() => action(store, id, 'run'), /Reconcile/);
  assert.throws(() => action(store, id, 'close'), /cannot close/);
  const before = Object.keys(store.records).filter((k) => k.startsWith(id + ':')).length;
  store = action(store, id, 'reconcile');
  store = action(store, id, 'verify');
  assert.equal(Object.keys(store.records).filter((k) => k.startsWith(id + ':')).length, before);
  assert.equal(get(store, id).effects[0].attempts, 1);
  assert.equal(get(store, id).effects[0].proof, 'demo-readback');
});

test('a mismatched saved record cannot be marked as a verified result', () => {
  let { store, id } = start(5);
  store = ready(store, id);
  store = action(store, id, 'approve');
  store = action(store, id, 'run');
  store.records[id + ':step-1'].fields[0].value = 'Wrong fictional record';
  assert.throws(() => action(store, id, 'verify'), /No exact matching/);
  assert.equal(get(store, id).status, 'awaiting-verification');
});

test('complete cancellation checks cleanup first and preserves cleanup success after cancellation fails', () => {
  let { store, id } = start(15);
  store = ready(store, id);
  store = action(store, id, 'approve');
  store = action(store, id, 'run');
  assert.match(get(store, id).effects[0].label, /travel/);
  assert.throws(() => action(store, id, 'run'), /Approve the exact/);
  store = action(store, id, 'verify');
  store = action(store, id, 'fail');
  assert.equal(get(store, id).status, 'blocked');
  assert.equal(get(store, id).effects[0].phase, 'verified');
  assert.equal(get(store, id).effects[1].phase, 'failed');
  assert.throws(() => action(store, id, 'close'), /cannot close/);
  store = action(store, id, 're-review');
  store = action(store, id, 'approve');
  store = action(store, id, 'run');
  store = action(store, id, 'verify');
  assert.equal(get(store, id).effects[0].attempts, 1);
  assert.equal(get(store, id).effects[1].attempts, 2);
  assert.equal(get(store, id).status, 'follow-up');
  assert.throws(() => action(store, id, 'close'), /cannot close/);
});

test('failed or merely queued follow-through blocks closure until specific checked evidence is recorded', () => {
  let { store, id } = start(8);
  store = ready(store, id);
  store = action(store, id, 'approve');
  store = action(store, id, 'run');
  store = action(store, id, 'verify');
  store = action(store, id, 'delivery-failure');
  const outcome = get(store, id).outcomes[0];
  assert.equal(outcome.status, 'failed');
  assert.throws(() => action(store, id, 'close'), /cannot close/);
  assert.throws(
    () =>
      action(store, id, 'outcome', {
        key: outcome.id,
        reference: 'Task queued',
        note: 'Not delivery',
        checked: false,
      }),
    /explicit staff confirmation/,
  );
  for (const o of get(store, id).outcomes)
    store = action(store, id, 'outcome', {
      key: o.id,
      reference: 'DEMO-OUTCOME-101',
      note: 'The required fictional outcome was checked.',
      checked: true,
    });
  store = action(store, id, 'close');
  assert.equal(get(store, id).status, 'completed');
});

test('a duplicate execution click cannot create a second record or increment attempts', () => {
  let { store, id } = start(11);
  store = ready(store, id);
  store = action(store, id, 'approve');
  store = action(store, id, 'run');
  assert.throws(() => action(store, id, 'run'), /Approve the exact/);
  assert.equal(get(store, id).effects[0].attempts, 1);
  assert.equal(Object.keys(store.records).filter((k) => k.startsWith(id + ':')).length, 1);
});

test('manual payroll handoff requires evidence and never creates a custom API or payment result', () => {
  let { store, id } = start(30);
  store = ready(store, id);
  assert.throws(() => action(store, id, 'run'), /no automatic native dispatch/);
  assert.throws(
    () => action(store, id, 'handoff', { reference: '', note: '', checked: true }),
    /checked native reference/,
  );
  store = action(store, id, 'handoff', {
    reference: 'DEMO-PAYROLL-REVIEW',
    note: 'Preparation was handed to the native payroll owner.',
    checked: true,
  });
  assert.equal(get(store, id).effects[0].proof, 'staff-checked');
  assert.equal(store.records[id + ':step-1'], undefined);
  assert.throws(
    () =>
      action(store, id, 'handoff', { reference: 'Other ref', note: 'Overwrite', checked: true }),
    /already recorded/,
  );
});

test('changing travel inputs invalidates a completed bounded result and requires a fresh check', () => {
  let { store, id } = start(12);
  store = ready(store, id);
  store = action(store, id, 'rule');
  const old = get(store, id).ruleResult.snapshot;
  store = action(store, id, 'field', { key: 'worker', value: 'Different fictional worker' });
  assert.equal(get(store, id).status, 'needs-review');
  assert.notEqual(M.snapshot(get(store, id)), old);
  store = action(store, id, 'rule');
  assert.equal(get(store, id).ruleResult.snapshot, M.snapshot(get(store, id)));
  assert.match(get(store, id).ruleResult.message, /No route API was called/);
});

test('identical sources deduplicate within their branch; a different branch keeps its own case', () => {
  const input = {
    type: 'create',
    opportunity: 5,
    person: 'Fictional person',
    subject: 'New review',
    source: 'Original fictional source',
    branch: M.BRANCHES[0],
  };
  let store = M.transition(M.initialStore(now), input, now);
  const count = store.cases.length;
  store = M.transition(store, input, now);
  assert.equal(store.cases.length, count);
  store = M.transition(store, { ...input, branch: M.BRANCHES[1] }, now);
  assert.equal(store.cases.length, count + 1);
  assert.equal(
    get(store, store.cases[0].id).fields.find((f) => f.key === 'name').value,
    'Fictional person',
  );
});

test('malformed or incomplete stored data is rejected before it can break the review screens', () => {
  const store = M.initialStore(now);
  assert.equal(M.isStore(store), true);
  for (const damage of [
    (s) => s.cases[0].history.push(null),
    (s) => (s.cases[0].dueDate = 'not-a-date'),
    (s) => s.audit.push(null),
    (s) => (s.records.bad = {}),
    (s) => (s.cases[0].fields = null),
    (s) => s.cases.push(structuredClone(s.cases[0])),
  ]) {
    const broken = structuredClone(store);
    damage(broken);
    assert.equal(M.isStore(broken), false);
  }
  assert.equal(M.isStore(null), false);
  assert.equal(M.isStore({ version: 1 }), false);
});

test('review CSV neutralizes spreadsheet formulas and excludes original source or sensitive notes', () => {
  const store = M.initialStore(now),
    c = store.cases[0];
  c.subject = '=HYPERLINK("example","open")';
  c.source = 'Private original source not for export';
  const csv = M.caseCsv([c]);
  assert.ok(csv.includes('"\'=HYPERLINK(""example"",""open"")"'));
  assert.equal(csv.includes(c.source), false);
  assert.match(csv, /Sample branch/);
});

test('unfinished follow-up can be reassigned without changing a saved approval or repeating a step', () => {
  for (const interruption of ['run', 'loss']) {
    let { store, id } = start(11);
    store = ready(store, id);
    store = action(store, id, 'approve');
    store = action(store, id, interruption);
    const approval = structuredClone(get(store, id).approval);
    const records = structuredClone(store.records);
    const state = get(store, id).status;
    store = action(store, id, 'assign', { owner: M.OWNERS[5], dueDate: '2026-10-29' });
    assert.equal(get(store, id).status, state);
    assert.deepEqual(get(store, id).approval, approval);
    assert.deepEqual(store.records, records);
    assert.equal(get(store, id).owner, M.OWNERS[5]);
    if (interruption === 'loss') store = action(store, id, 'reconcile');
    store = action(store, id, 'verify');
    store = action(store, id, 'assign', { owner: M.OWNERS[1], dueDate: '2026-10-30' });
    assert.equal(get(store, id).status, 'follow-up');
    assert.equal(get(store, id).effects[0].attempts, 1);
    assert.ok(get(store, id).history.some((a) => a.event.includes('Follow-up reassigned')));
    assert.equal(M.isStore(JSON.parse(JSON.stringify(store))), true);
    assert.throws(
      () => action(store, id, 'field', { key: 'time', value: '12:00–14:00' }),
      /saved or uncertain/,
    );
  }
});

test('coverage exception decisions are invalidated by location changes and cannot satisfy a different postcode', () => {
  let { store, id } = start(1);
  store = action(ready(store, id), id, 'field', { key: 'postcode', value: '9999' });
  store = action(store, id, 'rule');
  store = action(store, id, 'outcome', {
    key: 'coverage-review',
    reference: 'ONLY-9999',
    note: 'Only the 9999 location was checked.',
    checked: true,
  });
  store = action(store, id, 'close');
  store = action(store, id, 'field', { key: 'postcode', value: '8888' });
  store = action(store, id, 'rule');
  assert.equal(get(store, id).outcomes[0].status, 'pending');
  assert.equal(get(store, id).outcomes[0].reference, '');
  assert.throws(() => action(store, id, 'close'), /cannot close/);
  store = action(store, id, 'outcome', {
    key: 'coverage-review',
    reference: 'ONLY-8888',
    note: 'The new 8888 location was checked.',
    checked: true,
  });
  store = action(store, id, 'close');
  assert.equal(get(store, id).status, 'completed');
  store = action(store, id, 'field', { key: 'postcode', value: '6027' });
  store = action(store, id, 'rule');
  assert.equal(get(store, id).status, 'completed');
  assert.equal(get(store, id).outcomes.length, 0);
});

test('legacy or stale coverage proof cannot close a current rule result', () => {
  let { store, id } = start(1);
  store = action(ready(store, id), id, 'field', { key: 'postcode', value: '9999' });
  store = action(store, id, 'rule');
  Object.assign(get(store, id).outcomes[0], {
    status: 'done',
    reference: 'OLDER-UNKNOWN-SCOPE',
    note: 'Legacy checked outcome without an input fingerprint.',
  });
  assert.throws(() => action(store, id, 'close'), /cannot close/);
  store = action(store, id, 'rule');
  assert.equal(get(store, id).outcomes[0].status, 'pending');
});

test('reviewed confirmation exceptions route once into owned linked work and block parent closure', () => {
  for (const [response, target] of [
    ['Cancellation requested', 15],
    ['Change requested', 11],
    ['Unclear reply', 8],
    ['No response', 8],
  ]) {
    let { store, id } = start(14);
    store = action(ready(store, id), id, 'field', { key: 'response', value: response });
    store = action(store, id, 'approve');
    store = action(store, id, 'run');
    store = action(store, id, 'verify');
    const child = store.cases.find((c) => c.parentCaseId === id);
    assert.equal(child.opportunity, target);
    assert.equal(child.person, get(store, id).person);
    assert.equal(child.branch, get(store, id).branch);
    assert.equal(child.previewEnabled, false);
    assert.equal(child.approval, null);
    assert.equal(get(store, id).status, 'follow-up');
    assert.throws(() => action(store, id, 'close'), /cannot close/);
    assert.throws(() => action(store, id, 'verify'), /saved demo result/);
    assert.equal(store.cases.filter((c) => c.parentCaseId === id).length, 1);
    assert.throws(
      () =>
        action(store, id, 'outcome', {
          key: 'reply-follow-through',
          reference: 'CANNOT-BYPASS',
          note: 'Do not bypass the linked workflow.',
          checked: true,
        }),
      /linked case/,
    );
    store = complete(store, child.id);
    assert.equal(get(store, id).outcomes[0].status, 'done');
    store = action(store, id, 'close');
    assert.equal(get(store, id).status, 'completed');
    assert.equal(M.isStore(store), true);
  }
});

test('only a supported reviewed reply can enter confirmation handling', () => {
  let { store, id } = start(14);
  store = action(ready(store, id), id, 'field', {
    key: 'response',
    value: 'unclassified free text',
  });
  assert.throws(
    () => action(store, id, 'approve'),
    /unknown reply cannot be recorded as confirmed/,
  );
  store = action(store, id, 'field', { key: 'response', value: 'Confirmed' });
  store = complete(store, id);
  assert.equal(get(store, id).status, 'completed');
  assert.equal(store.cases.filter((c) => c.parentCaseId === id).length, 0);
});

test('free-form capture clears unrelated sample context and cannot approve it as extracted evidence', () => {
  const store = M.transition(
    M.initialStore(now),
    {
      type: 'create',
      opportunity: 11,
      person: 'Different fictional participant',
      subject: 'Move my 2 November visit',
      source: 'Please move my 2 November visit to 14:00.',
      branch: M.BRANCHES[0],
    },
    now,
  );
  const c = store.cases[0];
  assert.ok(c.fields.every((f) => f.value === ''));
  assert.ok(c.fields.every((f) => f.before === 'Not checked against this source'));
  assert.equal(c.status, 'needs-info');
  assert.match(M.reviewBlockers(c).join(' '), /Exact occurrence/);
  const reviewed = action(store, c.id, 'reviewed-example');
  assert.throws(() => action(reviewed, c.id, 'approve'), /source-backed value/);
});
