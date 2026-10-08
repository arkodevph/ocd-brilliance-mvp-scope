/* Read-only verification runs over captured MCP records or bounded REST reads. */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createShiftCareClient, ShiftCareError, shiftWindow } = require('./shiftcare.cjs');

const text = v => typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 400) : '';
const id = v => /^\d+$/.test(text(v)) ? text(v) : '';
const bool = v => typeof v === 'boolean' ? v : null;
const instant = v => v && Number.isFinite(Date.parse(v)) ? text(v) : null;
const evidenceLimit = 200;
const receiptDataKeys = { list_clients: 'participants', list_staff: 'staff', list_shifts: 'shifts', list_progress_notes: 'notes', list_timesheets: 'timesheets', list_staff_files: 'documents', list_staff_qualifications: 'qualifications' };
function nativeUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && ['app.shiftcare.com', 'app.ca.shiftcare.com', 'app.us.shiftcare.com', 'app.uk.shiftcare.com'].includes(u.hostname) && !u.username && !u.password ? u.origin + u.pathname : ''; } catch { return ''; }
}
function person(p) { return { id: id(p.id), label: text(p.label) || `Record ${id(p.id)}`, role: text(p.role), url: nativeUrl(p.url) }; }
function sanitizeCapture(raw) {
  if (raw?.version !== 1 || !['mcp', 'fixture', 'rest'].includes(raw.source?.method) || !id(raw.account?.id) || !instant(raw.capturedAt)) throw new ShiftCareError(503, 'INVALID_EVIDENCE', 'The captured evidence needs to be refreshed.');
  try { new Intl.DateTimeFormat('en', { timeZone: raw.account.timeZone }).format(); } catch { throw new ShiftCareError(503, 'INVALID_EVIDENCE', 'The captured account time zone is invalid.'); }
  const list = key => Array.isArray(raw.data?.[key]) ? raw.data[key].slice(0, evidenceLimit) : [];
  const gaps = Array.isArray(raw.gaps) ? raw.gaps.map(text) : [];
  const receipts = (Array.isArray(raw.receipts) ? raw.receipts : []).slice(0, 40).map(r => {
    const key = receiptDataKeys[r.tool], retainedCount = key ? list(key).length : null;
    const count = Number.isSafeInteger(r.count) && r.count >= 0 ? r.count : null;
    const total = Number.isSafeInteger(r.total) && r.total >= 0 ? r.total : null;
    const complete = r.complete === true && (!key || Array.isArray(raw.data?.[key]) && count === retainedCount && (total === null || total === retainedCount));
    if (key && raw.data?.[key]?.length > evidenceLimit) gaps.push(`${r.tool}: only the first ${evidenceLimit} records are retained; the source is partial.`);
    else if (key && r.complete === true && !complete) gaps.push(`${r.tool}: retained records do not match the complete read receipt; refresh the source before concluding that records are missing.`);
    return { tool: text(r.tool), startedAt: instant(r.startedAt), finishedAt: instant(r.finishedAt), status: ['passed', 'failed', 'unsupported'].includes(r.status) ? r.status : 'unknown', count, total, retainedCount, pages: Number.isSafeInteger(r.pages) ? r.pages : null, complete, scope: text(r.scope) };
  });
  const capture = {
    version: 1, capturedAt: raw.capturedAt,
    source: { method: raw.source.method, authenticated: raw.source.authenticated === true, note: text(raw.source.note) },
    account: { id: id(raw.account.id), name: text(raw.account.name), timeZone: text(raw.account.timeZone), role: text(raw.account.role), mcpAvailable: bool(raw.account.mcpAvailable), writesEnabled: bool(raw.account.writesEnabled) },
    range: { from: text(raw.range?.from), to: text(raw.range?.to) },
    receipts,
    data: {
      participants: list('participants').map(person), staff: list('staff').map(person),
      shifts: list('shifts').map(s => ({ id: id(s.id), startAt: instant(s.startAt), endAt: instant(s.endAt), pending: bool(s.pending), published: bool(s.published), approved: bool(s.approved), cancelledAt: instant(s.cancelledAt), clients: Array.isArray(s.clients) ? s.clients.map(person) : null, staff: Array.isArray(s.staff) ? s.staff.map(w => ({ ...person(w), assignmentId: id(w.assignmentId), clockIn: instant(w.clockIn), clockOut: instant(w.clockOut), verificationStatus: text(w.verificationStatus) })) : null, url: nativeUrl(s.url) })),
      notes: list('notes').map(n => ({ id: id(n.id), shiftId: id(n.shiftId), category: text(n.category), createdAt: instant(n.createdAt) })),
      timesheets: list('timesheets').map(t => ({ shiftId: id(t.shiftId), staffId: id(t.staffId), date: instant(t.date), itemCount: Number.isSafeInteger(t.itemCount) ? t.itemCount : null })),
      documents: list('documents').map(d => ({ id: id(d.id), staffId: id(d.staffId), expires: text(d.expires), noExpiration: bool(d.noExpiration) })),
      qualifications: list('qualifications').map(q => ({ id: id(q.id), staffId: id(q.staffId), expires: text(q.expires) }))
    },
    gaps: [...new Set(gaps)].slice(0, 30),
    proof: { status: 'not_run', proposal: null, createdId: '', readback: null, events: [] }
  };
  const proposal = raw.proof?.proposal;
  if (proposal?.tool === 'create_action_item' && id(proposal.args?.assignee_id)) capture.proof.proposal = { tool: proposal.tool, args: { assignee_id: Number(proposal.args.assignee_id), title: text(proposal.args.title), description: String(proposal.args.description || '').slice(0, 2500), due_date: text(proposal.args.due_date), priority: text(proposal.args.priority), verification_method: text(proposal.args.verification_method) } };
  if (capture.proof.proposal) capture.proof.status = 'awaiting_approval';
  // A green write result requires independently matching native read-back fields.
  const rb = raw.proof?.readback, expected = capture.proof.proposal?.args;
  if (raw.proof?.status === 'verified' && raw.source.method !== 'fixture' && raw.source.authenticated === true && rb?.tool === 'get_action_item' && expected && id(raw.proof.createdId) && id(rb?.id) === id(raw.proof.createdId) && rb.title === expected.title && id(rb.assigneeId) === id(expected.assignee_id) && rb.description === expected.description && rb.dueDate === expected.due_date && rb.verificationMethod === expected.verification_method && rb.priority === expected.priority && instant(rb.verifiedAt)) {
    capture.proof.status = 'verified';
    capture.proof.createdId = id(raw.proof.createdId);
    capture.proof.readback = { tool: 'get_action_item', id: id(rb.id), title: text(rb.title), assigneeId: id(rb.assigneeId), description: expected.description, dueDate: text(rb.dueDate), verificationMethod: text(rb.verificationMethod), priority: text(rb.priority), status: text(rb.status), verifiedAt: instant(rb.verifiedAt), url: nativeUrl(rb.url) };
    capture.proof.events = (raw.proof.events || []).slice(0, 12).map(e => ({ at: instant(e.at), title: text(e.title), tool: text(e.tool) }));
  } else if (['outcome_unknown', 'failed', 'awaiting_readback'].includes(raw.proof?.status)) capture.proof.status = raw.proof.status;
  return capture;
}
function analyse(capture) {
  const c = sanitizeCapture(capture), findings = [];
  const add = (s, code, title, detail, owner = 'Office') => findings.push({ id: `${c.account.id}:${s.id}:${code}`, shiftId: s.id, code, title, detail, owner, url: s.url });
  const notesRead = c.receipts.find(r => r.tool === 'list_progress_notes' && r.status === 'passed' && r.complete);
  for (const s of c.data.shifts) {
    if (s.cancelledAt) continue;
    const past = s.endAt && Date.parse(s.endAt) < Date.parse(c.capturedAt);
    if (s.staff === null) add(s, 'UNKNOWN_STAFF', 'Assignment data unavailable', 'Read the complete native assignments before deciding whether this service needs cover.');
    else if (!s.staff.length) add(s, 'UNSTAFFED', past ? 'Past occurrence has no assigned staff' : 'No staff assigned', past ? 'Verify what happened in ShiftCare before making a roster or billing decision.' : 'Office checks availability and native worker acceptance before arranging cover.');
    if (s.clients === null || !s.clients.length) add(s, 'CLIENT_CONTEXT', 'Participant context needs review', s.clients === null ? 'Participant data was not returned.' : 'No participant is assigned to this occurrence; confirm whether this is an intentional admin/demo shift.');
    if (past) for (const w of s.staff || []) {
      if (!w.clockIn || !w.clockOut || Date.parse(w.clockOut) < Date.parse(w.clockIn)) add(s, `ATTENDANCE_${w.id}`, 'Actual attendance needs checking', `Staff ${w.id}, assignment ${w.assignmentId || 'unknown'}: valid clock-in/out was not returned. Timesheet items do not establish actual delivered hours.`, 'Bookkeeper');
      else if (s.startAt && s.endAt && Date.parse(s.endAt) - Date.parse(s.startAt) !== Date.parse(w.clockOut) - Date.parse(w.clockIn)) add(s, `DURATION_${w.id}`, 'Scheduled and recorded durations differ', 'Review the original attendance and explanation; no rounding or pay rule was applied.', 'Bookkeeper');
    }
    if (past && notesRead && !c.data.notes.some(n => n.shiftId === s.id)) add(s, 'NOTE_SCOPE', 'No recent visible note matched', 'No permitted note in the captured creation window matched this shift. Older or restricted notes may exist; check natively.');
  }
  const sourceHash = crypto.createHash('sha256').update(JSON.stringify({ account: c.account.id, timeZone: c.account.timeZone, capturedAt: c.capturedAt, source: c.source, range: c.range, data: c.data, receipts: c.receipts })).digest('hex');
  return { sourceHash, account: c.account, source: c.source, capturedAt: c.capturedAt, range: c.range, complete: c.receipts.some(r => r.tool === 'list_shifts' && r.status === 'passed' && r.complete), findings, metrics: { participants: c.data.participants.length, staff: c.data.staff.length, shifts: c.data.shifts.length, notes: c.data.notes.length, timesheets: c.data.timesheets.length, unstaffed: findings.filter(f => f.code === 'UNSTAFFED').length }, gaps: c.gaps };
}
function proofSteps(capture, at) {
  const proof = capture.proof, verified = proof.status === 'verified';
  return [
    { title: 'Review native follow-up proposal', state: verified ? 'passed' : proof.proposal ? 'awaiting_approval' : 'not_run', at: verified ? proof.events.find(e => e.tool === 'create_action_item')?.at || proof.readback.verifiedAt : at },
    { title: 'Native write and independent read-back', state: verified ? 'passed' : ['outcome_unknown', 'failed', 'awaiting_readback'].includes(proof.status) ? proof.status : 'not_run', at: verified ? proof.readback.verifiedAt : at }
  ];
}
function withCurrentProof(run, capture) { return { ...run, steps: [...run.steps.slice(0, 3), ...proofSteps(capture, run.at)] }; }
function createProofStore({ env = process.env, fetchImpl = fetch } = {}) {
  const directory = env.WORKFLOW_DATA_DIR || path.join(__dirname, '..', '.local');
  const captureFile = path.join(directory, 'shiftcare-evidence.json'), runsFile = path.join(directory, 'integration-runs.json');
  const restFile = path.join(directory, 'shiftcare-rest-evidence.json'), selectionFile = path.join(directory, 'integration-selection.json');
  let queue = Promise.resolve();
  async function read(file, fallback) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } }
  const accountMatches = capture => !env.SHIFTCARE_ACCOUNT_ID || capture.account.id === env.SHIFTCARE_ACCOUNT_ID.trim();
  function checkAccount(capture) {
    if (capture && !accountMatches(capture)) throw new ShiftCareError(409, 'ACCOUNT_MISMATCH', 'The captured account does not match the configured website account.');
  }
  async function status() {
    const [rawMcp, rawRest, selection, runs] = await Promise.all([read(captureFile, null), read(restFile, null), read(selectionFile, null), read(runsFile, [])]);
    const mcp = rawMcp ? sanitizeCapture(rawMcp) : null;
    const raw = selection?.source === 'rest' && rawRest ? rawRest : rawMcp, capture = raw ? sanitizeCapture(raw) : null;
    checkAccount(capture);
    const captureHash = capture ? analyse(capture).sourceHash : null;
    const config = createShiftCareClient({ env, fetchImpl }).configuration;
    const visibleRuns = runs.filter(r => !env.SHIFTCARE_ACCOUNT_ID || r.account?.id === env.SHIFTCARE_ACCOUNT_ID.trim()).slice(-10).reverse().map(r => r.sourceHash === captureHash ? withCurrentProof(r, capture) : r);
    return { capture, captureHash, mcpCaptureAvailable: !!mcp && accountMatches(mcp) && mcp.source.method === 'mcp' && mcp.source.authenticated, runs: visibleRuns, rest: config, serverStorage: !env.VERCEL, writeAdapter: false };
  }
  async function restCapture(from, to) {
    const client = createShiftCareClient({ env, fetchImpl }), receipts = [], data = { participants: [], staff: [], shifts: [], notes: [], timesheets: [], documents: [], qualifications: [] };
    if (!client.configuration.configured) throw new ShiftCareError(503, 'NOT_CONFIGURED', client.configuration.error || 'The ShiftCare connection is awaiting account credentials.');
    // Reject unbounded/invalid review dates before any profile requests are made.
    shiftWindow(from, to, client.configuration.timeZone);
    for (const resource of ['clients', 'staff', 'shifts']) {
      let rows = [], total = null, hasNext = true, page = 1, startedAt = new Date().toISOString();
      while (hasNext && page <= 5) {
        const result = await client.list(resource, { from, to, page, per_page: 20 });
        rows.push(...result.records); total = result.pagination.total; hasNext = result.pagination.hasNext; page++;
      }
      receipts.push({ tool: `list_${resource}`, startedAt, finishedAt: new Date().toISOString(), status: 'passed', count: rows.length, total, pages: page - 1, complete: !hasNext, scope: resource === 'shifts' ? `${from} to ${to}; scheduled assignment fields only` : 'Permission-scoped profiles; five-page cap' });
      if (resource === 'shifts') data.shifts = rows.map(s => ({ ...s, clients: s.clients?.map(p => ({ id: p.id, label: `Participant ${p.id}` })) ?? null, staff: s.staff?.map(p => ({ id: p.id, label: `Staff ${p.id}` })) ?? null }));
      else data[resource === 'clients' ? 'participants' : 'staff'] = rows.map(p => ({ id: p.id, label: `${resource === 'clients' ? 'Participant' : 'Staff'} ${p.id}` }));
    }
    return sanitizeCapture({ version: 1, source: { method: 'rest', authenticated: true, note: 'Fresh website REST reads, using server credentials.' }, capturedAt: new Date().toISOString(), account: { id: client.configuration.accountId, name: 'Configured REST account', timeZone: client.configuration.timeZone, role: 'office', writesEnabled: null, mcpAvailable: null }, range: { from, to }, receipts, data, gaps: ['This REST projection contains scheduled people/times only. Native cancellation/publication state, actual attendance, notes, qualifications, leave and financial treatment were not checked.', 'No website write adapter is enabled.'], proof: { status: 'not_run' } });
  }
  async function run({ source, from, to }) {
    if (env.VERCEL) throw new ShiftCareError(503, 'PERSISTENCE_REQUIRED', 'This evidence dashboard needs configured shared job storage before hosted runs can be saved.');
    if (!['mcp', 'rest'].includes(source)) throw new ShiftCareError(422, 'INVALID_SOURCE', 'Select captured MCP evidence or a live REST read.');
    const raw = source === 'mcp' ? await read(captureFile, null) : null;
    const capture = source === 'rest' ? await restCapture(from, to) : raw ? sanitizeCapture(raw) : null;
    if (!capture) throw new ShiftCareError(503, 'NO_CAPTURE', 'No MCP capture is available. Ask the connected assistant to collect a fresh bounded read.');
    checkAccount(capture);
    if (source === 'mcp' && (capture.source.method !== 'mcp' || !capture.source.authenticated)) throw new ShiftCareError(503, 'UNAUTHENTICATED_EVIDENCE', 'An authenticated MCP read is required. Fixture or unverified captures cannot demonstrate the native connection.');
    const report = analyse(capture);
    const execute = queue.then(async () => {
      const runs = await read(runsFile, []), existing = runs.find(r => r.sourceHash === report.sourceHash);
      if (existing) {
        // Refresh both success and invalidation from the independently checked evidence.
        const updated = withCurrentProof(existing, capture);
        runs[runs.indexOf(existing)] = updated;
        await saveRuns(runs); await saveSelection(source, capture);
        return { capture, run: updated, reused: true };
      }
      const at = new Date().toISOString();
      const run = { id: `VERIFY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, at, ...report, steps: [{ title: source === 'rest' ? 'Read ShiftCare REST records' : 'Load authenticated MCP capture', state: 'passed', at }, { title: 'Check scope, account and source IDs', state: report.complete ? 'passed' : 'partial', at }, { title: 'Prepare owned exceptions', state: 'passed', at }, ...proofSteps(capture, at)] };
      runs.push(run); await saveRuns(runs); await saveSelection(source, capture);
      return { capture, run, reused: false };
    });
    queue = execute.catch(() => {}); return execute;
  }
  async function saveJson(file, value) {
    await fs.mkdir(directory, { recursive: true });
    const temporary = `${file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
    await fs.rename(temporary, file);
  }
  async function saveRuns(runs) { await saveJson(runsFile, runs.slice(-30)); }
  async function saveSelection(source, capture) {
    if (source === 'rest') await saveJson(restFile, capture);
    await saveJson(selectionFile, { source });
  }
  return { status, run };
}
module.exports = { sanitizeCapture, analyse, createProofStore, nativeUrl };
