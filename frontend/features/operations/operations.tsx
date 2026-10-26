import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Heart,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  X,
  AlertCircle,
  ExternalLink,
} from '../../solar-icons';
import { WORKFLOWS, type ModuleId, type WorkflowDefinition } from './catalogue';
import { MODULES } from './scenarios';
import { DemoStart, GuideHeading, readGuide, saveGuide } from './beginner';
import {
  BRANCHES,
  OWNERS,
  REPLY_RESPONSES,
  STATUS,
  STORAGE_KEY,
  caseCsv,
  definition,
  initialStore,
  isStore,
  isComputedField,
  reviewBlockers,
  snapshot,
  transition,
  type Action,
  type Outcome,
  type PrototypeStore,
  type WorkflowCase,
} from './model';

export type OperationsModel = { page?: string; caseId?: string };
const paths = [
  ['start', 'Start here'],
  ['queue', 'Work queue'],
  ['library', 'Explore workflows'],
];
const morePaths = [
  ['overview', 'Demo dashboard'],
  ['intake', 'Intake & people'],
  ['documents', 'Documents'],
  ['rostering', 'Rostering'],
  ['finance', 'Finance & payroll'],
  ['care', 'Care & feedback'],
  ['communications', 'Communications'],
  ['activity', 'Activity'],
];
const go = (page: string, id = '') => {
  location.hash = `#/office/operations/${page}${id ? '/' + id : ''}`;
};
const scopeLabel = (w: WorkflowDefinition) =>
  w.selection === 'G' ? 'Gated addition' : w.selection === 'L' ? 'Later / native' : 'Core workflow';
const initials = (s: string) =>
  s
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('');
const shortDate = (s: string) =>
  new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Australia/Perth',
  }).format(new Date(s.length === 10 ? s + 'T00:00:00+08:00' : s));
let memory: PrototypeStore | undefined;
let memoryUnsaved = false;
const memoryWarning =
  'Changes are in memory only. You can navigate this hub, but keep this tab open; reloading may discard unsaved changes.';

function loadStore() {
  if (memoryUnsaved && memory) return { store: memory, notice: memoryWarning };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isStore(parsed)) return { store: parsed, notice: '' };
      return {
        store: memory || initialStore(),
        notice:
          'The saved prototype could not be read. Fictional examples have been loaded; other workspace records are unaffected.',
      };
    }
    return { store: memory || initialStore(), notice: '' };
  } catch {
    return {
      store: memory || initialStore(),
      notice:
        'Browser storage is unavailable. You can explore the prototype, but changes may not survive a reload.',
    };
  }
}

function Scope({ workflow }: { workflow: WorkflowDefinition }) {
  return (
    <span className={`ops-scope ops-scope-${workflow.selection}`}>{scopeLabel(workflow)}</span>
  );
}
function Badge({ record }: { record: WorkflowCase }) {
  return (
    <span className={`ops-badge ops-${STATUS[record.status].tone}`}>
      <i />
      {STATUS[record.status].label}
    </span>
  );
}
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const Component =
    (
      {
        people: Users,
        file: FileText,
        calendar: CalendarDays,
        finance: ClipboardList,
        heart: Heart,
        mail: Mail,
        activity: ShieldCheck,
      } as Record<string, typeof Users>
    )[name] || ClipboardList;
  return <Component size={size} />;
}
function Panel({
  title,
  detail,
  actions,
  children,
  className = '',
  hidden = false,
}: {
  title: string;
  detail?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  hidden?: boolean;
}) {
  return (
    <section className={`ops-panel ${className}`} hidden={hidden}>
      <header className="ops-panel-heading">
        <div>
          <h2>{title}</h2>
          {detail && <p>{detail}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ops-empty">
      <CheckCircle2 size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function download(name: string, value: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function CaseTable({ cases, compact = false }: { cases: WorkflowCase[]; compact?: boolean }) {
  if (!cases.length)
    return (
      <Empty title="Nothing in this view">
        Change the filters or capture a new sample request.
      </Empty>
    );
  return (
    <div className="ops-table-scroll">
      <table className="ops-table">
        <thead>
          <tr>
            <th>Request & process</th>
            <th>Owner</th>
            {!compact && <th>Deadline</th>}
            <th>Status</th>
            <th>
              <span className="sr-only">Open case</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} data-ops-case-row={c.id}>
              <td>
                <button className="ops-row-title" onClick={() => go('case', c.id)}>
                  <span className={`ops-avatar ops-avatar-${c.opportunity % 4}`}>
                    {initials(c.person)}
                  </span>
                  <span>
                    <strong>{c.subject}</strong>
                    <small>
                      {c.person} · {c.id} · #{String(c.opportunity).padStart(2, '0')}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <span className="ops-owner">{c.owner}</span>
                <small className="ops-cell-sub">{c.branch.replace(' · sample', '')} · sample</small>
              </td>
              {!compact && (
                <td>
                  <span className="ops-due">
                    <Clock size={13} />
                    {shortDate(c.dueDate)}
                  </span>
                  {c.priority === 'High' && <small className="ops-priority">Priority review</small>}
                </td>
              )}
              <td>
                <Badge record={c} />
              </td>
              <td>
                <button
                  className="ops-icon-button"
                  aria-label={`Review ${c.id}`}
                  onClick={() => go('case', c.id)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Overview({ store, cases }: { store: PrototypeStore; cases: WorkflowCase[] }) {
  const open = cases.filter((c) => c.status !== 'completed');
  const review = open.filter((c) => ['needs-review', 'approved'].includes(c.status));
  const attention = open.filter((c) => ['needs-info', 'uncertain', 'blocked'].includes(c.status));
  const followup = open.filter((c) => ['follow-up', 'awaiting-verification'].includes(c.status));
  const priorities = [...open].sort(
    (a, b) =>
      Number(b.priority === 'High') - Number(a.priority === 'High') ||
      a.dueDate.localeCompare(b.dueDate),
  );
  const metrics = [
    {
      label: 'Open sample cases',
      value: open.length,
      detail: 'Every case has an owner',
      icon: ClipboardList,
      tone: 'blue',
      target: 'queue',
      filter: 'open',
    },
    {
      label: 'Ready for review',
      value: review.length,
      detail: 'Source and proposal together',
      icon: ShieldCheck,
      tone: 'green',
      target: 'queue',
      filter: 'review',
    },
    {
      label: 'Needs attention',
      value: attention.length,
      detail: 'Missing or uncertain evidence',
      icon: AlertCircle,
      tone: 'amber',
      target: 'queue',
      filter: 'attention',
    },
    {
      label: 'Follow-through',
      value: followup.length,
      detail: 'Check results and required outcomes',
      icon: CheckCircle2,
      tone: 'violet',
      target: 'queue',
      filter: 'follow-through',
    },
  ];
  return (
    <>
      <div className="ops-metrics">
        {metrics.map((m) => (
          <button className="ops-metric" key={m.label} onClick={() => go(m.target, m.filter)}>
            <span>
              {m.label}
              <i className={`ops-metric-icon ops-${m.tone}`}>
                <m.icon size={18} />
              </i>
            </span>
            <strong>{m.value}</strong>
            <small>
              {m.detail}
              <ArrowRight size={14} />
            </small>
          </button>
        ))}
      </div>
      <div className="ops-overview-grid">
        <div className="ops-stack">
          <Panel
            title="A clear next step for every request"
            detail="Prioritized fictional cases · human decisions stay visible"
            actions={
              <button className="ops-text-button" onClick={() => go('queue')}>
                All cases <ArrowRight size={15} />
              </button>
            }
          >
            <CaseTable cases={priorities.slice(0, 5)} compact />
          </Panel>
          <Panel
            title="Work, connected"
            detail="Move between the operational areas without losing the case context."
          >
            <div className="ops-module-grid">
              {MODULES.filter((m) => m.id !== 'shared').map((m) => {
                const count = cases.filter(
                  (c) => definition(c.opportunity).module === m.id && c.status !== 'completed',
                ).length;
                return (
                  <button key={m.id} className="ops-module-card" onClick={() => go(m.id)}>
                    <span className="ops-module-icon">
                      <Icon name={m.icon} />
                    </span>
                    <strong>{m.label}</strong>
                    <p>{m.description}</p>
                    <span>
                      {count} open sample cases
                      <ArrowRight size={15} />
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
        <aside className="ops-stack">
          <section className="ops-plan-card">
            <span className="ops-kicker">THE AGREED AUTOMATION SCOPE</span>
            <div className="ops-plan-total">
              <strong>25</strong>
              <span>workflows to explore</span>
            </div>
            <div className="ops-plan-bar">
              <i />
              <i />
            </div>
            <p>
              <b>20</b> core workflows <span>+</span> <b>5</b> gated additions
            </p>
            <small>Ten other processes retain native/manual work or later automation.</small>
            <button className="ops-button" onClick={() => go('library')}>
              Explore all 35 processes
              <ArrowRight size={15} />
            </button>
          </section>
          <Panel title="Platform responsibilities" detail="Demo connections and owned handoffs">
            <div className="ops-connections">
              {[
                ['SC', 'ShiftCare', 'People, rosters, care and service billing', 'Sample records'],
                ['M', 'Microsoft 365', 'Enquiry sources and message evidence', 'Demo inbox'],
                ['X', 'Xero', 'Native accounting and invoice export', 'Native handoff'],
                ['P', 'Payroll platform', 'Authorized pay-run and payment', 'Provider to confirm'],
              ].map(([mark, name, detail, state]) => (
                <div className="ops-connection" key={name}>
                  <span className={`ops-platform ops-platform-${mark.toLowerCase()}`}>{mark}</span>
                  <div>
                    <strong>{name}</strong>
                    <small>{detail}</small>
                    <span>{state}</span>
                  </div>
                </div>
              ))}
            </div>
            <a className="ops-panel-link" href="#/office/shiftcare">
              Open existing connection screen
              <ExternalLink size={14} />
            </a>
          </Panel>
          <Panel
            title="Latest activity"
            actions={
              <button className="ops-text-button" onClick={() => go('activity')}>
                View all
              </button>
            }
          >
            <ol className="ops-mini-timeline">
              {store.audit.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <i />
                  <div>
                    <span>{a.caseId}</span>
                    <p>{a.event}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Queue({
  cases,
  module,
  initialFilter = 'open',
}: {
  cases: WorkflowCase[];
  module?: ModuleId;
  initialFilter?: string;
}) {
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState(
      ['open', 'review', 'attention', 'follow-through'].includes(initialFilter)
        ? initialFilter
        : 'open',
    ),
    [scope, setScope] = useState('all');
  const relevant = cases.filter((c) => !module || definition(c.opportunity).module === module);
  const filtered = relevant.filter(
    (c) =>
      (status === 'all' ||
        (status === 'open' && c.status !== 'completed') ||
        (status === 'review' && ['needs-review', 'approved'].includes(c.status)) ||
        (status === 'attention' && ['needs-info', 'uncertain', 'blocked'].includes(c.status)) ||
        (status === 'follow-through' &&
          ['follow-up', 'awaiting-verification'].includes(c.status)) ||
        c.status === status) &&
      (scope === 'all' ||
        (scope === 'core' && ['C1', 'C2'].includes(definition(c.opportunity).selection)) ||
        definition(c.opportunity).selection === scope) &&
      `${c.id} ${c.subject} ${c.person} ${c.owner} ${definition(c.opportunity).title}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const [visible, setVisible] = useState(12);
  useEffect(() => {
    setVisible(12);
  }, [query, status, scope, module]);
  return (
    <Panel
      title={module ? 'Cases in this area' : 'Your shared work queue'}
      detail={`${filtered.length} matching sample cases · source, owner and required outcomes stay linked`}
      actions={
        <button
          className="ops-text-button"
          onClick={() => download('ocd-sample-case-review.csv', caseCsv(filtered))}
        >
          <FileText size={15} />
          Export review CSV
        </button>
      }
    >
      <div className="ops-filters">
        <label className="ops-search">
          <Search size={17} />
          <input
            type="search"
            aria-label="Search operation cases"
            placeholder="Search a person, request or case…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="ops-filter">
          <span>Status</span>
          <select
            aria-label="Filter cases by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">Open cases</option>
            <option value="all">All statuses</option>
            <option value="review">Ready for review</option>
            <option value="attention">Needs attention</option>
            <option value="follow-through">Result checks & follow-through</option>
            {Object.entries(STATUS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ops-filter">
          <span>Scope</span>
          <select
            aria-label="Filter cases by scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="all">All scope</option>
            <option value="core">Core workflows</option>
            <option value="G">Gated additions</option>
            <option value="L">Later / native</option>
          </select>
        </label>
      </div>
      <CaseTable cases={filtered.slice(0, visible)} />
      {filtered.length > visible && (
        <div className="ops-load-more">
          <button className="ops-button" onClick={() => setVisible((v) => v + 12)}>
            Show more cases <span>{filtered.length - visible} remaining</span>
          </button>
        </div>
      )}
    </Panel>
  );
}

function ModuleOverview({ module, cases }: { module: ModuleId; cases: WorkflowCase[] }) {
  const rows = cases.filter((c) => definition(c.opportunity).module === module);
  const shortcuts: Record<ModuleId, [string, string, string][]> = {
    intake: [
      ['office/intake/new', 'Participant intake', 'Existing forms and source review'],
      ['office/staff', 'Worker records', 'Existing staff workspace'],
      ['office/enquiries', 'Enquiry records', 'The existing shared intake path'],
    ],
    documents: [
      ['office/agreements', 'Agreements & filing', 'Originals, versions and checked signatures'],
      ['office/staff', 'Worker documents', 'Native qualification and access context'],
    ],
    rostering: [
      ['office/schedule', 'Team schedule', 'Existing bookings and cover tools'],
      ['office/fees', 'Travel checker', 'Current roster inputs and stale estimates'],
      ['worker/today', 'Worker demo', 'Native acceptance and service-entry examples'],
    ],
    finance: [
      ['office/finance', 'Financial checks', 'Existing period and evidence worksheet'],
      ['office/payroll', 'Payroll preparation', 'Reviewed hours, actual km and adjustments'],
      ['office/invoices', 'Invoice workspace', 'Native accounting review and handoff'],
    ],
    care: [
      ['office/visits', 'Visit records', 'Original attendance and care references'],
      ['office/inbox-tasks', 'Office follow-up', 'Reviewed tasks and human decisions'],
    ],
    communications: [
      ['office/inbox-tasks', 'Inbox & follow-ups', 'Existing source messages and task assignment'],
      ['office/automation', 'Earlier automation cases', 'Existing demo workflows are preserved'],
    ],
    shared: [
      ['office/work', 'Existing work queue', 'Keep the current operational tools in reach'],
      ['office/overview', 'Office overview', 'Existing sample service measures'],
    ],
  };
  const notes: Record<ModuleId, string> = {
    intake:
      'A basic saved profile is one step. Activation, signed documents, HR clearance, access and billing or payroll readiness have separate outcomes.',
    documents:
      'Presence, authenticity, signature and expiry meaning are different checks. Repair false metadata before starting genuine renewal follow-up.',
    rostering:
      'Only the reviewed occurrence changes. Worker acceptance, travel treatment and participant communication must be checked separately.',
    finance:
      'Prepare and review evidence here. Native pricing, accounting exports, payroll calculation and money movement retain their existing approval paths.',
    care: 'Factual exceptions need an accountable human. For an urgent concern, use the existing safety procedure immediately; do not wait for this queue.',
    communications:
      'A prepared message is not a sent message. Dispatch, failure, response and staff-checked outcomes stay separate.',
    shared:
      'A parent case only closes when all mandatory outcomes have checked evidence. Later reports do not infer savings or forecasts.',
  };
  return (
    <>
      <div className="ops-area-intro">
        <div className="ops-area-summary">
          <span className="ops-kicker">LINKED DEMONSTRATION TOOLS</span>
          <p>{notes[module]}</p>
          <div className="ops-area-counts">
            <span>
              <b>{rows.filter((c) => c.status !== 'completed').length}</b> open examples
            </span>
            <span>
              <b>{WORKFLOWS.filter((w) => w.module === module && w.selection !== 'L').length}</b>{' '}
              selected workflows
            </span>
          </div>
        </div>
        <div className="ops-shortcuts">
          <p className="ops-form-note">
            These tools use separate sample records. Hub changes stay in the hub.
          </p>
          {shortcuts[module].map(([href, label, detail]) => (
            <a href={`#/${href}`} key={href}>
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
              <ArrowUpRight size={17} />
            </a>
          ))}
        </div>
      </div>
      <Queue cases={cases} module={module} />
    </>
  );
}

function Library({ onExplore }: { onExplore: (workflow: WorkflowDefinition) => void }) {
  const [query, setQuery] = useState(''),
    [scope, setScope] = useState('all'),
    [module, setModule] = useState('intake');
  const areaWorkflows = WORKFLOWS.filter(
    (workflow) => module === 'all' || workflow.module === module,
  );
  const matches = WORKFLOWS.filter(
    (w) =>
      (module === 'all' || w.module === module) &&
      (scope === 'all' ||
        (scope === 'core' && ['C1', 'C2'].includes(w.selection)) ||
        w.selection === scope) &&
      `${w.number} ${w.title} ${w.problem}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <p className="demo-library-intro">
        Choose one area to explore. Start with intake, or use the area menu to find scheduling,
        documents and more.
      </p>
      <details className="demo-explainer demo-scope-details">
        <summary>About the scope: 20 core workflows, 5 gated additions, 10 later / native</summary>
        <div className="ops-library-summary">
          <div>
            <strong>35</strong>
            <span>identified processes</span>
          </div>
          <div>
            <strong>20</strong>
            <span>core workflows</span>
          </div>
          <div>
            <strong>5</strong>
            <span>gated additions</span>
          </div>
          <div>
            <strong>10</strong>
            <span>later / native processes</span>
          </div>
        </div>
      </details>
      <div className="ops-library-toolbar">
        <label className="demo-area-select">
          Area
          <select
            aria-label="Workflow area"
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setScope('all');
              setQuery('');
            }}
          >
            {MODULES.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
            <option value="all">All areas · 35 processes</option>
          </select>
        </label>
        <label className="ops-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search workflow library"
            placeholder="Find a workflow in this area…"
          />
        </label>
        <div className="ops-segments" aria-label="Workflow scope">
          {[
            ['all', `All ${areaWorkflows.length}`],
            [
              'core',
              `Core ${areaWorkflows.filter((workflow) => ['C1', 'C2'].includes(workflow.selection)).length}`,
            ],
            ['G', `Gated ${areaWorkflows.filter((workflow) => workflow.selection === 'G').length}`],
            [
              'L',
              `Later / native ${areaWorkflows.filter((workflow) => workflow.selection === 'L').length}`,
            ],
          ].map(([key, label]) => (
            <button key={key} aria-pressed={scope === key} onClick={() => setScope(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="ops-library-grid">
        {matches.map((w) => (
          <article className="ops-workflow-card" key={w.number} data-ops-workflow={w.number}>
            <div className="ops-workflow-top">
              <span className="ops-workflow-number">{String(w.number).padStart(2, '0')}</span>
              <Scope workflow={w} />
            </div>
            <h2>{w.title}</h2>
            <p>{w.problem}</p>
            <div className="ops-workflow-kind">
              <ShieldCheck size={14} />
              {w.level === 'F'
                ? 'Bounded automatic checks'
                : w.level === 'N'
                  ? 'Owned native handoff'
                  : 'System assistance + human review'}
            </div>
            <footer>
              <span>{w.workflow_families.join(' / ')}</span>
              <button className="ops-text-button" onClick={() => onExplore(w)}>
                Explore process <ArrowRight size={15} />
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!matches.length && (
        <Empty title="No matching processes">Clear the search or choose another scope.</Empty>
      )}
    </>
  );
}

function Progress({ record: c }: { record: WorkflowCase }) {
  const primary =
    c.mode === 'rules'
      ? Boolean(
          c.ruleResult &&
          c.ruleResult.snapshot === snapshot(c) &&
          ['follow-up', 'completed'].includes(c.status),
        )
      : c.effects.every((e) => e.phase === 'verified');
  const states = [
    true,
    c.mode === 'rules'
      ? reviewBlockers(c).length === 0
      : c.mode === 'handoff'
        ? c.effects.every((e) => e.phase === 'verified')
        : Boolean(c.approval),
    primary,
    primary && c.outcomes.every((o) => o.status === 'done'),
    c.status === 'completed',
  ];
  return (
    <ol className="ops-progress" aria-label="Case progress">
      {[
        'Source captured',
        c.mode === 'rules'
          ? 'Rules & inputs'
          : c.mode === 'handoff'
            ? 'Native handoff'
            : 'Review & approve',
        'Check saved result',
        'Required outcomes',
        'Case complete',
      ].map((label, i) => (
        <li key={label} className={states[i] ? 'is-done' : ''}>
          <span>{states[i] ? <Check size={13} /> : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function ProofForm({
  label,
  onSave,
  handoff = false,
}: {
  label: string;
  onSave: (reference: string, note: string, checked: boolean) => void;
  handoff?: boolean;
}) {
  const [reference, setReference] = useState(''),
    [note, setNote] = useState(''),
    [checked, setChecked] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave(reference, note, checked);
  }
  return (
    <form className="ops-proof-form" onSubmit={submit}>
      <label>
        Checked reference
        <input
          name="reference"
          required
          minLength={3}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. DEMO-NATIVE-REF-101"
          maxLength={250}
        />
      </label>
      <label>
        What was checked?
        <textarea
          name="note"
          required
          minLength={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Record the actual sample outcome and supporting evidence."
          maxLength={1500}
          rows={3}
        />
      </label>
      <label className="ops-checkbox">
        <input
          name="confirmed"
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          {handoff
            ? 'I checked this native handoff in the fictional example. This is staff confirmation, not API read-back.'
            : 'The required outcome was checked in this fictional example; a task or queued message alone is not completion.'}
        </span>
      </label>
      <div className="ops-proof-actions">
        <button
          type="button"
          className="ops-text-button"
          onClick={() => {
            setReference('DEMO-CHECKED-REF-101');
            setNote(
              'Fictional example: the named native outcome and supporting reference were checked by the responsible reviewer.',
            );
          }}
        >
          Use example reference
        </button>
        <button className="ops-button ops-primary" type="submit">
          {label}
          <Check size={14} />
        </button>
      </div>
    </form>
  );
}

function OutcomeCard({
  outcome,
  record,
  apply,
}: {
  outcome: Outcome;
  record: WorkflowCase;
  apply: (a: Action) => PrototypeStore | undefined;
}) {
  return (
    <article className={`ops-outcome ${outcome.status}`} data-ops-outcome={outcome.id}>
      <div className="ops-outcome-heading">
        <span className={`ops-step-icon ${outcome.status === 'done' ? 'is-done' : ''}`}>
          {outcome.status === 'done' ? <Check size={15} /> : <Clock size={15} />}
        </span>
        <div>
          <h3>{outcome.label}</h3>
          <small>
            {outcome.status === 'done'
              ? 'Staff-checked sample outcome'
              : outcome.status === 'failed'
                ? 'Failed follow-through · case remains open'
                : 'Required before this case can close'}
          </small>
        </div>
      </div>
      {outcome.linkedCaseId ? (
        <div className="ops-proof-saved">
          <button className="ops-text-button" onClick={() => go('case', outcome.linkedCaseId)}>
            Open linked case {outcome.linkedCaseId} <ArrowUpRight size={14} />
          </button>
          <p>
            {outcome.status === 'done'
              ? outcome.note
              : 'Complete the linked case and its required outcomes. Its checked result will update this follow-up.'}
          </p>
        </div>
      ) : outcome.status === 'done' ? (
        <div className="ops-proof-saved">
          <strong>{outcome.reference}</strong>
          <p>{outcome.note}</p>
        </div>
      ) : record.status === 'follow-up' ? (
        <ProofForm
          label="Record checked outcome"
          onSave={(reference, note, checked) =>
            apply({ type: 'outcome', id: record.id, key: outcome.id, reference, note, checked })
          }
        />
      ) : (
        <p className="ops-outcome-wait">
          Complete and check the primary steps first. This follow-up remains linked to the case.
        </p>
      )}
    </article>
  );
}

function CaseView({
  record: c,
  apply,
  guided = false,
}: {
  record: WorkflowCase;
  apply: (a: Action) => PrototypeStore | undefined;
  guided?: boolean;
}) {
  const w = definition(c.opportunity),
    blockers = reviewBlockers(c),
    frozen =
      c.effects.some((e) => e.phase !== 'pending') ||
      (c.status === 'completed' && c.mode !== 'rules');
  const pending = c.effects.find((e) => e.phase === 'pending');
  const canClose =
    c.status === 'follow-up' &&
    c.effects.every((e) => e.phase === 'verified') &&
    c.outcomes.every((o) => o.status === 'done');
  const [owner, setOwner] = useState(c.owner),
    [dueDate, setDueDate] = useState(c.dueDate);
  const completedOutcomes = c.outcomes.filter((outcome) => outcome.status === 'done').length;
  const nextOutcome = c.outcomes.find((outcome) => outcome.status !== 'done');
  const [guideStep, setGuideStep] = useState(() => {
    const saved = readGuide();
    if (c.status === 'completed' || c.status === 'follow-up') return 5;
    if (c.status === 'awaiting-verification' || c.status === 'uncertain') return 4;
    if (c.status === 'approved') return 3;
    return saved?.caseId === c.id ? Math.min(saved.step, 3) : 0;
  });
  useEffect(() => {
    if (!guided) return;
    if (c.status === 'approved') setGuideStep(3);
    if (['awaiting-verification', 'uncertain'].includes(c.status)) setGuideStep(4);
    if (['follow-up', 'completed'].includes(c.status)) setGuideStep(5);
  }, [guided, c.status]);
  useEffect(() => {
    if (!guided) return;
    saveGuide(c.id, guideStep);
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-guide-heading]')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [guided, c.id, guideStep, c.status]);
  useEffect(() => {
    if (!guided || guideStep !== 5 || completedOutcomes === 0 || c.status !== 'follow-up') return;
    const frame = requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>('.demo-guided-case .ops-outcome-heading h3') ||
        document.querySelector<HTMLElement>('[data-ops-close]');
      if (target) {
        if (target.tagName === 'H3') target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [guided, guideStep, completedOutcomes, c.status]);
  const hideStep = (...steps: number[]) => guided && !steps.includes(guideStep);
  useEffect(() => {
    setOwner(c.owner);
    setDueDate(c.dueDate);
  }, [c.owner, c.dueDate]);
  return (
    <div
      className={`ops-case ${guided ? 'demo-guided-case' : ''}`}
      data-ops-detail={c.id}
      data-guide-step={guided ? guideStep + 1 : undefined}
    >
      {guided && <GuideHeading step={guideStep} complete={c.status === 'completed'} />}
      {!guided && (
        <button className="ops-back" onClick={() => go('queue')}>
          ← Back to work queue
        </button>
      )}
      <div className="ops-case-heading" hidden={guided}>
        <div>
          <div className="ops-case-labels">
            <span>
              {c.id} · {w.workflow_families.join(' / ')} · PROCESS{' '}
              {String(w.number).padStart(2, '0')}
            </span>
            <Scope workflow={w} />
          </div>
          <h2>{c.subject}</h2>
          <p>
            {c.person} <span>·</span> {c.branch} <span>·</span> Due {shortDate(c.dueDate)}
          </p>
        </div>
        <Badge record={c} />
      </div>
      {!guided && <Progress record={c} />}
      {guided && c.status === 'completed' && (
        <section className="demo-guide-complete" data-guide-complete>
          <CheckCircle2 size={40} />
          <h2>Nice work. Every required outcome is checked.</h2>
          <p>
            The profile alone wasn’t the finish line: you also checked the agreement and billing
            handoff. Your practice case is saved in this browser.
          </p>
          <a className="ops-button ops-primary" href="#/office/operations/library">
            Explore another workflow <ArrowRight size={16} />
          </a>
          <a className="ops-button" href="#/office/start">
            Back to Start here
          </a>
        </section>
      )}
      {c.parentCaseId && (
        <p className="ops-form-note">
          Required follow-through for{' '}
          <button className="ops-text-button" onClick={() => go('case', c.parentCaseId)}>
            {c.parentCaseId}
          </button>
          . Review this case independently before changing a service.
        </p>
      )}
      {w.selection === 'G' && (
        <div className="ops-gate-banner">
          <ShieldCheck size={20} />
          <div>
            <strong>
              {c.previewEnabled
                ? 'Demo preview enabled · live release still gated'
                : 'This workflow has an acceptance gate'}
            </strong>
            <p>
              Explore the proposed steps with fictional records. Enabling this preview does not
              enable a live account integration.
            </p>
          </div>
          {!c.previewEnabled && (
            <button
              className="ops-button"
              data-ops-enable-preview
              onClick={() => apply({ type: 'preview', id: c.id })}
            >
              Enable demo preview
            </button>
          )}
        </div>
      )}
      {w.selection === 'L' && (
        <div className="ops-gate-banner ops-native-banner">
          <ExternalLink size={20} />
          <div>
            <strong>Owned native work / later automation</strong>
            <p>
              This process remains a reviewed staff handoff. The prototype does not add an
              accounting, payroll or tracking engine.
            </p>
          </div>
        </div>
      )}
      <div className="ops-case-grid" hidden={guided && c.status === 'completed'}>
        <div className="ops-stack">
          <Panel
            title="Original source"
            detail={`${c.channel} · fictional example · source version ${c.sourceRevision}`}
            hidden={hideStep(0)}
          >
            <div className="ops-source">
              <span className="ops-source-icon">
                <Mail size={21} />
              </span>
              <div>
                <strong>{c.person}</strong>
                <p>{c.source}</p>
                <span>Original evidence retained with this case</span>
              </div>
            </div>
          </Panel>
          <Panel
            title="Review the exact proposal"
            detail="Compare the current sample context with the proposed values."
            actions={<span className="ops-small-label">{c.fields.length} fields</span>}
            hidden={hideStep(1)}
          >
            <div className="ops-proposal">
              <div className="ops-proposal-key">
                <span>Source / current context</span>
                <span>Proposed value</span>
              </div>
              {c.fields.map((f) => (
                <label className="ops-proposal-row" key={f.key}>
                  <span>
                    <strong>{f.label}</strong>
                    <small>{f.before}</small>
                  </span>
                  <span>
                    {c.opportunity === 14 && f.key === 'response' ? (
                      <select
                        aria-label={f.label}
                        value={f.value}
                        disabled={frozen}
                        onChange={(e) =>
                          apply({ type: 'field', id: c.id, key: f.key, value: e.target.value })
                        }
                      >
                        <option value="">Choose the reviewed response</option>
                        {REPLY_RESPONSES.map((response) => (
                          <option key={response}>{response}</option>
                        ))}
                      </select>
                    ) : f.value.length > 110 || f.key === 'message' || f.key === 'instructions' ? (
                      <textarea
                        aria-label={f.label}
                        value={f.value}
                        disabled={frozen || isComputedField(c, f.key)}
                        rows={f.key === 'message' ? 5 : 3}
                        onChange={(e) =>
                          apply({ type: 'field', id: c.id, key: f.key, value: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        aria-label={f.label}
                        value={f.value}
                        disabled={frozen || isComputedField(c, f.key)}
                        onChange={(e) =>
                          apply({ type: 'field', id: c.id, key: f.key, value: e.target.value })
                        }
                      />
                    )}
                  </span>
                </label>
              ))}
            </div>
            {c.ruleResult && (
              <div
                className={`ops-rule-result ${c.ruleResult.snapshot !== snapshot(c) || c.status === 'needs-info' ? 'is-stale' : ''}`}
              >
                <ShieldCheck size={18} />
                <div>
                  <strong>
                    {c.ruleResult.snapshot !== snapshot(c)
                      ? 'Previous check is stale — run it again'
                      : c.status === 'needs-info'
                        ? 'Check incomplete — evidence is still needed'
                        : 'Configured sample check result'}
                  </strong>
                  <p>{c.ruleResult.message}</p>
                </div>
              </div>
            )}
          </Panel>
          <Panel
            title="Evidence & reviewer checks"
            detail="Automation prepares the work. People resolve identity, suitability and ambiguous evidence."
            hidden={hideStep(2)}
            actions={
              !frozen && (
                <button
                  className="ops-text-button"
                  data-ops-reviewed-example
                  onClick={() => apply({ type: 'reviewed-example', id: c.id })}
                >
                  Load reviewed example
                </button>
              )
            }
          >
            <div className="ops-checklist">
              {c.checks.map((check) => (
                <label className={`ops-check ${check.done ? 'checked' : ''}`} key={check.id}>
                  <input
                    type="checkbox"
                    checked={check.done}
                    disabled={frozen}
                    onChange={(e) =>
                      apply({ type: 'check', id: c.id, key: check.id, value: e.target.checked })
                    }
                  />
                  <span>{check.label}</span>
                  <small>{check.done ? 'Reviewed in sample' : 'Needs reviewer'}</small>
                </label>
              ))}
            </div>
          </Panel>
          {!!c.effects.length && (
            <Panel
              title="Execution & checked results"
              hidden={hideStep(4)}
              detail={
                c.mode === 'handoff'
                  ? 'Staff confirmation retains its own reference. No API read-back is claimed.'
                  : 'Each step is saved once in the browser demo and checked before the next step.'
              }
            >
              <ol className="ops-effects">
                {c.effects.map((effect, i) => (
                  <li key={effect.id} data-ops-effect={effect.id}>
                    <span
                      className={`ops-step-icon ${effect.phase === 'verified' ? 'is-done' : ''}`}
                    >
                      {effect.phase === 'verified' ? <Check size={15} /> : i + 1}
                    </span>
                    <div>
                      <h3>{effect.label}</h3>
                      <p>
                        {
                          {
                            pending: 'Waiting for the approved step',
                            observed: 'Demo record saved · read-back required',
                            uncertain: 'Response lost · reconcile before retry',
                            failed: 'Rejected before saving · re-review the remaining step',
                            verified:
                              effect.proof === 'staff-checked'
                                ? 'Staff-checked native handoff'
                                : 'Exact demo read-back matched',
                          }[effect.phase]
                        }
                      </p>
                      {effect.reference && <code>{effect.reference}</code>}
                    </div>
                    <span className="ops-attempts">
                      {effect.attempts
                        ? `${effect.attempts} attempt${effect.attempts > 1 ? 's' : ''}`
                        : 'Not run'}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
          {!!c.outcomes.length && (
            <Panel
              title="Required follow-through"
              detail="A saved profile, booking or cancellation does not finish every business outcome."
              hidden={hideStep(5)}
            >
              <div className="ops-outcomes">
                {guided && (
                  <p className="demo-outcome-count" role="status">
                    {completedOutcomes} of {c.outcomes.length} follow-up checks recorded.
                    {!nextOutcome && ' You can now close the case below.'}
                  </p>
                )}
                {c.outcomes
                  .filter((outcome) => !guided || outcome.id === nextOutcome?.id)
                  .map((outcome) => (
                    <OutcomeCard key={outcome.id} outcome={outcome} record={c} apply={apply} />
                  ))}
              </div>
            </Panel>
          )}
          <Panel
            title="Case activity"
            detail="Browser-local demonstration history; production audit controls are not implemented here."
            hidden={guided}
          >
            <ol className="ops-audit">
              {[...c.history]
                .reverse()
                .slice(0, 12)
                .map((entry) => (
                  <li key={entry.id}>
                    <i />
                    <div>
                      <p>{entry.event}</p>
                      <small>
                        {entry.actor} ·{' '}
                        {new Intl.DateTimeFormat('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Australia/Perth',
                        }).format(new Date(entry.at))}{' '}
                        Perth
                      </small>
                    </div>
                  </li>
                ))}
            </ol>
          </Panel>
        </div>
        <aside className="ops-case-sidebar ops-stack">
          <Panel title="Next action" className="ops-next-action" hidden={hideStep(3, 4, 5)}>
            <div className="ops-action-body">
              {c.status === 'completed' ? (
                <div className="ops-complete-summary">
                  <CheckCircle2 size={34} />
                  <h3>Checked outcome recorded</h3>
                  <p>
                    {c.mode === 'rules'
                      ? 'The bounded configured check is complete for this exact sample source.'
                      : 'Every mandatory sample step and required follow-up has checked evidence.'}
                  </p>
                  {c.mode === 'rules' && (
                    <button
                      className="ops-button ops-full"
                      data-ops-run-rule
                      onClick={() => apply({ type: 'rule', id: c.id })}
                    >
                      Run configured check again
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {['needs-review', 'needs-info'].includes(c.status) && (
                    <>
                      <p>
                        {c.mode === 'rules'
                          ? 'Run the configured check against the available evidence. Missing inputs remain visible.'
                          : c.mode === 'handoff'
                            ? 'Review the evidence, complete the native work and record the checked handoff.'
                            : 'Review the original, proposed values and evidence checks before approving this exact demo action.'}
                      </p>
                      {blockers.length > 0 && (
                        <div className="ops-blockers">
                          <strong>Before proceeding</strong>
                          <ul>
                            {blockers.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {c.mode === 'rules' ? (
                        <button
                          className="ops-button ops-primary ops-full"
                          data-ops-run-rule
                          onClick={() => apply({ type: 'rule', id: c.id })}
                        >
                          Run configured check
                          <ShieldCheck size={16} />
                        </button>
                      ) : c.mode !== 'handoff' ? (
                        <button
                          className="ops-button ops-primary ops-full"
                          data-ops-approve
                          disabled={blockers.length > 0}
                          onClick={() => apply({ type: 'approve', id: c.id })}
                        >
                          Approve exact proposal
                          <Check size={16} />
                        </button>
                      ) : (
                        <ProofForm
                          label="Record native handoff"
                          handoff
                          onSave={(reference, note, checked) =>
                            apply({ type: 'handoff', id: c.id, reference, note, checked })
                          }
                        />
                      )}
                    </>
                  )}
                  {c.status === 'approved' && (
                    <>
                      <span className="ops-approved-note">
                        <ShieldCheck size={18} />
                        Exact demo proposal approved
                      </span>
                      <h3>{pending?.label}</h3>
                      <p>
                        Only the next pending step will run. Earlier checked steps are preserved.
                      </p>
                      <button
                        className="ops-button ops-primary ops-full"
                        data-ops-run
                        onClick={() => apply({ type: 'run', id: c.id })}
                      >
                        Run next demo step
                        <ArrowRight size={16} />
                      </button>
                    </>
                  )}
                  {c.status === 'awaiting-verification' && (
                    <>
                      <h3>Check the saved demo record</h3>
                      <p>
                        The save and read-back are different steps. Compare the saved fictional
                        record with the approved snapshot.
                      </p>
                      <button
                        className="ops-button ops-primary ops-full"
                        data-ops-verify
                        onClick={() => apply({ type: 'verify', id: c.id })}
                      >
                        Verify demo result
                        <CheckCircle2 size={16} />
                      </button>
                    </>
                  )}
                  {c.status === 'uncertain' && (
                    <>
                      <span className="ops-recovery-icon">
                        <AlertCircle size={27} />
                      </span>
                      <h3>The result is unknown</h3>
                      <p>
                        Read and reconcile the existing demo record first. Sending the same change
                        again is blocked.
                      </p>
                      <button
                        className="ops-button ops-primary ops-full"
                        data-ops-reconcile
                        onClick={() => apply({ type: 'reconcile', id: c.id })}
                      >
                        Reconcile demo outcome
                        <RotateCcw size={16} />
                      </button>
                    </>
                  )}
                  {c.status === 'blocked' && (
                    <>
                      <h3>Keep the partial result visible</h3>
                      <p>
                        The rejected step did not save. Any earlier verified cleanup stays complete.
                        Review and approve only the remaining work.
                      </p>
                      <button
                        className="ops-button ops-primary ops-full"
                        data-ops-rereview
                        onClick={() => apply({ type: 're-review', id: c.id })}
                      >
                        Return remaining step for review
                        <ArrowRight size={16} />
                      </button>
                    </>
                  )}
                  {c.status === 'follow-up' && (
                    <>
                      <h3>
                        {canClose
                          ? 'Ready for checked closure'
                          : 'Required outcomes are still open'}
                      </h3>
                      <p>
                        {canClose
                          ? 'All required evidence is present in this demonstration.'
                          : 'Record the evidence for each required outcome. A queued message or an assigned task does not complete the case.'}
                      </p>
                      <button
                        className="ops-button ops-primary ops-full"
                        data-ops-close
                        disabled={!canClose}
                        onClick={() => apply({ type: 'close', id: c.id })}
                      >
                        Close checked case
                        <CheckCircle2 size={16} />
                      </button>
                      {!canClose && (
                        <small>
                          {c.outcomes.filter((o) => o.status !== 'done').length} required outcome(s)
                          still open
                        </small>
                      )}
                    </>
                  )}
                </>
              )}
              <span className="ops-action-footnote">
                Browser-only simulation · no live native write
              </span>
            </div>
          </Panel>
          <Panel title="Accountability" hidden={guided}>
            <form
              className="ops-assignment"
              onSubmit={(e) => {
                e.preventDefault();
                apply({ type: 'assign', id: c.id, owner, dueDate });
              }}
            >
              <label>
                Responsible owner
                <select
                  aria-label="Case owner"
                  value={owner}
                  disabled={c.status === 'completed' && c.mode !== 'rules'}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  {OWNERS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                Next deadline
                <input
                  aria-label="Case deadline"
                  type="date"
                  value={dueDate}
                  disabled={c.status === 'completed' && c.mode !== 'rules'}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </label>
              {(c.status !== 'completed' || c.mode === 'rules') && (
                <button className="ops-button ops-full" type="submit">
                  Save assignment
                </button>
              )}
            </form>
          </Panel>
          <Panel title="Keep the human decision" hidden={guided}>
            <div className="ops-boundary-copy">
              <ShieldCheck size={19} />
              <p>{w.manual_boundary}</p>
              <a href={`#/${c.route}`}>
                Open existing workspace
                <ArrowUpRight size={15} />
              </a>
              <small>
                Linked workspaces use separate demonstration records. This hub case does not update
                those examples.
              </small>
            </div>
          </Panel>
          {!guided && c.status !== 'completed' && (
            <details className="ops-scenarios">
              <summary>
                <RotateCcw size={16} />
                Try an interruption
                <ChevronRight size={15} />
              </summary>
              <div>
                <p>Fictional failure scenarios for the client walkthrough.</p>
                <button
                  className="ops-button ops-full"
                  disabled={c.status !== 'approved' || frozen}
                  data-ops-stale
                  onClick={() => apply({ type: 'stale', id: c.id })}
                >
                  New source after approval
                </button>
                <button
                  className="ops-button ops-full"
                  disabled={c.status !== 'approved'}
                  data-ops-loss
                  onClick={() => apply({ type: 'loss', id: c.id })}
                >
                  Lose response after save
                </button>
                <button
                  className="ops-button ops-full"
                  disabled={c.status !== 'approved'}
                  data-ops-fail
                  onClick={() => apply({ type: 'fail', id: c.id })}
                >
                  Reject the next step
                </button>
                <button
                  className="ops-button ops-full"
                  disabled={
                    c.status !== 'follow-up' || !c.outcomes.some((o) => o.status !== 'done')
                  }
                  data-ops-delivery-fail
                  onClick={() => apply({ type: 'delivery-failure', id: c.id })}
                >
                  Fail required follow-through
                </button>
              </div>
            </details>
          )}
        </aside>
      </div>
      {guided && c.status !== 'completed' && (
        <nav className="demo-guide-controls" aria-label="Walkthrough controls">
          <button
            className="ops-button"
            disabled={guideStep === 0}
            onClick={() => setGuideStep((step) => Math.max(0, step - 1))}
          >
            Back
          </button>
          <a href={`#/office/operations/case/${c.id}`}>Open full case</a>
          {guideStep < 3 && (
            <div>
              <button
                className="ops-button ops-primary"
                data-guide-next
                disabled={
                  guideStep === 1
                    ? c.fields.some((field) => !field.value.trim())
                    : guideStep === 2 && blockers.length > 0
                }
                onClick={() => setGuideStep((step) => step + 1)}
              >
                Continue <ArrowRight size={16} />
              </button>
              {guideStep === 2 && blockers.length > 0 && (
                <small>Complete the checks above to continue.</small>
              )}
            </div>
          )}
        </nav>
      )}
    </div>
  );
}

function Activity({ store, cases }: { store: PrototypeStore; cases: WorkflowCase[] }) {
  const ids = new Set(cases.map((c) => c.id));
  const [query, setQuery] = useState('');
  const rows = store.audit
    .filter(
      (a) =>
        ids.has(a.caseId) && `${a.caseId} ${a.event}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 80);
  return (
    <Panel
      title="Activity across the workflow"
      detail="Demo source history, approvals, checked results and incomplete outcomes"
    >
      <div className="ops-filters">
        <label className="ops-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a case, approval or outcome…"
            aria-label="Search workflow activity"
          />
        </label>
      </div>
      <ol className="ops-activity-list">
        {rows.map((a) => (
          <li key={a.id}>
            <span className="ops-activity-icon">
              <ShieldCheck size={17} />
            </span>
            <div>
              <button className="ops-text-button" onClick={() => go('case', a.caseId)}>
                {a.caseId}
                <ArrowUpRight size={13} />
              </button>
              <p>{a.event}</p>
              <small>
                {a.actor} · {shortDate(a.at)} · browser-local history
              </small>
            </div>
          </li>
        ))}
      </ol>
      {!rows.length && (
        <Empty title="No matching activity">Try another case ID or clear the search.</Empty>
      )}
    </Panel>
  );
}

export function OperationsPrototype({ page = 'start', caseId = '' }: OperationsModel) {
  const [boot] = useState(loadStore),
    [store, setStore] = useState(boot.store),
    [notice, setNotice] = useState(boot.notice),
    [error, setError] = useState('');
  const current = useRef(store),
    newDialog = useRef<HTMLDialogElement>(null),
    resetDialog = useRef<HTMLDialogElement>(null),
    libraryDialog = useRef<HTMLDialogElement>(null);
  const [branch, setBranch] = useState(() => {
    try {
      return sessionStorage.getItem('ocd-operations-sample-branch') || 'all';
    } catch {
      return 'all';
    }
  });
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null),
    [newOpportunity, setNewOpportunity] = useState(5);
  function persist(value: PrototypeStore) {
    memory = value;
    current.current = value;
    setStore(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      if (memoryUnsaved) setNotice('The current hub changes are now saved in this browser.');
      memoryUnsaved = false;
    } catch {
      memoryUnsaved = true;
      setNotice(memoryWarning);
    }
  }
  useEffect(() => {
    memory = current.current;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current.current));
      memoryUnsaved = false;
    } catch {
      memoryUnsaved = true;
      setNotice(memoryWarning);
    }
    function receive(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      if (memoryUnsaved) {
        setNotice(
          'Another tab changed the saved examples. Your unsaved work has been kept in this tab; keep it open until browser storage is available.',
        );
        return;
      }
      try {
        const parsed: unknown = JSON.parse(e.newValue);
        if (isStore(parsed)) {
          current.current = parsed;
          memory = parsed;
          setStore(parsed);
          setNotice(
            'The sample workspace was updated in another tab. Review the current case before acting.',
          );
        }
      } catch {
        setNotice(
          'A saved prototype update could not be read. The current in-memory examples were retained.',
        );
      }
    }
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, []);
  function apply(action: Action) {
    try {
      const next = transition(current.current, action);
      persist(next);
      setError('');
      return next;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'The sample action could not finish. Review the case and try again.',
      );
      return undefined;
    }
  }
  const filtered = store.cases.filter((c) => branch === 'all' || c.branch === branch);
  const active = store.cases.find((c) => c.id === caseId);
  const savedGuide = readGuide();
  const practice = store.cases.find((c) => c.id === savedGuide?.caseId && c.opportunity === 5);
  const guided = page === 'guide';
  const starting = page === 'start';
  const area = MODULES.find((m) => m.id === page);
  const heading =
    page === 'overview'
      ? 'Demo dashboard'
      : page === 'queue'
        ? 'Choose a request to review'
        : page === 'library'
          ? 'Explore one area at a time'
          : page === 'activity'
            ? 'What happened recently'
            : area?.label || (page === 'case' ? 'Case review' : 'Operations hub');
  const description =
    page === 'overview'
      ? 'Review requests, clear blockers and follow each case to a checked outcome.'
      : page === 'queue'
        ? 'Original sources, exact proposals and required follow-through, together.'
        : page === 'library'
          ? 'Choose an area, then open a sample workflow to see how it works.'
          : page === 'activity'
            ? 'See what changed, who owns the next step and which outcomes still need evidence.'
            : area?.description || '';
  function openExample(w: WorkflowDefinition) {
    const c = current.current.cases.find((item) => item.opportunity === w.number);
    libraryDialog.current?.close();
    if (c) go('case', c.id);
  }
  function startGuide(fresh = false) {
    if (practice && !fresh) {
      go('guide', practice.id);
      return;
    }
    try {
      const sample = initialStore().cases.find((c) => c.opportunity === 5)!;
      const sequence =
        current.current.cases.filter((c) => c.subject.startsWith('Practice ')).length + 1;
      let next = transition(current.current, {
        type: 'create',
        opportunity: 5,
        person: sample.person,
        subject: `Practice ${sequence}: Help Ava get started`,
        source: sample.source,
        branch: sample.branch,
      });
      const created = next.cases[0];
      for (const field of sample.fields)
        if (!isComputedField(created, field.key))
          next = transition(next, {
            type: 'field',
            id: created.id,
            key: field.key,
            value: field.value,
          });
      persist(next);
      saveGuide(created.id, 0);
      setError('');
      go('guide', created.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The practice case could not be created. Try again.',
      );
    }
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const input = {
      type: 'create' as const,
      opportunity: newOpportunity,
      person: String(values.get('person') || ''),
      subject: String(values.get('subject') || ''),
      source: String(values.get('source') || ''),
      branch: String(values.get('branch') || ''),
    };
    const next = apply(input);
    if (!next) return;
    const c = next.cases.find(
      (c) =>
        c.opportunity === input.opportunity &&
        c.source === input.source.trim() &&
        c.subject === input.subject.trim() &&
        c.person === input.person.trim() &&
        c.branch === input.branch,
    );
    if (c) {
      newDialog.current?.close();
      go('case', c.id);
    }
  }
  return (
    <div
      className={`ops-prototype ${starting ? 'ops-start-page' : ''} ${guided ? 'ops-guided-page' : ''}`}
      data-ops-page={page}
    >
      <div className="ops-demo-strip">
        <span>
          <i />
          Interactive prototype
        </span>
        <p>Fictional records · saved in this browser · no live native actions</p>
        <button
          className="ops-text-button"
          data-ops-reset
          onClick={() => resetDialog.current?.showModal()}
        >
          <RotateCcw size={13} />
          Reset examples
        </button>
      </div>
      {!['case', 'guide', 'start'].includes(page) && (
        <header className="ops-heading">
          <div>
            <span className="ops-kicker">OCD OPERATIONS HUB</span>
            <h1>{heading}</h1>
            <p>{description}</p>
          </div>
          <div className="ops-heading-actions" hidden={page === 'library'}>
            <label className="ops-branch">
              <Users size={16} />
              <span className="sr-only">Sample branch</span>
              <select
                aria-label="Sample branch"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  try {
                    sessionStorage.setItem('ocd-operations-sample-branch', e.target.value);
                  } catch {}
                }}
              >
                <option value="all">All sample branches</option>
                {BRANCHES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            <button
              className="ops-button ops-primary"
              data-ops-new
              onClick={() => newDialog.current?.showModal()}
            >
              <Plus size={16} />
              New sample request
            </button>
          </div>
        </header>
      )}
      {!starting && !guided && (
        <nav className="ops-tabs" aria-label="Operations hub">
          {paths.map(([key, label]) => (
            <a
              href={`#/office/operations/${key}`}
              key={key}
              aria-current={page === key ? 'page' : undefined}
            >
              {label}
              {key === 'queue' && (
                <span>{filtered.filter((c) => c.status !== 'completed').length}</span>
              )}
            </a>
          ))}
          <details
            className="ops-nav-more"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.currentTarget.open = false;
                e.currentTarget.querySelector('summary')?.focus();
              }
            }}
          >
            <summary>
              {morePaths.find(([key]) => key === page)?.[1] || 'More views'}{' '}
              <ChevronRight size={14} />
            </summary>
            <div>
              {morePaths.map(([key, label]) => (
                <a
                  key={key}
                  href={`#/office/operations/${key}`}
                  aria-current={page === key ? 'page' : undefined}
                >
                  {label}
                </a>
              ))}
            </div>
          </details>
          <label className="ops-mobile-views">
            <span className="sr-only">More operation views</span>
            <select
              aria-label="More operation views"
              value={morePaths.some(([key]) => key === page) ? page : ''}
              onChange={(e) => go(e.target.value)}
            >
              <option value="" disabled>
                More views
              </option>
              {morePaths.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </nav>
      )}
      {notice && (
        <div className="ops-notice" role="status">
          <AlertCircle size={17} />
          <p>{notice}</p>
          <button
            className="ops-icon-button"
            aria-label="Dismiss notice"
            onClick={() => setNotice('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="ops-notice ops-error" role="alert">
          <AlertCircle size={19} />
          <p>{error}</p>
          <button
            className="ops-icon-button"
            aria-label="Dismiss action error"
            onClick={() => setError('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {starting ? (
        <DemoStart practice={practice} onStart={startGuide} />
      ) : page === 'case' || guided ? (
        active ? (
          <CaseView key={`${active.id}:${guided}`} record={active} apply={apply} guided={guided} />
        ) : (
          <Empty title="This case is unavailable">
            <button className="ops-button" onClick={() => go('queue')}>
              Return to the work queue
            </button>
          </Empty>
        )
      ) : page === 'queue' ? (
        <Queue cases={filtered} initialFilter={caseId} />
      ) : page === 'library' ? (
        <Library
          onExplore={(w) => {
            setSelectedWorkflow(w);
            libraryDialog.current?.showModal();
          }}
        />
      ) : page === 'activity' ? (
        <Activity store={store} cases={filtered} />
      ) : area ? (
        <ModuleOverview module={area.id} cases={filtered} />
      ) : (
        <Overview store={store} cases={filtered} />
      )}
      <footer className="ops-footer">
        <span>
          <ShieldCheck size={14} />
          Custom supporting system · ShiftCare remains the operational source of truth
        </span>
        <span>Linked tools have separate demo records · 20 core · 5 gated · 10 later / native</span>
      </footer>
      <dialog className="ops-dialog" ref={newDialog} aria-labelledby="ops-new-title">
        <div className="ops-dialog-heading">
          <div>
            <span className="ops-kicker">FICTIONAL DEMONSTRATION</span>
            <h2 id="ops-new-title">Capture a sample request</h2>
            <p>Keep the source, person and next process together.</p>
          </div>
          <button
            type="button"
            className="ops-icon-button"
            aria-label="Close new sample request"
            onClick={() => newDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={create} className="ops-capture-form">
          <label>
            Process
            <select
              name="opportunity"
              value={newOpportunity}
              onChange={(e) => setNewOpportunity(Number(e.target.value))}
            >
              {WORKFLOWS.map((w) => (
                <option key={w.number} value={w.number}>
                  {String(w.number).padStart(2, '0')} · {w.title}
                </option>
              ))}
            </select>
          </label>
          <div className="ops-form-two">
            <label>
              Person / record
              <input name="person" required maxLength={120} placeholder="Use a fictional person" />
            </label>
            <label>
              Sample branch
              <select name="branch" defaultValue={branch === 'all' ? BRANCHES[0] : branch}>
                {BRANCHES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Request title
            <input name="subject" required maxLength={180} placeholder="What needs to happen?" />
          </label>
          <label>
            Original sample source
            <textarea
              name="source"
              required
              maxLength={5000}
              rows={5}
              placeholder="Paste a fictional message or describe the staff-logged sample request."
            />
          </label>
          <p className="ops-form-note">
            Proposal fields start blank for your review against this source. This form does not
            extract dates or match native records. An identical source and request opens its
            existing case.
          </p>
          <div className="ops-dialog-actions">
            <button className="ops-button" type="button" onClick={() => newDialog.current?.close()}>
              Cancel
            </button>
            <button className="ops-button ops-primary" type="submit">
              Capture request
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </dialog>
      <dialog
        className="ops-dialog ops-small-dialog"
        ref={resetDialog}
        aria-labelledby="ops-reset-title"
      >
        <div className="ops-dialog-heading">
          <div>
            <h2 id="ops-reset-title">Reset these demo examples?</h2>
            <p>
              This replaces only the operations hub’s browser-local examples. Other existing
              prototype screens and records are preserved.
            </p>
          </div>
        </div>
        <div className="ops-dialog-actions">
          <button className="ops-button" onClick={() => resetDialog.current?.close()}>
            Keep my examples
          </button>
          <button
            className="ops-button ops-primary"
            data-ops-confirm-reset
            onClick={() => {
              persist(initialStore());
              setError('');
              setNotice('The operations hub examples were reset.');
              resetDialog.current?.close();
              if (page === 'case') go('overview');
            }}
          >
            Reset hub examples
          </button>
        </div>
      </dialog>
      <dialog className="ops-dialog" ref={libraryDialog} aria-labelledby="ops-workflow-title">
        {selectedWorkflow && (
          <>
            <div className="ops-dialog-heading">
              <div>
                <Scope workflow={selectedWorkflow} />
                <h2 id="ops-workflow-title">
                  {String(selectedWorkflow.number).padStart(2, '0')} · {selectedWorkflow.title}
                </h2>
                <p>
                  {selectedWorkflow.workflow_families.join(' / ')} ·{' '}
                  {selectedWorkflow.level === 'F'
                    ? 'Bounded automatic function'
                    : 'Human review or native work retained'}
                </p>
              </div>
              <button
                className="ops-icon-button"
                aria-label="Close workflow details"
                onClick={() => libraryDialog.current?.close()}
              >
                <X size={20} />
              </button>
            </div>
            <dl className="ops-workflow-detail">
              {[
                ['The operational problem', selectedWorkflow.problem],
                ['What the system assists with', selectedWorkflow.automated_scope],
                ['What people retain', selectedWorkflow.manual_boundary],
                ['Acceptance gate', selectedWorkflow.remaining_work_or_gate],
                ['A completed outcome', selectedWorkflow.acceptance],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="ops-dialog-actions">
              <button className="ops-button" onClick={() => libraryDialog.current?.close()}>
                Close
              </button>
              <button
                className="ops-button ops-primary"
                data-ops-open-example
                onClick={() => openExample(selectedWorkflow)}
              >
                Open interactive example
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
