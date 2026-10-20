const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function installPage(
  t,
  userAgent = 'Mozilla/5.0 (Linux; Android 14) Brave',
  savedAlerts,
  serviceWorkerSupported = true,
) {
  const html = fs.readFileSync(require.resolve('../frontend/landing/index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://ocd.example.test/intake',
    runScripts: 'outside-only',
  });

  t.after(() => dom.window.close());
  const { window } = dom;
  const networkRequests = [];
  window.fetch = async (...args) => {
    networkRequests.push(args);
    throw new Error('The presentation must work without a backend.');
  };
  if (savedAlerts) window.localStorage.setItem('ocd-demo-alert-status-v2', savedAlerts);
  window.matchMedia = () => ({ matches: false });

  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent });

  Object.defineProperty(window, 'isSecureContext', { value: true });

  if (serviceWorkerSupported)
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
  return { window, trigger, networkRequests };
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

test('desktop Brave fallback includes its Save and Share menu', (t) => {
  const { window, trigger } = installPage(
    t,
    'Mozilla/5.0 (X11; Linux x86_64) Chrome/130 Safari/537.36',
  );
  trigger.click();
  window.document.querySelector('#install-app').click();
  const steps = window.document.querySelector('#install-steps');
  assert.equal(steps.hidden, false);
  assert.match(steps.textContent, /Save and Share.*Install OCD Brilliance/);
  assert.match(steps.textContent, /brave:\/\/apps/);
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
  const steps = dialog.querySelector('#install-steps');
  assert.ok(steps && !steps.hidden, 'Manual install must reveal visible steps');
  assert.match(steps.textContent, /Share.*Add to Home Screen.*Add.*icon/s);
});

test('Android acceptance does not claim installation completed before app launch', async (t) => {
  const { window, trigger } = installPage(t);
  const event = new window.Event('beforeinstallprompt', { cancelable: true });
  let finishPrompt;
  event.prompt = () =>
    new Promise((resolve) => {
      finishPrompt = resolve;
    });
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
  trigger.click();
  const status = window.document.querySelector('#install-status');
  const button = window.document.querySelector('#install-app');
  button.click();
  assert.match(status.textContent, /confirm.*browser/i);
  assert.equal(button.disabled, true);
  finishPrompt();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(status.textContent, /installation requested/i);
  assert.match(status.textContent, /does not share download progress/i);
  assert.equal(window.document.querySelector('#open-workspace').hidden, false);
  assert.match(window.document.querySelector('#open-workspace').textContent, /Continue in browser/);
  window.dispatchEvent(new window.Event('appinstalled'));
  assert.match(status.textContent, /installation requested/i);
  assert.equal(button.hidden, false);
  assert.equal(window.document.querySelector('#open-workspace').hidden, false);
  assert.match(window.document.querySelector('#open-workspace').textContent, /Continue in browser/);
  const steps = window.document.querySelector('#install-steps');
  assert.equal(steps.hidden, false);
  assert.match(steps.textContent, /Installing.*Chrome/);
  window.matchMedia = () => ({ matches: true });
  trigger.click();
  assert.match(status.textContent, /running.*app/i);
  assert.equal(button.hidden, true);
  assert.equal(window.document.querySelector('#open-workspace').hidden, false);
});

test('opening from the home screen confirms app mode without another install prompt', (t) => {
  const { window, trigger } = installPage(t);
  window.matchMedia = () => ({ matches: true });
  trigger.click();
  assert.match(window.document.querySelector('#install-status').textContent, /running.*app/i);
  assert.equal(window.document.querySelector('#install-app').hidden, true);
  assert.equal(window.document.querySelector('#open-workspace').getAttribute('href'), '/portal');
});

for (const [browser, userAgent] of [
  ['Android Chrome', 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36'],
  ['Android Firefox', 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0'],
  ['Samsung Internet', 'Mozilla/5.0 (Linux; Android 14) SamsungBrowser/26 Chrome/130 Mobile'],
  [
    'iPhone Chrome',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130 Mobile Safari/604.1',
  ],
  ['Mac Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Version/18.0 Safari/605.1.15'],
  ['desktop Firefox', 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'],
]) {
  test(`${browser} can open the workspace without installation or service worker support`, (t) => {
    const { window, trigger } = installPage(t, userAgent, undefined, false);
    assert.equal('serviceWorker' in window.navigator, false);
    trigger.click();
    const link = window.document.querySelector('#open-workspace');
    assert.equal(link.hidden, false);
    assert.equal(link.href, 'https://ocd.example.test/portal');
    assert.equal(link.textContent, 'Continue in browser');
    window.document.querySelector('#install-app').click();
    assert.equal(window.document.querySelector('#install-steps').hidden, false);
    assert.ok(window.document.querySelectorAll('#install-steps li').length >= 3);
  });
}

test('a browser prompt failure preserves manual steps and direct workspace access', async (t) => {
  const { window, trigger } = installPage(t);
  const event = new window.Event('beforeinstallprompt', { cancelable: true });
  event.prompt = async () => {
    throw new Error('Browser install unavailable');
  };
  window.dispatchEvent(event);
  trigger.click();
  window.document.querySelector('#install-app').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(
    window.document.querySelector('#app-tools-feedback').textContent,
    /could not open installation/,
  );
  assert.equal(window.document.querySelector('#install-app').disabled, false);
  assert.equal(window.document.querySelector('#install-steps').hidden, false);
  assert.equal(window.document.querySelector('#open-workspace').hidden, false);
});

test('presentation notifications work in-app without push permission and can be dismissed', (t) => {
  const { window, trigger, networkRequests } = installPage(t);
  trigger.click();
  assert.equal(window.document.querySelector('#preview-in-app-notification').hidden, true);
  window.document.querySelector('#enable-alerts').click();
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
  assert.deepEqual(networkRequests, []);
});

test('demo alert preferences survive reopening and stay separate for each employee', (t) => {
  const { window, trigger, networkRequests } = installPage(t);
  window.OCD_ALERTS.setWorker('WRK-01');
  trigger.click();
  window.document.querySelector('#enable-alerts').click();
  assert.equal(window.OCD_ALERTS.get('WRK-01').status, 'Demo · on');
  const saved = window.localStorage.getItem('ocd-demo-alert-status-v2');
  const reopened = installPage(t, undefined, saved);
  reopened.window.OCD_ALERTS.setWorker('WRK-01');
  reopened.trigger.click();
  assert.equal(
    reopened.window.document.querySelector('#preview-in-app-notification').hidden,
    false,
  );
  reopened.window.OCD_ALERTS.setWorker('WRK-02');
  assert.equal(reopened.window.document.querySelector('#preview-in-app-notification').hidden, true);
  assert.equal(reopened.window.OCD_ALERTS.get('WRK-02').status, 'Demo · off');
  window.document.querySelector('#preview-in-app-notification').click();
  trigger.click();
  window.document.querySelector('#disable-alerts').click();
  assert.equal(window.document.querySelector('#in-app-notification'), null);
  assert.equal(window.OCD_ALERTS.get('WRK-01').status, 'Demo · off');
  assert.equal(window.document.querySelector('#preview-in-app-notification').hidden, true);
  assert.deepEqual(networkRequests, []);
  assert.deepEqual(reopened.networkRequests, []);
});

test('iPhone demo alerts work before installation without browser push support', (t) => {
  const { window, trigger, networkRequests } = installPage(
    t,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  );
  trigger.click();
  assert.equal(window.document.querySelector('#enable-alerts').hidden, false);
  window.document.querySelector('#enable-alerts').click();
  window.document.querySelector('#preview-in-app-notification').click();
  assert.ok(window.document.querySelector('#in-app-notification'));
  assert.deepEqual(networkRequests, []);
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
