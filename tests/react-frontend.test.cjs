const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');

test('legacy disclosure enhancement preserves React-owned workflow controls during navigation', async () => {
  const bundle = await build({
    entryPoints: [path.join(__dirname, '../frontend/renderer.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const dom = new JSDOM('<div id="app"></div><dialog id="modal"></dialog>', {
    url: 'http://localhost/workspace/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const errors = [];
  window.structuredClone = structuredClone;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.addEventListener('error', (event) => errors.push(event.message));
  try {
    window.eval(bundle.outputFiles[0].text);
    const markup = (id) =>
      `<main><div data-react-operations="${JSON.stringify({ page: 'case', caseId: id }).replaceAll('"', '&quot;')}"></div></main>`;
    window.OCD_REACT.render(markup('OPS-1005'));
    assert.equal(
      window.document.querySelectorAll('.ops-progress .is-done').length,
      1,
      'Reviewed evidence does not show an unapproved proposal as approved',
    );
    const original = window.document.querySelector('details.ops-scenarios');
    assert.ok(original);
    window.eval(fs.readFileSync(path.join(__dirname, '../workspace/ui-layout.js'), 'utf8'));
    assert.equal(window.document.querySelector('details.ops-scenarios'), original);
    assert.equal(window.document.querySelector('.ops-scenarios.expanded-details'), null);
    window.OCD_REACT.render('<main><p>Existing workspace</p></main>');
    window.OCD_REACT.render(markup('OPS-1018'));
    window.OCD_REACT.render('<main><p>Returned to another page</p></main>');
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(errors, []);
    assert.match(window.document.getElementById('app').textContent, /Returned to another page/);
    window.OCD_REACT.unmount();
  } finally {
    window.close();
  }
});

test('React migration preserves form values, delegated actions and widget remounts', async () => {
  const bundle = await build({
    entryPoints: [path.join(__dirname, '../frontend/renderer.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  const dom = new JSDOM('<div id="app"></div><dialog id="modal"></dialog>', {
    url: 'http://localhost/',
    runScripts: 'outside-only',
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
    assert.deepEqual(fields, {
      name: 'Olivia & team',
      consent: 'on',
      worker: 'nurse',
      notes: 'Rooms & tasks',
    });

    assert.equal(form.elements.name.required, true);
    assert.equal(app.querySelector('svg').getAttribute('viewBox'), '0 0 24 24');
    let action;
    window.document.addEventListener('click', (event) => {
      action = event.target.closest('[data-action]')?.dataset.action;
    });

    app.querySelector('button').click();
    assert.equal(action, 'open');
    app.querySelector('#widget').append(window.document.createElement('canvas'));
    renderer.render('<main><input name="name" value="Sam"></main>');
    assert.equal(app.querySelector('canvas'), null);
    assert.equal(app.querySelector('input').value, 'Sam');
    renderer.renderModal(
      '<h2 id="modal-title">Review booking</h2><input name="date" value="2026-10-12">',
    );
    assert.equal(window.document.querySelector('#modal input').value, '2026-10-12');

    assert.equal(renderer.renderLogin, undefined);
    assert.equal(app.querySelector('input[type="password"]'), null);
    renderer.unmount();
  } finally {
    window.close();
  }
});

test('native booking maps keep portal controls, escaped names and widget cleanup', async () => {
  const bundle = await build({
    entryPoints: [path.join(__dirname, '../frontend/renderer.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  const dom = new JSDOM('<div id="app"></div><dialog id="modal"></dialog>', {
    url: 'http://localhost/',
    runScripts: 'outside-only',
  });

  const { window } = dom;
  const attr = (value) =>
    JSON.stringify(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  try {
    window.eval(bundle.outputFiles[0].text);
    const renderer = window.OCD_REACT;
    for (const area of ['office', 'worker', 'client']) {
      const model = {
        area,
        title: 'Visit map',
        subtitle: 'Service locations',
        date: '2026-10-05',
        threeD: true,
        worker: '',
        workers: [],
      };

      renderer.render(`<main><div data-react-booking-map="${attr(model)}"></div></main>`);
      const document = window.document;
      assert.equal(document.querySelector('main h1').textContent, 'Visit map');
      assert.equal(
        document.querySelector('[data-map-action="3d"]').getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(document.querySelector('#map-service-date').value, '2026-10-05');
      assert.equal(document.querySelector('[data-map-area]').dataset.mapArea, area);
      assert.equal(document.querySelectorAll('#booking-map-canvas').length, 1);
      assert.equal(!!document.querySelector('[data-map-form="connection"]'), area === 'office');
      const canvas = document.createElement('canvas');
      document.querySelector('#booking-map-canvas').append(canvas);
      renderer.renderMapOverview(document.querySelector('#booking-map-workspace'), {
        services: 1,
        travelling: 0,
        thirdLabel: 'Assigned worker',
        thirdValue: 'Elena Cruz',
        bookings: [
          {
            id: 'BKG-501',
            selected: true,
            title: 'Olivia <Hart>',
            time: '9:00 AM–11:00 AM',
            suburb: 'Woodvale',
            worker: 'Elena Cruz',
            phase: 'Journey not started',
          },
        ],
      });

      assert.equal(
        document.querySelector('[data-map-booking]').getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(document.querySelector('[data-map-list] strong').textContent, 'Olivia <Hart>');
      assert.equal(document.querySelector('#booking-map-canvas canvas'), canvas);
      renderer.renderMapOverview(document.querySelector('#booking-map-workspace'), {
        services: 0,
        travelling: 0,
        thirdLabel: 'Assigned worker',
        thirdValue: 'Elena Cruz',
        bookings: [],
      });

      assert.match(document.querySelector('[data-map-list]').textContent, /No bookings/);
      assert.equal(document.querySelector('[data-map-stats] strong').textContent, '0');
    }

    renderer.unmount();
    assert.equal(window.document.querySelector('#app').children.length, 0);
  } finally {
    window.close();
  }
});
