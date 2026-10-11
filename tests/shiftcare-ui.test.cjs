const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

test('office readiness checks entered dates and shows partial failures without a verified badge', async () => {
  const listeners = {};
  const requests = [];
  const window = {};
  const root = {
    isConnected: true, innerHTML: '',
    addEventListener(name, handler) { listeners[name] = handler; },
    querySelector(selector) { return { value: selector === '[name=from]' ? '2026-10-04' : '2026-10-05' }; }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/shiftcare.js'), 'utf8'), {
    window, AbortController, URLSearchParams, Intl, Date,
    fetch: async url => {
      const params = new URL(url, 'http://localhost').searchParams;
      requests.push(params);
      const data = params.get('action') === 'status'
        ? { configured: true, accountId: '12345', region: 'au', timeZone: 'Australia/Perth' }
        : { readsReady: false, checkedAt: new Date().toISOString(), reads: [
          { resource: 'clients', connected: true },
          { resource: 'staff', connected: false, error: '<denied>' },
          { resource: 'shifts', connected: true }
        ] };
      return { ok: true, json: async () => data };
    }
  });
  await window.OCD_SHIFTCARE.mount(root);
  assert.match(root.innerHTML, /Check clients, staff &amp; bookings/);
  assert.match(root.innerHTML, /Roster screenshots/);
  listeners.click({ target: { closest: () => ({ hasAttribute: name => name === 'data-readiness' }) } });
  await new Promise(resolve => setImmediate(resolve));
  const request = requests.at(-1);
  assert.equal(request.get('action'), 'readiness');
  assert.equal(request.get('from'), '2026-10-04');
  assert.equal(request.get('to'), '2026-10-05');
  assert.match(root.innerHTML, /Connection needs attention/);
  assert.match(root.innerHTML, /Staff: &lt;denied&gt;/);
  assert.ok(!root.innerHTML.includes('>Verified</span>'));
  assert.match(root.innerHTML, /Native writes and live worker location are not connected/);
  window.OCD_SHIFTCARE.unmount();
});
