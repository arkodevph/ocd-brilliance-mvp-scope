const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

test('offline workspace serves every stylesheet linked by its cached shell', async () => {
  const handlers = new Map(), cached = new Map();
  const origin = 'http://localhost:8001';
  const cache = {
    async addAll(urls) {
      for (const url of urls) cached.set(origin + url, { url });
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/sw.js'), 'utf8'), {
    URL,
    self: {
      location: { origin },
      registration: { scope: origin + '/' },
      addEventListener: (type, handler) => handlers.set(type, handler),
      skipWaiting: async () => {},
    },
    caches: {
      open: async () => cache,
      match: async (request) => cached.get(typeof request === 'string' ? origin + request : request.url),
    },
    fetch: async () => { throw new Error('Network unavailable'); },
  });
  let installation;
  handlers.get('install')({ waitUntil: (promise) => { installation = promise; } });
  await installation;
  const html = fs.readFileSync(require.resolve('../workspace/index.html'), 'utf8');
  const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
  for (const url of styles) {
    let response;
    handlers.get('fetch')({
      request: { method: 'GET', mode: 'cors', url: origin + url },
      respondWith: (promise) => { response = promise; },
    });
    assert.ok(await response, `Offline shell is missing ${url}`);
  }
});
