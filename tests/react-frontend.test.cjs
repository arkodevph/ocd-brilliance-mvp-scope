const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');

test('React migration preserves form values, delegated actions and widget remounts', async () => {
  const bundle = await build({
    entryPoints: [path.join(__dirname, '../frontend/renderer.tsx')],
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }
  });
  const dom = new JSDOM('<div id="app"></div><dialog id="modal"></dialog>', {
    url: 'http://localhost/', runScripts: 'outside-only'
  });
  const { window } = dom;
  try {
    window.eval(bundle.outputFiles[0].text);
    const renderer = window.OCD_REACT;
    const app = window.document.getElementById('app');
    renderer.render(`<main><form data-form="test">
      <input name="name" value="Olivia &amp; team" required>
      <input name="consent" type="checkbox" checked>
      <select name="worker"><option value="first">First</option><option value="nurse" selected>Nurse</option></select>
      <textarea name="notes">Rooms &amp; tasks</textarea>
      <button type="button" data-action="open">Open</button>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 1h4" /></svg>
    </form><div id="widget"></div></main>`);
    const form = app.querySelector('form');
    const fields = Object.fromEntries(new window.FormData(form));
    assert.deepEqual(fields, { name: 'Olivia & team', consent: 'on', worker: 'nurse', notes: 'Rooms & tasks' });
    assert.equal(form.elements.name.required, true);
    assert.equal(app.querySelector('svg').getAttribute('viewBox'), '0 0 24 24');
    let action;
    window.document.addEventListener('click', event => { action = event.target.closest('[data-action]')?.dataset.action; });
    app.querySelector('button').click();
    assert.equal(action, 'open');
    app.querySelector('#widget').append(window.document.createElement('canvas'));
    renderer.render('<main><input name="name" value="Sam"></main>');
    assert.equal(app.querySelector('canvas'), null);
    assert.equal(app.querySelector('input').value, 'Sam');
    renderer.renderModal('<h2 id="modal-title">Review booking</h2><input name="date" value="2026-10-12">');
    assert.equal(window.document.querySelector('#modal input').value, '2026-10-12');

    let received;
    renderer.renderLogin(async credentials => { received = credentials; throw new window.Error('Check your credentials.'); });
    let login = app.querySelector('#staff-login');
    login.elements.email.value = 'office@example.test';
    login.elements.password.value = 'test-password';
    login.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(received.email, 'office@example.test');
    assert.equal(received.password, 'test-password');
    assert.equal(app.querySelector('[role="alert"]').textContent, 'Check your credentials.');
    assert.equal(app.querySelector('[role="alert"]').hidden, false);
    assert.equal(login.elements.password.value, 'test-password');
    assert.equal(login.querySelector('button').disabled, false);

    let finish;
    renderer.renderLogin(() => new Promise(resolve => { finish = resolve; }));
    login = app.querySelector('#staff-login');
    login.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(login.querySelector('button').disabled, true);
    finish();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(login.querySelector('button').disabled, false);
    renderer.unmount();
  } finally {
    window.close();
  }
});
