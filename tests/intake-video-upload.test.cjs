const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('large multiple videos upload in chunks, persist as references and stream only to office staff', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-large-videos-'));
  const settings = { WORKFLOW_DATA_DIR: directory, SERVICE_POSTCODES: '6027', WORKFLOW_STAFF_EMAIL: 'office@example.test', WORKFLOW_STAFF_PASSWORD: 'fixture-password', WORKFLOW_SESSION_SECRET: 'a-test-session-secret-longer-than-32-characters', WORKFLOW_STAFF_ACCOUNTS: '', VERCEL: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  const server = http.createServer(require('../api/workflow.js')).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
    for (const key of Object.keys(settings)) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  });
  const base = `http://127.0.0.1:${server.address().port}/api/workflow`;
  async function call(action, body, cookie, headers = {}) {
    const raw = Buffer.isBuffer(body);
    const response = await fetch(`${base}?action=${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: new URL(base).origin, ...(body !== undefined ? { 'Content-Type': raw ? 'application/octet-stream' : 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
    return response;
  }
  const start = { name: 'room.mp4', type: 'video/mp4', size: 4 * 1024 * 1024 + 100, postcode: '6027', consent: true };
  assert.equal((await call('video-start', { ...start, consent: false })).status, 422);
  assert.equal((await call('video-start', { ...start, size: 100 * 1024 * 1024 + 1 })).status, 422);
  assert.equal((await call('video-start', start, undefined, { Origin: 'https://unrelated.example' })).status, 403);
  const bytes = Buffer.alloc(start.size, 7);
  bytes.write('ftyp', 4);
  const refs = [];
  for (const type of ['video/mp4', 'video/quicktime']) {
    const upload = await (await call('video-start', { ...start, type })).json();
    assert.equal(upload.chunkBytes, 1024 * 1024);
    assert.equal((await call(`video-upload&id=${upload.id}&offset=1`, bytes.subarray(0, 12))).status, 409);
    let result;
    for (let offset = 0; offset < bytes.length; offset += upload.chunkBytes) {
      const chunk = bytes.subarray(offset, offset + upload.chunkBytes);
      const response = await call(`video-upload&id=${upload.id}&offset=${offset}`, chunk);
      assert.equal(response.status, 200);
      result = await response.json();
      if (!offset) {
        const replay = await (await call(`video-upload&id=${upload.id}&offset=0`, chunk)).json();
        assert.equal(replay.received, chunk.length);
        assert.equal((await call(`video-upload&id=${upload.id}&offset=0`, Buffer.alloc(12))).status, 409);
      }
    }
    assert.equal(result.complete, true);
    refs.push({ id: upload.id });
  }
  const pending = await (await call('video-start', start)).json();
  const intake = { name: 'Video Client', email: 'video@example.test', phone: '0400000099', service: 'Cleaning', suburb: 'Joondalup', postcode: '6027', consent: true, idempotencyKey: 'large-video-intake' };
  assert.equal((await call('intake', { ...intake, serviceVideos: [{ id: pending.id }] })).status, 422);
  assert.equal((await call('intake', { ...intake, serviceVideos: Array(6).fill(refs[0]) })).status, 422);
  assert.equal((await call('intake', { ...intake, serviceVideos: [refs[0], refs[0]] })).status, 422);
  const created = await (await call('intake', { ...intake, serviceVideos: refs })).json();
  assert.match(created.id, /^REQ-/);
  const replay = await (await call('intake', { ...intake, serviceVideos: refs })).json();
  assert.equal(replay.id, created.id);
  const login = await call('login', { email: settings.WORKFLOW_STAFF_EMAIL, password: settings.WORKFLOW_STAFF_PASSWORD });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const record = (await (await call('intakes', undefined, cookie)).json()).records[0];
  assert.equal(record.onboarding.serviceVideos.length, 2);
  assert.equal(record.onboarding.serviceVideos[0].size, bytes.length);
  assert.equal(record.onboarding.serviceVideos[0].data, undefined);
  assert.ok((await fs.stat(path.join(directory, 'intakes.json'))).size < 20000);
  const reviewed = await fetch(`${base}?action=draft-review`, { method: 'PATCH', headers: { Origin: new URL(base).origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...record, status: 'Reviewing', sourceReviewed: true, serviceVideoReviewed: true }) });
  assert.equal(reviewed.status, 200);
  assert.equal((await reviewed.json()).record.onboarding.serviceVideoReviewedBy, settings.WORKFLOW_STAFF_EMAIL);
  const media = `video&recordId=${created.id}&id=${refs[0].id}`;
  assert.equal((await call(media)).status, 401);
  assert.equal((await call(`video&recordId=missing&id=${refs[0].id}`, undefined, cookie)).status, 404);
  const range = await call(media, undefined, cookie, { Range: 'bytes=0-11' });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), bytes.subarray(0, 12));
  assert.equal((await call(media, undefined, cookie, { Range: 'bytes=999999999-' })).status, 416);
  const full = await call(media, undefined, cookie);
  assert.deepEqual(Buffer.from(await full.arrayBuffer()), bytes);
  process.env.VERCEL = '1';
  assert.equal((await call('video-start', start)).status, 503);
});
