const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { AutomationStore } = require('../.backend/automation/store.js');
const { AutomationService, policy } = require('../.backend/automation/service.js');
const { prepare } = require('../.backend/automation/handlers.js');
const { catalog } = require('../.backend/automation/catalog.js');
const { Microsoft365Mailbox } = require('../.backend/automation/microsoft365.js');
const { ShiftCareOperations } = require('../.backend/automation/shiftcare-operations.js');
const { NativeRejection } = require('../.backend/automation/types.js');
const { sessionCookie } = require('../lib/staff-auth.cjs');

const owner = 'office@example.test';
const now = new Date('2026-10-13T01:00:00Z');
const nativePayload = {
  evidenceReference: 'Fictional original form',
  fields: { name: 'Alex Test', email: 'alex@example.test', dob: '1990-01-01' },
  consent: true,
  identityChecked: true,
};
async function setup(t, operations = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-native-'));
  const previous = { ...process.env };
  process.env.WORKFLOW_STAFF_EMAIL = owner;
  process.env.WORKFLOW_STAFF_PASSWORD = 'fictional-test-password';
  process.env.WORKFLOW_SESSION_SECRET = 'fictional-32-character-session-secret';
  process.env.SERVICE_POSTCODES = '6027';
  process.env.SHIFTCARE_TIME_ZONE = 'Australia/Perth';
  process.env.OCD_INTAKE_RULES = JSON.stringify({
    version: 'fixture-v1',
    source: 'Fictional fixture policy',
    approvedBy: 'Fictional reviewer',
    inboxSignals: {
      tested: true,
      gaps: ['Fictional fixture mapping'],
      evidence: 'Fictional native trial',
    },
  });
  process.env.WORKFLOW_DATA_DIR = directory;
  delete process.env.DATABASE_URL;
  delete process.env.WORKFLOW_STAFF_ACCOUNTS;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VERCEL;
  delete process.env.OCD_SHIFTCARE_WRITE_OPERATIONS;
  delete process.env.SHIFTCARE_API_KEY;
  delete process.env.SHIFTCARE_ACCOUNT_ID;
  t.after(async () => {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
    await fs.rm(directory, { recursive: true, force: true });
  });
  const store = new AutomationStore({ directory, scope: 'local', env: {} });
  const service = new AutomationService(store, operations, () => now);
  return { directory, store, service };
}
const enqueue = (service, workflow = 'W03', payload = nativePayload, sourceId = 'source-1') =>
  service.enqueue({ workflow, sourceId, payload, owner }, owner);
async function prepared(service, workflow = 'W03', payload = nativePayload) {
  let job = await enqueue(service, workflow, payload);
  await service.process();
  return (await service.store.read()).jobs.find((j) => j.id === job.id);
}
const approve = (service, job) =>
  service.decide(
    job.id,
    job.revision,
    { action: 'approve', sourceReviewed: true, proposalHash: job.proposalHash },
    owner,
  );

test('all 14 workflow areas have explicit handlers, source references and proposed effects', async (t) => {
  await setup(t);
  assert.equal(catalog.length, 14);
  for (const entry of catalog) {
    const proposal = prepare(entry.id, {}, policy(), now);
    assert.ok(proposal.summary);
    assert.ok(proposal.nextAction);
    assert.ok(proposal.missing.length);
  }
});
test('concurrent duplicate submissions create one durable case and changed content conflicts', async (t) => {
  const { service, directory } = await setup(t);
  const results = await Promise.all(Array.from({ length: 12 }, () => enqueue(service)));
  assert.equal(new Set(results.map((j) => j.id)).size, 1);
  assert.equal(
    (await new AutomationStore({ directory, scope: 'local', env: {} }).read()).jobs.length,
    1,
  );
  await assert.rejects(enqueue(service, 'W03', { ...nativePayload, consent: false }), {
    status: 409,
  });
});
test('separate worker processes share one file-backed case without lost updates', async (t) => {
  const { store } = await setup(t);
  const source = `const {AutomationStore}=require(${JSON.stringify(require.resolve('../.backend/automation/store.js'))}); const {AutomationService}=require(${JSON.stringify(require.resolve('../.backend/automation/service.js'))}); const service=new AutomationService(new AutomationStore({directory:process.env.WORKFLOW_DATA_DIR,scope:'local',env:{}})); Promise.all(Array.from({length:5},()=>service.enqueue({workflow:'W01',sourceId:'process-source',owner:'office@example.test',payload:{evidenceReference:'Test call',postcode:'6027'}},'Test worker'))).catch(()=>process.exitCode=1);`;
  await Promise.all(
    Array.from(
      { length: 3 },
      () =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, ['-e', source], {
            env: process.env,
            stdio: 'ignore',
          });
          child.once('error', reject);
          child.once('exit', (code) =>
            code === 0 ? resolve() : reject(new Error('Worker fixture failed')),
          );
        }),
    ),
  );
  assert.equal((await store.read()).jobs.length, 1);
});
test('competing workers claim a case once and stale leases safely requeue preparation', async (t) => {
  const { service } = await setup(t);
  await enqueue(service);
  const claims = await Promise.all([service.claim(), service.claim()]);
  assert.equal(claims.filter(Boolean).length, 1);
  await service.store.mutate((s) => {
    s.jobs[0].lease.until = '2026-10-12T00:00:00Z';
  });
  const reclaimed = await service.claim();
  assert.ok(reclaimed);
  assert.equal(reclaimed.attempts, 2);
});
test('approval binds the exact proposal; edits invalidate it and keep source replay idempotent', async (t) => {
  const { service } = await setup(t);
  let job = await prepared(service);
  await assert.rejects(
    service.decide(
      job.id,
      job.revision,
      { action: 'approve', sourceReviewed: true, proposalHash: 'changed' },
      owner,
    ),
    { status: 422 },
  );
  job = await approve(service, job);
  const oldRevision = job.revision;
  job = await service.decide(
    job.id,
    job.revision,
    { action: 'revise', payload: { fields: { ...nativePayload.fields, name: 'Corrected Test' } } },
    owner,
  );
  assert.equal(job.approval, undefined);
  assert.equal(job.status, 'queued');
  assert.equal((await enqueue(service)).id, job.id);
  await assert.rejects(service.execute(job.id, oldRevision, owner), { status: 409 });
});
test('rule changes stop an old approval and allow a fresh preparation', async (t) => {
  const { service } = await setup(t);
  let job = await approve(service, await prepared(service));
  process.env.SERVICE_POSTCODES = '6027,6000';
  await assert.rejects(service.execute(job.id, job.revision, owner), { status: 409 });
  job = await service.decide(job.id, job.revision, { action: 'revise', payload: {} }, owner);
  assert.equal(job.status, 'queued');
  await service.process();
  assert.equal((await service.store.read()).jobs[0].policyVersion, policy().version);
});
test('superseded source versions cannot be revived for approval', async (t) => {
  const { service } = await setup(t);
  const first = await prepared(service);
  await service.enqueue(
    { workflow: 'W03', sourceId: 'source-1', sourceRevision: '2', payload: nativePayload, owner },
    owner,
  );
  const old = (await service.store.read()).jobs.find((j) => j.id === first.id);
  assert.equal(old.status, 'blocked');
  await assert.rejects(
    service.decide(old.id, old.revision, { action: 'revise', payload: {} }, owner),
    { status: 409 },
  );
});
test('unconfigured native writes become tracked handoffs; manual evidence is labelled honestly', async (t) => {
  const { service } = await setup(t);
  let job = await approve(service, await prepared(service));
  job = await service.execute(job.id, job.revision, owner);
  assert.equal(job.status, 'awaiting_native');
  await assert.rejects(
    service.verify(job.id, job.revision, { nativeChecked: true, reference: 'SC-1' }, owner),
    { status: 422 },
  );
  job = await service.verify(
    job.id,
    job.revision,
    {
      nativeChecked: true,
      reference: 'SC-1',
      accountingChecked: true,
      accountingReference: 'Bookkeeper: existing contact checked',
    },
    owner,
  );
  assert.equal(job.status, 'completed');
  assert.equal(job.receipt.method, 'staff-manual');
});
test('a timeout after dispatch requires reconciliation and never causes a blind second write', async (t) => {
  let dispatches = 0;
  const { service } = await setup(t, {
    'client.upsert': {
      execute: async () => {
        dispatches++;
        throw new Error('Timeout after remote commit');
      },
      verify: async () => ({ matches: true, reference: 'SC-remote' }),
    },
  });
  let job = await approve(service, await prepared(service));
  job = await service.execute(job.id, job.revision, owner);
  assert.equal(job.status, 'reconciliation_required');
  await assert.rejects(service.execute(job.id, job.revision, owner), { status: 409 });
  job = await service.verify(
    job.id,
    job.revision,
    { accountingChecked: true, accountingReference: 'Separate accounting verified' },
    owner,
  );
  assert.equal(dispatches, 1);
  assert.equal(job.receipt.method, 'api-read-back');
});
test('a definite native rejection blocks for a fresh review rather than claiming an uncertain write', async (t) => {
  const { service } = await setup(t, {
    'client.upsert': {
      execute: async () => {
        throw new NativeRejection(409, 'Native validation rejected the request.');
      },
      verify: async () => ({ matches: false, reference: '' }),
    },
  });
  let job = await approve(service, await prepared(service));
  job = await service.execute(job.id, job.revision, owner);
  assert.equal(job.status, 'blocked');
  assert.equal(job.approval, undefined);
  await assert.rejects(service.execute(job.id, job.revision, owner), { status: 409 });
});
test('a checked cancellation stays open for separately reviewed participant and worker communication', async (t) => {
  const { service } = await setup(t);
  let job = await prepared(service, 'W07', {
    evidenceReference: 'Test call',
    shiftId: '123',
    reason: 'Away',
    treatment: 'without_charge',
    scopeChecked: true,
    policyChecked: true,
    travelChecked: true,
    travelReference: 'Checked original travel: no mileage incurred',
    nativeContext: { clients: [{ id: '789' }], staff: [{ id: '456' }] },
  });
  job = await approve(service, job);
  job = await service.execute(job.id, job.revision, owner);
  job = await service.verify(
    job.id,
    job.revision,
    { nativeChecked: true, reference: '123' },
    owner,
  );
  const followUp = (await service.store.read()).jobs.find((j) => j.workflow === 'W13');
  assert.equal(followUp.status, 'queued');
  assert.equal(followUp.payload.recipient, 'ShiftCare client 789');
  assert.equal(job.status, 'follow_up');
  assert.equal(job.requiredChildren.length, 2);
  const worker = (await service.store.read()).jobs.find((j) => j.payload.audience === 'worker');
  assert.equal(worker.payload.recipient, 'ShiftCare staff 456');
  await assert.rejects(
    service.close(
      job.id,
      job.revision,
      { financialChecked: true, financialReference: 'Reviewed final charges' },
      owner,
    ),
    { status: 409 },
  );
  await assert.rejects(
    service.verify(job.id, job.revision, { nativeChecked: true, reference: '123' }, owner),
    { status: 409 },
  );
  assert.equal((await service.store.read()).jobs.filter((j) => j.workflow === 'W13').length, 2);
});
test('a dispatched outcome can be reconciled after its source changes without repeating the write', async (t) => {
  const { service } = await setup(t, {
    'client.upsert': {
      execute: async () => ({ reference: 'SC-1' }),
      verify: async () => ({ matches: true, reference: 'SC-1' }),
    },
  });
  let job = await approve(service, await prepared(service));
  job = await service.execute(job.id, job.revision, owner);
  await service.enqueue(
    {
      workflow: 'W03',
      sourceId: 'source-1',
      sourceRevision: '2',
      owner,
      payload: { ...nativePayload, fields: { ...nativePayload.fields, name: 'New source' } },
    },
    owner,
  );
  job = (await service.store.read()).jobs[0];
  assert.equal(job.status, 'reconciliation_required');
  assert.ok(job.approval);
  job = await service.verify(
    job.id,
    job.revision,
    { accountingChecked: true, accountingReference: 'Separate check' },
    owner,
  );
  assert.equal(job.status, 'completed');
  assert.equal((await service.store.read()).jobs[1].status, 'queued');
});
test('concurrent execution dispatches a registered operation once and requires matching read-back', async (t) => {
  let dispatches = 0;
  const { service } = await setup(t, {
    'client.upsert': {
      execute: async () => {
        dispatches++;
        return { reference: 'SC-1' };
      },
      verify: async () => ({ matches: false, reference: 'SC-1' }),
    },
  });
  let job = await approve(service, await prepared(service));
  const results = await Promise.allSettled([
    service.execute(job.id, job.revision, owner),
    service.execute(job.id, job.revision, owner),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(dispatches, 1);
  job = (await service.store.read()).jobs[0];
  await assert.rejects(
    service.verify(
      job.id,
      job.revision,
      { accountingChecked: true, accountingReference: 'Checked' },
      owner,
    ),
    { status: 409 },
  );
  assert.equal((await service.store.read()).jobs[0].status, 'awaiting_verification');
});
test('different sources for the same new identity cannot dispatch concurrent creates', async (t) => {
  let dispatches = 0;
  const { service } = await setup(t, {
    'client.upsert': {
      execute: async () => {
        dispatches++;
        return { reference: '456' };
      },
      verify: async () => ({ matches: true, reference: '456' }),
    },
  });
  await enqueue(service, 'W03', nativePayload, 'email-source');
  await enqueue(service, 'W03', nativePayload, 'website-source');
  await service.process();
  const jobs = (await service.store.read()).jobs;
  const first = await approve(service, jobs[0]),
    second = await approve(service, jobs[1]);
  const outcomes = await Promise.all([
    service.execute(first.id, first.revision, owner),
    service.execute(second.id, second.revision, owner),
  ]);
  assert.equal(dispatches, 1);
  assert.equal(outcomes.filter((j) => j.status === 'blocked').length, 1);
});
test('service-area screening retains adjacent-area/capacity review instead of promising service', async (t) => {
  await setup(t);
  const proposal = prepare(
    'W01',
    { evidenceReference: 'Phone enquiry', postcode: '6000' },
    policy(),
    now,
  );
  assert.equal(proposal.fields.coverage, 'office_review');
  assert.equal(proposal.fields.capacityConfirmed, false);
});
test('reviewed cancellation replies create a separate case; silence never cancels a visit', async (t) => {
  const { service } = await setup(t);
  let job = await approve(
    service,
    await prepared(service, 'W06', {
      evidenceReference: 'Reminder reply',
      shiftId: 'shift-1',
      response: 'cancel',
      reason: 'Away',
    }),
  );
  await service.execute(job.id, job.revision, owner);
  const state = await service.store.read();
  assert.equal(state.jobs[0].status, 'completed');
  assert.equal(state.jobs[1].workflow, 'W07');
  assert.ok(
    prepare('W06', { evidenceReference: 'No reply', shiftId: 'shift-1' }, policy(), now).missing
      .length,
  );
});
test('reviewed mailbox routing creates one downstream case without sending a reply', async (t) => {
  const { service } = await setup(t);
  let job = await approve(
    service,
    await prepared(service, 'W02', {
      evidenceReference: 'Email original',
      text: 'Participant intake\nFull name: Alex Test\nEmail: alex@example.test',
    }),
  );
  await service.execute(job.id, job.revision, owner);
  assert.equal((await service.store.read()).jobs[1].workflow, 'W03');
});
test('mailbox routing separates payroll and preserves staff-selected routes without rewriting the source', async (t) => {
  await setup(t);
  const input = { evidenceReference: 'Email', text: 'Payroll query: my travel hours look wrong.' };
  assert.equal(prepare('W02', input, policy(), now).fields.suggestedWorkflow, 'W11');
  const routed = prepare('W02', { ...input, nextWorkflow: 'W09' }, policy(), now);
  assert.equal(routed.fields.suggestedWorkflow, 'W09');
  assert.equal(routed.fields.routingSource, 'staff-selected');
});
test('cover requires real acceptance and cancellation requires explicit financial treatment', async (t) => {
  await setup(t);
  assert.ok(
    prepare(
      'W08',
      { evidenceReference: 'Sickness', shiftId: 'shift-1', workerId: 'worker-1' },
      policy(),
      now,
    ).missing.some((s) => /acceptance/.test(s)),
  );
  assert.ok(
    prepare(
      'W07',
      { evidenceReference: 'Call', shiftId: 'shift-1', reason: 'Away', scopeChecked: true },
      policy(),
      now,
    ).missing.some((s) => /charge/.test(s)),
  );
});
test('onboarding stays blocked until native feature gaps and extraction policy are approved', async (t) => {
  await setup(t);
  delete process.env.OCD_INTAKE_RULES;
  assert.ok(
    prepare('W03', nativePayload, policy(), now).missing.some((s) =>
      /native intake coverage/.test(s),
    ),
  );
});
test('finance checks flag incomplete evidence without computing invented hours or releasing money', async (t) => {
  await setup(t);
  const proposal = prepare(
    'W11',
    {
      evidenceReference: 'Native visit',
      visits: [
        {
          shiftId: 'shift-1',
          startAt: '2026-10-13T09:00:00+08:00',
          endAt: '2026-10-13T10:00:00+08:00',
        },
      ],
    },
    policy(),
    now,
  );
  assert.ok(proposal.fields.exceptions[0].findings.some((s) => /Actual times/.test(s)));
  assert.equal(proposal.effect, 'internal');
  assert.equal(proposal.fields.totalPay, undefined);
});
test('blank expiry needs evidence and stale arrival data is withdrawn', async (t) => {
  await setup(t);
  const proposal = prepare(
    'W12',
    {
      evidenceReference: 'Native qualifications',
      documents: [
        { id: 'doc-1', expires: '' },
        { id: 'doc-2', expires: '', noExpirationVerified: true },
      ],
    },
    policy(),
    now,
  );
  assert.equal(proposal.fields.documents[0].status, 'needs_evidence');
  assert.equal(proposal.fields.documents[1].status, 'verified_non_expiring');
  const arrival = prepare(
    'W14',
    {
      evidenceReference: 'Device update',
      shiftId: 'shift-1',
      workerId: 'worker-1',
      consent: true,
      assignmentChecked: true,
      updatedAt: '2026-10-13T00:50:00Z',
      remainingMinutes: 10,
    },
    policy(),
    now,
  );
  assert.equal(arrival.fields.visible, false);
  assert.equal(arrival.fields.remainingMinutes, null);
});
test('account-time-zone schedules deduplicate and respect an explicit fortnight anchor', async (t) => {
  const { service } = await setup(t);
  await service.schedule(
    {
      workflow: 'W11',
      cadence: 'fortnightly',
      localTime: '09:00',
      weekday: 2,
      anchorDate: '2026-10-13',
      enabled: true,
    },
    owner,
  );
  assert.equal(await service.dueSchedules(), 1);
  assert.equal(await service.dueSchedules(), 0);
  const later = new AutomationService(service.store, {}, () => new Date('2026-10-20T01:00:00Z'));
  assert.equal(await later.dueSchedules(), 0);
  const next = new AutomationService(service.store, {}, () => new Date('2026-10-27T01:00:00Z'));
  assert.equal(await next.dueSchedules(), 1);
});
test('intake collector reads genuine shared intakes and invalidates stale source review', async (t) => {
  const { service } = await setup(t);
  const { IntakeRepository } = require('../lib/intake-repository.cjs');
  const repo = IntakeRepository.configured();
  await repo.set({
    id: 'REQ-1',
    revision: 'v1',
    status: 'New',
    owner,
    name: 'Alex Test',
    postcode: '6027',
  });
  assert.equal(await service.syncIntakes(), 1);
  assert.equal(await service.syncIntakes(), 0);
  await service.process();
  const job = (await service.store.read()).jobs[0];
  await repo.set(
    { id: 'REQ-1', revision: 'v2', status: 'New', owner, name: 'Alex Test', postcode: '6027' },
    'v1',
  );
  await assert.rejects(approve(service, job), { status: 409 });
});
test('verified native onboarding links back to the unchanged original intake without a second create', async (t) => {
  const { service } = await setup(t, {
    'client.upsert': {
      execute: async () => ({ reference: '456' }),
      verify: async () => ({ matches: true, reference: '456' }),
    },
  });
  const { IntakeRepository } = require('../lib/intake-repository.cjs');
  const repo = IntakeRepository.configured();
  await repo.set({
    id: 'REQ-verified',
    revision: 'v1',
    status: 'Ready for ShiftCare',
    owner,
    name: 'Alex Test',
    email: 'alex@example.test',
    postcode: '6027',
    consentAt: now.toISOString(),
    onboarding: { reviewedAt: now.toISOString() },
    history: [],
  });
  await service.syncIntakes();
  await service.process();
  let job = (await service.store.read()).jobs[0];
  job = await service.decide(
    job.id,
    job.revision,
    { action: 'revise', payload: { identityChecked: true, fields: nativePayload.fields } },
    owner,
  );
  await service.process();
  job = (await service.store.read()).jobs[0];
  job = await approve(service, job);
  job = await service.execute(job.id, job.revision, owner);
  job = await service.verify(
    job.id,
    job.revision,
    { accountingChecked: true, accountingReference: 'Checked existing contact' },
    owner,
  );
  assert.equal(job.receipt.details.originalIntakeLink, 'linked');
  const original = await repo.get('REQ-verified');
  assert.equal(original.status, 'Entered in ShiftCare');
  assert.equal(original.shiftCareId, '456');
  assert.equal(original.shiftCareVerification.method, 'api-read-back');
  assert.equal(await service.syncIntakes(), 0);
  assert.equal((await service.store.read()).jobs.length, 1);
});

const microsoftEnv = {
  MICROSOFT365_TENANT_ID: 'tenant.example',
  MICROSOFT365_CLIENT_ID: 'fictional-client',
  MICROSOFT365_CLIENT_SECRET: 'fictional-secret',
  MICROSOFT365_MAILBOX: 'inbox@example.test',
  MICROSOFT365_INGEST_FROM: '2026-10-01T00:00:00Z',
};
test('Microsoft 365 delta pages commit cursor with deduplicated sources and keep credentials private', async (t) => {
  const { service } = await setup(t);
  const urls = [];
  const delta =
    'https://graph.microsoft.com/v1.0/users/inbox%40example.test/mailFolders/inbox/messages/delta?$deltatoken=private-cursor';
  const fetchImpl = async (url, options) => {
    urls.push(String(url));
    if (String(url).includes('login.microsoftonline'))
      return Response.json({ access_token: 'fictional-token', expires_in: 3600 });
    assert.equal(options.method, 'GET');
    assert.match(options.headers.Prefer, /ImmutableId/);
    return Response.json({
      value: [
        {
          id: 'immutable-1',
          subject: 'Participant intake',
          body: { contentType: 'text', content: 'Full name: Alex Test' },
          receivedDateTime: '2026-10-12T10:00:00Z',
        },
        { '@removed': { reason: 'deleted' }, id: 'removed' },
      ],
      '@odata.deltaLink': delta,
    });
  };
  const reader = new Microsoft365Mailbox(service, microsoftEnv, fetchImpl);
  assert.equal((await reader.poll()).imported, 1);
  assert.equal((await reader.poll()).imported, 0);
  const state = await service.store.read();
  assert.equal(state.jobs.length, 1);
  assert.equal(Object.values(state.connectors)[0].cursor, delta);
  assert.ok(!JSON.stringify(state).includes('fictional-secret'));
  assert.ok(urls.some((url) => url.includes('$deltatoken')));
});
test('Microsoft 365 rejects foreign pagination URLs without advancing its cursor', async (t) => {
  const { service } = await setup(t);
  const reader = new Microsoft365Mailbox(service, microsoftEnv, async (url) =>
    String(url).includes('login.microsoftonline')
      ? Response.json({ access_token: 'token', expires_in: 3600 })
      : Response.json({ value: [], '@odata.nextLink': 'https://example.test/token-theft' }),
  );
  await assert.rejects(reader.poll(), { status: 502 });
  assert.equal(Object.values((await service.store.read()).connectors)[0].cursor, undefined);
});
test('documented ShiftCare client adapter uses form parameters, narrow mappings and independent verification', async (t) => {
  const { service } = await setup(t);
  const nativeEnv = {
    SHIFTCARE_ACCOUNT_ID: '123',
    SHIFTCARE_API_KEY: 'fictional-key',
    SHIFTCARE_API_REGION: 'au',
    SHIFTCARE_TIME_ZONE: 'Australia/Perth',
    OCD_SHIFTCARE_WRITE_OPERATIONS: 'client.upsert',
  };
  let saved,
    writes = 0;
  const native = new ShiftCareOperations(nativeEnv, async (url, options) => {
    assert.equal(new URL(url).origin, 'https://api.shiftcare.com');
    if (options.method === 'POST') {
      writes++;
      saved = { id: 456, ...Object.fromEntries(options.body) };
      assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
      return Response.json(saved, { status: 201 });
    }
    if (String(url).includes('filter_by_name')) return Response.json({ clients: [] });
    return Response.json(saved);
  });
  assert.deepEqual(
    new ShiftCareOperations({ ...nativeEnv, OCD_SHIFTCARE_WRITE_OPERATIONS: '' }).enabled(),
    [],
  );
  const realService = new AutomationService(service.store, native.registry(), () => now);
  let job = await prepared(realService, 'W03', {
    ...nativePayload,
    fields: {
      ...nativePayload.fields,
      firstName: 'Alex',
      familyName: 'Test',
      service: 'Preserve only in original intake',
    },
  });
  job = await approve(realService, job);
  job = await realService.execute(job.id, job.revision, owner);
  assert.equal(writes, 1);
  assert.equal(saved.first_name, 'Alex');
  assert.equal(saved.client_status, 'prospect');
  assert.equal(saved.service, undefined);
  job = await realService.verify(
    job.id,
    job.revision,
    { accountingChecked: true, accountingReference: 'Existing accounting check' },
    owner,
  );
  assert.equal(job.receipt.method, 'api-read-back');
});
test('native preflight blocks duplicate identities before dispatch and does not label it an unknown write', async (t) => {
  const { service } = await setup(t);
  let writes = 0;
  const native = new ShiftCareOperations(
    {
      SHIFTCARE_ACCOUNT_ID: '123',
      SHIFTCARE_API_KEY: 'fictional',
      SHIFTCARE_TIME_ZONE: 'Australia/Perth',
      OCD_SHIFTCARE_WRITE_OPERATIONS: 'client.upsert',
    },
    async (url, options) => {
      if (options.method !== 'GET') writes++;
      return Response.json({
        clients: [{ id: '456', first_name: 'Alex', dob: '1990-01-01', email: 'alex@example.test' }],
      });
    },
  );
  const realService = new AutomationService(service.store, native.registry(), () => now);
  let job = await approve(
    realService,
    await prepared(realService, 'W03', {
      ...nativePayload,
      fields: { ...nativePayload.fields, firstName: 'Alex' },
    }),
  );
  job = await realService.execute(job.id, job.revision, owner);
  assert.equal(job.status, 'blocked');
  assert.equal(writes, 0);
  assert.equal(job.dispatch, undefined);
});
test('application API enforces sign-in, role permissions and the exact case revision', async (t) => {
  await setup(t);
  process.env.WORKFLOW_STAFF_ACCOUNTS = JSON.stringify([
    { email: owner, password: 'test', role: 'admin' },
    { email: 'reader@example.test', password: 'test', role: 'reader' },
    { email: 'coordinator@example.test', password: 'test', role: 'coordinator' },
  ]);
  const adapter = require('../api/automation.js');
  const server = http.createServer(adapter).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/automation`;
  const cookie = (email) => sessionCookie(email, { headers: {} }).split(';')[0];
  assert.equal((await fetch(`${base}?action=status`)).status, 401);
  const status = await fetch(`${base}?action=status`, { headers: { cookie: cookie(owner) } });
  const data = await status.json();
  assert.equal(data.catalog.length, 14);
  assert.equal(data.connectors.shiftcare.readOnly, true);
  for (const action of ['close', 'restore-follow-ups']) {
    assert.equal(
      (
        await fetch(`${base}?action=${action}`, {
          method: 'POST',
          headers: {
            cookie: cookie('coordinator@example.test'),
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await fetch(`${base}?action=enqueue`, {
        method: 'POST',
        headers: { cookie: cookie('reader@example.test'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: 'W01', sourceId: 'source', payload: {} }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}?action=enqueue`, {
        method: 'POST',
        headers: {
          cookie: cookie(owner),
          origin: 'https://foreign.example',
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
    ).status,
    403,
  );
});

const cancellationEvidence = () => ({
  evidenceReference: 'Fictional cancellation call',
  shiftId: '123',
  reason: 'Participant away',
  treatment: 'without_charge',
  scopeChecked: true,
  policyChecked: true,
  travelChecked: true,
  travelReference: 'Original attendance checked; no travel incurred',
  nativeContext: { clients: [{ id: '789' }], staff: [{ id: '456' }] },
});
async function checkedCommunication(service, id) {
  await service.process();
  let child = (await service.store.read()).jobs.find((j) => j.id === id);
  child = await approve(service, child);
  child = await service.execute(child.id, child.revision, owner);
  return service.verify(
    child.id,
    child.revision,
    {
      nativeChecked: true,
      reference: 'NATIVE-COMMS-REVIEW',
      communicationChecked: true,
      communicationReference: `NATIVE-HISTORY-${child.id}`,
    },
    owner,
  );
}
test('cancellation cannot be approved until actual travel cleanup has a checked reference', async (t) => {
  const { service } = await setup(t);
  const payload = cancellationEvidence();
  delete payload.travelChecked;
  delete payload.travelReference;
  let job = await prepared(service, 'W07', payload);
  assert.equal(job.status, 'blocked');
  assert.ok(job.proposal.missing.some((item) => /Before cancellation.*travel/.test(item)));
  await assert.rejects(approve(service, job), { status: 409 });
  job = await service.decide(
    job.id,
    job.revision,
    {
      action: 'revise',
      payload: { travelChecked: true, travelReference: 'Checked native travel correction REF-42' },
    },
    owner,
  );
  await service.process();
  job = (await service.store.read()).jobs.find((j) => j.id === job.id);
  assert.equal(job.status, 'needs_review');
  assert.equal(job.proposal.fields.travelReference, 'Checked native travel correction REF-42');
});
test('cancellation closure requires every delivered communication and a separate final financial check', async (t) => {
  const { service } = await setup(t);
  let job = await approve(service, await prepared(service, 'W07', cancellationEvidence()));
  job = await service.execute(job.id, job.revision, owner);
  job = await service.verify(
    job.id,
    job.revision,
    { nativeChecked: true, reference: '123' },
    owner,
  );
  const proof = structuredClone(job.receipt);
  await checkedCommunication(service, job.requiredChildren[0].id);
  await assert.rejects(
    service.close(
      job.id,
      job.revision,
      { financialChecked: true, financialReference: 'Reviewed final treatment' },
      owner,
    ),
    { status: 409 },
  );
  await checkedCommunication(service, job.requiredChildren[1].id);
  await assert.rejects(service.close(job.id, job.revision, {}, owner), { status: 422 });
  job = await service.assign(
    job.id,
    job.revision,
    { owner, dueAt: '2026-10-29T09:00:00+08:00' },
    owner,
  );
  assert.equal(job.status, 'follow_up');
  assert.deepEqual(job.receipt, proof);
  job = await service.close(
    job.id,
    job.revision,
    { financialChecked: true, financialReference: 'Native charge/pay outcome REF-43' },
    owner,
  );
  assert.equal(job.status, 'completed');
  assert.equal(job.receipt.reference, '123');
  assert.equal(job.receipt.details.financialReference, 'Native charge/pay outcome REF-43');
  const revision = job.revision;
  job = await service.close(job.id, job.revision, {}, owner);
  assert.equal(job.revision, revision);
  await assert.rejects(service.execute(job.id, job.revision, owner), { status: 409 });
  assert.equal(
    (await service.store.read()).jobs.filter((j) => j.payload.outcomeJobId === job.id).length,
    2,
  );
});
test('rejected communication and a newer source never conceal the old verified action or close its follow-through', async (t) => {
  const { service } = await setup(t);
  let job = await approve(service, await prepared(service, 'W07', cancellationEvidence()));
  job = await service.execute(job.id, job.revision, owner);
  job = await service.verify(
    job.id,
    job.revision,
    { nativeChecked: true, reference: '123' },
    owner,
  );
  await service.process();
  let child = (await service.store.read()).jobs.find((j) => j.id === job.requiredChildren[0].id);
  await service.decide(
    child.id,
    child.revision,
    { action: 'reject', reason: 'Recipient needs a different approved contact' },
    owner,
  );
  await service.enqueue(
    {
      workflow: 'W07',
      sourceId: job.sourceId,
      sourceRevision: '2',
      owner,
      payload: { ...cancellationEvidence(), reason: 'New source correction' },
    },
    owner,
  );
  const original = (await service.store.read()).jobs.find((j) => j.id === job.id);
  assert.equal(original.status, 'follow_up');
  assert.deepEqual(original.receipt, job.receipt);
  await assert.rejects(
    service.close(
      job.id,
      job.revision,
      { financialChecked: true, financialReference: 'Final check' },
      owner,
    ),
    { status: 409 },
  );
});
test('a checked assignment remains open until both communications are delivered', async (t) => {
  const { service } = await setup(t);
  let job = await approve(
    service,
    await prepared(service, 'W08', {
      evidenceReference: 'Fictional accepted cover',
      shiftId: '123',
      workerId: '456',
      availabilityChecked: true,
      qualificationsChecked: true,
      workerAccepted: true,
      participantAgreed: true,
      nativeContext: { clients: [{ id: '789' }] },
    }),
  );
  job = await service.execute(job.id, job.revision, owner);
  job = await service.verify(
    job.id,
    job.revision,
    { nativeChecked: true, reference: '123' },
    owner,
  );
  assert.equal(job.status, 'follow_up');
  await assert.rejects(service.close(job.id, job.revision, {}, owner), { status: 409 });
  for (const link of job.requiredChildren) await checkedCommunication(service, link.id);
  job = await service.close(job.id, job.revision, {}, owner);
  assert.equal(job.status, 'completed');
});

test('older action-only completion is presented as follow-through and recovers without duplicate communication or native dispatch', async (t) => {
  const { service } = await setup(t);
  let job = await approve(service, await prepared(service, 'W07', cancellationEvidence()));
  job = await service.execute(job.id, job.revision, owner);
  job = await service.verify(
    job.id,
    job.revision,
    { nativeChecked: true, reference: '123' },
    owner,
  );
  const oldParticipantId = job.requiredChildren[0].id;
  // Reproduce the stored shape from before business-case completion was introduced.
  await service.store.mutate((state) => {
    const old = state.jobs.find((j) => j.id === job.id);
    old.status = 'completed';
    delete old.requiredChildren;
    delete old.payload.travelChecked;
    delete old.payload.travelReference;
    state.jobs = state.jobs.filter((j) => j.payload.audience !== 'worker');
    delete state.jobs.find((j) => j.id === oldParticipantId).payload.audience;
  });
  job = (await service.store.read()).jobs.find((j) => j.id === job.id);
  const { presentJob } = require('../.backend/automation/service.js');
  assert.equal(presentJob(job).status, 'follow_up');
  assert.equal(presentJob(job).followUpReviewRequired, true);
  const originalReceipt = structuredClone(job.receipt);
  job = await service.restoreFollowUps(job.id, job.revision, owner);
  assert.equal(job.status, 'follow_up');
  assert.equal(job.requiredChildren[0].id, oldParticipantId);
  assert.equal(job.requiredChildren.length, 2);
  assert.deepEqual(job.receipt, originalReceipt);
  const restoredAgain = await service.restoreFollowUps(job.id, job.revision, owner);
  assert.equal(restoredAgain.revision, job.revision);
  for (const link of job.requiredChildren) await checkedCommunication(service, link.id);
  await assert.rejects(
    service.close(
      job.id,
      job.revision,
      { financialChecked: true, financialReference: 'Final treatment checked' },
      owner,
    ),
    { status: 422 },
  );
  job = await service.close(
    job.id,
    job.revision,
    {
      travelChecked: true,
      travelReference: 'Retrospective actual travel/cleanup REF-44',
      financialChecked: true,
      financialReference: 'Final treatment checked',
    },
    owner,
  );
  assert.equal(job.status, 'completed');
  assert.equal(presentJob(job).status, 'completed');
  assert.equal(job.receipt.reference, originalReceipt.reference);
  assert.equal(
    job.receipt.details.retrospectiveTravelReference,
    'Retrospective actual travel/cleanup REF-44',
  );
  assert.equal(
    (await service.store.read()).jobs.filter((j) => j.payload.outcomeJobId === job.id).length,
    2,
  );
});
