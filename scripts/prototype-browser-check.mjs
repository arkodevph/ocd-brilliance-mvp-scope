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
const clientPresentation = process.env.PROTOTYPE_PRESENTATION === '1';
const reviewedAt = new Date().toISOString(), reviewDate = reviewedAt.slice(0, 10);
const output = path.resolve(root, process.env.PROTOTYPE_REVIEW_DIR || `docs/${clientPresentation ? 'client-presentation-review' : integrationProof ? 'shiftcare-proof-review' : liveMap ? 'prototype-mapbox-review' : 'prototype-review'}-${reviewDate}`);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-prototype-review-'));
let nativeCapture;
if (integrationProof || clientPresentation) {
  nativeCapture = JSON.parse(await fs.readFile(path.join(root, '.local/shiftcare-evidence.json'), 'utf8'));
  await fs.mkdir(path.join(temp, 'data'), { recursive: true });
  await fs.writeFile(path.join(temp, 'data', 'shiftcare-evidence.json'), JSON.stringify(nativeCapture), { mode: 0o600 });
}
const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const password = crypto.randomBytes(18).toString('hex');
const email = 'prototype.office@example.test';
const server = spawn(process.execPath, ['server.cjs'], { cwd: root, stdio: 'ignore', env: { ...process.env, PORT: String(port), VERCEL: '', WORKFLOW_DATA_DIR: path.join(temp, 'data'), WORKFLOW_STAFF_EMAIL: email, WORKFLOW_STAFF_PASSWORD: password, WORKFLOW_SESSION_SECRET: crypto.randomBytes(32).toString('hex'), UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', SERVICE_POSTCODES: '6024,6025,6026,6027,6065' } });
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
const input = (selector, value) => evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e) throw new Error('Missing input'); e.value=${JSON.stringify(String(value))}; e.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
async function route(value) { await evaluate(`location.hash=${JSON.stringify('#/' + value)}`); await wait(`location.hash===${JSON.stringify('#/' + value)} && !!document.querySelector(${JSON.stringify(value.startsWith('public/') ? '.public-main' : '#main-content')})`); await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); }
async function submit(selector, values) {
  await evaluate(`(() => { const f=document.querySelector(${JSON.stringify(selector)}); if(!f) throw new Error('Missing form'); for(const [k,v] of Object.entries(${JSON.stringify(values)})){ const e=f.elements[k]; if(!e) throw new Error('Missing field: '+k); if(e.type==='checkbox')e.checked=!!v; else e.value=v; } f.requestSubmit(); return true; })()`);
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
  // Map/network fallback is checked without spending Mapbox quota or contacting a real roster.
  if (!liveMap) await command('Network.setBlockedURLs', { urls: ['https://api.mapbox.com/*', 'https://events.mapbox.com/*'] });
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  if (integrationProof) {
    assert.equal((await fetch(origin + '/api/integration-proof')).status, 401);
    assert.equal((await fetch(origin + '/.local/shiftcare-evidence.json')).status, 404);
    passed('Office evidence access', 'Unsigned API reads were rejected and the private capture was inaccessible as a static file.');
  }
  await command('Page.navigate', { url: origin + (clientPresentation ? '/#/office/presentation' : integrationProof ? '/#/office/verification' : '/#/office/automation') }); await wait("!!document.querySelector('#staff-login')");
  await submit('#staff-login', { email, password }); await wait("!!document.querySelector('.sidebar')");
  if (clientPresentation) {
    await wait("!!document.querySelector('#client-presentation')");
    assert.equal(await evaluate("document.querySelectorAll('.cp-tabs a').length"), 5);
    assert.match(await evaluate("document.querySelector('.cp-counts').innerText"), /7[\s\S]*14/);
    assert.match(await evaluate("document.querySelector('.cp-system-grid').innerText"), /Source of truth/);
    await capture('client-overview-desktop');
    await route('office/presentation/use-cases');
    assert.equal(await evaluate("document.querySelectorAll('.cp-use-card').length"), 7);
    assert.match(await evaluate("document.querySelector('[data-client-content]').innerText"), /What we handle/i);
    assert.match(await evaluate("document.querySelector('[data-client-content]').innerText"), /How to measure it/i);
    await capture('client-use-cases-desktop');
    passed('Business scope and practical benefits', 'Five presentation sections show seven core areas, thirteen operational workflows plus booking/arrival W14, specific triggers, staff/native responsibilities and measures.');

    await click('[data-client-scenario="onboarding"]'); await wait("!!document.querySelector('.cp-demo-stage')");
    const beforeGuide = await evaluate("localStorage.getItem('ocd-brilliance-operations-v1')");
    await click('[data-client-action="next"]');
    assert.match(await evaluate("document.querySelector('.cp-step-content').innerText"), /pre-filled sample fields/);
    assert.equal(await evaluate("localStorage.getItem('ocd-brilliance-operations-v1')"), beforeGuide);
    await click('[data-client-action="prepare"]');
    const prepared = await stored('s.automation.jobs.length');
    assert.ok(prepared > 0);
    await click('[data-client-action="prepare"]'); assert.equal(await stored('s.automation.jobs.length'), prepared);
    const intakeId = await job('participant');
    assert.equal(await evaluate("document.querySelector('.cp-demo-open a').getAttribute('href')"), `#/office/automation/${intakeId}`);
    assert.match(await evaluate("document.querySelector('[data-client-preparation]').innerText"), /0 new sample cases[\s\S]*No native ShiftCare changes/);
    await capture('client-intake-guide-desktop');
    await click('.cp-demo-open a'); await wait("!!document.querySelector('.automation-case-detail')");
    assert.equal(await evaluate('location.hash'), `#/office/automation/${intakeId}`);
    assert.match(await evaluate("document.querySelector('.automation-case-detail').innerText"), /Ava/);
    await route('office/presentation/walkthrough');
    await click('[data-client-scenario="cover"]');
    assert.match(await evaluate("document.querySelector('.cp-demo-stage').innerText"), /worker.*acceptance/i);
    assert.equal(await evaluate("document.querySelector('.cp-demo-open a').getAttribute('href')"), `#/office/automation/${await job('cover')}`);
    await route('office/presentation/overview'); await click('[data-client-scenario="onboarding"]');
    await wait("document.querySelector('.cp-step-content')?.innerText.includes('Receive and assign')");
    assert.equal(await evaluate("document.querySelector('.cp-demo-open a').getAttribute('href')"), `#/office/automation/${intakeId}`);
    passed('Guided sample and working case links', 'Guide navigation changes no operational state. Preparation deduplicates fictional sources, preserves history, and links intake and cover to the actual interactive cases.');

    await click('[data-client-action="presentation"]');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.sidebar')).display"), 'none');
    await route('office/presentation/value');
    assert.equal(await evaluate("document.body.classList.contains('client-presentation-mode')"), true);
    await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
    assert.equal(await evaluate("document.body.classList.contains('client-presentation-mode')"), false);
    await click('[data-client-action="presentation"]');
    await route('office/automation');
    assert.equal(await evaluate("document.body.classList.contains('client-presentation-mode')"), false);
    assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.sidebar')).display"), 'none');
    await route('office/presentation/value'); await click('[data-client-action="presentation"]');
    passed('Presentation mode and operational navigation', 'Presentation mode hides navigation, persists between its sections, exits with Escape, and always restores the operational shell on another route.');

    assert.match(await evaluate("document.querySelector('[data-client-estimate]').innerText"), /Not calculated/);
    assert.equal(await evaluate("document.querySelectorAll('.cp-score input').length"), 12);
    assert.equal(await evaluate("[...document.querySelectorAll('.cp-score input')].every(e=>e.value==='')"), true);
    await click('[data-client-action="illustrate"]');
    assert.match(await evaluate("document.querySelector('[data-client-estimate]').innerText"), /8[\s\S]*staff hours[\s\S]*\$280/);
    assert.match(await evaluate("document.querySelector('.cp-section-line .cp-tag').innerText"), /Illustrative example/);
    await input('#client-value-form [name=assistedMinutes]', 25);
    assert.match(await evaluate("document.querySelector('[data-client-estimate]').innerText"), /ADDITIONAL EFFORT[\s\S]*3\.33[\s\S]*-\$116\.67/);
    assert.match(await evaluate("document.querySelector('.cp-section-line .cp-tag').innerText"), /Assumptions/);
    await click('[data-client-action="clear-estimate"]');
    assert.match(await evaluate("document.querySelector('[data-client-estimate]').innerText"), /Not calculated/);
    for (const [field, value] of Object.entries({ volume: 0, manualMinutes: 20, assistedMinutes: 8 })) await input(`#client-value-form [name=${field}]`, value);
    assert.match(await evaluate("document.querySelector('[data-client-estimate]').innerText"), /0[\s\S]*staff hours/);
    await input('#client-value-form [name=volume]', '');
    assert.match(await evaluate("document.querySelector('[data-client-estimate]').innerText"), /Not calculated/);
    await click('[data-client-action="illustrate"]');
    await input('[data-client-period=baselinePeriod]', 'Illustrative baseline: 40 cases');
    await input('[data-client-period=pilotPeriod]', 'Illustrative pilot: 40 cases');
    await input('[data-client-metric=intake][data-client-observation=baseline]', 20);
    await input('[data-client-metric=intake][data-client-observation=pilot]', 8);
    await input('[data-client-metric=cover][data-client-observation=baseline]', 50);
    await input('[data-client-metric=cover][data-client-observation=pilot]', 80);
    assert.match(await evaluate("document.querySelector('[data-client-change=intake]').innerText"), /-12[\s\S]*Favourable/);
    assert.match(await evaluate("document.querySelector('[data-client-change=cover]').innerText"), /\+30[\s\S]*Favourable/);
    await capture('client-value-desktop');
    passed('Capacity assumptions and pilot scorecard', 'The calculator starts unknown, keeps blanks distinct from zero, labels examples, exposes additional effort, and compares effort and cover in their correct favourable directions.');

    await route('office/presentation/pilot');
    await wait("!!document.querySelector('.cp-proof-summary')");
    assert.match(await evaluate("document.querySelector('.cp-proof-summary').innerText"), /11 read receipts[\s\S]*3 visible shifts/);
    assert.match(await evaluate("document.querySelector('.cp-proof-summary').innerText"), /No saved run selected/);
    assert.match(await evaluate("document.querySelector('.cp-proof-summary').innerText"), /One follow-up checked[\s\S]*11221[\s\S]*Current completion is not polled/);
    await route('office/verification'); await wait("!!document.querySelector('[data-proof=run-mcp]') && !document.querySelector('[data-proof=run-mcp]').disabled");
    await click('[data-proof=run-mcp]'); await wait("!!document.querySelector('.proof-findings article') && !document.querySelector('[data-proof=run-mcp]').disabled");
    await route('office/presentation/pilot'); await wait("document.querySelector('.cp-proof-summary')?.innerText.includes('6 review signals')");
    await capture('client-pilot-proof-desktop');
    assert.equal(await evaluate(`JSON.stringify(localStorage).includes(${JSON.stringify(nativeCapture.data.shifts[0].id)})`), false);
    passed('Dated native evidence and matching check run', 'The presentation shows actual saved authenticated read counts and one independently checked trial task. Only the matching local check run contributes six review signals; native IDs are not stored in browser localStorage.');

    await route('office/presentation/value');
    await evaluate("(() => { const original=URL.createObjectURL.bind(URL); URL.createObjectURL=blob=>{window.__clientReportBlob=blob;return original(blob)}; const click=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this.download) window.__clientDownload=this.download; else click.call(this); }; })()");
    await click('[data-client-action="report"]');
    const report = await evaluate('window.__clientReportBlob.text()');
    assert.match(await evaluate('window.__clientDownload'), /^OCD_Client_Automation_Report_.*\.md$/);
    assert.match(report, /Illustrative example; not client measurements/);
    assert.match(report, /8 staff hours per month/);
    assert.match(report, /One approved administrative follow-up/);
    assert.match(report, /6 review signals/);
    for (const privateValue of [password, nativeCapture.data.shifts[0].id, nativeCapture.proof.readback.title, nativeCapture.proof.readback.description]) assert.equal(report.includes(privateValue), false);
    assert.match(report, /Cover accepted before deadline.*50.*80.*30/);
    await route('office/presentation/pilot'); await wait("!!document.querySelector('.cp-proof-summary')");
    await evaluate("window.__clientOriginalFetch=window.fetch;window.fetch=(url,options)=>url==='/api/integration-proof'?Promise.resolve(new Response(JSON.stringify({capture:null,runs:[]}))):window.__clientOriginalFetch(url,options)");
    await click('[data-client-action="refresh-proof"]'); await wait("!!document.querySelector('.cp-proof-empty')");
    await click('[data-client-action="report"]');
    assert.match(await evaluate('window.__clientReportBlob.text()'), /No authenticated account evidence/);
    assert.doesNotMatch(await evaluate('window.__clientReportBlob.text()'), /One approved administrative follow-up/);
    await evaluate('window.fetch=window.__clientOriginalFetch');
    passed('Markdown export and missing-evidence honesty', 'The report includes labelled assumptions, entered observations and dated proof, omits record contents and credentials, and withdraws native proof when account evidence is unavailable.');

    for (const section of ['overview', 'use-cases', 'walkthrough', 'value', 'pilot']) {
      await route(`office/presentation/${section}`);
      if (section === 'pilot') await wait("!!document.querySelector('.cp-proof-summary')");
      await capture(`client-${section}-mobile`, 390, 900);
    }
    await route('office/presentation/value'); await capture('client-scorecard-mobile', 390, 900, '.cp-score-wrap');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.cp-score tr')).display"), 'grid');
    assert.equal(await evaluate("document.querySelector('.cp-score-wrap').scrollWidth <= document.querySelector('.cp-score-wrap').clientWidth"), true);
    assert.deepEqual(errors, []);
    assert.equal(requests.some(r => r.host.includes('shiftcare') && !['GET', 'HEAD'].includes(r.method)), false);
    await route('office/overview');
    assert.equal(await evaluate("!!document.querySelector('.cp-launch')"), true);
    assert.equal(await evaluate("!!document.querySelector('.nav-link[href=\"#/office/presentation\"]')"), true);
    passed('Responsive presentation and runtime boundary', 'Every presentation section and the scorecard were checked at 390px without horizontal page overflow. The office launch link is present; no uncaught exception or native ShiftCare mutation occurred.');
  } else if (integrationProof) {
    await wait("!!document.querySelector('[data-proof=run-mcp]') && !document.querySelector('[data-proof=run-mcp]').disabled");
    const dashboard = await evaluate("document.querySelector('#integration-proof-dashboard').innerText");
    assert.ok(dashboard.includes(nativeCapture.account.id));
    assert.ok(dashboard.includes(nativeCapture.account.timeZone));
    assert.ok(dashboard.includes('Authenticated MCP capture'));
    assert.ok(dashboard.includes('does not hold the MCP login or poll ShiftCare'));
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
  await route('client/home');
  assert.equal(await evaluate("document.querySelector('[data-arrival-time]').textContent"), 'ETA unavailable');
  await capture('stale-arrival-home-mobile', 390, 900, '[data-arrival-preview]');
  await route('worker/map/BKG-501'); await click('[data-map-action="stop"]');
  assert.equal(await stored("s.journeys['BKG-501'].consent"), false);
  passed('Consent, privacy and stale arrival', 'Only Worker started a consented estimate. Client had no playback control/route request or other participant bookings; stale ETA was withdrawn on both the map and home card and sharing could stop. Mapbox network fallback was used.');

  await route('office/automation'); await capture('automation-mobile', 390, 900);
  await route(`office/automation/${participant}`); await capture('completed-case-mobile', 390, 900, '.automation-case-detail');
  await command('Page.reload', { ignoreCache: true }); await wait("!!document.querySelector('.sidebar')");
  assert.equal(await jobStatus(participant), 'completed');
  passed('Reload persistence and responsive layout', 'Browser case state and audit persisted after reload; captured desktop/mobile viewports had no horizontal overflow.');

  const sections = {
    office: ['overview', 'schedule', 'work', 'calendar', 'participants', 'staff', 'enquiries', 'calls', 'agreements', 'visits', 'fees', 'shiftcare', 'automation', 'finance'],
    worker: ['today', 'calendar', 'availability', 'review'],
    client: ['home', 'bookings', 'documents', 'intake']
  };
  for (const [area, pages] of Object.entries(sections)) {
    for (const page of pages) {
      await route(`${area}/${page}`);
      assert.ok((await evaluate("document.querySelector('#main-content h1')?.textContent || ''")).trim(), `${area}/${page}: expected heading`);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${area}/${page}: mobile overflow`);
    }
  }
  await route('office/overview'); await capture('office-home-mobile', 390, 900);
  await route('worker/today'); await capture('worker-visits-mobile', 390, 900);
  await route('client/home'); await capture('participant-home-mobile', 390, 900);
  await route('client/bookings'); await capture('participant-bookings-mobile', 390, 900);
  passed('Workspace navigation', 'Twenty-two office, worker and participant sections rendered headings without mobile page overflow; persona selectors remain explicitly a demo rather than separate user permissions.');

  await click('[data-action="sign-out"]'); await wait("!!document.querySelector('#staff-login')");
  await route('public/intake');
  await submit('[data-form="area-check"]', { postcode: '6999' });
  await wait("!!document.querySelector('.area-result.outside')");
  assert.equal(await evaluate("!!document.querySelector('[data-form=public-intake]')"), false);
  await submit('[data-form="area-check"]', { postcode: '6027' });
  await wait("!!document.querySelector('[data-form=public-intake]')");
  await capture('public-intake-mobile', 390, 900);
  await submit('[data-form="public-intake"]', { name: 'Browser review requester', email: 'browser.review@example.test', phone: '0400000000', suburb: 'Joondalup', service: 'Domestic assistance', preferredContact: 'Email', support: 'Fictional review request for office follow-up.', consent: true });
  await wait("document.querySelector('dialog[open]')?.innerText.includes('Your reference is')");
  await click('[data-action="close-modal"]');
  await command('Page.navigate', { url: origin + '/#/office/work' }); await wait("!!document.querySelector('#staff-login')");
  await submit('#staff-login', { email, password }); await wait("!!document.querySelector('#main-content')");
  assert.equal(await evaluate('location.hash'), '#/office/work');
  await wait("document.querySelector('#main-content').innerText.includes('Browser review requester')");
  await capture('server-intake-office-mobile', 390, 900);
  passed('Public intake to office handoff', 'An unauthenticated requester was gated by postcode, submitted consented fictional details to the isolated server, and appeared in the office queue after a fresh sign-in preserving its route. Capacity and the final ShiftCare handoff remain office decisions.');

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
  await fs.writeFile(path.join(output, 'browser-review.json'), JSON.stringify({ schemaVersion: 1, reviewDate, reviewedAt, status: success ? 'pass' : 'fail', sourceMode: clientPresentation ? 'Client presentation; fictional operational cases and dated authenticated trial capture; isolated local server' : integrationProof ? 'Authenticated MCP capture; isolated local review server' : 'fictional and isolated', checks, captures, uncaughtErrors: errors, visualReview: 'pending image inspection', mapbox: integrationProof || clientPresentation ? 'Not exercised in this review.' : liveMap ? 'Real Mapbox Standard browser rendering; fictional coordinates only, no device GPS.' : 'External calls blocked deliberately; fallback, privacy and ETA state verified.', productionLimit: clientPresentation ? 'Business benefits are expected or illustrative, not measured client outcomes. Native evidence is historical and separate from sample workflow operations. No new native write, live ingestion, delivery, background automation, real identities or device GPS certified.' : integrationProof ? 'Captured MCP reads and local rules are demonstrated. Website-owned OAuth, live REST credentials, hosted job storage and unattended native writes are not certified.' : 'No real mailbox/OCR, ShiftCare writes, background jobs, payroll release, secure worker/client identities or device GPS certified.' }, null, 2) + '\n');
  chrome.kill(); server.kill();
  for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(new Error('Browser review ended')); } pending.clear();
  await new Promise(resolve => setTimeout(resolve, 150)); await fs.rm(temp, { recursive: true, force: true });
}
