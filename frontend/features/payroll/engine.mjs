const key = (value) => JSON.stringify(value);
const copy = (value) => structuredClone(value);
const text = (value) => String(value || '').trim();
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const now = () => new Date().toISOString();
const date = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const clock = (value) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const storage = (state) => (state.payroll ||= { approvals: [], drafts: [] });
const next = (prefix, rows) =>
  `${prefix}-${Math.max(0, ...rows.map((r) => Number(r.id.split('-').pop()) || 0)) + 1}`;
export function payrollPeriod(from, to) {
  if (!date(from) || !date(to) || from > to)
    throw new Error('Choose a valid pay period with the end on or after its start.');
  return { from, to };
}
function source(state, b) {
  const visits = state.visits.filter((v) => v.bookingId === b.id);
  const v = visits[0];
  const p = state.participants.find((p) => p.id === b.participantId);
  const w = state.workers.find((w) => w.id === b.workerId);
  const start = clock(v?.clockIn),
    end = clock(v?.clockOut);
  const issues = [];
  if (visits.length !== 1)
    issues.push(
      visits.length ? 'Multiple visit records need reconciliation.' : 'Visit record missing.',
    );
  if (!w) issues.push('Assigned worker is unavailable.');
  if (start === null || end === null || end <= start)
    issues.push(
      'Valid same-day clock-in and clock-out are required. Overnight visits need a checked correction.',
    );
  if (v?.status !== 'Reviewed') issues.push('Office visit review is required.');
  const snapshot = {
    booking: {
      id: b.id,
      workerId: b.workerId,
      participantId: b.participantId,
      date: b.date,
      status: b.status,
      start: b.start,
      end: b.end,
      service: b.service,
    },
    visit: visits.map((v) => ({
      id: v.id,
      clockIn: v.clockIn,
      clockOut: v.clockOut,
      status: v.status,
      corrections: v.corrections || [],
    })),
    address: p?.address || '',
    location: p?.location || null,
    dispatch: w?.dispatchLocation || null,
  };
  const token = key(snapshot);
  const approval = [...(state.payroll?.approvals || [])]
    .reverse()
    .find((a) => a.bookingId === b.id);
  const current = !!approval && approval.sourceToken === token && !issues.length;
  return {
    booking: b,
    worker: w,
    visit: v,
    token,
    issues,
    elapsedMinutes: start !== null && end !== null && end > start ? end - start : null,
    approval,
    current,
  };
}
export function payrollSources(state, from, to) {
  payrollPeriod(from, to);
  return state.bookings
    .filter((b) => b.status === 'Completed' && b.date >= from && b.date <= to)
    .map((b) => source(state, b));
}
export function approvePayrollSource(state, input) {
  const b = state.bookings.find((b) => b.id === input.bookingId);
  if (!b || b.status !== 'Completed')
    throw new Error('Only a completed visit can be approved for this payroll draft.');
  const row = source(state, b);
  if (row.token !== input.token)
    throw new Error(
      'The visit or assignment changed. Reopen the approval and check current evidence.',
    );
  if (row.issues.length) throw new Error(row.issues.join(' '));
  if (
    !Number.isInteger(input.breakMinutes) ||
    input.breakMinutes < 0 ||
    input.breakMinutes >= row.elapsedMinutes
  )
    throw new Error(
      'Enter unpaid break minutes below the recorded visit duration, including zero when none.',
    );
  if (!finite(input.actualKm) || input.actualKm < 0 || input.actualKm > 100000)
    throw new Error(
      'Enter valid verified actual kilometres, including zero if no mileage is claimed.',
    );
  if (
    !text(input.hoursReference) ||
    !text(input.mileageReference) ||
    !text(input.note) ||
    input.checked !== true
  )
    throw new Error('Record the time source, mileage evidence, approval note and confirmation.');
  const a = {
    id: next('PAYAPP', storage(state).approvals),
    bookingId: b.id,
    workerId: b.workerId,
    date: b.date,
    minutes: row.elapsedMinutes - input.breakMinutes,
    breakMinutes: input.breakMinutes,
    actualKm: Math.round(input.actualKm * 100) / 100,
    hoursReference: text(input.hoursReference),
    mileageReference: text(input.mileageReference),
    note: text(input.note),
    by: text(input.by) || 'Office',
    at: now(),
    sourceToken: row.token,
  };
  state.payroll.approvals.push(a);
  return a;
}
function collect(state, from, to) {
  const rows = payrollSources(state, from, to);
  return {
    rows,
    lines: rows
      .filter((r) => r.current)
      .map((r) => ({ ...copy(r.approval), workerName: r.worker.name, visitId: r.visit.id })),
    issues: rows
      .filter((r) => !r.current)
      .map((r) => ({
        bookingId: r.booking.id,
        workerId: r.booking.workerId,
        visitId: r.visit?.id,
        detail:
          r.issues.join(' ') ||
          (r.approval
            ? 'Payroll approval is out of date. Check time and mileage again.'
            : 'Payable time and actual mileage need approval.'),
      })),
  };
}
export function preparePayroll(state, from, to) {
  const result = collect(state, from, to),
    db = storage(state);
  let draft = db.drafts.find((d) => d.from === from && d.to === to);
  if (!draft) {
    draft = {
      id: next('PAY', db.drafts),
      from,
      to,
      adjustments: [],
      history: [],
      status: 'Draft',
      createdAt: now(),
    };
    db.drafts.push(draft);
  }
  if (draft.lines)
    draft.history.push({
      at: now(),
      event: 'Draft refreshed',
      lines: copy(draft.lines),
      issues: copy(draft.issues),
      review: copy(draft.review || null),
    });
  draft.lines = result.lines;
  draft.issues = result.issues;
  draft.status = 'Draft';
  delete draft.review;
  draft.updatedAt = now();
  return draft;
}
export function payrollDraft(state, id) {
  const draft = state.payroll?.drafts.find((d) => d.id === id);
  if (!draft) throw new Error('Payroll draft not found.');
  return draft;
}
export function payrollDraftIssues(state, draft) {
  const current = collect(state, draft.from, draft.to);
  const issues = current.issues.map((i) => `${i.bookingId}: ${i.detail}`);
  if (key(current.lines) !== key(draft.lines) || key(current.issues) !== key(draft.issues))
    issues.push('Source records or approvals changed. Refresh this draft before review or export.');
  if (!draft.lines.length && !draft.adjustments.length)
    issues.push('No approved entries in this draft.');
  for (const a of draft.adjustments)
    if (!state.workers.some((w) => w.id === a.workerId))
      issues.push(`Adjustment ${a.id}: worker record is unavailable.`);
  const ids = new Set(draft.lines.map((l) => l.bookingId));
  if (
    state.payroll?.drafts.some(
      (d) =>
        d.id !== draft.id && d.status === 'Reviewed' && d.lines.some((l) => ids.has(l.bookingId)),
    )
  )
    issues.push(
      'A visit is already included in another reviewed payroll draft. Resolve overlapping periods.',
    );
  return [...new Set(issues)];
}
export function addPayrollAdjustment(state, id, input) {
  const draft = payrollDraft(state, id);
  if (draft.status === 'Reviewed')
    throw new Error('Refresh the draft to reopen it before adding adjustments.');
  if (
    !state.workers.some((w) => w.id === input.workerId) ||
    !date(input.date) ||
    input.date < draft.from ||
    input.date > draft.to
  )
    throw new Error('Choose a current worker and a date within this pay period.');
  if (
    !['hours', 'mileage', 'amount'].includes(input.kind) ||
    !finite(input.value) ||
    input.value === 0 ||
    Math.abs(input.value) > 1000000
  )
    throw new Error('Choose hours, kilometres or AUD and enter a non-zero adjustment.');
  if (!text(input.reference) || !text(input.reason) || input.checked !== true)
    throw new Error('Record the adjustment reference, reason and approval.');
  const a = {
    id: next('ADJ', draft.adjustments),
    workerId: input.workerId,
    date: input.date,
    kind: input.kind,
    value: Math.round(input.value * 100) / 100,
    reference: text(input.reference),
    reason: text(input.reason),
    by: text(input.by) || 'Office',
    at: now(),
  };
  if (a.value === 0) throw new Error('Adjustment must be at least 0.01 in its selected unit.');
  draft.adjustments.push(a);
  draft.updatedAt = now();
  return a;
}
export function removePayrollAdjustment(state, id, adjustmentId) {
  const draft = payrollDraft(state, id);
  if (draft.status === 'Reviewed')
    throw new Error('Refresh the draft before removing an adjustment.');
  const a = draft.adjustments.find((a) => a.id === adjustmentId);
  if (!a) throw new Error('Adjustment not found.');
  draft.history.push({ at: now(), event: 'Adjustment removed', adjustment: copy(a) });
  draft.adjustments = draft.adjustments.filter((a) => a.id !== adjustmentId);
}
export function payrollTotals(draft) {
  const workers = new Map();
  function row(id, name) {
    if (!workers.has(id))
      workers.set(id, { workerId: id, name: name || id, minutes: 0, km: 0, amount: 0 });
    return workers.get(id);
  }
  draft.lines.forEach((l) => {
    const r = row(l.workerId, l.workerName);
    r.minutes += l.minutes;
    r.km += l.actualKm;
  });
  draft.adjustments.forEach((a) => {
    const r = row(a.workerId);
    if (a.kind === 'hours') r.minutes += Math.round(a.value * 60);
    if (a.kind === 'mileage') r.km += a.value;
    if (a.kind === 'amount') r.amount += Math.round(a.value * 100);
  });
  return [...workers.values()].map((r) => ({
    ...r,
    hours: Math.round((r.minutes / 60) * 100) / 100,
    km: Math.round(r.km * 100) / 100,
    amount: r.amount / 100,
  }));
}
export function reviewPayrollDraft(state, id, input) {
  const draft = payrollDraft(state, id),
    issues = payrollDraftIssues(state, draft);
  if (issues.length) throw new Error(issues.join(' '));
  if (input.checked !== true || !text(input.note))
    throw new Error('Confirm the payroll evidence and record a final review note.');
  draft.status = 'Reviewed';
  draft.review = { by: text(input.by) || 'Office', note: text(input.note), at: now() };
  draft.updatedAt = now();
  return draft;
}
const spreadsheetCell = (value) =>
  typeof value === 'string' && /^[=+@\-\t\r]/.test(value) && !/^-?\d+(\.\d+)?$/.test(value)
    ? `'${value}`
    : value;
export function payrollExport(state, id) {
  const draft = payrollDraft(state, id),
    issues = payrollDraftIssues(state, draft);
  if (draft.status !== 'Reviewed' || issues.length)
    throw new Error('Only a reviewed, current draft without exceptions can be exported.');
  return draft.lines
    .map((l) => [
      draft.id,
      draft.from,
      draft.to,
      l.workerId,
      l.workerName,
      l.date,
      l.bookingId,
      'Visit',
      (l.minutes / 60).toFixed(2),
      l.actualKm.toFixed(2),
      '',
      l.hoursReference,
      l.mileageReference,
      l.note,
      l.by,
      l.at,
    ])
    .concat(
      draft.adjustments.map((a) => [
        draft.id,
        draft.from,
        draft.to,
        a.workerId,
        state.workers.find((w) => w.id === a.workerId)?.name || a.workerId,
        a.date,
        a.id,
        'Adjustment',
        a.kind === 'hours' ? a.value.toFixed(2) : '',
        a.kind === 'mileage' ? a.value.toFixed(2) : '',
        a.kind === 'amount' ? a.value.toFixed(2) : '',
        a.reference,
        '',
        a.reason,
        a.by,
        a.at,
      ]),
    )
    .map((row) => row.map(spreadsheetCell));
}
