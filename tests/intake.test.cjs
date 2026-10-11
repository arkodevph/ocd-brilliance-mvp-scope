const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { IntakeService } = require('../lib/intake-service.cjs');
const { IntakeRepository } = require('../lib/intake-repository.cjs');
const { rules } = require('../lib/intake-rules.cjs');
const policyInput = {
  version: 'test-v1',
  approvedBy: 'Test coordinator',
  source: 'Fictional test policy',
};
const policy = rules({
  OCD_INTAKE_RULES: JSON.stringify(policyInput),
  SERVICE_POSTCODES: '6027',
});
const approve = (service, record) =>
  service.approve(
    {
      id: record.id,
      revision: record.revision,
      approved: true,
      existingPeopleChecked: true,
    },
    staff,
  );

const staff = 'office@example.test';
const source =
  'Full name: Alex Demo\nEmail: alex@example.test\nService: Domestic assistance\nSuburb: Joondalup\nPostcode: 6027\nNotes: Fictional intake';
const covered = (postcode) => ({
  status: postcode === '6027' ? 'covered' : 'outside',
});
async function setup(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-intake-check-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const repository = new IntakeRepository({ directory });
  return {
    service: new IntakeService(repository, covered, structuredClone(policy)),
    repository,
    directory,
  };
}
async function draft(service, text = source) {
  const preview = await service.previewText(text);
  return service.createDraft(
    {
      ...preview.draft.fields,
      source: 'Text upload',
      sourceText: preview.draft.sourceText,
    },
    staff,
  );
}
const review = (record) => ({
  ...record,
  status: 'Reviewing',
  sourceReviewed: true,
});
const rejects = (promise, status, message) =>
  assert.rejects(
    promise,
    (error) => error.status === status && (!message || message.test(error.message)),
  );

test('source, corrections, ready handoff and manual verification persist with staff audit', async (t) => {
  const { service, repository } = await setup(t);
  let record = await draft(service);
  assert.equal(record.onboarding.sourceText, source);
  assert.equal(record.onboarding.evidence.name, 'Full name: Alex Demo');
  assert.equal(record.onboarding.reviewedAt, null);
  await rejects(service.handoff(record.id), 422);
  record = await service.update({ ...review(record), name: 'Alex Reviewed' }, staff, true);
  assert.equal(record.onboarding.reviewedBy, staff);
  record = await service.update({ ...record, status: 'Ready for ShiftCare' }, staff);
  await rejects(service.handoff(record.id, record.revision), 422, /Approve/);
  record = await approve(service, record);
  const text = await service.handoff(record.id, record.revision);
  assert.match(text, /Full name: Alex Reviewed/);
  assert.match(text, /Manual entry; no ShiftCare sync/);
  await rejects(
    service.verify({ ...record, shiftCareId: 'SC-DEMO', profileChecked: false }, staff),
    422,
  );
  await rejects(service.verify({ ...record, shiftCareId: '', profileChecked: true }, staff), 422);
  record = await service.verify({ ...record, shiftCareId: 'SC-DEMO', profileChecked: true }, staff);
  assert.equal(record.status, 'Entered in ShiftCare');
  assert.equal(record.shiftCareVerification.method, 'staff-manual');
  assert.equal(record.shiftCareVerification.reviewedAt, record.onboarding.reviewedAt);
  assert.equal((await repository.get(record.id)).shiftCareId, 'SC-DEMO');
  assert.match(record.history[0].event, /no API read-back/);
});

test('missing data, unresolved review, outside area and direct completion are blocked', async (t) => {
  const { service } = await setup(t);
  const record = await draft(service, 'Full name: Incomplete');
  await rejects(service.update(review(record), staff, true), 422, /complete valid/);
  const complete = await draft(service);
  await rejects(service.update({ ...review(complete), sourceReviewed: false }, staff, true), 422);
  await rejects(service.update({ ...complete, status: 'Ready for ShiftCare' }, staff), 422);
  await rejects(
    service.verify({ ...complete, shiftCareId: 'SC-DEMO', profileChecked: true }, staff),
    422,
  );
  await rejects(
    service.update({ ...complete, status: 'Entered in ShiftCare', shiftCareId: 'SC-DEMO' }, staff),
    422,
  );
  const reviewed = await service.update(review(complete), staff, true);
  await rejects(
    service.update({ ...reviewed, status: 'Ready for ShiftCare', postcode: '6999' }, staff),
    422,
  );
});

test('review and readiness save together while preserving coverage and source checks', async (t) => {
  const { service, repository } = await setup(t);
  const original = await draft(service);
  const input = {
    ...review(original),
    status: 'Ready for ShiftCare',
    name: 'Alex Reviewed',
  };
  await rejects(service.update({ ...input, sourceReviewed: false }, staff, true), 422);
  await rejects(service.update({ ...input, postcode: '6999' }, staff, true), 422);
  assert.equal((await repository.get(original.id)).onboarding.reviewedAt, null);
  let ready = await service.update(input, staff, true);
  assert.equal(ready.status, 'Ready for ShiftCare');
  assert.equal(ready.onboarding.reviewedBy, staff);
  const reviewedRevision = ready.revision;
  ready = await approve(service, ready);
  assert.match(await service.handoff(ready.id, ready.revision), /Full name: Alex Reviewed/);
  assert.equal((await service.update(input, staff, true)).revision, reviewedRevision);
});

test('extraction conflicts survive saving and duplicates link to the existing enquiry', async (t) => {
  const { service } = await setup(t);
  const text = source + '\nFull name: Another Person';
  const preview = await service.previewText(text);
  assert.deepEqual(preview.draft.warnings, ['Multiple values for name; check the source']);
  const record = await draft(service, text);
  assert.deepEqual(record.onboarding.warnings, preview.draft.warnings);
  assert.equal((await service.previewText(source)).duplicate.id, record.id);
  await rejects(draft(service), 409, /matching enquiry/);
  const second = await draft(service, source.replace('alex@example.test', 'other@example.test'));
  await rejects(service.update({ ...review(second), email: record.email }, staff, true), 409);
});

test('stale save, verification and copy are rejected without replacing newer details', async (t) => {
  const { service, repository } = await setup(t);
  const original = await draft(service);
  const reviewed = await service.update(review(original), staff, true);
  assert.equal((await service.update(review(original), staff, true)).revision, reviewed.revision);
  await rejects(service.update({ ...review(original), name: 'Changed' }, staff, true), 409);
  const ready = await service.update({ ...reviewed, status: 'Ready for ShiftCare' }, staff);
  await rejects(service.handoff(ready.id, reviewed.revision), 409, /Refresh/);
  await rejects(
    service.verify(
      {
        ...ready,
        revision: reviewed.revision,
        shiftCareId: 'SC-DEMO',
        profileChecked: true,
      },
      staff,
    ),
    409,
  );
  await rejects(repository.set({ ...ready, name: 'Overwrite' }, reviewed.revision), 409);
  assert.equal((await repository.get(ready.id)).name, original.name);
});

test('changing reviewed location invalidates approval and blocks the handoff', async (t) => {
  const { service } = await setup(t);
  let record = await draft(service);
  record = await service.update(review(record), staff, true);
  record = await service.update({ ...record, suburb: 'New suburb' }, staff);
  assert.equal(record.onboarding.reviewedAt, null);
  await rejects(service.update({ ...record, status: 'Ready for ShiftCare' }, staff), 422);
});

test('authenticated API contract completes the intake without opening a network listener', async (t) => {
  const { directory } = await setup(t);
  const environment = {
    WORKFLOW_DATA_DIR: directory,
    SERVICE_POSTCODES: '6027',
    WORKFLOW_STAFF_EMAIL: staff,
    WORKFLOW_STAFF_PASSWORD: 'test-password',
    WORKFLOW_SESSION_SECRET: 'test-session-secret-longer-than-32-characters',
    VERCEL: '',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  const previousPolicy = process.env.OCD_INTAKE_RULES;
  process.env.OCD_INTAKE_RULES = JSON.stringify(policyInput);
  t.after(() => {
    if (previousPolicy === undefined) delete process.env.OCD_INTAKE_RULES;
    else process.env.OCD_INTAKE_RULES = previousPolicy;
  });
  t.after(() => {
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  });
  const { handleWorkflow: handler } = require('../.backend/operations/workflow.handler.js');
  let cookie = '';
  async function call(action, method = 'GET', body) {
    const result = {};
    await handler(
      {
        url: `/api/workflow?action=${action}`,
        method,
        body,
        headers: { host: 'localhost', origin: 'http://localhost', cookie },
      },
      {
        writeHead(status, headers) {
          Object.assign(result, { status, headers });
        },
        end(text) {
          result.body = JSON.parse(text);
        },
      },
    );
    return result;
  }
  assert.equal((await call('draft-preview', 'POST', { text: source })).status, 401);
  const login = await call('login', 'POST', {
    email: staff,
    password: 'test-password',
  });
  assert.equal(login.status, 200);
  cookie = login.headers['Set-Cookie'].split(';')[0];
  const preview = await call('draft-preview', 'POST', { text: source });
  assert.deepEqual(preview.body.issues, []);
  let result = await call('draft', 'POST', {
    ...preview.body.draft.fields,
    source: 'Text upload',
    sourceText: source,
  });
  assert.equal(result.status, 201);
  result = await call('draft-review', 'PATCH', review(result.body.record));
  assert.equal(result.status, 200);
  result = await call('record', 'PATCH', {
    ...result.body.record,
    status: 'Ready for ShiftCare',
  });
  assert.equal(result.status, 200);
  result = await call('handoff-approve', 'POST', {
    id: result.body.record.id,
    revision: result.body.record.revision,
    approved: true,
    existingPeopleChecked: true,
  });
  assert.equal(result.status, 200);
  const handoff = await call(
    `handoff&id=${result.body.record.id}&revision=${result.body.record.revision}`,
  );
  assert.equal(handoff.status, 200);
  assert.match(handoff.body.text, /Full name: Alex Demo/);
  assert.equal((await call(`handoff&id=${result.body.record.id}&revision=stale`)).status, 409);
  result = await call('handoff-verify', 'PATCH', {
    ...result.body.record,
    shiftCareId: 'SC-DEMO',
    profileChecked: true,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.record.shiftCareVerification.checkedBy, staff);
  const saved = await call('intakes');
  assert.equal(saved.body.records[0].status, 'Entered in ShiftCare');
});

test('concurrent creation and retries preserve one request and the original result', async (t) => {
  const { service, repository } = await setup(t);
  const fields = (await service.previewText(source)).draft.fields;
  const input = {
    ...fields,
    source: 'Text upload',
    sourceText: source,
    idempotencyKey: 'submission-001',
  };
  const [first, retry] = await Promise.all([
    service.createDraft(input, staff),
    service.createDraft(input, staff),
  ]);
  assert.equal(first.id, retry.id);
  assert.equal((await repository.all()).length, 1);
  await service.update(review(first), staff, true);
  const reloaded = new IntakeService(
    new IntakeRepository({ directory: path.dirname(repository.file) }),
    covered,
    policy,
  );
  assert.equal((await reloaded.createDraft(input, staff)).revision, first.revision);
  await rejects(reloaded.createDraft({ ...input, name: 'Changed' }, staff), 409);
  const outcomes = await Promise.allSettled([
    draft(service, source.replace('alex@example.test', 'second@example.test')),
    draft(service, source.replace('alex@example.test', 'second@example.test')),
  ]);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await repository.all()).length, 2);
});

test('required documents, approval source and Inbox Signals gate are enforced', async (t) => {
  const { service, repository } = await setup(t);
  service.policy.requiredDocuments = ['Consent form'];
  const record = await draft(service);
  await rejects(service.update(review(record), staff, true), 422);
  let ready = await service.update(
    {
      ...review(record),
      documents: ['Consent form'],
      status: 'Ready for ShiftCare',
    },
    staff,
    true,
  );
  await rejects(
    service.approve({ id: ready.id, revision: ready.revision, approved: true }, staff),
    422,
  );
  ready = await approve(service, ready);
  assert.match(await service.handoff(ready.id, ready.revision), /Alex Demo/);
  service.policy.version = 'changed-v2';
  await rejects(service.handoff(ready.id, ready.revision), 422);
  await rejects(
    service.verify(
      {
        id: ready.id,
        revision: ready.revision,
        shiftCareId: 'SC-1',
        profileChecked: true,
      },
      staff,
    ),
    422,
  );
  const unapproved = new IntakeService(repository, covered, rules({ SERVICE_POSTCODES: '6027' }));
  await rejects(unapproved.previewText(source, true), 422, /Inbox Signals/);
  await rejects(unapproved.handoff(ready.id, ready.revision), 422, /OCD must approve/);
});

test('queue exposes missing documents, conflicting details, duplicates and failed transfers', async (t) => {
  const { service } = await setup(t);
  let record = await draft(service, source + '\nFull name: Conflicting');
  await draft(service, source.replace('alex@example.test', 'different@example.test'));
  service.policy.requiredDocuments = ['Consent form'];
  let item = (await service.queue()).find((item) => item.id === record.id);
  assert.ok(item.issues.includes('Missing document: Consent form'));
  assert.ok(item.issues.some((issue) => issue.includes('Multiple values')));
  assert.ok(item.duplicateId);
  record = await service.failure(
    {
      id: record.id,
      revision: record.revision,
      reason: 'Native entry could not be saved',
      owner: staff,
      nextAction: 'Confirm the native outcome',
      followUp: '2020-01-01',
    },
    staff,
  );
  item = (await service.queue()).find((item) => item.id === record.id);
  assert.equal(item.overdue, true);
  assert.ok(item.issues.some((issue) => issue.startsWith('Failed transfer:')));
});

test('approval and verification replay exactly, and corrections invalidate approval', async (t) => {
  const { service } = await setup(t);
  let record = await draft(service);
  record = await service.update({ ...review(record), status: 'Ready for ShiftCare' }, staff, true);
  const input = {
    id: record.id,
    revision: record.revision,
    approved: true,
    existingPeopleChecked: true,
  };
  const approvals = await Promise.all([
    service.approve(input, staff),
    service.approve(input, staff),
  ]);
  assert.equal(approvals[0].revision, approvals[1].revision);
  record = approvals[0];
  const verification = {
    id: record.id,
    revision: record.revision,
    shiftCareId: 'SC-DEMO',
    profileChecked: true,
  };
  const verified = await service.verify(verification, staff);
  assert.equal((await service.verify(verification, staff)).revision, verified.revision);
  assert.equal((await service.approve(input, staff)).revision, record.revision);
  await rejects(service.verify({ ...verification, shiftCareId: 'DIFFERENT' }, staff), 409);
  await rejects(
    service.failure(
      {
        ...verification,
        owner: staff,
        nextAction: 'Retry',
        followUp: '2026-10-10',
        reason: 'Oops',
        revision: verified.revision,
      },
      staff,
    ),
    422,
  );
  let second = await draft(service, source.replace('alex@example.test', 'second@example.test'));
  second = await service.update({ ...review(second), status: 'Ready for ShiftCare' }, staff, true);
  second = await approve(service, second);
  second = await service.update(
    { ...review(second), name: 'Corrected', status: 'Reviewing' },
    staff,
    true,
  );
  assert.equal(second.handoffApproval, null);
  await rejects(service.handoff(second.id, second.revision), 422);
});

test('roles are enforced on API actions using server identities', async (t) => {
  const { directory } = await setup(t);
  const env = {
    WORKFLOW_DATA_DIR: directory,
    SERVICE_POSTCODES: '6027',
    WORKFLOW_SESSION_SECRET: 'test-session-secret-longer-than-32-characters',
    WORKFLOW_STAFF_ACCOUNTS: JSON.stringify([
      {
        email: 'reader@example.test',
        password: 'reader-password',
        role: 'reader',
      },
      { email: staff, password: 'office-password', role: 'coordinator' },
    ]),
    VERCEL: '',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
    OCD_INTAKE_RULES: JSON.stringify(policyInput),
  };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  });
  const { handleWorkflow: handler } = require('../.backend/operations/workflow.handler.js');
  const { sessionCookie } = require('../lib/staff-auth.cjs');
  async function call(action, method, email, body) {
    const result = {};
    await handler(
      {
        url: `/api/workflow?action=${action}`,
        method,
        body,
        headers: {
          host: 'localhost',
          cookie: sessionCookie(email, { headers: {} }).split(';')[0],
        },
      },
      {
        writeHead(status) {
          result.status = status;
        },
        end(raw) {
          result.body = JSON.parse(raw);
        },
      },
    );
    return result;
  }
  assert.equal((await call('queue', 'GET', 'reader@example.test')).status, 200);
  assert.equal((await call('draft', 'POST', 'reader@example.test', { role: 'admin' })).status, 403);
  assert.equal((await call('handoff-approve', 'POST', staff, { role: 'admin' })).status, 403);
  assert.equal((await call('handoff-verify', 'PATCH', staff, {})).status, 403);
  assert.equal((await call('draft-preview', 'POST', staff, { text: source })).status, 200);
  assert.equal((await call('handoff-transfer', 'POST', staff, {})).status, 404);
});

test('AI arrangement rejects unsupported values and retains literal evidence', async (t) => {
  const { arrange } = require('../lib/intake-ai.cjs');
  const previous = process.env.OCD_AI_API_KEY;
  process.env.OCD_AI_API_KEY = 'test-key';
  t.after(() => {
    if (previous === undefined) delete process.env.OCD_AI_API_KEY;
    else process.env.OCD_AI_API_KEY = previous;
  });
  let request;
  const result = await arrange(source, policy, ['Missing consent'], async (url, options) => {
    request = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                fields: {
                  name: 'Invented Person',
                  email: 'alex@example.test',
                },
                evidence: {
                  name: 'Invented quote',
                  email: 'Email: alex@example.test',
                },
                explanation: 'Confirm consent using the approved source.',
              }),
            },
          },
        ],
      }),
    };
  });
  assert.equal(result.fields.name, 'Alex Demo');
  assert.equal(result.evidence.email, 'Email: alex@example.test');
  assert.ok(request.messages[1].content.includes('Fictional test policy'));
  const { service } = await setup(t);
  const saved = await service.createDraft(
    {
      ...result.fields,
      name: 'Unsupported value',
      source: 'Text upload',
      sourceText: source,
      evidence: { name: 'Invented quote' },
    },
    staff,
  );
  assert.equal(saved.onboarding.evidence.name, undefined);
  assert.ok(
    saved.onboarding.warnings.some((warning) =>
      warning.includes('No matching source evidence for name'),
    ),
  );
  await rejects(
    arrange(source, policy, [], async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'null' } }] }),
    })),
    502,
  );
});
