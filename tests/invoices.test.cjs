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
  assert.equal(
    I.total({
      lines: [
        { hours: 1.5, rate: 65 },
        { hours: 2, rate: 19.99 },
      ],
    }),
    13748,
  );
  for (const hours of [0, -1, 25, NaN]) assert.throws(() => I.lineTotal({ hours, rate: 65 }));

  for (const rate of [0, -1, Infinity, 10001]) assert.throws(() => I.lineTotal({ hours: 1, rate }));
});

test('invoice drafts include only uninvoiced completed visits and retain source references', () => {
  const state = seed();
  I.ensure(state);
  assert.equal(state.invoices.length, 2);
  assert.ok(state.invoices.every((i) => i.status === 'Draft' && i.example));
  const draft = I.create(state, {
    participantId: 'PAR-102',
    from: '2026-10-05',
    to: '2026-10-09',
    rate: 65,
    rateSource: 'Test agreement',
  });

  assert.deepEqual(
    draft.lines.map((l) => l.bookingId),
    ['BKG-500'],
  );
  assert.equal(I.total(draft), 6500);
  state.invoices.push(draft);
  assert.throws(
    () =>
      I.create(state, {
        participantId: 'PAR-102',
        from: '2026-10-05',
        to: '2026-10-09',
        rate: 65,
        rateSource: 'Test agreement',
      }),
    /No uninvoiced/,
  );
  assert.throws(
    () =>
      I.create(state, {
        participantId: 'PAR-102',
        from: '2026-02-30',
        to: '2026-10-09',
        rate: 65,
        rateSource: 'Test agreement',
      }),
    /valid service period/,
  );
  assert.throws(
    () =>
      I.create(state, {
        participantId: 'PAR-102',
        from: '2026-10-09',
        to: '2026-10-05',
        rate: 65,
        rateSource: 'Test agreement',
      }),
    /valid service period/,
  );
  assert.equal(I.ensure(state).length, 3);
});

test('review queue detects all four exceptions and clears only corrected records', () => {
  const state = seed();
  I.ensure(state);
  const original = structuredClone(state);
  let queue = I.reviewQueue(state);
  assert.ok(queue.some((row) => row.issues.some((issue) => issue.type === 'Awaiting invoicing')));
  assert.ok(
    queue.some((row) => row.issues.some((issue) => issue.type === 'Missing billing information')),
  );
  assert.deepEqual(state, original, 'inspection must not change billing records');
  const invoice = state.invoices[0];
  const categories = Object.fromEntries(
    invoice.lines.map((line) => [line.description, 'Agreed test category']),
  );
  I.saveBillingProfile(
    state,
    {
      participantId: invoice.participantId,
      name: 'Plan manager',
      email: 'billing@example.test',
      source: 'Fictional agreement v1',
      serviceCategories: categories,
    },
    'Test reviewer',
  );
  invoice.lines.forEach((line) => {
    line.category = 'Wrong category';
  });
  let issues = I.invoiceIssues(state, invoice);
  assert.ok(issues.some((issue) => issue.type === 'Incorrect recipient'));
  assert.ok(issues.some((issue) => issue.type === 'Service/category mismatch'));
  invoice.billingName = 'Plan manager';
  invoice.billingEmail = 'BILLING@example.test';
  invoice.lines.forEach((line) => {
    line.category = 'Agreed test category';
  });
  assert.deepEqual(I.invoiceIssues(state, invoice), []);
  assert.equal(
    I.reviewQueue(state).some((row) => row.invoiceId === invoice.id),
    false,
  );
  invoice.lines[0].description = 'Unrelated service';
  assert.ok(
    I.invoiceIssues(state, invoice).some((issue) => issue.type === 'Service/category mismatch'),
  );
  invoice.lines[0].description = original.invoices[0].lines[0].description;
  state.bookings.find((b) => b.id === invoice.lines[0].bookingId).status = 'Cancelled';
  assert.ok(
    I.invoiceIssues(state, invoice).some((issue) => issue.type === 'Service/category mismatch'),
  );
});

test('billing references validate before mutation and new drafts use agreed recipient/categories', () => {
  const state = seed();
  I.ensure(state);
  const person = state.participants.find((p) => p.id === 'PAR-102');
  assert.throws(
    () =>
      I.saveBillingProfile(
        state,
        { participantId: person.id, name: 'Manager', email: 'bad', source: 'agreement' },
        'Staff',
      ),
    /valid email/,
  );
  assert.equal(person.billingProfile, undefined);
  const booking = state.bookings.find((b) => b.id === 'BKG-500');
  I.saveBillingProfile(
    state,
    {
      participantId: person.id,
      name: 'Manager',
      email: 'manager@example.test',
      source: 'Agreed reference',
      serviceCategories: { [booking.service]: 'Category A' },
    },
    'Staff',
  );
  const invoice = I.create(state, {
    participantId: person.id,
    from: booking.date,
    to: booking.date,
    rate: 65,
    rateSource: 'Agreed rate',
  });
  assert.equal(invoice.billingName, 'Manager');
  assert.equal(invoice.lines[0].category, 'Category A');
  assert.deepEqual(I.invoiceIssues(state, invoice), []);
  state.invoices.push(invoice);
  assert.equal(
    I.reviewQueue(state).some((row) => row.bookingId === booking.id),
    false,
  );
  person.billingProfile.email = 'updated@example.test';
  assert.ok(I.invoiceIssues(state, invoice).some((issue) => issue.type === 'Incorrect recipient'));
});
