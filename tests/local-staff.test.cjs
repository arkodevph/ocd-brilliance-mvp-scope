const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const seedLocalStaff = require('../scripts/local-staff.cjs');

test('creates one private local account and never seeds production', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-staff-'));
  const keys = ['WORKFLOW_DATA_DIR', 'WORKFLOW_STAFF_EMAIL', 'WORKFLOW_STAFF_PASSWORD', 'WORKFLOW_SESSION_SECRET', 'VERCEL', 'NODE_ENV'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(async () => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    await fs.rm(dir, { recursive: true });
  });
  for (const key of keys) delete process.env[key];
  process.env.WORKFLOW_DATA_DIR = dir;

  const first = await seedLocalStaff();
  assert.equal(first.email, 'office@ocd-brilliance.local');
  assert.ok(first.password.length >= 24);
  assert.equal((await fs.stat(first.file)).mode & 0o777, 0o600);
  assert.equal(process.env.WORKFLOW_STAFF_PASSWORD, first.password);

  for (const key of ['WORKFLOW_STAFF_EMAIL', 'WORKFLOW_STAFF_PASSWORD', 'WORKFLOW_SESSION_SECRET']) delete process.env[key];
  const second = await seedLocalStaff();
  assert.equal(second.password, first.password);

  for (const key of ['WORKFLOW_STAFF_EMAIL', 'WORKFLOW_STAFF_PASSWORD', 'WORKFLOW_SESSION_SECRET']) delete process.env[key];
  process.env.NODE_ENV = 'production';
  assert.equal(await seedLocalStaff(), null);
  assert.equal(process.env.WORKFLOW_STAFF_EMAIL, undefined);
});
