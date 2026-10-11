const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { bookingRequest } = require('../.backend/intake/booking-request.js');
const { IntakeService } = require('../lib/intake-service.cjs');
const { IntakeRepository } = require('../lib/intake-repository.cjs');
const repeat = {
  mode: 'same-as-before',
  services: ['Domestic assistance'],
  preferredDate: '2099-11-02',
  previousBookingId: 'BKG-499',
  preferredStart: '09:00',
  preferredEnd: '11:00',
};
test('booking request validates dates, service choices, reference and paired times', () => {
  assert.equal(bookingRequest(undefined), null);
  assert.deepEqual(bookingRequest(repeat), repeat);
  for (const input of [
    [],
    { ...repeat, services: [] },
    { ...repeat, services: ['Unknown'] },
    { ...repeat, services: ['Nursing', 'Nursing'] },
    { ...repeat, preferredDate: '2020-01-01' },
    { ...repeat, preferredDate: '2099-02-30' },
    { ...repeat, previousBookingId: '' },
    { ...repeat, preferredEnd: '08:00' },
    { ...repeat, preferredStart: '' },
  ])
    assert.throws(
      () => bookingRequest(input),
      (error) => error.status === 422,
    );
  assert.deepEqual(
    bookingRequest({
      ...repeat,
      mode: 'different-services',
      services: ['Cleaning', 'Nursing'],
      previousBookingId: '',
      preferredStart: '',
      preferredEnd: '',
    }).services,
    ['Cleaning', 'Nursing'],
  );
});
test('repeat requests persist for office review, and changed details invalidate an idempotency key', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-repeat-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new IntakeRepository({ directory });
  const service = new IntakeService(repository, () => ({ status: 'covered' }));
  const input = {
    name: 'Returning client',
    email: 'client@example.test',
    phone: '0400000000',
    service: 'Domestic assistance',
    suburb: 'Woodvale',
    postcode: '6026',
    source: 'Website',
    consent: true,
    bookingRequest: repeat,
    idempotencyKey: 'repeat-request-test',
  };
  const record = await service.createDraft(input, 'office@example.test');
  assert.equal(record.status, 'New');
  assert.equal(record.onboarding.reviewedAt, null);
  assert.deepEqual((await repository.get(record.id)).bookingRequest, repeat);
  await assert.rejects(
    service.update({ ...record, status: 'Ready for ShiftCare' }, 'office@example.test'),
    /roster review/,
  );
  assert.equal((await service.createDraft(input, 'office@example.test')).id, record.id);
  await assert.rejects(
    service.createDraft(
      { ...input, bookingRequest: { ...repeat, preferredDate: '2099-11-03' } },
      'office@example.test',
    ),
    (error) => error.status === 409,
  );
  await assert.rejects(
    service.createDraft({ ...input, service: 'Nursing' }, 'office@example.test'),
    (error) => error.status === 422,
  );
  const changed = {
    ...input,
    idempotencyKey: 'changed-request-test',
    service: 'Cleaning, Nursing',
    bookingRequest: {
      ...repeat,
      mode: 'different-services',
      services: ['Cleaning', 'Nursing'],
      previousBookingId: '',
      preferredStart: '',
      preferredEnd: '',
    },
  };
  assert.deepEqual(
    (await service.createDraft(changed, 'office@example.test')).bookingRequest.services,
    ['Cleaning', 'Nursing'],
  );
  await assert.rejects(
    service.createDraft(
      { ...changed, idempotencyKey: 'duplicate-request-test' },
      'office@example.test',
    ),
    (error) => error.status === 409,
  );
  const nextDate = {
    ...input,
    idempotencyKey: 'next-date-request-test',
    bookingRequest: { ...repeat, preferredDate: '2099-11-03' },
  };
  assert.equal(
    (await service.createDraft(nextDate, 'office@example.test')).bookingRequest.preferredDate,
    '2099-11-03',
  );
});
