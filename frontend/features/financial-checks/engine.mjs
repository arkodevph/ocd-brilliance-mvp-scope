import { payrollPeriod, payrollSources, payrollDraftIssues } from '../payroll/engine.mjs';
import { inspectTravel } from '../travel-checker/engine.mjs';
const text = (v) => String(v || '').trim();
const stamp = () => new Date().toISOString();
const json = (v) => JSON.stringify(v);
const db = (s) => (s.financialChecks ||= { cases: {}, tracking: {}, history: [] });
const validDate = (v) => {
  try {
    payrollPeriod(v, v);
    return true;
  } catch {
    return false;
  }
};
const minutes = (a, b) => {
  const clock = (v) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '') ? +v.slice(0, 2) * 60 + +v.slice(3) : null;
  const start = clock(a),
    end = clock(b);
  return start !== null && end !== null && end > start ? end - start : null;
};
export function financialFindings(state, scope, invoices) {
  payrollPeriod(scope.from, scope.to);
  if (!validDate(scope.asOf)) throw new Error('Choose a valid follow-up date.');
  const findings = [],
    inPeriod = (d) => d >= scope.from && d <= scope.to;
  const prefix = `${scope.from}_${scope.to}`;
  function add(
    kind,
    id,
    area,
    title,
    subject,
    recorded,
    expected,
    href,
    token,
    explainable = false,
  ) {
    findings.push({
      id: `${prefix}-${kind}-${id}`,
      kind,
      entityId: id,
      area,
      title,
      subject,
      recorded,
      expected,
      href,
      token: json(token),
      explainable,
    });
  }
  const allInvoices = state.invoices || [];
  const bookings = state.bookings.filter((b) => b.status === 'Completed' && inPeriod(b.date));
  const selectedInvoices = allInvoices.filter((i) => i.from <= scope.to && i.to >= scope.from);
  const used = new Map();
  allInvoices.forEach((i) =>
    i.lines.forEach((l) => {
      if (!used.has(l.bookingId)) used.set(l.bookingId, []);
      used.get(l.bookingId).push({ invoice: i, line: l });
    }),
  );
  for (const b of bookings) {
    const person = state.participants.find((p) => p.id === b.participantId);
    const label = `${person?.name || b.participantId} · ${b.date} · ${b.id}`;
    const linked = used.get(b.id) || [];
    if (!linked.length)
      add(
        'uninvoiced',
        b.id,
        'Invoices',
        'Completed service has no invoice',
        label,
        `${b.service} · completed`,
        'One invoice line for this service',
        '#/office/invoices',
        b,
      );
    if (linked.length > 1)
      add(
        'duplicate',
        b.id,
        'Invoices',
        'Service appears more than once',
        label,
        linked.map((r) => r.invoice.id).join(', '),
        'One charge per service; reconcile duplicates',
        `#/office/invoices/${linked[0].invoice.id}`,
        linked,
      );
    const visits = state.visits.filter((v) => v.bookingId === b.id),
      v = visits[0];
    const actual = minutes(v?.clockIn, v?.clockOut),
      scheduled = minutes(b.start, b.end);
    const safeVisit = visits.map((r) => ({
      id: r.id,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      status: r.status,
      hasNote: !!r.note,
      tasks: r.tasks,
      goals: r.goals,
      corrections: r.corrections,
    }));
    const visitHref = v ? `#/office/visits/${v.id}` : `#/office/schedule/${b.id}`;
    if (visits.length !== 1 || actual === null || !v?.note || v?.status !== 'Reviewed')
      add(
        'attendance',
        b.id,
        'Invoices',
        'Visit evidence needs review',
        label,
        `${visits.length} visit record(s) · ${actual === null ? 'invalid or missing time' : `${actual} recorded min`} · ${v?.status || 'no review'} · ${v?.note ? 'note present' : 'note missing'}`,
        'One reviewed visit with valid actual times and a progress note',
        visitHref,
        [b, safeVisit],
      );
    if (
      actual !== null &&
      visits.length === 1 &&
      (actual !== scheduled ||
        linked.some((r) => Math.abs(Number(r.line.hours) * 60 - actual) > 0.61))
    )
      add(
        'time',
        b.id,
        'Invoices',
        'Attendance and billing time differ',
        label,
        `Actual ${actual} min; scheduled ${scheduled ?? 'unknown'} min; billed ${linked.map((r) => `${r.invoice.id}: ${(Number(r.line.hours) * 60).toFixed(1)} min`).join(', ') || 'not yet drafted'}`,
        'Check the explanation and agreed billable time; actual time is not automatically billable time',
        linked.length ? `#/office/invoices/${linked[0].invoice.id}` : visitHref,
        [b, safeVisit, linked],
        true,
      );
  }
  for (const i of selectedInvoices) {
    const issues = invoices.invoiceIssues(state, i).map((r) => `${r.type}: ${r.detail}`);
    if (!i.lines.length) issues.push('Invoice has no service lines.');
    if (
      i.lines.some(
        (l) =>
          !Number.isFinite(Number(l.hours)) ||
          Number(l.hours) <= 0 ||
          Number(l.hours) > 24 ||
          !Number.isFinite(Number(l.rate)) ||
          Number(l.rate) <= 0 ||
          Number(l.rate) > 10000,
      )
    )
      issues.push('Invalid billable hours or rate.');
    if (i.status !== 'Reviewed') issues.push('Invoice draft has not been marked reviewed.');
    if (issues.length)
      add(
        'invoice',
        i.id,
        'Invoices',
        'Invoice is not ready',
        i.id,
        issues.join('\n'),
        'Current billing agreement, matching service/category, valid amounts and reviewed draft',
        `#/office/invoices/${i.id}`,
        [i, state.participants.find((p) => p.id === i.participantId)?.billingProfile],
      );
  }
  const payrollRows = payrollSources(state, scope.from, scope.to);
  for (const r of payrollRows) {
    const drafts = (state.payroll?.drafts || []).filter((d) =>
      d.lines.some((l) => l.bookingId === r.booking.id),
    );
    const currentLine = drafts.some((d) =>
      d.lines.some((l) => l.bookingId === r.booking.id && l.id === r.approval?.id),
    );
    if (!r.current || !currentLine)
      add(
        'pay-source',
        r.booking.id,
        'Payroll',
        !r.current
          ? 'Payroll inputs need approval'
          : 'Approved visit is missing from a current draft',
        `${r.worker?.name || r.booking.workerId} · ${r.booking.date} · ${r.booking.id}`,
        r.issues.join(' ') ||
          (!r.current
            ? 'Actual payable time or mileage approval is missing or stale.'
            : `${r.approval.minutes} approved min · ${r.approval.actualKm} actual km`),
        'Current time and actual mileage approval included in a payroll draft',
        drafts.length ? `#/office/payroll/${drafts[0].id}` : '#/office/payroll',
        [r.token, r.approval, drafts.map((d) => [d.id, d.lines])],
      );
  }
  const drafts = (state.payroll?.drafts || []).filter(
    (d) => d.from <= scope.to && d.to >= scope.from,
  );
  for (const d of drafts) {
    const issues = payrollDraftIssues(state, d);
    if (d.status !== 'Reviewed') issues.push('Final payroll draft review is outstanding.');
    if (issues.length)
      add(
        'pay-draft',
        d.id,
        'Payroll',
        'Payroll draft is not ready',
        `${d.id} · ${d.from} – ${d.to}`,
        issues.join('\n'),
        'Current approved inputs, reconciled adjustments and final review',
        `#/office/payroll/${d.id}`,
        [d, issues],
      );
  }
  for (const r of inspectTravel(state)) {
    const b = state.bookings.find((b) => b.id === r.estimate.bookingId);
    if (b && inPeriod(b.date) && r.reasons.length)
      add(
        'travel',
        b.id,
        'Charges',
        'Saved route needs rechecking',
        `${b.id} · ${b.date}`,
        r.reasons.join('\n'),
        'Checked route evidence; estimates remain separate from actual mileage',
        '#/office/fees',
        r.token,
      );
  }
  for (const f of state.feeProposals || []) {
    const b = state.bookings.find((b) => b.id === f.bookingId);
    if (inPeriod(b?.date || f.created) && f.status !== 'Approved')
      add(
        'fee',
        f.id,
        'Charges',
        'Charge proposal awaits approval',
        `${f.id} · ${f.type}`,
        `${f.status} · ${f.amount} AUD proposed`,
        'Office approval of the charge and its evidence',
        '#/office/proposed-fees',
        f,
      );
  }
  for (const b of state.bookings.filter((b) => inPeriod(b.date) && b.status === 'Cancelled')) {
    const jobs =
      state.automation?.jobs?.filter((j) => j.targetId === b.id && j.kind === 'cancel') || [];
    if (
      !b.cancellation?.billingEvidence ||
      !b.cancellation?.travelEvidence ||
      jobs.some((j) => j.status !== 'completed')
    )
      add(
        'cancel',
        b.id,
        'Charges',
        'Cancellation review is incomplete',
        `${b.id} · ${b.date}`,
        `${b.cancellation?.billingEvidence ? 'Charge evidence recorded' : 'Charge evidence missing'}; ${b.cancellation?.travelEvidence ? 'travel evidence recorded' : 'travel evidence missing'}${jobs.some((j) => j.status !== 'completed') ? '; cancellation assistant remains open' : ''}`,
        'Checked charge/travel treatment and completed cancellation handoff',
        `#/office/schedule/${b.id}`,
        [b.cancellation, jobs.map((j) => [j.id, j.status])],
      );
  }
  for (const [id, t] of Object.entries(state.financialChecks?.tracking || {})) {
    if (t.status === 'Paid' || t.status === 'Closed') continue;
    const overdue = t.due < scope.asOf;
    if (t.status === 'Returned' || overdue || t.nextFollowup <= scope.asOf)
      add(
        'followup',
        id,
        'Follow-up',
        t.status === 'Returned'
          ? 'Invoice was returned'
          : overdue
            ? 'Invoice is overdue'
            : 'Follow-up is due',
        `${id} · external ${t.externalReference}`,
        `${t.status}; due ${t.due}; recipient ${t.recipient}; ${t.reason}; next follow-up ${t.nextFollowup}; evidence ${t.reference}`,
        'Verify recipient and payment outcome; record the next follow-up',
        `#/office/invoices/${id}`,
        t,
      );
  }
  return { findings, bookings, invoices: selectedInvoices, drafts };
}
export function runFinancialChecks(state, scope, invoices) {
  const result = financialFindings(state, scope, invoices),
    store = db(state),
    at = stamp();
  store.scope = { ...scope };
  const active = new Set();
  for (const f of result.findings) {
    active.add(f.id);
    let c = store.cases[f.id];
    if (!c)
      c = store.cases[f.id] = {
        ...f,
        scope: { ...scope },
        owner: '',
        note: '',
        history: [],
        status: 'Open',
        firstSeen: at,
      };
    const explained = f.explainable && c.explanation?.token === f.token;
    const status = explained ? 'Explained' : 'Open';
    if (c.token !== f.token || c.status !== status)
      c.history.push({
        at,
        event: `Rechecked: ${status}`,
        previousToken: c.token,
        previousStatus: c.status,
      });
    Object.assign(c, f, { status, lastChecked: at });
  }
  for (const c of Object.values(store.cases)) {
    if (
      c.scope.from === scope.from &&
      c.scope.to === scope.to &&
      !active.has(c.id) &&
      c.status !== 'Resolved'
    ) {
      c.history.push({ at, event: 'Resolved by source recheck', previousStatus: c.status });
      c.status = 'Resolved';
      c.lastChecked = at;
    }
  }
  const cases = Object.values(store.cases).filter(
    (c) => c.scope.from === scope.from && c.scope.to === scope.to,
  );
  const open = cases.filter((c) => c.status === 'Open');
  const blockedInvoices = new Set(
    open
      .filter((c) => ['Invoices', 'Charges'].includes(c.area))
      .flatMap((c) =>
        c.kind === 'invoice'
          ? [c.entityId]
          : (state.invoices || [])
              .filter((i) =>
                i.lines.some(
                  (l) =>
                    l.bookingId ===
                    (c.kind === 'fee'
                      ? state.feeProposals.find((f) => f.id === c.entityId)?.bookingId
                      : c.entityId),
                ),
              )
              .map((i) => i.id),
      ),
  );
  return {
    ...result,
    cases,
    open,
    invoiceReady: result.invoices.filter((i) => !blockedInvoices.has(i.id)).length,
    payrollReady: result.drafts.filter(
      (d) => !open.some((c) => c.kind === 'pay-draft' && c.subject.startsWith(`${d.id} ·`)),
    ).length,
  };
}
export function updateFinancialCase(state, input, invoices) {
  const store = db(state),
    c = store.cases[input.id];
  if (!c) throw new Error('Check not found. Reopen Financial checks.');
  const scope = store.scope;
  runFinancialChecks(state, scope, invoices);
  if (c.token !== input.token || c.status === 'Resolved')
    throw new Error('Source records changed. Reopen this check before saving.');
  if (!text(input.owner) || !text(input.note))
    throw new Error('Record an owner and next action or explanation.');
  if (input.explain && (!c.explainable || input.checked !== true || !text(input.reference)))
    throw new Error(
      'Only time differences can be explained; record evidence and confirm the billing treatment.',
    );
  c.owner = text(input.owner);
  c.note = text(input.note);
  c.history.push({
    at: stamp(),
    event: input.explain ? 'Time difference explained' : 'Follow-up updated',
    by: text(input.by) || 'Office',
    owner: c.owner,
    note: c.note,
    reference: text(input.reference),
  });
  if (input.explain)
    c.explanation = {
      token: c.token,
      reference: text(input.reference),
      by: text(input.by) || 'Office',
      at: stamp(),
    };
  return runFinancialChecks(state, scope, invoices);
}
export function trackFinancialInvoice(state, input) {
  const invoice = (state.invoices || []).find((i) => i.id === input.invoiceId);
  if (!invoice) throw new Error('Choose an existing invoice.');
  const previous = db(state).tracking[invoice.id];
  if ((previous ? json(previous) : '') !== input.token)
    throw new Error('Tracking changed. Reopen the form before saving.');
  if (
    !['Issued', 'Returned', 'Paid', 'Closed'].includes(input.status) ||
    !validDate(input.due) ||
    !validDate(input.nextFollowup)
  )
    throw new Error('Choose a valid status, due date and next follow-up date.');
  if (
    !text(input.externalReference) ||
    !text(input.recipient) ||
    !text(input.reference) ||
    !text(input.reason) ||
    input.checked !== true
  )
    throw new Error('Record the external invoice, recipient, evidence, outcome and verification.');
  const record = {
    status: input.status,
    due: input.due,
    nextFollowup: input.nextFollowup,
    externalReference: text(input.externalReference),
    recipient: text(input.recipient),
    reason: text(input.reason),
    reference: text(input.reference),
    by: text(input.by) || 'Office',
    at: stamp(),
  };
  db(state).history.push({
    invoiceId: invoice.id,
    previous: previous ? structuredClone(previous) : null,
    record: structuredClone(record),
  });
  state.financialChecks.tracking[invoice.id] = record;
  return record;
}
