const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const globals = { Request: global.Request, Response: global.Response };

const { application } = require('../.backend/application.js');
// Hono finalizes its router on the first request; register fault injection beforehand.
application.get('/api/test-failure', () => {
  throw new Error('Private upstream details');
});

async function serve(t, handler) {
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  return `http://127.0.0.1:${server.address().port}`;
}

test('all public adapters dispatch the existing routes through Hono with their access rules', async (t) => {
  const adapters = Object.fromEntries(
    ['workflow', 'push', 'shiftcare', 'integration-proof', 'journeys'].map((name) => [
      name,
      require(`../api/${name}.js`),
    ]),
  );
  assert.notEqual(adapters.shiftcare.createHandler, adapters['integration-proof'].createHandler);
  const base = await serve(t, (req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.split('/').pop();
    return adapters[name](req, res);
  });

  for (const name of ['shiftcare', 'integration-proof']) {
    const response = await fetch(`${base}/api/${name}`);
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /Sign in/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }

  const workflow = await fetch(`${base}/api/workflow?action=session`);
  assert.equal(workflow.status, 200);
  assert.equal(Boolean((await workflow.json()).email), false);
  const push = await fetch(`${base}/api/push`, { method: 'DELETE' });

  assert.equal(push.status, 405);
  const journey = await fetch(`${base}/api/journeys`, { method: 'DELETE' });

  assert.equal(journey.status, 405);
});

test('Hono preserves Node globals, trailing-slash routes and raw JSON body limits', async (t) => {
  const dispatch = require('../api/_hono.cjs');
  assert.equal(global.Request, globals.Request);
  assert.equal(global.Response, globals.Response);
  const base = await serve(t, dispatch);
  assert.equal((await fetch(`${base}/api/workflow/?action=session`)).status, 200);
  assert.equal((await fetch(`${base}/api/unknown`)).status, 404);

  const malformed = await fetch(`${base}/api/workflow?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });

  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /valid JSON/);
  const oversized = await fetch(`${base}/api/workflow?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'x'.repeat(20001) }),
  });

  assert.equal(oversized.status, 413);
  assert.equal(oversized.headers.get('cache-control'), 'no-store');
});

test('Hono accepts pre-parsed Vercel request bodies and preserves session cookies', async (t) => {
  const keys = ['WORKFLOW_STAFF_ACCOUNTS', 'WORKFLOW_SESSION_SECRET'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    WORKFLOW_STAFF_ACCOUNTS: JSON.stringify([
      { email: 'hono@example.test', password: 'test', role: 'reader' },
    ]),
    WORKFLOW_SESSION_SECRET: 'fictional-hono-secret-longer-than-32-characters',
  });

  t.after(() => {
    for (const key of keys)
      original[key] === undefined ? delete process.env[key] : (process.env[key] = original[key]);
  });

  const dispatch = require('../api/_hono.cjs');
  const base = await serve(t, async (req, res) => {
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      req.body = JSON.parse(raw);
    }

    return dispatch(req, res);
  });

  const response = await fetch(`${base}/api/workflow?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
    body: JSON.stringify({ email: 'hono@example.test', password: 'test' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { email: 'hono@example.test', role: 'reader' });

  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly; SameSite=Lax; Path=\/; Max-Age=28800; Secure/);
  const session = await fetch(`${base}/api/workflow?action=session`, {
    headers: { Cookie: cookie.split(';')[0] },
  });

  assert.equal((await session.json()).email, 'hono@example.test');
  const denied = await fetch(`${base}/api/workflow?action=session`, {
    headers: { Origin: 'https://untrusted.example.test' },
  });

  assert.equal(denied.status, 403);
});

test('Hono returns a private service error for unexpected handler failures', async (t) => {
  const { dispatch } = require('../.backend/application.js');
  const base = await serve(t, dispatch);
  const response = await fetch(`${base}/api/test-failure`);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await response.json(), { error: 'The backend service is unavailable.' });
});
