import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Car, Mail, Sparkles, X, ChevronRight, FileText } from './solar-icons';

export type CompanionModel = {
  identity: string;
  tasks: { type: string; title: string; detail: string; reference: string; action: ReactNode }[];
  routes: {
    id: string;
    bookingId: string;
    origin: string;
    destination: string;
    distance: number;
    duration: number;
    source: string;
    participant: string;
    start: string;
  }[];
  enquiries: {
    id: string;
    name: string;
    service: string;
    emailDraft: string | null;
    email: string;
  }[];
  saveDraft: (id: string, message: string, previous: string | null) => void;
  openTravel: (bookingId: string) => void;
};

const tools = [
  { id: 'today', label: 'Today', Icon: CalendarDays },
  { id: 'travel', label: 'Travel', Icon: Car },
  { id: 'messages', label: 'Messages', Icon: Mail },
  { id: 'guide', label: 'Guide', Icon: FileText },
] as const;

const guidance = [
  {
    title: 'When a worker is unavailable',
    text: 'Open the cover task, review suitable workers and prepare an offer. Keep the visit unassigned until the worker accepts and the office confirms. Check the outcome in the existing booking.',
    href: '#/office/work',
    label: 'Open work queue',
  },
  {
    title: 'Travel between visits',
    text: 'Review the saved route estimate and service times together. The demo estimates are illustrative. Check the journey before approving travel time or kilometres; opening this panel does not calculate a live route.',
    href: '#/office/fees',
    label: 'Review travel',
  },
  {
    title: 'What connects to ShiftCare?',
    text: 'The companion uses the same OCD workspace records. It does not sync, send messages or write to ShiftCare. Use the existing connection screen to check configured read access.',
    href: '#/office/shiftcare',
    label: 'Open connection',
  },
];

function MessageDraft({
  enquiry,
  save,
}: {
  enquiry: CompanionModel['enquiries'][number];
  save: CompanionModel['saveDraft'];
}) {
  const [message, setMessage] = useState(
    enquiry.emailDraft ||
      `Hi ${enquiry.name.split(' ')[0]},\n\nThank you for contacting OCD Brilliance about ${enquiry.service.toLowerCase()}. Please let us know a convenient time to discuss your support needs.\n\nKind regards,\nOCD Brilliance`,
  );
  const [previous, setPrevious] = useState(enquiry.emailDraft);
  const [feedback, setFeedback] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!message.trim()) {
          setFeedback('Add a message before saving.');
          return;
        }
        try {
          save(enquiry.id, message.trim(), previous);
          setPrevious(message.trim());
          setFeedback('Saved to this enquiry. Nothing has been sent.');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : 'The draft could not be saved.');
        }
      }}
    >
      <p className="companion-caption">
        To {enquiry.email || enquiry.name} · {enquiry.id}
      </p>
      <label htmlFor="companion-message">Message draft</label>
      <textarea
        id="companion-message"
        value={message}
        rows={8}
        maxLength={12000}
        required
        onChange={(event) => {
          setMessage(event.target.value);
          setFeedback('Unsaved changes');
        }}
      />
      <button className="companion-primary" type="submit">
        Save draft to enquiry
      </button>
      <p className="companion-feedback" role="status">
        {feedback}
      </p>
      <a className="companion-link" href={`#/office/enquiries/${encodeURIComponent(enquiry.id)}`}>
        Review full enquiry <ChevronRight size={16} />
      </a>
    </form>
  );
}

export function OfficeCompanion({ model }: { model: CompanionModel }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof tools)[number]['id']>('today');
  const [enquiryId, setEnquiryId] = useState('');
  const launcher = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const enquiry = model.enquiries.find((item) => item.id === enquiryId) || model.enquiries[0];
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);
  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
  }, [tab, open]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  return (
    <div className="office-companion">
      <button
        ref={launcher}
        className="companion-launcher"
        type="button"
        aria-expanded={open}
        aria-controls="office-companion-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Sparkles size={20} aria-hidden="true" /> Companion <span>{model.tasks.length}</span>
      </button>
      {open && (
        <section
          className="companion-panel"
          id="office-companion-panel"
          role="dialog"
          aria-labelledby="companion-heading"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className="companion-header">
            <div>
              <p>OCD BRILLIANCE</p>
              <h2 id="companion-heading" ref={heading} tabIndex={-1}>
                <Sparkles size={18} aria-hidden="true" />
                Companion
              </h2>
            </div>
            <button
              className="companion-close"
              type="button"
              aria-label="Minimize companion"
              onClick={close}
            >
              <X size={20} />
            </button>
          </header>
          <nav className="companion-tabs" aria-label="Companion tools">
            {tools.map(({ id, label, Icon }) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
                <Icon size={17} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          <div className="companion-content" ref={content}>
            {tab === 'today' && (
              <>
                <div className="companion-section-title">
                  <h3>A little less admin.</h3>
                  <span>{model.tasks.length} to review</span>
                </div>
                <p className="companion-caption">Your existing work queue, within reach.</p>
                {model.tasks.length ? (
                  model.tasks.slice(0, 6).map((task) => (
                    <article className="companion-task" key={`${task.type}-${task.reference}`}>
                      <span className="companion-tag">
                        {task.type} · {task.reference}
                      </span>
                      <h4>{task.title}</h4>
                      <p>{task.detail}</p>
                      <div className="companion-task-action">{task.action}</div>
                    </article>
                  ))
                ) : (
                  <div className="companion-card">
                    <h4>All clear</h4>
                    <p>No tasks currently need attention in the work queue.</p>
                  </div>
                )}
                <a className="companion-link" href="#/office/work">
                  Open full work queue <ChevronRight size={16} />
                </a>
              </>
            )}
            {tab === 'travel' && (
              <>
                <h3>Travel in context.</h3>
                <p className="companion-caption">Saved estimates from the same booking records.</p>
                {model.routes.length ? (
                  model.routes.map((route) => (
                    <article className="companion-card" key={route.id}>
                      <span className="companion-tag">
                        {route.bookingId} · {route.participant}
                      </span>
                      <h4>
                        {route.origin} → {route.destination}
                      </h4>
                      <div className="companion-metrics">
                        <strong>
                          {route.distance} <small>km</small>
                        </strong>
                        <strong>
                          {route.duration} <small>min</small>
                        </strong>
                      </div>
                      <p>
                        {route.source} · Service starts {route.start}
                      </p>
                      <button
                        className="companion-link"
                        type="button"
                        onClick={() => model.openTravel(route.bookingId)}
                      >
                        Review in travel workspace <ChevronRight size={16} />
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="companion-card">
                    <p>No saved route estimates. Review the booking in the travel workspace.</p>
                  </div>
                )}
                <a className="companion-link" href="#/office/fees">
                  Open travel workspace <ChevronRight size={16} />
                </a>
              </>
            )}
            {tab === 'messages' && (
              <>
                <h3>One less email to rewrite.</h3>
                <p className="companion-caption">
                  Edit an unsent draft on an existing demo enquiry.
                </p>
                {enquiry ? (
                  <>
                    <label htmlFor="companion-enquiry">Enquiry</label>
                    <select
                      id="companion-enquiry"
                      data-native-select
                      value={enquiry.id}
                      onChange={(event) => setEnquiryId(event.target.value)}
                    >
                      {model.enquiries.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.id}
                        </option>
                      ))}
                    </select>
                    <MessageDraft key={enquiry.id} enquiry={enquiry} save={model.saveDraft} />
                  </>
                ) : (
                  <div className="companion-card">
                    <p>
                      No local demo enquiries available. Open an enquiry to review its email tools.
                    </p>
                  </div>
                )}
              </>
            )}
            {tab === 'guide' && (
              <>
                <h3>A little clarity.</h3>
                <p className="companion-caption">
                  Demo workflow guidance. Confirm company policy before acting.
                </p>
                {guidance.map((guide) => (
                  <article className="companion-card" key={guide.title}>
                    <h4>{guide.title}</h4>
                    <p>{guide.text}</p>
                    <a className="companion-link" href={guide.href}>
                      {guide.label} <ChevronRight size={16} />
                    </a>
                  </article>
                ))}
              </>
            )}
          </div>
          <footer className="companion-footer">
            <span>{model.identity}</span>
            <span>Demo · same workspace</span>
          </footer>
        </section>
      )}
    </div>
  );
}
