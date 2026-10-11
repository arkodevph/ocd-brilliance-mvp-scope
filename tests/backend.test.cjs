const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

test('all public adapters dispatch the existing routes through Nest with their access rules', async t => {
  const adapters = Object.fromEntries(['workflow', 'push', 'shiftcare', 'integration-proof', 'journeys'].map(name => [name, require(`../api/${name}.js`)]));
  assert.notEqual(adapters.shiftcare.createHandler, adapters['integration-proof'].createHandler);
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.split('/').pop();
    return adapters[name](req, res);
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
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
