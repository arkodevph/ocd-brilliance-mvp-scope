import { WORKFLOWS, type ModuleId, type WorkflowDefinition } from './catalogue';
import { scenarioFor } from './scenarios';

export const STORAGE_KEY = 'ocd-comprehensive-prototype-v1';
export const BRANCHES = ['Perth North · sample', 'Perth South · sample'];
export const OWNERS = [
  'Mia Roberts · Intake',
  'HR / admin',
  'Roster team',
  'Bookkeeper',
  'Care supervisor',
  'Office team',
];
export const REPLY_RESPONSES = [
  'Confirmed',
  'Change requested',
  'Cancellation requested',
  'Unclear reply',
  'No response',
];
export type CaseStatus =
  | 'needs-review'
  | 'needs-info'
  | 'approved'
  | 'awaiting-verification'
  | 'uncertain'
  | 'blocked'
  | 'follow-up'
  | 'completed';
export const STATUS: Record<CaseStatus, { label: string; tone: string }> = {
  'needs-review': { label: 'Needs review', tone: 'blue' },
  'needs-info': { label: 'Needs information', tone: 'amber' },
  approved: { label: 'Approved for demo', tone: 'green' },
  'awaiting-verification': { label: 'Check demo result', tone: 'violet' },
  uncertain: { label: 'Result unknown', tone: 'red' },
  blocked: { label: 'Partial outcome', tone: 'red' },
  'follow-up': { label: 'Follow-through', tone: 'amber' },
  completed: { label: 'Completed · demo', tone: 'green' },
};
export type Field = { key: string; label: string; before: string; value: string };
export type Effect = {
  id: string;
  label: string;
  phase: 'pending' | 'observed' | 'uncertain' | 'failed' | 'verified';
  reference: string;
  attempts: number;
  proof?: 'demo-readback' | 'staff-checked';
};
export type Outcome = {
  id: string;
  label: string;
  status: 'pending' | 'failed' | 'done';
  reference: string;
  note: string;
  evidenceSnapshot?: string;
  linkedCaseId?: string;
};
export type AuditEntry = { id: string; caseId: string; at: string; actor: string; event: string };
export type WorkflowCase = {
  id: string;
  opportunity: number;
  subject: string;
  person: string;
  branch: string;
  owner: string;
  dueDate: string;
  priority: 'Normal' | 'High';
  status: CaseStatus;
  source: string;
  channel: string;
  sourceRevision: number;
  fields: Field[];
  checks: { id: string; label: string; done: boolean }[];
  effects: Effect[];
  outcomes: Outcome[];
  previewEnabled: boolean;
  approval: { snapshot: string; by: string; at: string } | null;
  approvedAssignment?: { owner: string; dueDate: string };
  parentCaseId?: string;
  mode: 'rules' | 'internal' | 'native' | 'handoff';
  route: string;
  createdAt: string;
  updatedAt: string;
  ruleResult?: { message: string; snapshot: string };
  history: AuditEntry[];
};
export type DemoRecord = { reference: string; snapshot: string; fields: Field[] };
export type PrototypeStore = {
  version: 1;
  cases: WorkflowCase[];
  audit: AuditEntry[];
  records: Record<string, DemoRecord>;
  sequence: number;
};
export type Action =
  | { type: 'field'; id: string; key: string; value: string }
  | { type: 'check'; id: string; key: string; value: boolean }
  | { type: 'assign'; id: string; owner: string; dueDate: string }
  | {
      type:
        | 'preview'
        | 'reviewed-example'
        | 'approve'
        | 'run'
        | 'rule'
        | 'verify'
        | 'reconcile'
        | 'close'
        | 'stale'
        | 'loss'
        | 'fail'
        | 're-review'
        | 'delivery-failure';
      id: string;
    }
  | { type: 'outcome'; id: string; key: string; reference: string; note: string; checked: boolean }
  | { type: 'handoff'; id: string; reference: string; note: string; checked: boolean }
  | {
      type: 'create';
      opportunity: number;
      person: string;
      subject: string;
      source: string;
      branch: string;
    };

export function definition(number: number): WorkflowDefinition {
  const workflow = WORKFLOWS.find((item) => item.number === number);
  if (!workflow) throw new Error('Choose a process from the agreed workflow register.');
  return workflow;
}

const ownerFor = (module: ModuleId, number: number) =>
  number === 6
    ? OWNERS[1]
    : {
        intake: OWNERS[0],
        documents: OWNERS[1],
        rostering: OWNERS[2],
        finance: OWNERS[3],
        care: OWNERS[4],
        communications: OWNERS[5],
        shared: OWNERS[5],
      }[module];
const nativeProcesses = new Set([5, 6, 7, 10, 11, 13, 15, 16, 18, 20]);
const clean = (value: unknown, max = 3000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export function snapshot(c: WorkflowCase): string {
  return JSON.stringify([
    c.opportunity,
    c.sourceRevision,
    c.source,
    c.branch,
    c.approvedAssignment?.owner ?? c.owner,
    c.approvedAssignment?.dueDate ?? c.dueDate,
    c.fields.map((f) => [f.key, f.value]),
    c.checks.map((check) => [check.id, check.done]),
  ]);
}

function evidenceSnapshot(c: WorkflowCase): string {
  return JSON.stringify([c.sourceRevision, c.source, c.fields, c.checks]);
}

export const isComputedField = (c: WorkflowCase, key: string) =>
  c.opportunity === 1 && key === 'coverage';

export function reviewBlockers(c: WorkflowCase): string[] {
  const issues: string[] = [];
  if (definition(c.opportunity).selection === 'G' && !c.previewEnabled)
    issues.push('Enable the explicitly labelled demo preview. The live workflow remains gated.');
  c.fields
    .filter((f) => !isComputedField(c, f.key) && !f.value.trim())
    .forEach((f) => issues.push(`${f.label} needs a source-backed value.`));
  for (const f of c.fields) {
    if (['date', 'effective', 'expiry'].includes(f.key) && f.value && !isDate(f.value))
      issues.push(`${f.label} needs a valid date in YYYY-MM-DD format.`);
    if (f.key === 'recipient' && f.value.includes('@') && !/^\S+@\S+\.\S+$/.test(f.value))
      issues.push('Check the recipient email address.');
    if (f.key === 'postcode' && !/^\d{4}$/.test(f.value))
      issues.push('Check the four-digit postcode.');
  }
  if (
    c.opportunity === 14 &&
    !REPLY_RESPONSES.includes(c.fields.find((f) => f.key === 'response')?.value || '')
  )
    issues.push(
      'Choose the reviewed reply outcome; an unknown reply cannot be recorded as confirmed.',
    );
  const remaining = c.checks.filter((check) => !check.done).length;
  if (remaining)
    issues.push(
      `${remaining} evidence ${remaining === 1 ? 'check remains' : 'checks remain'} for the reviewer.`,
    );
  return issues;
}

function makeCase(number: number, sequence: number, now: string): WorkflowCase {
  const workflow = definition(number),
    example = scenarioFor(number, workflow.module);
  const mode =
    workflow.selection === 'L' || workflow.level === 'N'
      ? 'handoff'
      : workflow.level === 'F'
        ? 'rules'
        : nativeProcesses.has(number)
          ? 'native'
          : 'internal';
  return {
    id: `OPS-${1000 + sequence}`,
    opportunity: number,
    subject: example.subject,
    person: example.person,
    branch: BRANCHES[number % 4 === 0 ? 1 : 0],
    owner: ownerFor(workflow.module, number),
    dueDate: number % 5 === 0 ? '2026-10-26' : '2026-10-25',
    priority: [15, 16, 28, 32].includes(number) ? 'High' : 'Normal',
    status: example.fields.some((f) => !f[3]) ? 'needs-info' : 'needs-review',
    source: example.source,
    channel: example.channel,
    sourceRevision: 1,
    fields: example.fields.map(([key, label, before, value]) => ({ key, label, before, value })),
    checks: example.checks.map((label, i) => ({ id: `check-${i + 1}`, label, done: false })),
    effects: example.effects.map((label, i) => ({
      id: `step-${i + 1}`,
      label,
      phase: 'pending',
      reference: '',
      attempts: 0,
    })),
    outcomes: example.outcomes.map((label, i) => ({
      id: `outcome-${i + 1}`,
      label,
      status: 'pending',
      reference: '',
      note: '',
    })),
    previewEnabled: false,
    approval: null,
    mode,
    route: example.route,
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}

function audit(store: PrototypeStore, c: WorkflowCase, event: string, now: string) {
  const entry = {
    id: `event-${crypto.randomUUID()}`,
    caseId: c.id,
    at: now,
    actor: 'Demo office reviewer',
    event,
  };
  c.updatedAt = now;
  c.history.push(entry);
  c.history = c.history.slice(-40);
  store.audit.unshift(entry);
  store.audit = store.audit.slice(0, 400);
}

const hasEffect = (c: WorkflowCase) => c.effects.some((e) => e.phase !== 'pending');
const recordKey = (c: WorkflowCase, e: Effect) => `${c.id}:${e.id}`;

function invalidate(c: WorkflowCase) {
  c.approval = null;
  c.status = c.fields.some((f) => !isComputedField(c, f.key) && !f.value.trim())
    ? 'needs-info'
    : 'needs-review';
}

function captureCase(
  store: PrototypeStore,
  opportunity: number,
  input: { person: string; subject: string; source: string; branch: string },
  now: string,
) {
  const c = makeCase(opportunity, ++store.sequence, now);
  Object.assign(c, input, { channel: 'Captured sample request' });
  c.fields.forEach((field) => {
    field.before = 'Not checked against this source';
    field.value = ['name', 'person'].includes(field.key) ? input.person : '';
  });
  invalidate(c);
  store.cases.unshift(c);
  audit(
    store,
    c,
    'Sample request captured once. Proposal values require review against this source.',
    now,
  );
  return c;
}

function prepareReplyRoute(c: WorkflowCase) {
  const response = c.fields.find((f) => f.key === 'response')?.value;
  if (c.effects[0])
    c.effects[0].label =
      response === 'Confirmed'
        ? 'Record the matched sample confirmation'
        : response === 'Cancellation requested'
          ? 'Record the reviewed reply and open cancellation handling'
          : response === 'Change requested'
            ? 'Record the reviewed reply and open occurrence-change handling'
            : 'Record the unresolved reply and open an owned clarification';
}

function routeReply(store: PrototypeStore, c: WorkflowCase, now: string) {
  const response = c.fields.find((f) => f.key === 'response')?.value;
  if (response === 'Confirmed') return;
  const opportunity =
    response === 'Cancellation requested' ? 15 : response === 'Change requested' ? 11 : 8;
  let child = store.cases.find((item) => item.parentCaseId === c.id);
  if (!child) {
    const occurrence = c.fields.find((f) => f.key === 'occurrence')?.value || '';
    child = captureCase(
      store,
      opportunity,
      {
        person: c.person,
        branch: c.branch,
        subject: `${response}: ${occurrence}`,
        source: `Reviewed reply from ${c.id}: ${response}. Exact occurrence: ${occurrence}. Original source: ${c.source}`,
      },
      now,
    );
    child.parentCaseId = c.id;
    child.dueDate = c.dueDate;
    const occurrenceField = child.fields.find((f) => f.key === 'occurrence');
    if (occurrenceField) occurrenceField.value = occurrence;
    const reason = child.fields.find((f) => f.key === 'reason');
    if (reason) reason.value = response || '';
    audit(
      store,
      child,
      `Linked from ${c.id}; review is required before any service change or communication.`,
      now,
    );
  }
  if (!c.outcomes.some((o) => o.linkedCaseId === child!.id))
    c.outcomes.push({
      id: 'reply-follow-through',
      label: `Complete the linked ${opportunity === 15 ? 'cancellation' : opportunity === 11 ? 'occurrence change' : 'clarification'} case`,
      status: 'pending',
      reference: '',
      note: '',
      linkedCaseId: child.id,
    });
  audit(
    store,
    c,
    `Reviewed reply routed once to ${child.id}. This case stays open until the linked work is complete.`,
    now,
  );
}

function refreshLinkedOutcomes(store: PrototypeStore, now: string) {
  for (const c of store.cases) {
    for (const outcome of c.outcomes.filter((o) => o.linkedCaseId)) {
      const child = store.cases.find(
        (item) => item.id === outcome.linkedCaseId && item.parentCaseId === c.id,
      );
      const done = child?.status === 'completed';
      if (done && outcome.status !== 'done') {
        outcome.status = 'done';
        outcome.reference = child.id;
        outcome.note = 'The linked case completed its required checked outcomes.';
        audit(store, c, `Required linked outcome checked: ${child.id}.`, now);
      } else if (!done && outcome.status === 'done') {
        outcome.status = 'pending';
        outcome.reference = '';
        outcome.note = '';
      }
    }
  }
}

function assertUnchanged(c: WorkflowCase) {
  if (!c.approval || c.approval.snapshot !== snapshot(c))
    throw new Error(
      'This proposal changed after approval. Review the current source and approve again.',
    );
}

function reviewed(c: WorkflowCase) {
  const blockers = reviewBlockers(c);
  if (blockers.length) throw new Error(blockers.join(' '));
}

export function transition(
  previous: PrototypeStore,
  action: Action,
  now = new Date().toISOString(),
): PrototypeStore {
  const store = structuredClone(previous);
  if (action.type === 'create') {
    if (!BRANCHES.includes(action.branch))
      throw new Error('Choose one of the labelled sample branches.');
    const person = clean(action.person, 120),
      subject = clean(action.subject, 180),
      source = clean(action.source, 5000);
    if (!person || !subject || !source)
      throw new Error('Add the person, request title and original sample source.');
    definition(action.opportunity);
    const duplicate = store.cases.find(
      (c) =>
        c.opportunity === action.opportunity &&
        c.branch === action.branch &&
        c.source === source &&
        c.person === person &&
        c.subject === subject,
    );
    if (duplicate) return previous;
    captureCase(store, action.opportunity, { person, subject, source, branch: action.branch }, now);
    return store;
  }
  const c = store.cases.find((item) => item.id === action.id);
  if (!c) throw new Error('This sample case is unavailable. Open it again from the work queue.');
  if (c.status === 'completed') {
    if (action.type === 'close') return previous;
    if (!(c.mode === 'rules' && ['rule', 'field', 'check', 'assign'].includes(action.type)))
      throw new Error('This case is completed. Capture a new source for further work.');
  }
  if (action.type === 'assign') {
    if (!OWNERS.includes(action.owner) || !isDate(action.dueDate))
      throw new Error('Choose a sample owner and a valid deadline.');
    if (c.owner === action.owner && c.dueDate === action.dueDate) return previous;
    const previousOwner = c.owner;
    if (hasEffect(c)) {
      c.approvedAssignment ??= { owner: c.owner, dueDate: c.dueDate };
      c.owner = action.owner;
      c.dueDate = action.dueDate;
      audit(
        store,
        c,
        `Follow-up reassigned from ${previousOwner} to ${c.owner}, due ${c.dueDate}. Saved actions and their approvals were preserved.`,
        now,
      );
    } else {
      c.owner = action.owner;
      c.dueDate = action.dueDate;
      invalidate(c);
      audit(store, c, 'Assignment updated; review the current proposal before execution.', now);
    }
  } else if (action.type === 'preview') {
    if (definition(c.opportunity).selection !== 'G')
      throw new Error('This process does not need a gated preview.');
    c.previewEnabled = true;
    audit(
      store,
      c,
      'Demo-only gated preview enabled. No account integration or live release was enabled.',
      now,
    );
  } else if (
    action.type === 'field' ||
    action.type === 'check' ||
    action.type === 'reviewed-example'
  ) {
    if (hasEffect(c))
      throw new Error(
        'A saved or uncertain result already exists. Verify or reconcile it before changing the source; use a new case for a correction.',
      );
    if (action.type === 'field') {
      const f = c.fields.find((item) => item.key === action.key);
      if (!f) throw new Error('Choose a field from the displayed proposal.');
      if (f.value === action.value) return previous;
      if (isComputedField(c, f.key))
        throw new Error('Run the configured check to calculate this field.');
      f.value = action.value.slice(0, 3000);
      c.sourceRevision += 1;
      if (c.opportunity === 14) prepareReplyRoute(c);
    } else if (action.type === 'check') {
      const check = c.checks.find((item) => item.id === action.key);
      if (!check) throw new Error('Choose an evidence check from this case.');
      check.done = action.value;
    } else {
      c.checks.forEach((check) => (check.done = true));
    }
    if (c.mode === 'rules') {
      c.outcomes.forEach((outcome) => {
        if (outcome.status === 'done' && outcome.evidenceSnapshot !== evidenceSnapshot(c)) {
          outcome.status = 'pending';
          outcome.reference = '';
          outcome.note = '';
          outcome.evidenceSnapshot = undefined;
          audit(
            store,
            c,
            'Source evidence changed; the dependent office decision needs a fresh check.',
            now,
          );
        }
      });
    }
    const wasApproved = Boolean(c.approval);
    invalidate(c);
    audit(
      store,
      c,
      action.type === 'reviewed-example'
        ? 'Loaded the explicitly pre-reviewed fictional evidence example.'
        : wasApproved
          ? 'The proposal or evidence changed. Its old approval was invalidated.'
          : 'Sample proposal, evidence or assignment updated.',
      now,
    );
  } else if (action.type === 'approve') {
    if (c.mode === 'rules' || c.mode === 'handoff')
      throw new Error('Use the configured check or the staff-checked handoff for this process.');
    if (!['needs-review', 'needs-info'].includes(c.status))
      throw new Error('Resolve the current result before approving another action.');
    reviewed(c);
    if (c.opportunity === 14) prepareReplyRoute(c);
    c.approval = { snapshot: snapshot(c), by: 'Demo office reviewer', at: now };
    c.status = 'approved';
    audit(
      store,
      c,
      'The exact displayed proposal and evidence snapshot were approved for this browser-only demonstration.',
      now,
    );
  } else if (action.type === 'rule') {
    if (c.mode !== 'rules')
      throw new Error('This process needs reviewed preparation or a native handoff.');
    const blockers = reviewBlockers(c);
    if (
      c.opportunity === 19 &&
      /\b(partial|incomplete|unknown|unreadable)\b/i.test(
        c.fields.find((f) => f.key === 'scope')?.value || '',
      )
    )
      blockers.push(
        'The visible document scope is incomplete or unknown; a complete set cannot be claimed.',
      );
    if (blockers.length) {
      c.status = 'needs-info';
      c.ruleResult = { message: 'Check incomplete: ' + blockers.join(' '), snapshot: snapshot(c) };
      audit(
        store,
        c,
        'Configured check stopped: missing or unconfirmed evidence remains visible.',
        now,
      );
    } else {
      const messages: Record<number, string> = {
        1: 'Configured sample coverage found. Actual service capacity still needs office confirmation.',
        4: 'Required sample fields are present. Authenticity and ambiguous answers still belong to a reviewer.',
        12: 'Sample travel inputs were checked and fingerprinted. No route API was called and no distance or pay claim was created.',
        19: 'The configured visible sample metadata set was checked. Presence is not signature or authenticity verification.',
        33: 'The sample ownership and required-outcome rules were checked. Unfinished business cases remain open.',
      };
      if (c.opportunity === 1) {
        const postcode = c.fields.find((f) => f.key === 'postcode')?.value || '';
        const covered = ['6024', '6025', '6026', '6027', '6065'].includes(postcode);
        const result = c.fields.find((f) => f.key === 'coverage');
        if (result)
          result.value = covered
            ? 'On the configured sample coverage list'
            : 'Not on the sample list · office review required';
        if (!covered) {
          messages[1] =
            'This postcode is not on the explicitly fictional coverage list. The enquiry is not automatically rejected; an office decision remains required.';
          if (!c.outcomes.some((o) => o.id === 'coverage-review'))
            c.outcomes.push({
              id: 'coverage-review',
              label: 'Office confirms the coverage exception or an appropriate alternative',
              status: 'pending',
              reference: '',
              note: '',
            });
        } else {
          c.outcomes = c.outcomes.filter((o) => o.id !== 'coverage-review');
        }
      }
      for (const outcome of c.outcomes) {
        if (outcome.status === 'done' && outcome.evidenceSnapshot !== evidenceSnapshot(c)) {
          outcome.status = 'pending';
          outcome.reference = '';
          outcome.note = '';
        }
      }
      if (c.opportunity === 33) {
        const open = store.cases.filter((item) => item.id !== c.id && item.status !== 'completed');
        const unfinished = open.reduce(
          (total, item) => total + item.outcomes.filter((o) => o.status !== 'done').length,
          0,
        );
        messages[33] = `Checked ${open.length} other open sample cases: ${unfinished} mandatory follow-through outcomes still need evidence. These linked business cases remain open; this bounded check does not complete their work.`;
      }
      c.ruleResult = {
        message: messages[c.opportunity] || 'Configured sample check completed.',
        snapshot: snapshot(c),
      };
      c.status = c.outcomes.length ? 'follow-up' : 'completed';
      audit(store, c, c.ruleResult.message, now);
    }
  } else if (action.type === 'run' || action.type === 'loss' || action.type === 'fail') {
    if (c.mode === 'rules' || c.mode === 'handoff')
      throw new Error('This process has no automatic native dispatch.');
    if (c.status !== 'approved')
      throw new Error(
        c.status === 'uncertain'
          ? 'The result is unknown. Reconcile before attempting another send.'
          : 'Approve the exact current proposal before running its next demo step.',
      );
    assertUnchanged(c);
    const e = c.effects.find((item) => item.phase === 'pending');
    if (!e) throw new Error('There is no pending step. Check the existing outcome.');
    if (
      c.effects.some(
        (item) =>
          item.phase === 'uncertain' || item.phase === 'observed' || item.phase === 'failed',
      )
    )
      throw new Error('The previous step must be resolved before another step can run.');
    if (store.records[recordKey(c, e)])
      throw new Error('A saved demo record already exists. Reconcile it instead of resending.');
    e.attempts += 1;
    if (action.type === 'fail') {
      e.phase = 'failed';
      c.status = 'blocked';
      audit(
        store,
        c,
        `Demo step rejected before saving: ${e.label}. Earlier verified steps remain real partial demo outcomes.`,
        now,
      );
    } else {
      e.reference = `DEMO-${c.id}-${e.id.toUpperCase()}`;
      store.records[recordKey(c, e)] = {
        reference: e.reference,
        snapshot: c.approval!.snapshot,
        fields: structuredClone(c.fields),
      };
      e.phase = action.type === 'loss' ? 'uncertain' : 'observed';
      c.status = action.type === 'loss' ? 'uncertain' : 'awaiting-verification';
      audit(
        store,
        c,
        action.type === 'loss'
          ? `The demo response was lost for “${e.label}”. Reconciliation is required before any resend.`
          : `Demo step saved once: ${e.label}. Independent demo read-back is still required.`,
        now,
      );
    }
  } else if (action.type === 'verify' || action.type === 'reconcile') {
    if (action.type === 'reconcile' && c.status !== 'uncertain')
      throw new Error('Choose an unknown result that requires reconciliation.');
    if (action.type === 'verify' && c.status !== 'awaiting-verification')
      throw new Error('A saved demo result is required before verification.');
    assertUnchanged(c);
    const e = c.effects.find(
      (item) => item.phase === (action.type === 'reconcile' ? 'uncertain' : 'observed'),
    );
    if (!e) throw new Error('There is no matching pending result to check.');
    const record = store.records[recordKey(c, e)];
    if (
      !record ||
      record.snapshot !== c.approval!.snapshot ||
      JSON.stringify(record.fields) !== JSON.stringify(c.fields)
    )
      throw new Error(
        'No exact matching demo record was found. Keep the case open and investigate; do not resend blindly.',
      );
    if (action.type === 'reconcile') {
      e.phase = 'observed';
      c.status = 'awaiting-verification';
      audit(
        store,
        c,
        `Read-only demo reconciliation found ${record.reference}. No resend occurred.`,
        now,
      );
    } else {
      e.phase = 'verified';
      e.proof = 'demo-readback';
      c.status = c.effects.some((item) => item.phase === 'pending') ? 'approved' : 'follow-up';
      if (c.opportunity === 14) routeReply(store, c, now);
      audit(
        store,
        c,
        `Independent demo read-back matched ${record.reference}. ${c.status === 'approved' ? 'The next approved step may proceed.' : 'Required follow-through is checked separately.'}`,
        now,
      );
    }
  } else if (action.type === 'handoff') {
    if (c.mode !== 'handoff') throw new Error('This case uses a different preparation method.');
    if (!['needs-review', 'needs-info'].includes(c.status) || hasEffect(c))
      throw new Error('The checked handoff is already recorded. Complete its remaining outcomes.');
    reviewed(c);
    if (!action.checked || clean(action.reference).length < 3 || clean(action.note).length < 3)
      throw new Error(
        'Add a checked native reference, outcome note and explicit staff confirmation.',
      );
    c.effects.forEach((e) => {
      e.phase = 'verified';
      e.reference = clean(action.reference, 250);
      e.proof = 'staff-checked';
      e.attempts = 1;
    });
    c.status = 'follow-up';
    audit(
      store,
      c,
      `Staff-checked native handoff recorded: ${clean(action.reference, 250)}. This is not API read-back or proof of payroll payment. ${clean(action.note, 1000)}`,
      now,
    );
  } else if (action.type === 'outcome') {
    if (c.status !== 'follow-up')
      throw new Error('Check all primary steps before recording required follow-through.');
    const outcome = c.outcomes.find((item) => item.id === action.key);
    if (outcome?.linkedCaseId)
      throw new Error(
        'Complete the linked case. A separate reference cannot bypass its required outcomes.',
      );
    if (
      !outcome ||
      !action.checked ||
      clean(action.reference).length < 3 ||
      clean(action.note).length < 3
    )
      throw new Error(
        'Add the outcome reference, what was checked and explicit staff confirmation.',
      );
    outcome.status = 'done';
    outcome.reference = clean(action.reference, 250);
    outcome.note = clean(action.note, 1500);
    if (c.mode === 'rules') outcome.evidenceSnapshot = evidenceSnapshot(c);
    audit(
      store,
      c,
      `Required outcome checked: ${outcome.label}. Reference: ${outcome.reference}. ${outcome.note}`,
      now,
    );
  } else if (action.type === 'close') {
    refreshLinkedOutcomes(store, now);
    if (
      c.status !== 'follow-up' ||
      c.effects.some((e) => e.phase !== 'verified') ||
      c.outcomes.some((o) => o.status !== 'done') ||
      (c.mode === 'rules' &&
        (c.ruleResult?.snapshot !== snapshot(c) ||
          c.outcomes.some((o) => o.evidenceSnapshot !== evidenceSnapshot(c))))
    )
      throw new Error(
        'The parent case cannot close while any required step or outcome is missing, failed or uncertain.',
      );
    c.status = 'completed';
    audit(
      store,
      c,
      'Parent case closed after every required demo outcome was checked. Native financial release retains its own authority.',
      now,
    );
  } else if (action.type === 'stale') {
    if (!c.approval || hasEffect(c))
      throw new Error('Try a source change after approval and before any saved result.');
    c.sourceRevision += 1;
    invalidate(c);
    audit(
      store,
      c,
      'A newer sample source version arrived. The old approval no longer authorizes execution.',
      now,
    );
  } else if (action.type === 're-review') {
    if (c.status !== 'blocked' || c.effects.some((e) => e.phase === 'uncertain'))
      throw new Error('Resolve unknown effects before preparing another reviewed attempt.');
    c.effects.filter((e) => e.phase === 'failed').forEach((e) => (e.phase = 'pending'));
    invalidate(c);
    audit(
      store,
      c,
      'Rejected remaining steps returned for fresh approval. Earlier verified steps are preserved and will not be repeated.',
      now,
    );
  } else if (action.type === 'delivery-failure') {
    if (c.status !== 'follow-up' || !c.outcomes.length)
      throw new Error('Choose a case with outstanding required follow-through.');
    const outcome = c.outcomes.find((o) => o.status !== 'done');
    if (!outcome) throw new Error('All required outcomes already have checked evidence.');
    outcome.status = 'failed';
    audit(
      store,
      c,
      `Simulated failed follow-through: ${outcome.label}. Parent closure remains blocked.`,
      now,
    );
  }
  refreshLinkedOutcomes(store, now);
  return store;
}

export function initialStore(now = new Date().toISOString()): PrototypeStore {
  let store: PrototypeStore = {
    version: 1,
    cases: WORKFLOWS.map((w, i) => makeCase(w.number, i + 1, now)),
    audit: [],
    records: {},
    sequence: 35,
  };
  store.cases.forEach((c) =>
    audit(store, c, 'Fictional example created from the agreed process register.', now),
  );
  for (const number of [1, 5, 8, 11, 12, 18, 19, 33]) {
    const c = store.cases.find((item) => item.opportunity === number)!;
    store = transition(store, { type: 'reviewed-example', id: c.id }, now);
  }
  for (const number of [1, 19, 33])
    store = transition(store, { type: 'rule', id: `OPS-${1000 + number}` }, now);
  for (const number of [8, 11, 18])
    store = transition(store, { type: 'approve', id: `OPS-${1000 + number}` }, now);
  for (const number of [8, 18])
    store = transition(store, { type: 'run', id: `OPS-${1000 + number}` }, now);
  store = transition(store, { type: 'verify', id: 'OPS-1008' }, now);
  return store;
}

export function isStore(value: unknown): value is PrototypeStore {
  if (!value || typeof value !== 'object') return false;
  const s = value as PrototypeStore;
  const auditShape = (a: AuditEntry) =>
    a &&
    ['id', 'caseId', 'at', 'actor', 'event'].every(
      (k) => typeof a[k as keyof AuditEntry] === 'string',
    ) &&
    Number.isFinite(Date.parse(a.at));
  const fieldShape = (f: Field) =>
    f &&
    typeof f.key === 'string' &&
    typeof f.label === 'string' &&
    typeof f.value === 'string' &&
    typeof f.before === 'string';
  if (
    s.version !== 1 ||
    !Array.isArray(s.cases) ||
    !Array.isArray(s.audit) ||
    !s.audit.every(auditShape) ||
    !s.records ||
    typeof s.records !== 'object' ||
    Array.isArray(s.records) ||
    !Number.isSafeInteger(s.sequence) ||
    s.cases.length > 1000
  )
    return false;
  if (
    !Object.values(s.records).every(
      (r) =>
        r &&
        typeof r.reference === 'string' &&
        typeof r.snapshot === 'string' &&
        Array.isArray(r.fields) &&
        r.fields.every(fieldShape),
    )
  )
    return false;
  const ids = new Set();
  return s.cases.every((c) => {
    if (
      !c ||
      typeof c.id !== 'string' ||
      ids.has(c.id) ||
      !WORKFLOWS.some((w) => w.number === c.opportunity) ||
      !STATUS[c.status]
    )
      return false;
    ids.add(c.id);
    return (
      ['subject', 'person', 'branch', 'owner', 'dueDate', 'source', 'channel'].every(
        (k) => typeof c[k as keyof WorkflowCase] === 'string',
      ) &&
      BRANCHES.includes(c.branch) &&
      OWNERS.includes(c.owner) &&
      isDate(c.dueDate) &&
      typeof c.createdAt === 'string' &&
      Number.isFinite(Date.parse(c.createdAt)) &&
      ['rules', 'internal', 'native', 'handoff'].includes(c.mode) &&
      Number.isSafeInteger(c.sourceRevision) &&
      typeof c.previewEnabled === 'boolean' &&
      (c.parentCaseId === undefined || typeof c.parentCaseId === 'string') &&
      (c.approvedAssignment === undefined ||
        (c.approvedAssignment !== null &&
          OWNERS.includes(c.approvedAssignment.owner) &&
          isDate(c.approvedAssignment.dueDate))) &&
      (c.approval === null ||
        (!!c.approval &&
          typeof c.approval.snapshot === 'string' &&
          typeof c.approval.by === 'string' &&
          typeof c.approval.at === 'string')) &&
      (!c.ruleResult ||
        (typeof c.ruleResult.message === 'string' && typeof c.ruleResult.snapshot === 'string')) &&
      Array.isArray(c.fields) &&
      c.fields.every(fieldShape) &&
      Array.isArray(c.checks) &&
      c.checks.every(
        (k) =>
          k &&
          typeof k.id === 'string' &&
          typeof k.label === 'string' &&
          typeof k.done === 'boolean',
      ) &&
      Array.isArray(c.effects) &&
      c.effects.every(
        (e) =>
          e &&
          typeof e.id === 'string' &&
          typeof e.label === 'string' &&
          typeof e.reference === 'string' &&
          Number.isSafeInteger(e.attempts) &&
          e.attempts >= 0 &&
          ['pending', 'observed', 'uncertain', 'failed', 'verified'].includes(e.phase),
      ) &&
      Array.isArray(c.outcomes) &&
      c.outcomes.every(
        (o) =>
          o &&
          typeof o.id === 'string' &&
          typeof o.label === 'string' &&
          typeof o.reference === 'string' &&
          typeof o.note === 'string' &&
          (o.evidenceSnapshot === undefined || typeof o.evidenceSnapshot === 'string') &&
          (o.linkedCaseId === undefined || typeof o.linkedCaseId === 'string') &&
          ['pending', 'failed', 'done'].includes(o.status),
      ) &&
      Array.isArray(c.history) &&
      c.history.every(auditShape)
    );
  });
}

export function caseCsv(cases: WorkflowCase[]) {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return '"' + (/^[\s]*[=+\-@]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
  };
  return [
    ['Case', 'Process', 'Subject', 'Sample branch', 'Owner', 'Deadline', 'Status'],
    ...cases.map((c) => [
      c.id,
      c.opportunity,
      c.subject,
      c.branch,
      c.owner,
      c.dueDate,
      STATUS[c.status].label,
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n');
}
