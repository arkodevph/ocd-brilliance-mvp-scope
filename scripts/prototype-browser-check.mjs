/* Browser acceptance checks against an isolated local server and fictional records. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liveMap = process.env.PROTOTYPE_MAPBOX_LIVE === '1';
const integrationProof = process.env.PROTOTYPE_INTEGRATION === '1';
const intakeHandoff = process.env.PROTOTYPE_INTAKE === '1';
const designReview = process.env.PROTOTYPE_DESIGN === '1';
const automationDesign = process.env.PROTOTYPE_AUTOMATION_DESIGN === '1';
const output = path.resolve(root, process.env.PROTOTYPE_REVIEW_DIR || (intakeHandoff ? 'docs/intake-review-2026-10-08' : integrationProof ? 'docs/shiftcare-proof-review-2026-10-07' : 'docs/prototype-review-2026-10-07'));
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-prototype-review-'));
let nativeCapture;
if (integrationProof) {
  nativeCapture = JSON.parse(await fs.readFile(path.join(root, '.local/shiftcare-evidence.json'), 'utf8'));
  await fs.mkdir(path.join(temp, 'data'), { recursive: true });
  await fs.writeFile(path.join(temp, 'data', 'shiftcare-evidence.json'), JSON.stringify(nativeCapture), { mode: 0o600 });
}
const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const password = crypto.randomBytes(18).toString('hex');
const email = 'prototype.office@example.test';
const intakePolicy = JSON.stringify({ version: 'fictional-browser-test-v1', approvedBy: 'Fictional test coordinator', source: 'Browser test fixture', inboxSignals: { tested: true, gaps: ['Fictional extraction fixture'], evidence: 'Automated fixture; not an OCD document trial' } });
const server = spawn(process.execPath, ['server.cjs'], { cwd: root, stdio: 'ignore', env: { ...process.env, PORT: String(port), VERCEL: '', WORKFLOW_DATA_DIR: path.join(temp, 'data'), WORKFLOW_STAFF_EMAIL: email, WORKFLOW_STAFF_PASSWORD: password, WORKFLOW_SESSION_SECRET: crypto.randomBytes(32).toString('hex'), UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', SERVICE_POSTCODES: '6024,6025,6026,6027,6065', OCD_INTAKE_RULES: intakePolicy, WORKFLOW_STAFF_ACCOUNTS: '', OCD_AI_API_KEY: '', OPENROUTER_API_KEY: '', OCD_AI_DEMO: 'false', OCD_AI_PROVIDER: 'openai' } });
const chrome = spawn(process.env.CHROME_PATH || '/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', ...(liveMap ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-gpu']), '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${path.join(temp, 'chrome')}`], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let sequence = 0, buffer = '', session;
const pending = new Map(), errors = [], requests = [], checks = [], captures = [];
function command(method, params = {}, target = session) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 12000);
    pending.set(id, { resolve, reject, timeout });
    chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(target ? { sessionId: target } : {}) }) + '\0');
  });
}
chrome.stdio[4].on('data', chunk => {
  buffer += chunk;
  while (buffer.includes('\0')) {
    const at = buffer.indexOf('\0'), raw = buffer.slice(0, at); buffer = buffer.slice(at + 1);
    if (!raw) continue;
    const item = JSON.parse(raw), waiter = pending.get(item.id);
    if (waiter) { clearTimeout(waiter.timeout); pending.delete(item.id); item.error ? waiter.reject(new Error(item.error.message)) : waiter.resolve(item.result); }
    if (item.method === 'Runtime.exceptionThrown') errors.push(item.params.exceptionDetails.text + ': ' + (item.params.exceptionDetails.exception?.description || '').slice(0, 300));
    if (item.method === 'Network.requestWillBeSent') { const r = item.params.request; const u = new URL(r.url); requests.push({ host: u.hostname, path: u.pathname, method: r.method }); }
  }
});
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const wait = async (expression, timeout = 6000) => {
  for (let i = 0; i < Math.ceil(timeout / 75); i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 75)); }
  throw new Error(`Expected browser state missing: ${expression}`);
};
const click = selector => evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e) throw new Error('Missing element: '+${JSON.stringify(selector)}); e.click(); return true; })()`);
async function route(value) { await evaluate(`location.hash=${JSON.stringify('#/' + value)}`); await wait(`location.hash===${JSON.stringify('#/' + value)} && !!document.querySelector('#main-content')`); await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); }
async function submit(selector, values, submitter = '') {
  await evaluate(`(() => { const f=document.querySelector(${JSON.stringify(selector)}); if(!f) throw new Error('Missing form'); for(const [k,v] of Object.entries(${JSON.stringify(values)})){ const e=f.elements[k]; if(!e) throw new Error('Missing field: '+k); if(e.type==='checkbox')e.checked=!!v; else e.value=v; } f.requestSubmit(${submitter ? `f.querySelector(${JSON.stringify(submitter)})` : ''}); return true; })()`);
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
const stored = expression => evaluate(`(() => { const s=JSON.parse(localStorage.getItem('ocd-brilliance-operations-v1')); return (${expression}); })()`);
const job = kind => stored(`s.automation.jobs.find(j=>j.kind===${JSON.stringify(kind)}).id`);
const jobStatus = id => stored(`s.automation.jobs.find(j=>j.id===${JSON.stringify(id)}).status`);
function passed(name, detail) { checks.push({ name, status: 'pass', detail }); }
async function capture(name, width = 1440, height = 1000, focus = '') {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await wait('!document.querySelector("#toast")?.classList.contains("show")');
  await evaluate('new Promise(resolve=>setTimeout(resolve,400))');
  await evaluate(`(() => { const e=${focus ? `document.querySelector(${JSON.stringify(focus)})` : 'null'}; window.scrollTo(0, e ? scrollY+e.getBoundingClientRect().top-85 : 0); return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))); })()`);
  const dimensions = await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight})');
  assert.equal(dimensions.scrollWidth <= dimensions.width, true, `${name}: horizontal overflow`);
  const r = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(output, `${name}.png`); await fs.writeFile(file, Buffer.from(r.data, 'base64'));
  captures.push({ path: path.relative(root, file), sha256: crypto.createHash('sha256').update(Buffer.from(r.data, 'base64')).digest('hex'), width, height, horizontalOverflow: false, focus: focus || 'Page overview' });
}
let success = false;
try {
  await fs.mkdir(output, { recursive: true });
  let ready = false;
  for (let i = 0; i < 80; i++) { try { if ((await fetch(origin + '/api/workflow?action=session')).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  assert.equal(ready, true, 'Isolated local server must start');
  const targets = await command('Target.getTargets', {}, null);
  const target = targets.targetInfos.find(t => t.type === 'page') || await command('Target.createTarget', { url: 'about:blank' }, null);
  session = (await command('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
  await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
  await command('Emulation.setFocusEmulationEnabled', { enabled: true });
  // Map/network fallback is checked without spending Mapbox quota or contacting a real roster.
  if (!liveMap) await command('Network.setBlockedURLs', { urls: ['https://api.mapbox.com/*', 'https://events.mapbox.com/*'] });
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  if (integrationProof) {
    assert.equal((await fetch(origin + '/api/integration-proof')).status, 401);
    assert.equal((await fetch(origin + '/.local/shiftcare-evidence.json')).status, 404);
    passed('Office evidence access', 'Unsigned API reads were rejected and the private capture was inaccessible as a static file.');
  }
  await command('Page.navigate', { url: origin + (integrationProof ? '/#/office/verification' : '/#/office/automation') }); await wait("!!document.querySelector('#staff-login')");
  await submit('#staff-login', { email, password }); await wait("!!document.querySelector('.sidebar')");
  await route('office/fees');
  await wait('!!document.querySelector(".booking-picker input")');
  await evaluate(`(() => { const search = document.querySelector('.booking-picker input'); search.value = 'BKG-504'; search.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  assert.equal(await evaluate('document.querySelectorAll(".booking-picker button:not([hidden])").length'), 1);
  await click('.booking-picker button[data-choice="BKG-504"]');
  assert.equal(await evaluate('document.querySelector("#route-booking").value'), 'BKG-504');
  assert.equal(await evaluate('document.querySelector(".booking-picker button[aria-pressed=true]").getAttribute("aria-pressed")'), 'true');
  await evaluate(`(() => { const search = document.querySelector('.booking-picker input'); search.value = 'no matching booking'; search.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  assert.equal(await evaluate('document.querySelector(".booking-picker .profile-picker-empty").hidden'), false);
  await evaluate(`(() => { const search = document.querySelector('.booking-picker input'); search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await capture('booking-search', 390, 900);
  passed('Service booking search', 'Filters bookings by their labels, selects the matching record, shows an empty result message and fits a mobile viewport.');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await route(integrationProof ? 'office/verification' : 'office/automation');
  if (process.env.PROTOTYPE_BOOKING === '1') {
    assert.deepEqual(errors, []);
  } else if (process.env.PROTOTYPE_OVERVIEW === '1') {
    await route('office/overview');
    await wait('!!document.querySelector(".weekly-chart")');
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".analytics-stat > strong")).map(e=>Number(e.textContent))'), [6, 1, 1, 0]);
    assert.equal(await evaluate('document.querySelector(".analytics-primary .analytics-donut strong").textContent'), '7');
    assert.equal(await evaluate('document.querySelector(".review-donut strong").textContent'), '100%');
    assert.equal(await evaluate('document.querySelectorAll(".weekly-chart a").length'), 7);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("[data-date=\\\"2026-10-05\\\"] .chart-bar-fill")).reduce((sum,bar)=>sum+Number(bar.getAttribute("height")),0)'), 127.5);
    assert.equal(await evaluate('document.querySelectorAll("[data-date=\\\"2026-10-10\\\"] .chart-bar-fill").length'), 0);
    assert.equal(await evaluate('document.querySelectorAll(".chart-texture,.chart-empty-bar").length'), 0);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".analytics-status-list small")).map(e=>e.textContent)'), ['14.3%', '57.1%', '14.3%', '14.3%']);
    assert.equal(await evaluate('document.querySelector(".analytics-hours > strong").textContent'), '11h');
    assert.equal(await evaluate('document.querySelector(".analytics-next h3").textContent'), 'Olivia Hart');
    assert.equal(await evaluate('document.querySelector(".analytics-delta").textContent'), '+4');
    assert.equal(await evaluate('document.querySelectorAll(".analytics-activity li").length'), 3);
    await evaluate('document.querySelector("[data-chart-title]").dispatchEvent(new PointerEvent("pointerover",{bubbles:true}))');
    assert.ok(await evaluate('!document.querySelector("#overview-chart-tooltip").hidden && document.querySelector("#overview-chart-tooltip").textContent.includes("5h scheduled")'));
    await capture('overview-chart-tooltip', 1440, 1000);
    await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    assert.equal(await evaluate('document.querySelector("#overview-chart-tooltip").hidden'), true);
    await evaluate('document.querySelector("[data-chart-title]").focus()');
    assert.equal(await evaluate('document.querySelector("#overview-chart-tooltip").hidden'), false);
    await evaluate('document.querySelector("[data-chart-title]").blur()');
    assert.equal(await evaluate('document.querySelector("#overview-chart-tooltip").hidden'), true);
    await click('[data-action="overview-week"][data-value="previous"]');
    assert.equal(await evaluate('document.querySelector(".analytics-stat > strong").textContent'), '2');
    await click('[data-action="overview-week"][data-value="next"]');
    assert.equal(await evaluate('document.querySelector(".analytics-stat > strong").textContent'), '6');
    await capture('overview-charts-desktop', 1440, 1000);
    await capture('overview-charts-wide', 1920, 1080);
    assert.equal(await evaluate('document.querySelector(".analytics-chart-area").getBoundingClientRect().height'), 180);
    assert.ok(await evaluate('[".analytics-employees",".analytics-activity",".analytics-attention",".analytics-reviews"].every(selector=>document.querySelector(selector).getBoundingClientRect().bottom<=innerHeight)'), 'Operational summaries should fit above the fold on a wide desktop');
    await capture('overview-reflow', 720, 1000);
    await capture('overview-charts-mobile', 390, 900);
    await capture('overview-charts-small-mobile', 320, 900);
    assert.ok(await evaluate('Array.from(document.querySelectorAll(".analytics-card")).every(card=>card.scrollWidth<=card.clientWidth)'), 'Overview cards should reflow without internal overflow');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'), 'The overview should fit the available mobile width, including the scrollbar');
    await capture('overview-details-desktop', 1440, 1000, '.analytics-next');
    await capture('overview-details-mobile', 390, 900, '.analytics-next');
    await evaluate('document.querySelector("[data-action=overview-day][data-date=\\"2026-10-06\\"]").dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}))');
    await wait('!!document.querySelector(".schedule-period h2")');
    assert.ok(await evaluate('document.querySelector(".schedule-period h2").textContent.includes("Tuesday 6 October")'));
    assert.equal(await evaluate('document.querySelectorAll(".timeline-visit").length'), 1);
    await route('office/overview');
    await wait('!!document.querySelector(".weekly-chart")');
    await evaluate(`(() => {
      const state=JSON.parse(localStorage.getItem('ocd-brilliance-operations-v1')) || structuredClone(window.OCD_DEMO_SEED);
      state.bookings.forEach(b=>b.date='2026-09-01');state.visits=[];state.workers=[];
      localStorage.setItem('ocd-brilliance-operations-v1',JSON.stringify(state));
      window.dispatchEvent(new StorageEvent('storage',{key:'ocd-brilliance-operations-v1'}));
    })()`);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".analytics-stat > strong")).map(e=>Number(e.textContent))'), [0, 0, 0, 0]);
    assert.equal(await evaluate('document.querySelector(".review-donut strong").textContent'), '—');
    assert.ok(await evaluate('document.querySelector(".analytics-home").textContent.includes("No bookings this week")'));
    assert.equal(await evaluate('document.querySelector(".analytics-home").innerHTML.includes("NaN")'), false);
    assert.equal(await evaluate('document.querySelector(".analytics-hours > strong").textContent'), '0h');
    assert.ok(await evaluate('document.querySelector(".analytics-next").textContent.includes("No confirmed visits")'));
    await capture('overview-charts-empty', 390, 900);
    assert.deepEqual(errors, []);
    passed('Chart overview', 'Week-scoped totals, cancellation breakdown, review percentage, day drill-down, desktop/mobile layouts and empty datasets were verified.');
  } else if (process.env.PROTOTYPE_EMPLOYEE === '1') {
    await route('office/schedule');
    await click('[data-action="schedule-view"][data-value="day"]');
    await click('[data-action="schedule-demo-week"]');
    await click('.timeline-person a[href="#/office/staff/WRK-02"]');
    await wait('!!document.querySelector(".profile-ratings")');
    assert.equal(await evaluate('document.querySelector(".employee-identity h2").textContent'), 'Sam Walker');
    assert.equal(await evaluate('document.querySelectorAll(".profile-stat strong")[2].textContent'), '1');
    assert.ok(await evaluate('document.querySelector(".employee-main").textContent.includes("Jan")'));
    assert.ok(await evaluate('document.querySelector(".profile-ratings").textContent.includes("Not rated")'));
    await capture('employee-profile-desktop', 1440, 1000);
    await capture('employee-profile-mobile', 390, 900);
    for (const tab of ['Visits', 'Documents', 'Client reviews', 'Overview']) {
      await click(`[data-action="employee-tab"][data-value="${tab}"]`);
      assert.equal(await evaluate(`document.querySelector('[data-action="employee-tab"][data-value="${tab}"]').getAttribute('aria-pressed')`), 'true');
    }
    await click('.record-back[href="#/office/schedule"]');
    await wait('!!document.querySelector(".staff-timeline")');
    await click('[data-action="schedule-view"][data-value="week"]');
    await click('.roster-table a[href="#/office/staff/WRK-01"]');
    await wait('document.querySelector(".employee-identity h2")?.textContent === "Elena Cruz"');
    await route('office/staff/WRK-04');
    await wait('document.querySelector(".employee-identity h2")?.textContent === "Alex Kim"');
    assert.equal(await evaluate('document.querySelectorAll(".profile-stat strong")[2].textContent'), '0');
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".data-pair")).find(row=>row.textContent.includes("Eligibility review")).querySelector("strong").textContent'), 'Pending');
    await route('office/staff/UNKNOWN');
    await wait('document.querySelector("h1")?.textContent.includes("not found")');
    assert.ok(await evaluate('document.querySelector("h1").textContent.includes("not found")'));
    assert.deepEqual(errors, []);
    passed('Employee profiles from schedule', 'Day and week employee links open the correct profile; mobile layout, unrated state, completed visit counts, all tabs, return navigation and unknown employees were checked.');
  } else if (automationDesign) {
    await click('[data-auto-action="ingest"]');
    for (const id of ['areas', 'reminders', 'documents']) await click(`[data-auto-action="check"][data-id="${id}"]`);
    const invoice = await job('finance-query');
    await route(`office/automation/${invoice}`);
    await capture('automation-review-desktop', 1720, 984);
    assert.equal(await evaluate('document.documentElement.scrollHeight <= innerHeight'), true, 'The case workspace fits the desktop viewport');
    assert.equal(await evaluate('document.querySelectorAll(".automation-case-list .pagination").length'), 0);
    assert.equal(await evaluate('document.querySelectorAll("details").length'), 0);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("select")).filter(e=>e.getClientRects().length).length'), 0);
    await submit('[data-auto-form="approve"]', { sourceReviewed: true });
    await wait('!!document.querySelector("[data-auto-form=manual]")');
    await submit('[data-auto-form="manual"]', { reference: 'Fictional invoice review INV-TEST', note: 'Bookkeeper compared the recorded hours with the invoice and confirmed the outcome.', checked: true });
    await wait('!!document.querySelector(".automation-next .notice strong") && document.querySelector(".automation-next").textContent.includes("Human resolution recorded")');
    assert.equal(await jobStatus(invoice), 'completed');
    await click('[data-auto-action="filter"][data-id="all"]');
    await route(`office/automation/${invoice}`);
    assert.ok((await evaluate('document.querySelector(".automation-next").textContent')).includes('Bookkeeper compared'));
    assert.ok((await evaluate('document.querySelector(".automation-thread .automation-history").textContent')).includes('Checked human outcome recorded'));
    for (const [width,height] of [[1720,984], [1440,900], [1366,768]]) {
      await capture(`automation-completed-${width}`, width, height);
      assert.equal(await evaluate('document.documentElement.scrollHeight <= innerHeight'), true, 'Desktop page fit');
      assert.equal(await evaluate('document.querySelector(".automation-case-heading").getBoundingClientRect().top >= 0'), true);
    }
    await evaluate('(() => {const input=document.querySelector("#automation-case-search");input.focus();input.value="Question about an invoice";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelectorAll(".automation-case:not([hidden])").length'), 1);
    assert.equal(await evaluate('document.activeElement.id'), 'automation-case-search');
    await evaluate('(() => {const input=document.querySelector("#automation-case-search");input.value="no-such-case";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelector(".automation-no-cases").hidden'), false);
    await evaluate('(() => {const input=document.querySelector("#automation-case-search");input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.ok(await evaluate('document.querySelectorAll(".automation-case:not([hidden])").length > 5'));
    await capture('automation-case-mobile', 390, 900);
    assert.equal(await evaluate('document.querySelector(".automation-queue").getClientRects().length'), 0);
    assert.ok(await evaluate('document.querySelector(".automation-case-detail").getClientRects().length > 0'));
    await click('.automation-back');
    await wait('location.hash==="#/office/automation"');
    assert.ok(await evaluate('document.querySelector(".automation-queue").getClientRects().length > 0'));
    await capture('automation-queue-mobile', 390, 900);
    assert.deepEqual(errors, []);
    passed('Reference-led automation workspace', 'Intercom queue/thread/context layout, desktop fit, visible source and audit history, manual outcome persistence, inline search and empty results, mobile list/detail navigation, and no visible dropdowns.');
  } else if (designReview) {
    const routes = [
      ...['overview', 'work', 'intake', 'schedule', 'calendar', 'participants', 'staff', 'enquiries', 'calls', 'agreements', 'visits', 'map', 'fees', 'automation', 'finance', 'shiftcare', 'verification'].map(section => `office/${section}`),
      ...['today', 'map', 'calendar', 'availability', 'review'].map(section => `worker/${section}`),
      ...['home', 'bookings', 'map', 'documents', 'intake'].map(section => `client/${section}`),
      'public/book', 'public/intake', 'office/enquiries/ENQ-1043', 'office/participants/PAR-101', 'office/schedule/BKG-499', 'office/agreements/AGR-301', 'office/visits/VIS-701', 'worker/today/BKG-499'
    ];
    for (const destination of routes) {
      await evaluate(`location.hash=${JSON.stringify('#/' + destination)}`);
      await wait(destination.startsWith('public/') ? '!!document.querySelector(".public-main")' : '!!document.querySelector("#main-content")');
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      if (destination === 'office/verification') await wait('!!document.querySelector("#integration-proof-dashboard h1")');
      assert.ok(await evaluate('!!document.querySelector("h1")'), `${destination}: heading`);
      await capture('design-' + destination.replaceAll('/', '-'), 1440, 1000);
      await capture('design-' + destination.replaceAll('/', '-') + '-mobile', 390, 900);
    }
    passed('All workspace layouts', `${routes.length} office, worker, client, public and detail screens rendered at desktop and mobile widths without horizontal page overflow.`);
    await route('office/schedule');
    await click('[data-action="schedule-view"][data-value="day"]');
    await click('[data-action="schedule-demo-week"]');
    assert.equal(await evaluate('document.querySelectorAll(".timeline-visit").length'), 3);
    await click('[data-action="schedule-next"]');
    assert.equal(await evaluate('document.querySelectorAll(".timeline-visit").length'), 1);
    await click('[data-action="schedule-prev"]');
    await click('[data-action="schedule-view"][data-value="week"]');
    assert.equal(await evaluate('document.querySelectorAll(".roster-shift").length'), 6);
    await click('[data-action="schedule-view"][data-value="day"]');
    passed('Staff schedule views', 'Day navigation shows the correct visits; the full week remains available and each timeline visit links to its booking.');
    await route('office/schedule/BKG-503');
    assert.equal(await evaluate('document.querySelectorAll(".split-workspace").length'), 0);
    assert.ok(await evaluate('document.querySelectorAll(".record-page .grid-detail section.panel:not([hidden])").length') >= 2);
    await evaluate('Array.from(document.querySelectorAll(".section-button")).find(b=>b.textContent==="Manage this service").click()');
    assert.equal(await evaluate('document.querySelector("[data-action=cancel-booking]").getClientRects().length > 0'), true);
    await capture('design-booking-manage', 1440, 1000);
    await capture('design-booking-manage-mobile', 390, 900);
    await route('worker/today/BKG-499');
    await evaluate('Array.from(document.querySelectorAll(".section-button")).find(b=>b.textContent==="Visit record").click()');
    await evaluate('document.querySelector("[name=note]").value="Unsaved pagination review fixture"');
    await evaluate('document.querySelector(".section-button").click()');
    await evaluate('Array.from(document.querySelectorAll(".section-button")).find(b=>b.textContent==="Visit record").click()');
    assert.equal(await evaluate('document.querySelector("[name=note]").value'), 'Unsaved pagination review fixture');
    const originalState = await evaluate('localStorage.getItem("ocd-brilliance-operations-v1")');
    await evaluate(`(() => {
      const state=JSON.parse(localStorage.getItem('ocd-brilliance-operations-v1')) || structuredClone(window.OCD_DEMO_SEED);
      const template=state.enquiries[0];
      for(let i=0;i<25;i++) state.enquiries.push({...template,id:'PAGER-'+i,name:'Pagination fixture '+String(i).padStart(2,'0'),received:'2099-01-01'});
      localStorage.setItem('ocd-brilliance-operations-v1',JSON.stringify(state));
      window.dispatchEvent(new StorageEvent('storage',{key:'ocd-brilliance-operations-v1'}));
    })()`);
    await route('office/enquiries');
    await evaluate('(() => {const input=document.getElementById("enquiry-search");input.value="Pagination fixture";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelectorAll(".enquiry-card:not([hidden])").length'), 8);
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '1–8 of 25');
    const firstPage = await evaluate('document.querySelector(".enquiry-card:not([hidden]) a").getAttribute("href")');
    await click('.pagination > button:last-child');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '9–16 of 25');
    assert.notEqual(await evaluate('document.querySelector(".enquiry-card:not([hidden]) a").getAttribute("href")'), firstPage);
    await click('.pagination > button:last-child');
    await click('.pagination > button:last-child');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '25–25 of 25');
    assert.equal(await evaluate('document.querySelector(".pagination > button:last-child").disabled'), true);
    await evaluate('(() => {const select=document.querySelector(".pagination select");select.value="16";select.dispatchEvent(new Event("change",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '1–16 of 25');
    assert.ok(await evaluate('[...document.querySelectorAll(".enquiry-card:not([hidden])")].every(card => card.querySelector(".enquiry-owner strong") && card.querySelector("footer a"))'));
    await capture('design-pagination-mobile', 390, 900);
    await evaluate('(() => {const input=document.getElementById("enquiry-search");input.value="Pagination fixture 24";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '1–1 of 1');
    await evaluate('(() => {const input=document.getElementById("enquiry-search");input.value="No matching pagination fixture";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '0 records');
    assert.equal(await evaluate('document.querySelector(".pagination > button:last-child").disabled'), true);
    await evaluate('(() => {const input=document.getElementById("enquiry-search");input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));})()');
    await evaluate(`(() => {${originalState === null ? "localStorage.removeItem('ocd-brilliance-operations-v1')" : `localStorage.setItem('ocd-brilliance-operations-v1',${JSON.stringify(originalState)})`};window.dispatchEvent(new StorageEvent('storage',{key:'ocd-brilliance-operations-v1'}));})()`);
    passed('Focused records and pagination', 'Record actions are reachable through sections, unsaved notes survive section changes, 25 fictional rows paginate without overlap, last-page and empty boundaries disable navigation, page size resets to the beginning, and filtering updates the result count.');
    await route('office/verification');
    await evaluate(`(async () => {
      const originalFetch = window.fetch;
      const capture = {
        capturedAt: new Date().toISOString(),
        source: { method: 'fixture' },
        account: { id: 'fixture', name: 'Pagination fixture', timeZone: 'UTC', role: 'admin' },
        range: { from: '2026-10-01', to: '2026-10-14' },
        proof: { status: 'not_run' }, gaps: [],
        data: { participants: [], staff: [], notes: [], shifts: Array.from({length: 17}, (_, i) => ({id: 'SHIFT-'+i, clients: [], staff: []})) },
        receipts: Array.from({length: 17}, (_, i) => ({tool: 'fixture_read_'+i, status: 'passed', complete: true}))
      };
      const run = {id: 'FIXTURE-RUN', sourceHash: 'fixture', complete: true, findings: Array.from({length: 12}, (_, i) => ({id: 'FINDING-'+i, title: 'Fictional finding '+i, owner: 'Fixture owner', shiftId: 'SHIFT-'+i}))};
      window.fetch = async (...args) => String(args[0]) === '/api/integration-proof'
        ? new Response(JSON.stringify({capture, captureHash: 'fixture', runs: [run], rest: {configured: false, missing: ['Fixture key']}, serverStorage: true}), {status: 200})
        : originalFetch(...args);
      try { await window.OCD_INTEGRATION_PROOF.mount(document.getElementById('integration-proof-dashboard')); }
      finally { window.fetch = originalFetch; }
    })()`);
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '1–5 of 12');
    await click('.pagination > button:last-child');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '6–10 of 12');
    await click('[data-proof="tab"][data-id="records"]');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '1–8 of 17');
    await click('.pagination > button:last-child');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '9–16 of 17');
    await click('[data-proof="tab"][data-id="calls"]');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '1–8 of 17');
    await click('[data-proof="tab"][data-id="records"]');
    assert.equal(await evaluate('document.querySelector(".pagination-summary").textContent'), '9–16 of 17');
    assert.equal(await evaluate('document.querySelectorAll(".pagination").length'), 1);
    await capture('design-integration-pagination', 1440, 1000);
    await capture('design-integration-pagination-mobile', 390, 900);
    passed('Asynchronous integration pagination', 'Fictional findings and capture tables paginate after loading and tab changes, keep each table page independently and avoid duplicate footers. No native calls were made.');
    await route('office/overview');
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    assert.equal(await evaluate('document.querySelectorAll(".workspace-areas a").length'), 5);
    assert.equal(await evaluate('document.querySelectorAll(".workspace-context a").length'), 3);
    await evaluate('document.querySelector(".workspace-area:nth-child(2)").focus()');
    await command('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
    await command('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await wait('location.hash==="#/office/enquiries" && document.querySelectorAll(".workspace-context a").length===5');
    assert.equal(await evaluate('document.querySelectorAll(".workspace-context a").length'),5);
    await click('[data-action="workspace-search"]');
    await wait('document.querySelector("#modal").open');
    await evaluate('(()=>{const e=document.querySelector("[data-workspace-search]");e.value="calendar";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelectorAll(".workspace-search-results a:not([hidden])").length'),1);
    await click('.workspace-search-results a:not([hidden])');
    await wait('location.hash==="#/office/calendar"&&!document.querySelector("#modal").open');
    await click('[data-action="account-settings"]');
    await wait('document.querySelector("#modal").open');
    assert.equal(await evaluate('document.querySelectorAll("#modal .visible-choices button").length'),4);
    await evaluate('document.querySelector(".modal-close").focus()');
    assert.notEqual(await evaluate('getComputedStyle(document.activeElement).outlineStyle'),'none');
    await capture('design-help-and-account',390,900);
    await click('[data-action="close-modal"]');
    await route('office/work');
    for (const filter of ['Cover', 'Intake', 'Checks', 'Messages', 'All']) {
      await click(`[data-action="work-filter"][data-value="${filter}"]`);
      assert.equal(await evaluate(`document.querySelector('[data-action="work-filter"][data-value="${filter}"]').getAttribute('aria-pressed')`), 'true');
    }
    await click('[data-action="mobile-menu"]');
    await wait('document.querySelector("#modal").open');
    assert.equal(await evaluate('document.querySelectorAll(".mobile-menu-list a").length'), 17);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await wait('!document.querySelector("#modal").open');
    await capture('design-work-320', 320, 900);
    await route('office/overview');
    await evaluate('document.documentElement.style.fontSize="200%"');
    await capture('design-home-large-text', 390, 900);
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".nav-list .nav-link")).filter(e=>e.getClientRects().length && getComputedStyle(e).display!=="none").every(e=>{const r=e.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight;})'), true, 'Enlarged mobile navigation stays inside the viewport');
    await evaluate('document.documentElement.style.fontSize=""');
    await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.ok(parseFloat(await evaluate('getComputedStyle(document.querySelector(".nav-link")).transitionDuration')) < .02);
    assert.deepEqual(errors, []);
    assert.equal(requests.some(r => r.host.includes('shiftcare') && !['GET', 'HEAD'].includes(r.method)), false);
    passed('Navigation, keyboard and reading support', 'Five process areas with contextual tools; workspace search opens a destination; the account dialog and visible choices work by keyboard, all five work filters work, mobile More exposes every office route, 320px and doubled-text views reflow, and reduced motion is respected.');
  } else if (intakeHandoff) {
    await route('office/intake');
    await click('[data-action="sample-intake"]');
    await wait("!!document.querySelector('[data-form=intake-save]')");
    assert.ok((await evaluate('document.querySelector("#intake-preview").textContent')).includes('Automatic checks completed'));
    assert.equal(await evaluate('document.activeElement.id'), 'intake-source');
    assert.equal(await evaluate('document.querySelectorAll("details").length'), 0);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("select")).filter(e=>e.getClientRects().length).length'), 0);
    assert.ok((await evaluate("document.querySelector('#intake-source').value")).includes('Fictional presentation intake'));
    await capture('intake-capture-desktop');
    await submit('[data-form="intake-save"]', {});
    await wait("!!document.querySelector('[data-form=intake-review]')");
    const id = await evaluate("document.querySelector('[data-form=intake-review]').dataset.id");
    assert.equal(await evaluate('document.querySelectorAll("[data-intake-section]:not([hidden])").length'), 1);
    await evaluate('document.querySelector("[data-form=intake-review] [name=notes]").value="Unsaved tab-switch check"');
    for (const section of ['handoff', 'verify', 'followup', 'activity', 'review']) {
      await click(`[data-action="intake-section"][data-value="${section}"]`);
      assert.equal(await evaluate('document.querySelectorAll("[data-intake-section]:not([hidden])").length'), 1);
      assert.equal(await evaluate(`document.querySelector('[data-intake-section="${section}"]').getClientRects().length > 0`), true);
      assert.equal(await evaluate(`document.querySelector('[data-action="intake-section"][data-value="${section}"]').getAttribute('aria-pressed')`), 'true');
    }
    assert.equal(await evaluate('document.querySelector("[data-form=intake-review] [name=notes]").value'), 'Unsaved tab-switch check');
    await click('[data-action="intake-section"][data-value="followup"]');
    assert.equal(await evaluate('document.querySelector("[data-owner-picker] select").hidden'), false);
    await evaluate(`(() => { const input = document.querySelector('[data-owner-search]'); input.value = 'no-such-person'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    assert.equal(await evaluate('document.querySelector("[data-owner-picker] select").options.length'), 1);
    assert.equal(await evaluate('document.querySelector("[data-owner-picker] select").checkValidity()'), false);
    await evaluate(`(() => { const input = document.querySelector('[data-owner-search]'); input.value = 'PROTOTYPE.OFFICE'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    assert.equal(await evaluate('document.querySelector("[data-owner-picker] select").options.length'), 2);
    await submit('[data-form="server-record"]', { owner: email, nextAction: 'Contact the requester' });
    await wait("document.querySelector('#toast').textContent === 'Request updated.'");
    await route(`office/enquiries/${id}`);
    assert.equal(await evaluate('document.querySelector("[data-owner-picker] select").value'), email);
    assert.equal(await evaluate('document.querySelector("[data-form=server-record] [name=nextAction]").value'), 'Contact the requester');
    passed('Searchable staff ownership', 'Search filters configured staff, unknown names cannot be selected, and the selected account persists after save and reload.');
    await click('[data-action="intake-section"][data-value="review"]');
    passed('Focused intake sections', 'Only one section is visible at a time; all five navigation buttons work and preserve unsaved review fields.');
    assert.equal(await evaluate("document.querySelector('[data-form=server-record] [name=status] option[value=\"Ready for ShiftCare\"]').disabled"), true);
    await submit('[data-form="intake-review"]', { email: '', phone: '', sourceReviewed: true });
    await wait("!!document.querySelector('[data-form=intake-review] .field-error')");
    await submit('[data-form="intake-review"]', { name: 'Alex Reviewed', email: 'alex.intake@example.test', sourceReviewed: true }, '[value="review"]');
    await wait("!!document.querySelector('[data-action=ready-intake]')");
    assert.equal(await evaluate("!!document.querySelector('[data-form=intake-verify]')"), false);
    await submit('[data-form="intake-review"]', { sourceReviewed: true }, '[value="ready"]');
    await wait("!!document.querySelector('[data-form=intake-verify]')");
    assert.equal(await evaluate("document.querySelector('[data-form=server-record] [name=status]').value"), 'Ready for ShiftCare');
    assert.equal(await evaluate('document.querySelector("[data-intake-section]:not([hidden])").dataset.intakeSection'), 'handoff');
    await click('[data-action="intake-section"][data-value="review"]');
    assert.ok((await evaluate("document.querySelector('.intake-source').innerText")).includes('Alex Demo'));
    await capture('intake-review-desktop');
    await capture('intake-review-mobile', 390, 900);
    await click('[data-action="intake-section"][data-value="handoff"]');
    await click('[data-native-match]');
    await click('[data-action="approve-intake-handoff"]');
    await wait("!document.querySelector('[data-action=approve-intake-handoff]')");
    await evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.intakeCopied = text; } } })");
    await click('[data-action="copy-intake-field"][data-value="name"]');
    await wait("window.intakeCopied === 'Alex Reviewed'");
    await click('[data-action="copy-intake-handoff"]');
    await wait("window.intakeCopied?.startsWith('SHIFTCARE MANUAL HANDOFF')");
    assert.ok((await evaluate('window.intakeCopied')).includes('Manual entry; no ShiftCare sync'));
    await evaluate("navigator.clipboard.writeText = async () => { throw new Error('Clipboard denied'); }");
    await click('[data-action="copy-intake-field"][data-value="email"]');
    await wait("!!document.querySelector('#modal[open] .copy-fallback')");
    assert.equal(await evaluate("document.querySelector('.copy-fallback').value"), 'alex.intake@example.test');
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await wait("!document.querySelector('#modal').open");
    await capture('intake-handoff-mobile', 390, 900, '.intake-followup');
    await click('[data-action="intake-section"][data-value="verify"]');
    await submit('[data-form="intake-verify"]', { shiftCareId: 'SC-FICTIONAL-DEMO', profileChecked: true });
    await wait("!!document.querySelector('.verification-receipt')");
    assert.ok((await evaluate("document.querySelector('.verification-receipt').innerText")).includes('Staff manual verification'));
    await command('Page.reload', { ignoreCache: true });
    await wait("!!document.querySelector('.verification-receipt')");
    assert.equal(await evaluate("document.querySelector('[data-form=intake-review] fieldset').disabled"), true);
    assert.equal(await evaluate(`(JSON.parse(localStorage.getItem('ocd-brilliance-operations-v1'))?.enquiries || []).some(e => e.id === ${JSON.stringify(id)})`), false);
    await capture('intake-verified-desktop');
    await route('office/work');
    await click('[data-action="work-filter"][data-value="Intake"]');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.crm-work-list tbody tr')).some(e => e.textContent.includes(${JSON.stringify(id)}))`), false);
    await route('office/enquiries');
    assert.equal(await evaluate(`!!document.querySelector('a[href="#/office/enquiries/${id}"]')`), true);
    await route('office/intake');
    await click('[data-action="sample-intake"]');
    await submit('[data-form="intake-extract"]', {});
    await wait("!!document.querySelector('.intake-warning a')");
    assert.equal(await evaluate("document.querySelector('[data-form=intake-save] button').disabled"), true);
    await capture('intake-duplicate-mobile', 320, 900);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.notEqual(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'none');
    const documentResults = await evaluate(`(async () => {
      const lines = ['Full name: PDF Person', 'Email: pdf@example.test', 'Service: Transport', 'Suburb: Joondalup', 'Postcode: 6027'];
      const pdfFile = (objects, name) => {
        let data = '%PDF-1.4\\n'; const offsets = [0];
        objects.forEach((object, index) => { offsets.push(data.length); data += (index + 1) + ' 0 obj\\n' + object + '\\nendobj\\n'; });
        const xref = data.length;
        data += 'xref\\n0 ' + offsets.length + '\\n0000000000 65535 f \\n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \\n').join('');
        data += 'trailer\\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\\nstartxref\\n' + xref + '\\n%%EOF';
        return new File([Uint8Array.from(data, c => c.charCodeAt(0))], name, { type: 'application/pdf' });
      };
      const content = 'BT /F1 16 Tf 50 750 Td ' + lines.map((line, index) => (index ? '0 -30 Td ' : '') + '(' + line + ') Tj').join(' ') + ' ET';
      const digital = pdfFile(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' + content.length + ' >>\\nstream\\n' + content + '\\nendstream'], 'fictional-digital.pdf');
      const extracted = await window.OCD_DOCUMENTS.extract(digital);
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 350;
      const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, 1000, 350); context.fillStyle = 'black'; context.font = '30px Arial';
      lines.forEach((line, index) => context.fillText(line, 30, 50 + index * 55));
      const jpeg = atob(canvas.toDataURL('image/jpeg', .95).split(',')[1]);
      const imageContent = 'q 550 0 0 193 30 550 cm /Image Do Q';
      const scanned = pdfFile(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Image 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /XObject /Subtype /Image /Width 1000 /Height 350 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\\nstream\\n' + jpeg + '\\nendstream', '<< /Length ' + imageContent.length + ' >>\\nstream\\n' + imageContent + '\\nendstream'], 'fictional-scanned.pdf');
      const ocr = await window.OCD_DOCUMENTS.extract(scanned);
      const response = await fetch('/api/workflow?action=draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'PDF Person', email: 'pdf@example.test', service: 'Transport', suburb: 'Joondalup', postcode: '6027', source: 'Text upload', sourceText: extracted.text, originalDocument: extracted.originalDocument, idempotencyKey: 'browser-document-001' }) });
      const saved = await response.json();
      return { digitalText: extracted.text, scanText: ocr.text, status: response.status, id: saved.record?.id, originalName: saved.record?.onboarding.originalDocument?.name };
    })()`);
    assert.ok(documentResults.digitalText.includes('Full name: PDF Person'));
    assert.ok(documentResults.scanText.includes('PDF Person'));
    assert.equal(documentResults.status, 201);
    assert.equal(documentResults.originalName, 'fictional-digital.pdf');
    await command('Page.reload', { ignoreCache: true });
    await wait("!!document.querySelector('#intake-source')");
    await route('office/enquiries/' + documentResults.id);
    await wait("!!document.querySelector('[data-document-pdf][data-rendered=true] canvas')");
    await capture('intake-original-document-desktop');
    passed('Digital PDF and scanned PDF', 'PDF.js extracted digital text; Tesseract processed an image-only PDF using local language assets; the original PDF persisted and appeared beside the draft after reload.');
    assert.deepEqual(errors, []);
    assert.equal(requests.some(r => r.host.includes('shiftcare') && !['GET', 'HEAD'].includes(r.method)), false);
    passed('Reviewed intake and manual handoff', 'Original source, missing contact gate, staff review, ready status, per-field/full copying and clipboard denial fallback were exercised with fictional data.');
    passed('Verification and persistence', 'Staff check and reference persisted after reload; completed fields were disabled and shared intake data stayed out of browser localStorage.');
    passed('Duplicate recovery and responsive keyboard flow', 'Duplicate extraction linked to the existing intake and prevented another draft; desktop, 390px and 320px captures had no horizontal page overflow; keyboard focus and dialog Escape were checked.');
  } else if (integrationProof) {
    await wait("!!document.querySelector('[data-proof=run-mcp]') && !document.querySelector('[data-proof=run-mcp]').disabled");
    const dashboard = await evaluate("document.querySelector('#integration-proof-dashboard').innerText");
    assert.ok(dashboard.includes(nativeCapture.account.id));
    assert.ok(dashboard.includes(nativeCapture.account.timeZone));
    assert.ok(dashboard.includes('Authenticated MCP capture'));
    assert.equal(await evaluate('document.querySelectorAll(".proof-source details").length'), 0);
    assert.ok((await evaluate("document.querySelector('#integration-proof-dashboard').innerText")).includes('does not hold the MCP login or poll ShiftCare'));
    assert.equal(await evaluate("document.querySelector('[data-proof-rest] button').disabled"), true);
    passed('Real capture and honest connection status', 'Dashboard identifies the authenticated capture, account, timestamp and time zone; website REST reads remain disabled without a separate key.');

    await click('[data-proof=run-mcp]');
    await wait("!!document.querySelector('.proof-findings article') && !document.querySelector('[data-proof=run-mcp]').disabled");
    const result = await evaluate("fetch('/api/integration-proof',{cache:'no-store'}).then(r=>r.json())");
    const expected = (await import('../lib/integration-proof.cjs')).analyse(nativeCapture);
    assert.equal(result.runs.length, 1); assert.equal(result.runs[0].findings.length, expected.findings.length);
    assert.ok(result.runs[0].findings.some(f => f.code === 'UNSTAFFED'));
    assert.ok(result.runs[0].findings.some(f => f.code.startsWith('ATTENDANCE_') && f.owner === 'Bookkeeper'));
    assert.match(await evaluate("document.querySelector('.proof-findings').innerText"), /Timesheet items do not establish actual delivered hours/);
    const runId = result.runs[0].id;
    await capture('proof-overview-desktop');
    await capture('proof-findings-desktop', 1440, 1000, '.proof-results');
    passed('Automation over native records', `${expected.metrics.shifts} real captured shifts produced ${expected.findings.length} owned findings with native source IDs; actual attendance was not inferred from scheduled or payroll data.`);

    await click('[data-proof=run-mcp]');
    await wait("document.querySelector('.proof-results').innerText.includes('Same source reused')");
    const replay = await evaluate("fetch('/api/integration-proof',{cache:'no-store'}).then(r=>r.json())");
    assert.equal(replay.runs.length, 1); assert.equal(replay.runs[0].id, runId);
    passed('Replay prevention', 'Repeating the same capture reused the persisted run ID and findings.');

    await click('[data-proof=tab][data-id=records]');
    const hrefs = await evaluate("Array.from(document.querySelectorAll('.proof-results a')).map(a=>a.href)");
    for (const shift of nativeCapture.data.shifts) assert.ok(hrefs.includes(shift.url));
    assert.ok((await evaluate("document.querySelector('.proof-results').innerText")).includes('assignment '));
    await capture('proof-native-records-desktop', 1440, 1000, '.proof-results');
    await click('[data-proof=tab][data-id=calls]');
    assert.equal(await evaluate("document.querySelectorAll('.proof-results tbody tr').length"), nativeCapture.receipts.length);
    await capture('proof-call-receipts-desktop', 1440, 1000, '.proof-results');
    passed('Traceability into ShiftCare', 'Native links match the returned URLs, staff and assignment IDs stay separate, and actual call counts/scopes/timestamps are visible.');

    const isVerified = result.capture.proof.status === 'verified';
    assert.equal(await evaluate("!!document.querySelector('.proof-verified')"), isVerified);
    if (isVerified) {
      assert.equal(result.capture.proof.readback.id, String(nativeCapture.proof.createdId));
      assert.equal(await evaluate("document.querySelectorAll('.proof-pipeline li.passed').length"), 5);
      assert.match(await evaluate("document.querySelector('[data-proof=copy-proposal]').textContent"), /verification request/);
      await capture('proof-native-result-desktop', 1440, 1000, '.proof-verified');
      await capture('proof-native-result-mobile', 390, 900, '.proof-verified');
    }
    if (!isVerified) assert.ok((await evaluate("document.querySelector('.proof-handoff').innerText")).includes('No native write has been verified'));
    assert.equal(await evaluate("document.querySelectorAll('.proof-handoff button').length"), 2);
    assert.equal(await evaluate(`JSON.stringify(localStorage).includes(${JSON.stringify(nativeCapture.data.shifts[0].id)})`), false);
    await capture('proof-native-handoff-mobile', 390, 900, '.proof-handoff');
    passed('Native proof and data boundaries', isVerified ? `Native action ${result.capture.proof.readback.id} is independently matched and all five stages are recorded. Copy now produces a get_action_item request rather than a duplicate create; no unsupervised write control or native browser persistence exists.` : 'Native proof stays pending, with the exact proposal and no write control. Native IDs are absent from browser localStorage.');

    await command('Page.reload', { ignoreCache: true });
    await wait("!!document.querySelector('.proof-findings article')");
    assert.ok((await evaluate("document.querySelector('.proof-results').innerText")).includes(runId));
    await capture('proof-overview-mobile', 390, 900);
    await capture('proof-findings-mobile', 390, 900, '.proof-results');
    assert.deepEqual(errors, []);
    assert.equal(requests.some(r => r.host.includes('shiftcare') && !['GET','HEAD'].includes(r.method)), false);
    passed('Persisted review and responsive runtime', 'The authenticated review survived reload, desktop/mobile captures had no horizontal page overflow, and the browser made no ShiftCare mutation or uncaught exception.');
  } else if (liveMap) {
    for (const area of ['office', 'worker', 'client']) {
      const before = requests.length;
      await route(`${area}/map/BKG-501`);
      await wait("document.querySelector('[data-map-connection]')?.textContent==='Mapbox · 3D buildings available'", 25000);
      assert.equal(await evaluate("!!document.querySelector('#booking-map-canvas canvas') && document.querySelector('[data-map-fallback]').hidden"), true);
      if (area === 'client') {
        assert.equal(requests.slice(before).some(r => r.path.includes('/directions/')), false);
        assert.equal(await evaluate("document.querySelector('.map-booking-list').innerText.includes('Daniel')||document.querySelector('.map-booking-list').innerText.includes('Farah')"), false);
      }
      await capture(`${area}-mapbox-3d`, area === 'client' ? 390 : 1440, area === 'client' ? 900 : 1000);
      passed(`${area} live Mapbox rendering`, 'Real Mapbox Standard loaded in a WebGL browser using fictional service coordinates; no device GPS or ShiftCare mutation.');
    }
    assert.deepEqual(errors, []);
  } else {
  await route('office/automation'); await click('[data-auto-action="ingest"]');
  assert.equal(await stored('s.automation.jobs.length'), 10);
  await click('[data-auto-action="ingest"]'); assert.equal(await stored('s.automation.jobs.length'), 10);
  passed('Inbox routing and replay', 'Eight sources created owned cases once; repeated processing preserved ten total cases including two existing operational requests.');
  await capture('automation-desktop');

  const participant = await job('participant'); await route(`office/automation/${participant}`);
  await capture('intake-mapping-desktop', 1440, 1000, '.automation-next');
  await submit('[data-auto-form="approve"]', { dob: '', sourceReviewed: true, consent: true, areaReviewed: true });
  assert.equal(await jobStatus(participant), 'needs_review');
  await submit('[data-auto-form="approve"]', { dob: '1981-03-14', sourceReviewed: true, consent: true, areaReviewed: true });
  assert.equal(await jobStatus(participant), 'approved');
  await submit('[data-auto-form="native"]', { failure: 'timeout' });
  assert.equal(await jobStatus(participant), 'reconciliation_required'); assert.equal(await stored('s.participants.length'), 3);
  await capture('unknown-outcome-desktop', 1440, 1000, '.automation-case-detail');
  await click('[data-auto-action="verify"]'); assert.equal(await stored('s.participants.length'), 4);
  await submit('[data-auto-form="accounting"]', { reference: 'DEMO-XERO-CONTACT', note: 'Separate contact link checked by bookkeeper in this scenario', checked: true });
  assert.equal(await jobStatus(participant), 'completed');
  passed('Intake, unknown outcome and accounting', 'Missing DOB prevented approval; lost response preserved the proposal; reconciliation and a separate Xero check were required before closure.');

  const employee = await job('employee'); await route(`office/automation/${employee}`);
  await submit('[data-auto-form="approve"]', { sourceReviewed: true, consent: true });
  await submit('[data-auto-form="native"]', { failure: 'success' }); await click('[data-auto-action="verify"]');
  assert.equal(await stored("s.workers.find(w=>w.email==='noah.reed@example.com').approved"), false);
  await submit('[data-auto-form="accounting"]', { reference: 'DEMO-PAYROLL-EMPLOYEE', note: 'Separate payroll onboarding checked; screening still pending', checked: true });
  passed('Employee onboarding', 'Staff profile read-back and separate payroll reference were required; screening approval was not granted.');

  const agreement = await job('file'); await route(`office/automation/${agreement}`);
  await submit('[data-auto-form="approve"]', { sourceReviewed: true, fileReviewed: true });
  await submit('[data-auto-form="native"]', { failure: 'success' });
  assert.equal(await stored("s.agreements.find(a=>a.id==='AGR-303').status"), 'Awaiting signature');
  await click('[data-auto-action="verify"]'); assert.equal(await stored("s.agreements.find(a=>a.id==='AGR-303').status"), 'Signed');
  passed('Returned agreement filing', 'Signed status followed checked native filing and read-back, without an upload API.');

  const cancel = await job('cancel'); await route(`office/automation/${cancel}`);
  await submit('[data-auto-form="approve"]', { charge: 'with-charge', code: 'NSDH', scope: 'occurrence', policyReviewed: true, sourceReviewed: true });
  await submit('[data-auto-form="native"]', { failure: 'success' });
  assert.equal(await stored("s.bookings.find(b=>b.id==='BKG-505').status"), 'Confirmed');
  await click('[data-auto-action="verify"]'); assert.equal(await stored("s.bookings.find(b=>b.id==='BKG-505').status"), 'Cancelled');
  await click('[data-auto-action="delivery-fail"]'); assert.equal(await stored('s.automation.messages[0].status'), 'failed');
  await click('[data-auto-action="deliver"]'); assert.equal(await stored('s.updates.filter(u=>u.messageId).length'), 1);
  await route('client/home'); assert.match(await evaluate("document.querySelector('#main-content').innerText"), /Cancellation confirmed \(demo\)/);
  passed('Cancellation and recipient delivery', 'Single occurrence remained unchanged until verification. Failed delivery stayed separate from the write and delivered once after retry.');

  const cover = await job('cover'); await route(`office/automation/${cover}`);
  await submit('[data-auto-form="approve"]', { workerId: 'WRK-01', availabilityReviewed: true, sourceReviewed: true });
  await submit('[data-auto-form="native"]', { failure: 'success' }); await click('[data-auto-action="verify"]');
  await route('worker/today'); await click('[data-action="respond-offer"][data-value="Accepted"]');
  assert.equal(await jobStatus(cover), 'needs_review');
  await route(`office/automation/${cover}`);
  await submit('[data-auto-form="approve"]', { communication: 'Office checked the native acceptance and agreed the replacement with Daniel', sourceReviewed: true });
  await submit('[data-auto-form="native"]', { failure: 'success' });
  assert.equal(await stored("s.bookings.find(b=>b.id==='BKG-502').workerId"), 'WRK-02');
  await click('[data-auto-action="verify"]'); assert.equal(await stored("s.bookings.find(b=>b.id==='BKG-502').workerId"), 'WRK-01');
  passed('Cross-workspace replacement cover', 'Office posted and verified a native offer; selected Worker accepted; assignment changed only after office review and read-back.');

  await route('office/automation'); await click('[data-auto-action="check"][data-id="documents"]');
  const doc = await stored("s.automation.jobs.find(j=>j.kind==='document'&&j.targetId==='WDC-04').id");
  await route(`office/automation/${doc}`);
  await submit('[data-auto-form="approve"]', { noExpiration: true, note: 'Original induction acknowledgement has no expiry', sourceReviewed: true });
  await submit('[data-auto-form="native"]', { failure: 'success' }); await click('[data-auto-action="verify"]');
  assert.equal(await stored("s.workerDocs.find(d=>d.id==='WDC-04').noExpiration"), true);
  passed('Non-expiring document correction', 'Explicit evidence and date clearing followed the native review/read-back path.');

  await route('worker/today');
  await evaluate("document.querySelector('#worker-persona').value='WRK-02';document.querySelector('#worker-persona').dispatchEvent(new Event('change',{bubbles:true}))");
  await route('worker/today/BKG-498');
  await submit('[data-form="worker-note"]', { note: 'Fictional visit note: participant needs an office follow-up.', tasks: 'Kitchen completed; laundry deferred with explanation.', goals: 'Household tasks partly completed; office to follow up.', majorIssue: true });
  await route('office/finance');
  await submit('[data-auto-form="report"]', { type: 'invoices', partial: true });
  assert.equal(await stored('s.automation.lastReport.complete'), false);
  assert.equal(await stored("s.automation.jobs.find(j=>j.kind==='finance'&&j.targetId==='BKG-498').owner"), 'Office');
  await capture('bookkeeping-desktop');
  await submit('[data-auto-form="report"]', { type: 'payroll', partial: false });
  assert.equal(await stored('s.feeProposals.length'), 0);
  passed('Native care and bookkeeping exceptions', 'Worker tasks/goals/major flag reached the restricted office review. Missing source scope remained visible; invoice and payroll checks created no financial release.');

  await route('worker/today');
  await evaluate("document.querySelector('#worker-persona').value='WRK-01';document.querySelector('#worker-persona').dispatchEvent(new Event('change',{bubbles:true}))");
  await route('worker/map/BKG-501'); await wait("!!document.querySelector('[data-map-action=play]')");
  await click('[data-map-action="play"]'); assert.equal(await stored("s.journeys['BKG-501']?.consent===true"), false);
  await evaluate("document.querySelector('[data-journey-consent]').checked=true");
  await click('[data-map-action="play"]'); assert.equal(await stored("s.journeys['BKG-501'].consent"), true);
  const clientRequestStart = requests.length;
  await route('client/map/BKG-501');
  assert.equal(await evaluate("!!document.querySelector('[data-map-action=play]')"), false);
  assert.equal(await evaluate("document.querySelector('.map-booking-list').innerText.includes('Daniel')||document.querySelector('.map-booking-list').innerText.includes('Farah')"), false);
  assert.match(await evaluate("document.querySelector('[data-map-route-source]').innerText"), /Worker origins, routes/);
  assert.equal(requests.slice(clientRequestStart).some(r => r.path.includes('/directions/')), false);
  await capture('participant-map-mobile', 390, 900);
  await route('worker/map/BKG-501'); await click('[data-map-action="stale"]');
  await route('client/map/BKG-501'); assert.equal(await evaluate("document.querySelector('[data-map-eta]').innerText"), 'Unavailable');
  await capture('stale-arrival-mobile', 390, 900, '[data-map-detail]');
  await route('worker/map/BKG-501'); await click('[data-map-action="stop"]');
  assert.equal(await stored("s.journeys['BKG-501'].consent"), false);
  passed('Consent, privacy and stale arrival', 'Only Worker started a consented estimate. Client had no playback control/route request or other participant bookings; stale ETA was withdrawn and sharing could stop. Mapbox network fallback was used.');

  await route('office/automation'); await capture('automation-mobile', 390, 900);
  await route(`office/automation/${participant}`); await capture('completed-case-mobile', 390, 900, '.automation-case-detail');
  await command('Page.reload', { ignoreCache: true }); await wait("!!document.querySelector('.sidebar')");
  assert.equal(await jobStatus(participant), 'completed');
  passed('Reload persistence and responsive layout', 'Browser case state and audit persisted after reload; captured desktop/mobile viewports had no horizontal overflow.');
  assert.deepEqual(errors, []);
  assert.equal(requests.some(r => r.host.includes('shiftcare') && !['GET','HEAD'].includes(r.method)), false);
  passed('Runtime and integration boundary', 'No uncaught browser exception; no live ShiftCare mutation or external financial/message operation.');
  }
  success = true;
  console.log(JSON.stringify({ status: 'pass', scenarios: checks.length, captures: captures.length, browserErrors: errors.length, output: path.relative(root, output) }, null, 2));
} catch (error) {
  try { await capture('failure-current-state'); } catch {}
  console.error(error.stack); process.exitCode = 1;
} finally {
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'browser-review.json'), JSON.stringify({ schemaVersion: 1, reviewDate: '2026-10-07', status: success ? 'pass' : 'fail', sourceMode: integrationProof ? 'Authenticated MCP capture; isolated local review server' : 'fictional and isolated', checks, captures, uncaughtErrors: errors, visualReview: 'pending image inspection', mapbox: integrationProof ? 'Not exercised in this review.' : liveMap ? 'Real Mapbox Standard browser rendering; fictional coordinates only, no device GPS.' : 'External calls blocked deliberately; fallback, privacy and ETA state verified.', productionLimit: integrationProof ? 'Captured MCP reads and local rules are demonstrated. Website-owned OAuth, live REST credentials, hosted job storage and unattended native writes are not certified.' : 'No real mailbox/OCR, ShiftCare writes, background jobs, payroll release, secure worker/client identities or device GPS certified.' }, null, 2) + '\n');
  chrome.kill(); server.kill();
  for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(new Error('Browser review ended')); } pending.clear();
  await new Promise(resolve => setTimeout(resolve, 150)); await fs.rm(temp, { recursive: true, force: true });
}
