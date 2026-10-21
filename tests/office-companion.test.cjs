const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');
const path = require('node:path');

async function companion(t) {
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
    url: 'http://localhost/workspace/#/office/work',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  window.eval(bundle.outputFiles[0].text);
  const renderer = window.OCD_REACT;
  t.after(() => {
    renderer.unmount();
    window.close();
  });
  const enquiries = [
    {
      id: 'ENQ-1',
      name: 'Olivia Hart',
      email: 'olivia@example.test',
      service: 'Cleaning',
      emailDraft: 'Original unsent draft',
    },
  ];
  const model = {
    identity: 'Existing office account',
    tasks: [
      {
        type: 'Cover',
        title: 'Olivia Hart',
        detail: 'A visit needs cover',
        reference: 'BKG-1',
        action: '<button data-action="offer-cover" data-id="BKG-1">Offer shift</button>',
      },
    ],
    routes: [
      {
        id: 'RTE-1',
        bookingId: 'BKG-1',
        origin: 'Office',
        destination: 'Woodvale',
        distance: 11.4,
        duration: 18,
        source: 'Illustrative map response',
        participant: 'Olivia Hart',
        start: '09:00',
      },
    ],
    enquiries,
    saveDraft(id, message, previous) {
      assert.equal(id, enquiries[0].id);
      if (previous !== enquiries[0].emailDraft)
        throw new window.Error('The enquiry draft changed.');
      enquiries[0].emailDraft = message;
      renderer.renderCompanion(model);
    },
    openTravel(id) {
      window.location.hash = `#/office/fees/${id}`;
    },
  };
  renderer.renderCompanion(model);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 15));
  async function click(selector) {
    window.document.querySelector(selector).click();
    await settle();
  }
  async function tab(label) {
    [...window.document.querySelectorAll('.companion-tabs button')]
      .find((button) => button.textContent === label)
      .click();
    await settle();
  }
  return { window, renderer, model, settle, click, tab };
}

test('companion shares record actions and preserves unsaved drafts across workspace updates', async (t) => {
  const { window, renderer, model, settle, click, tab } = await companion(t);
  await click('.companion-launcher');
  assert.match(
    window.document.querySelector('.companion-footer').textContent,
    /Existing office account/,
  );
  let action;
  window.document.addEventListener('click', (event) => {
    if (event.target.dataset.action) action = event.target.dataset;
  });
  await click('.companion-task button');
  assert.equal(action.action, 'offer-cover');
  assert.equal(action.id, 'BKG-1');
  await tab('Messages');
  const input = window.document.querySelector('#companion-message');
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(
    input,
    'Edited shared draft',
  );
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await settle();
  renderer.render('<main>Another workspace page</main>');
  renderer.renderCompanion({ ...model, tasks: [] });
  assert.equal(window.document.querySelector('#companion-message').value, 'Edited shared draft');
  await click('.companion-primary');
  assert.equal(model.enquiries[0].emailDraft, 'Edited shared draft');
  assert.match(
    window.document.querySelector('.companion-feedback').textContent,
    /Saved.*Nothing has been sent/,
  );
  await tab('Travel');
  assert.match(window.document.querySelector('.companion-metrics').textContent, /11.4.*18/);
  await click('.companion-card button');
  assert.equal(window.location.hash, '#/office/fees/BKG-1');
  await tab('Today');
  model.tasks = [];
  renderer.renderCompanion(model);
  assert.match(window.document.querySelector('.companion-content').textContent, /All clear/);
});

test('companion handles changed drafts, keyboard dismissal and role changes', async (t) => {
  const { window, renderer, model, click, tab } = await companion(t);
  await click('.companion-launcher');
  await tab('Messages');
  model.enquiries[0].emailDraft = 'Changed in the main enquiry';
  await click('.companion-primary');
  assert.match(window.document.querySelector('.companion-feedback').textContent, /draft changed/);
  assert.equal(model.enquiries[0].emailDraft, 'Changed in the main enquiry');
  window.document
    .querySelector('#companion-message')
    .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(window.document.querySelector('.companion-panel'), null);
  assert.equal(window.document.activeElement.className, 'companion-launcher');
  renderer.renderCompanion(null);
  assert.equal(window.document.querySelector('.office-companion'), null);
  renderer.renderCompanion(model);
  assert.equal(
    window.document.querySelector('.companion-launcher').getAttribute('aria-expanded'),
    'false',
  );
});
