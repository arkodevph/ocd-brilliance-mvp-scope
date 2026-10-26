/* Local, fictional frontend acceptance. Never inherits a live integration or runs a worker. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(
  root,
  process.env.OPERATIONS_REVIEW_DIR || 'docs/prototype-operations-2026-10-25',
);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-operations-ui-'));
const probe = net.createServer();
await new Promise((r) => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const origin = `http://127.0.0.1:${port}`;
const env = { ...process.env };
const exampleEnv = await fs.readFile(path.join(root, '.env.example'), 'utf8');
for (const name of new Set([
  ...Object.keys(env),
  ...exampleEnv
    .split('\n')
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter(Boolean),
])) {
  if (
    /^(SHIFTCARE_|MICROSOFT365_|MAPBOX_|OCD_|OPENROUTER_|OPENAI_|UPSTASH_|DATABASE_URL|WORKFLOW_STAFF|WORKFLOW_SESSION)/.test(
      name,
    )
  )
    env[name] = '';
}
Object.assign(env, {
  PORT: String(port),
  VERCEL: '',
  AUTOMATION_RUN_WORKER: 'false',
  DATABASE_URL: '',
  WORKFLOW_DATA_DIR: path.join(temp, 'data'),
  WORKFLOW_STAFF_EMAIL: 'prototype.office@example.test',
  WORKFLOW_STAFF_PASSWORD: crypto.randomBytes(24).toString('hex'),
  WORKFLOW_SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  WORKFLOW_STAFF_ACCOUNTS: '',
  OCD_PORTAL_ACCOUNTS: '[]',
  OCD_ARRIVAL_ENABLED: 'false',
  OCD_NATIVE_FIELD_MAPPINGS: '',
  SHIFTCARE_TIME_ZONE: 'Australia/Perth',
  SERVICE_POSTCODES: '6024,6025,6026,6027,6065',
});
const server = spawn(process.execPath, ['server.cjs'], { cwd: root, env, stdio: 'ignore' });
const chrome = spawn(
  process.env.CHROME_PATH || '/usr/bin/google-chrome',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--remote-debugging-pipe',
    '--user-data-dir=' + path.join(temp, 'chrome'),
  ],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
);
let sequence = 0,
  buffer = '',
  session;
const pending = new Map(),
  errors = [],
  requests = [],
  checks = [],
  captures = [];
function command(method, params = {}, target = session) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(method + ' timed out'));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
    chrome.stdio[3].write(
      JSON.stringify({ id, method, params, ...(target ? { sessionId: target } : {}) }) + '\0',
    );
  });
}
chrome.stdio[4].on('data', (chunk) => {
  buffer += chunk;
  while (buffer.includes('\0')) {
    const end = buffer.indexOf('\0'),
      raw = buffer.slice(0, end);
    buffer = buffer.slice(end + 1);
    if (!raw) continue;
    const message = JSON.parse(raw),
      p = pending.get(message.id);
    if (p) {
      clearTimeout(p.timeout);
      pending.delete(message.id);
      message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(
        message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text,
      );
    if (message.method === 'Network.requestWillBeSent')
      requests.push({ method: message.params.request.method, url: message.params.request.url });
  }
});
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function wait(expression, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate('Boolean(' + expression + ')')) return;
    await pause(60);
  }
  throw new Error('Missing browser state: ' + expression);
}
async function click(selector) {
  await evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('Missing button '+${JSON.stringify(selector)});e.click();return true})()`,
  );
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
}
async function input(selector, value) {
  await evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('Missing input '+${JSON.stringify(selector)});const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`,
  );
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
}
async function route(page, id = '') {
  await evaluate(
    `location.hash=${JSON.stringify('#/office/operations/' + page + (id ? '/' + id : ''))}`,
  );
  await wait(
    `document.querySelector('[data-ops-page="${page}"]') && ${id ? `document.querySelector('[data-ops-detail="${id}"]')` : 'true'}`,
  );
}
const saved = (expression) =>
  evaluate(
    `(()=>{const s=JSON.parse(localStorage.getItem('ocd-comprehensive-prototype-v1'));return (${expression})})()`,
  );
const cstatus = (id) => saved(`s.cases.find(c=>c.id===${JSON.stringify(id)}).status`);
async function expectStatus(id, status) {
  await wait(
    `JSON.parse(localStorage.getItem('ocd-comprehensive-prototype-v1')).cases.find(c=>c.id===${JSON.stringify(id)}).status===${JSON.stringify(status)}`,
  );
}
function passed(name, detail) {
  checks.push({ name, status: 'pass', ...(detail ? { detail } : {}) });
  console.log('PASS ' + name);
}
async function capture(name, width = 1440, height = 1050) {
  await command('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(
    'window.scrollTo(0,0);new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))',
  );
  await pause(400);
  const size = await evaluate(
    `({width:innerWidth,scroll:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2}).slice(0,20).map(e=>({tag:e.tagName,class:typeof e.className==='string'?e.className:'svg',width:Math.round(e.getBoundingClientRect().width),right:Math.round(e.getBoundingClientRect().right)}))})`,
  );
  const r = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  const data = Buffer.from(r.data, 'base64'),
    file = path.join(output, name + '.png');
  await fs.writeFile(file, data);
  captures.push({
    path: path.relative(root, file),
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    width,
    height,
    horizontalOverflow: size.scroll > size.width + 1,
  });
  assert.ok(
    size.scroll <= size.width + 1,
    name + ': document horizontal overflow ' + JSON.stringify(size),
  );
}
async function checkedOutcome(id, key) {
  const base = `[data-ops-outcome="${key}"]`;
  await input(base + ' input[name="reference"]', 'DEMO-OUTCOME-101');
  await input(
    base + ' textarea[name="note"]',
    'The required fictional native or communication outcome was checked by the responsible reviewer.',
  );
  await click(base + ' input[name="confirmed"]');
  await click(base + ' button[type="submit"]');
  await wait(
    `JSON.parse(localStorage.getItem('ocd-comprehensive-prototype-v1')).cases.find(c=>c.id===${JSON.stringify(id)}).outcomes.find(o=>o.id===${JSON.stringify(key)}).status==='done'`,
  );
}

let success = false;
try {
  await fs.mkdir(output, { recursive: true });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + '/api/workflow?action=session')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(60);
  }
  assert.ok(ready, 'Isolated server starts');
  const { targetId } = await command('Target.createTarget', { url: 'about:blank' }, null);
  session = (await command('Target.attachToTarget', { targetId, flatten: true }, null)).sessionId;
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Network.setBlockedURLs', { urls: ['https://*', 'http://api.*'] });
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1050,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await command('Page.navigate', { url: origin + '/workspace/#/office/operations/overview' });
  await wait('!!document.querySelector("[data-ops-page=overview]")');
  assert.equal(await saved('s.cases.length'), 35);
  assert.equal(await evaluate('document.querySelectorAll(".ops-metric").length'), 4);
  assert.ok(
    await evaluate(
      `!!document.querySelector(${JSON.stringify('.sidebar a[href="#/office/operations"]')})`,
    ),
  );
  passed('Operations hub is integrated with 35 fictional cases and derived dashboard counts');
  await capture('01-operations-overview');
  await capture('initial-mobile-layout', 390, 844);
  await click('.ops-metric:nth-child(3)');
  await wait('!!document.querySelector("[data-ops-page=queue]")');
  await wait('document.querySelectorAll("[data-ops-case-row]").length===1');
  assert.equal(await evaluate('document.querySelector(".ops-filter select").value'), 'attention');
  passed('Dashboard counters open the matching filtered work queue');
  for (const page of [
    'intake',
    'documents',
    'rostering',
    'finance',
    'care',
    'communications',
    'activity',
  ]) {
    await route(page);
    assert.ok(await evaluate('!!document.querySelector(".ops-panel")'));
    await capture('area-' + page);
  }
  passed('Seven operational areas and activity views open without replacing existing screens');
  await route('queue');
  const all = await evaluate('document.querySelectorAll("[data-ops-case-row]").length');
  await input('[aria-label="Search operation cases"]', 'NO-MATCH-ACCEPTANCE');
  assert.equal(await evaluate('document.querySelectorAll("[data-ops-case-row]").length'), 0);
  await input('[aria-label="Search operation cases"]', '');
  assert.equal(await evaluate('document.querySelectorAll("[data-ops-case-row]").length'), all);
  await input('[aria-label="Sample branch"]', 'Perth South · sample');
  assert.ok(
    await evaluate(
      '[...document.querySelectorAll(".ops-cell-sub")].every(e=>e.textContent.includes("Perth South"))',
    ),
  );
  await input('[aria-label="Sample branch"]', 'all');
  passed('Queue search, empty state and sample-branch filtering work');
  await route('library');
  assert.equal(await evaluate('document.querySelectorAll("[data-ops-workflow]").length'), 7);
  assert.equal(
    await evaluate(`document.querySelector('[aria-label="Workflow area"]').value`),
    'intake',
  );
  await capture('02-workflow-library-by-area');
  await input('[aria-label="Workflow area"]', 'all');
  assert.equal(await evaluate('document.querySelectorAll("[data-ops-workflow]").length'), 35);
  await capture('02-workflow-library');
  for (const [label, count] of [
    ['Core 20', 20],
    ['Gated 5', 5],
    ['Later / native 10', 10],
  ]) {
    await evaluate(
      `document.querySelector('.ops-segments button:nth-child(${label === 'Core 20' ? 2 : label === 'Gated 5' ? 3 : 4})').click()`,
    );
    await wait(`document.querySelectorAll('[data-ops-workflow]').length===${count}`);
  }
  passed('All 35 opportunities preserve the 20-core / five-gated / ten-native-later scope');
  await evaluate('document.querySelector(".ops-segments button:nth-child(3)").click()');
  await wait(`!!document.querySelector('[data-ops-workflow="15"]')`);
  await click('[data-ops-workflow="15"] button');
  await wait('!!document.querySelector("dialog[open] [data-ops-open-example]")');
  assert.match(
    await evaluate('document.querySelector("dialog[open]").textContent'),
    /Approve cause, notice, actual travel/,
  );
  await click('[data-ops-open-example]');
  await wait('!!document.querySelector("[data-ops-detail=OPS-1015]")');
  assert.equal(await evaluate('document.querySelector("[data-ops-approve]").disabled'), true);
  await click('[data-ops-enable-preview]');
  await click('[data-ops-reviewed-example]');
  await click('[data-ops-approve]');
  await expectStatus('OPS-1015', 'approved');
  await capture('03-cancellation-approved');
  await click('[data-ops-run]');
  await expectStatus('OPS-1015', 'awaiting-verification');
  await click('[data-ops-verify]');
  await expectStatus('OPS-1015', 'approved');
  await click('.ops-scenarios summary');
  await click('[data-ops-fail]');
  await expectStatus('OPS-1015', 'blocked');
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1015").effects[0].phase'), 'verified');
  await capture('04-cancellation-partial');
  await click('[data-ops-rereview]');
  await click('[data-ops-approve]');
  await click('[data-ops-loss]');
  await expectStatus('OPS-1015', 'uncertain');
  await command('Page.reload', { ignoreCache: true });
  await wait('!!document.querySelector("[data-ops-reconcile]")');
  await expectStatus('OPS-1015', 'uncertain');
  await capture('05-unknown-result-recovery');
  await click('[data-ops-reconcile]');
  await expectStatus('OPS-1015', 'awaiting-verification');
  await click('[data-ops-verify]');
  await expectStatus('OPS-1015', 'follow-up');
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1015").effects[0].attempts'), 1);
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1015").effects[1].attempts'), 2);
  assert.equal(await evaluate('document.querySelector("[data-ops-close]").disabled'), true);
  await click('.ops-scenarios summary');
  await click('[data-ops-delivery-fail]');
  for (const key of ['outcome-1', 'outcome-2', 'outcome-3']) await checkedOutcome('OPS-1015', key);
  await click('[data-ops-close]');
  await expectStatus('OPS-1015', 'completed');
  passed(
    'Gated cancellation verifies cleanup first, preserves partial success, recovers without resend, and requires all three outcomes before closure',
  );
  await route('case', 'OPS-1011');
  await click('.ops-scenarios summary');
  await click('[data-ops-stale]');
  await expectStatus('OPS-1011', 'needs-review');
  assert.equal(await evaluate('!!document.querySelector("[data-ops-run]")'), false);
  await click('[data-ops-approve]');
  await click('[data-ops-run]');
  await click('[data-ops-verify]');
  await expectStatus('OPS-1011', 'follow-up');
  passed('A changed source invalidates approval before a reviewed occurrence change');
  await route('case', 'OPS-1004');
  await click('[data-ops-run-rule]');
  await expectStatus('OPS-1004', 'needs-info');
  assert.equal(await evaluate('document.querySelectorAll(".ops-progress .is-done").length'), 1);
  await input('[aria-label="Preferred contact"]', 'ava@example.test');
  await click('[data-ops-reviewed-example]');
  await click('[data-ops-run-rule]');
  await expectStatus('OPS-1004', 'completed');
  passed(
    'Missing information stays blocked until the fictional answer and source checks are supplied',
  );
  await route('case', 'OPS-1030');
  await click('[data-ops-reviewed-example]');
  assert.equal(await evaluate('!!document.querySelector("[data-ops-run]")'), false);
  await input('.ops-next-action input[name="reference"]', 'DEMO-PAYROLL-HANDOFF');
  await input(
    '.ops-next-action textarea[name="note"]',
    'Reviewed preparation was handed to the authorized fictional payroll owner.',
  );
  await click('.ops-next-action input[name="confirmed"]');
  await click('.ops-next-action button[type="submit"]');
  await expectStatus('OPS-1030', 'follow-up');
  assert.equal(await saved('s.records["OPS-1030:step-1"] || null'), null);
  await capture('06-native-payroll-handoff');
  passed('Payroll remains a staff-checked handoff and never produces an API or payment result');
  await route('queue');
  const before = await saved('s.cases.length');
  async function captureRequest() {
    await click('[data-ops-new]');
    await input('.ops-capture-form input[name="person"]', 'Fictional Person');
    await input('.ops-capture-form input[name="subject"]', '<b>Fictional request</b>');
    await input(
      '.ops-capture-form textarea[name="source"]',
      'Fictional source for a demonstration only.',
    );
    await click('.ops-capture-form button[type="submit"]');
    await wait('!!document.querySelector("[data-ops-detail=OPS-1036]")');
  }
  await captureRequest();
  assert.equal(await saved('s.cases.length'), before + 1);
  assert.equal(
    await saved(
      's.cases[0].fields.every(f=>["name","person"].includes(f.key)?f.value==="Fictional Person":f.value==="")',
    ),
    true,
  );
  assert.equal(await evaluate('document.querySelector("[data-ops-approve]").disabled'), true);
  assert.match(
    await evaluate('document.querySelector(".ops-case-heading h2").textContent'),
    /<b>Fictional request<\/b>/,
  );
  assert.equal(await evaluate('document.querySelector(".ops-case-heading h2 b")'), null);
  await route('queue');
  await captureRequest();
  assert.equal(await saved('s.cases.length'), before + 1);
  passed(
    'New sources persist, render as text and deduplicate without altering earlier workspace records',
  );
  await route('overview');
  await capture('07-overview-mobile', 390, 844);
  await route('case', 'OPS-1005');
  assert.equal(await evaluate('document.querySelectorAll(".ops-progress .is-done").length'), 1);
  await capture('08-case-mobile', 390, 844);
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1050,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await capture('09-participant-review');
  passed('Overview and case review fit the mobile document width');
  for (const section of [
    'overview',
    'participants',
    'staff',
    'schedule',
    'finance',
    'payroll',
    'inbox-tasks',
  ]) {
    await evaluate(`location.hash=${JSON.stringify('#/office/' + section)}`);
    await wait(
      '!!document.querySelector("#main-content") && !document.querySelector("[data-ops-page]")',
    );
    assert.ok(
      (await evaluate('document.getElementById("main-content").textContent')).trim().length > 30,
    );
  }
  passed(
    'Existing office, participant, staff, roster, finance, payroll and inbox workspaces still render',
  );
  await route('overview');
  await command('Page.reload', { ignoreCache: true });
  await wait('!!document.querySelector("[data-ops-page=overview]")');
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1015").status'), 'completed');
  assert.equal(await saved('s.cases.length'), before + 1);
  passed('Checked outcomes and captured sources survive a full reload');

  await route('case', 'OPS-1008');
  const savedApproval = await saved('s.cases.find(c=>c.id==="OPS-1008").approval');
  assert.equal(
    await evaluate(`document.querySelector('[aria-label="Case owner"]').disabled`),
    false,
  );
  await input('[aria-label="Case owner"]', 'HR / admin');
  await input('[aria-label="Case deadline"]', '2026-10-30');
  await click('.ops-assignment button[type="submit"]');
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1008").owner'), 'HR / admin');
  assert.deepEqual(await saved('s.cases.find(c=>c.id==="OPS-1008").approval'), savedApproval);
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1008").effects[0].attempts'), 1);
  await capture('10-follow-up-reassigned');
  passed(
    'Saved steps retain their exact approval while open follow-up ownership and deadlines can change',
  );

  await route('case', 'OPS-1001');
  await input('[aria-label="Service postcode"]', '9999');
  await click('[data-ops-run-rule]');
  await checkedOutcome('OPS-1001', 'coverage-review');
  await click('[data-ops-close]');
  await input('[aria-label="Service postcode"]', '8888');
  await click('[data-ops-run-rule]');
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1001").outcomes[0].status'), 'pending');
  assert.equal(await saved('s.cases.find(c=>c.id==="OPS-1001").outcomes[0].reference'), '');
  assert.equal(await evaluate('document.querySelector("[data-ops-close]").disabled'), true);
  await capture('11-coverage-new-evidence-required');
  await checkedOutcome('OPS-1001', 'coverage-review');
  await click('[data-ops-close]');
  passed(
    'Changing a coverage exception location clears obsolete proof and requires a fresh checked decision',
  );

  await route('overview');
  await click('[data-ops-new]');
  await input('.ops-capture-form select[name="opportunity"]', '14');
  await input('.ops-capture-form input[name="person"]', 'Olivia Hart');
  await input(
    '.ops-capture-form input[name="subject"]',
    'Cancel the exact 27 October morning visit',
  );
  await input(
    '.ops-capture-form textarea[name="source"]',
    'Fictional reviewed reply: please cancel my 27 October 09:00–11:00 visit. Office review must confirm actual travel, treatment and communications.',
  );
  await click('.ops-capture-form button[type="submit"]');
  const replyId = await evaluate('document.querySelector("[data-ops-detail]").dataset.opsDetail');
  await input('[aria-label="Sender match"]', 'Olivia Hart · checked fictional contact');
  await input('[aria-label="Exact occurrence"]', '2026-10-27 · 09:00–11:00');
  await input('[aria-label="Reviewed response"]', 'Cancellation requested');
  await click('[data-ops-reviewed-example]');
  await click('[data-ops-approve]');
  await click('[data-ops-run]');
  await click('[data-ops-verify]');
  const child = await saved(`s.cases.find(c=>c.parentCaseId===${JSON.stringify(replyId)})`);
  assert.equal(child.opportunity, 15);
  assert.equal(child.previewEnabled, false);
  assert.equal(child.approval, null);
  assert.equal(await evaluate('document.querySelector("[data-ops-close]").disabled'), true);
  assert.equal(
    await saved(`s.cases.filter(c=>c.parentCaseId===${JSON.stringify(replyId)}).length`),
    1,
  );
  await capture('12-cancellation-reply-linked-case');
  await click('[data-ops-outcome="reply-follow-through"] button');
  await wait(`!!document.querySelector('[data-ops-detail="${child.id}"]')`);
  await input(
    '[aria-label="Reviewed treatment"]',
    'Fictional policy reviewed: no untravelled mileage or charge',
  );
  await click('[data-ops-enable-preview]');
  await click('[data-ops-reviewed-example]');
  await click('[data-ops-approve]');
  for (let i = 0; i < 2; i++) {
    await click('[data-ops-run]');
    await click('[data-ops-verify]');
  }
  for (const key of ['outcome-1', 'outcome-2', 'outcome-3']) await checkedOutcome(child.id, key);
  await click('[data-ops-close]');
  await route('case', replyId);
  assert.equal(await evaluate('document.querySelector("[data-ops-close]").disabled'), false);
  await click('[data-ops-close]');
  await expectStatus(replyId, 'completed');
  passed(
    'A cancellation reply routes once to an independently reviewed gated case and cannot close until its linked outcomes complete',
  );

  await route('overview');
  const persistedCount = await saved('s.cases.length');
  await evaluate(
    `(()=>{window.__opsStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='ocd-comprehensive-prototype-v1')throw new DOMException('Fictional quota failure','QuotaExceededError');return window.__opsStorageSet.call(this,k,v)};})()`,
  );
  await click('[data-ops-new]');
  await input('.ops-capture-form input[name="person"]', 'Fictional storage recovery');
  await input(
    '.ops-capture-form input[name="subject"]',
    'Keep this captured source during navigation',
  );
  await input(
    '.ops-capture-form textarea[name="source"]',
    'Fictional source retained in memory while browser writes are unavailable.',
  );
  await click('.ops-capture-form button[type="submit"]');
  const memoryId = await evaluate('document.querySelector("[data-ops-detail]")?.dataset.opsDetail');
  assert.ok(memoryId, 'The captured case remains available after failed storage writes');
  assert.match(await evaluate('document.querySelector(".ops-notice").textContent'), /memory only/);
  assert.equal(await saved('s.cases.length'), persistedCount);
  await route('overview');
  await route('case', memoryId);
  assert.match(
    await evaluate('document.querySelector(".ops-source").textContent'),
    /retained in memory/,
  );
  await evaluate(
    `window.dispatchEvent(new StorageEvent('storage',{key:'ocd-comprehensive-prototype-v1',newValue:localStorage.getItem('ocd-comprehensive-prototype-v1')}))`,
  );
  assert.ok(await evaluate('!!document.querySelector("[data-ops-detail]")'));
  await capture('13-storage-failure-retains-case', 390, 844);
  await evaluate('Storage.prototype.setItem=window.__opsStorageSet');
  await input('[aria-label="Case deadline"]', '2026-10-31');
  await click('.ops-assignment button[type="submit"]');
  assert.equal(await saved('s.cases.length'), persistedCount + 1);
  await command('Page.reload', { ignoreCache: true });
  await wait(`!!document.querySelector('[data-ops-detail="${memoryId}"]')`);
  assert.match(
    await evaluate('document.querySelector(".ops-source").textContent'),
    /retained in memory/,
  );
  passed(
    'Storage write failure preserves capture across navigation and another-tab updates; restored storage saves it for reload',
  );

  // Exercise the actual first-visit entry and a complete guided case without resetting prior work.
  const existingCases = await saved('s.cases');
  await command('Page.navigate', { url: origin + '/portal' });
  await wait('!!document.querySelector("#demo-accounts")');
  await click('#demo-accounts a');
  await wait('!!document.querySelector("[data-demo-start]")');
  assert.equal(await evaluate('location.hash'), '#/office/start');
  assert.equal(await evaluate('document.querySelectorAll(".ops-metric").length'), 0);
  assert.equal(
    await evaluate('document.querySelectorAll("details.demo-nav-group[open]").length'),
    0,
  );
  assert.equal(
    await evaluate('document.querySelectorAll(".demo-nav-group.expanded-details").length'),
    0,
  );
  await capture('14-beginner-start-desktop');
  await capture('15-beginner-start-mobile', 390, 844);
  await capture('16-beginner-start-small-mobile', 320, 720);
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1050,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await command('Page.bringToFront');
  await command('Emulation.setFocusEmulationEnabled', { enabled: true });
  await evaluate('document.querySelector(".demo-nav-group summary").focus()');
  assert.equal(await evaluate('document.activeElement?.matches(".demo-nav-group summary")'), true);
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    text: '\r',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await command('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await wait('document.querySelector(".demo-nav-group").open');
  await click('[data-demo-begin]');
  await wait('!!document.querySelector("[data-ops-page=guide]")');
  const practiceId = await evaluate(
    'document.querySelector("[data-ops-detail]").dataset.opsDetail',
  );
  assert.equal(await saved('s.cases.length'), existingCases.length + 1);
  assert.equal(
    await evaluate('document.querySelector("[data-guide-heading] h1").textContent'),
    'Read the request',
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".demo-guided-case .ops-panel:not([hidden])").length',
    ),
    1,
  );
  await click('[data-guide-next]');
  await input('[aria-label="Participant name"]', '');
  assert.equal(await evaluate('document.querySelector("[data-guide-next]").disabled'), true);
  await input('[aria-label="Participant name"]', 'Ava Bennett');
  await click('[data-guide-next]');
  assert.equal(await evaluate('document.querySelector("[data-guide-next]").disabled'), true);
  for (let i = 1; i <= 3; i++) await click(`.ops-check:nth-child(${i}) input`);
  await capture('17-guided-evidence-mobile', 390, 844);
  await command('Page.reload', { ignoreCache: true });
  await wait('document.querySelector("[data-guide-step]")?.dataset.guideStep === "3"');
  await evaluate('location.hash="#/office/start"');
  await wait('!!document.querySelector("[data-demo-begin]")');
  assert.match(
    await evaluate('document.querySelector("[data-demo-begin]").textContent'),
    /Continue/,
  );
  await click('[data-demo-begin]');
  await wait('document.querySelector("[data-guide-step]")?.dataset.guideStep === "3"');
  assert.equal(
    await evaluate('document.querySelector("[data-ops-detail]").dataset.opsDetail'),
    practiceId,
  );
  await click('[data-guide-next]');
  await click('[data-ops-approve]');
  await expectStatus(practiceId, 'approved');
  await click('[data-ops-run]');
  await expectStatus(practiceId, 'awaiting-verification');
  await wait('document.querySelector("[data-guide-step]")?.dataset.guideStep === "5"');
  await click('[data-ops-verify]');
  await expectStatus(practiceId, 'follow-up');
  await wait('document.querySelector("[data-guide-step]")?.dataset.guideStep === "6"');
  assert.equal(
    await evaluate('document.querySelectorAll(".demo-guided-case .ops-outcome").length'),
    1,
  );
  assert.equal(await evaluate('document.querySelector("[data-ops-close]").disabled'), true);
  await capture('18-guided-follow-up-mobile', 390, 844);
  for (const key of ['outcome-1', 'outcome-2']) await checkedOutcome(practiceId, key);
  await click('[data-ops-close]');
  await expectStatus(practiceId, 'completed');
  await wait('!!document.querySelector("[data-guide-complete]")');
  await capture('19-guided-complete-desktop', 1440, 1050);
  await click('[data-guide-complete] a');
  await wait('!!document.querySelector("[data-ops-page=library]")');
  await evaluate('document.querySelector(".ops-nav-more summary").focus()');
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    text: '\r',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await command('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await wait('document.querySelector(".ops-nav-more").open');
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  assert.equal(await evaluate('document.querySelector(".ops-nav-more").open'), false);
  await capture('20-mobile-more-views', 320, 720);
  await input('[aria-label="More operation views"]', 'activity');
  await wait('!!document.querySelector("[data-ops-page=activity]")');
  await capture('21-mobile-activity', 320, 720);
  assert.deepEqual(
    await saved(`s.cases.filter(c=>c.id!==${JSON.stringify(practiceId)})`),
    existingCases,
  );
  passed(
    'First-time entry offers a quiet starting point; six guided steps preserve review/closure gates, resume after reload and leave prior cases unchanged',
  );

  assert.equal(requests.filter((r) => r.method !== 'GET' && r.method !== 'HEAD').length, 0);
  assert.equal(
    requests.filter(
      (r) =>
        new URL(r.url).hostname !== '127.0.0.1' &&
        !r.url.startsWith('data:') &&
        !r.url.startsWith('blob:'),
    ).length,
    0,
  );
  assert.deepEqual(errors, []);
  passed('No external service requests, API mutations or page JavaScript exceptions occurred');
  success = true;
} catch (error) {
  checks.push({ name: 'Browser acceptance', status: 'fail', detail: error.stack || String(error) });
  try {
    await capture('failure');
  } catch {}
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  const receipt = {
    reviewedAt: new Date().toISOString(),
    status: success ? 'pass' : 'fail',
    scope: 'Fictional frontend prototype only; not live API, security or production acceptance',
    checks,
    captures,
    errors,
    networkRequests: requests.map((r) => ({ method: r.method, path: new URL(r.url).pathname })),
    visualReview: 'Captures require separate author inspection.',
  };
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(
    path.join(output, 'browser-check.json'),
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      status: receipt.status,
      checks: checks.length,
      captures: captures.length,
      output: path.relative(root, output),
    }),
  );
  try {
    await command('Browser.close', {}, null);
  } catch {}
  chrome.kill();
  server.kill();
}
