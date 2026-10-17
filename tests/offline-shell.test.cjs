const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function installPage(t, userAgent = 'Mozilla/5.0 (Linux; Android 14) Brave') {
  const html = fs.readFileSync(require.resolve('../frontend/landing/index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://ocd.example.test/intake',
    runScripts: 'outside-only',
  });

  t.after(() => dom.window.close());
  const { window } = dom;
  window.matchMedia = () => ({ matches: false });

  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent });

  Object.defineProperty(window, 'isSecureContext', { value: true });

  Object.defineProperty(window.navigator, 'serviceWorker', {
    value: { register: async () => ({}) },
  });

  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };

  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new window.Event('close'));
  };

  const trigger = window.document.createElement('button');
  trigger.setAttribute('data-app-tools-open', '');
  window.document.body.appendChild(trigger);
  window.eval(fs.readFileSync(require.resolve('../workspace/pwa.js'), 'utf8'));
  return { window, trigger };
}

test('public intake exposes the manifest, iPhone icon and installation runtime', () => {
  const html = fs.readFileSync(require.resolve('../frontend/landing/index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  assert.equal(
    document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
    '/workspace/manifest.webmanifest',
  );
  assert.ok(document.querySelector('link[rel="apple-touch-icon"]'));
  assert.ok(document.querySelector('script[src="/workspace/pwa.js"]'));
  const manifest = JSON.parse(
    fs.readFileSync(require.resolve('../workspace/manifest.webmanifest'), 'utf8'),
  );
  assert.equal(manifest.start_url, '/portal');
});

test('Brave without an install prompt shows actionable installation instructions', (t) => {
  const { window, trigger } = installPage(t);
  trigger.click();
  const dialog = window.document.querySelector('#app-tools-dialog');
  assert.ok(dialog.hasAttribute('open'));
  const button = dialog.querySelector('#install-app');
  assert.equal(button.hidden, false);
  button.click();
  assert.match(dialog.querySelector('#install-status').textContent, /menu|Install|Home Screen/);
  assert.match(dialog.querySelector('#app-tools-feedback').textContent, /menu|Install|Home Screen/);
});

test('iPhone install fallback explains the Share menu and Safari fallback', (t) => {
  const { window, trigger } = installPage(
    t,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  );
  trigger.click();
  const dialog = window.document.querySelector('#app-tools-dialog');
  dialog.querySelector('#install-app').click();
  assert.match(dialog.querySelector('#install-status').textContent, /Share.*Add to Home Screen/);
  assert.match(dialog.querySelector('#install-status').textContent, /Safari/);
});

test('presentation notifications work in-app without push permission and can be dismissed', (t) => {
  const { window, trigger } = installPage(t);
  trigger.click();
  window.document.querySelector('#preview-in-app-notification').click();
  const notification = window.document.querySelector('#in-app-notification');
  assert.ok(notification);
  assert.equal(window.document.querySelector('#app-tools-dialog').hasAttribute('open'), false);
  assert.match(notification.textContent, /Presentation demo.*Sample booking update/);
  assert.equal(notification.querySelector('a').getAttribute('href'), '/portal');
  trigger.click();
  window.document.querySelector('#preview-in-app-notification').click();
  assert.equal(window.document.querySelectorAll('#in-app-notification').length, 1);
  window.document.querySelector('#in-app-notification button').click();
  assert.equal(window.document.querySelector('#in-app-notification'), null);
  assert.equal(window.document.activeElement, trigger);
});

test('offline workspace serves every stylesheet linked by its cached shell', async () => {
  const handlers = new Map(),
    cached = new Map();
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
      match: async (request) =>
        cached.get(typeof request === 'string' ? origin + request : request.url),
    },
    fetch: async () => {
      throw new Error('Network unavailable');
    },
  });

  let installation;
  handlers.get('install')({
    waitUntil: (promise) => {
      installation = promise;
    },
  });

  await installation;
  const html = fs.readFileSync(require.resolve('../workspace/index.html'), 'utf8');
  const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(
    (match) => match[1],
  );
  for (const url of styles) {
    let response;
    handlers.get('fetch')({
      request: { method: 'GET', mode: 'cors', url: origin + url },
      respondWith: (promise) => {
        response = promise;
      },
    });

    assert.ok(await response, `Offline shell is missing ${url}`);
  }
});
