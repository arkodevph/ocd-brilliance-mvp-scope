import { useState } from 'react';
import { demoRating } from './employee-feedback';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  Shuffle,
  Star,
  Users,
  House,
  Heart,
  Car,
  Compass,
} from './solar-icons';

export type PageHeadingModel = { title: string; subtitle?: string; eyebrow?: string };

export function PageHeading({
  model,
  children,
}: {
  model: PageHeadingModel;
  children?: ReactNode;
}) {
  return (
    <header className="page-header portal-page-heading">
      <div>
        {model.eyebrow && <span className="eyebrow">{model.eyebrow}</span>}
        <h1>{model.title}</h1>
        {model.subtitle && <p>{model.subtitle}</p>}
      </div>
      {children && <div className="header-actions">{children}</div>}
    </header>
  );
}

export function Status({ value }: { value: string }) {
  const tone = ['Confirmed', 'Approved', 'Completed', 'Reviewed', 'Valid'].includes(value)
    ? 'green'
    : ['Pending', 'Needs cover', 'Awaiting signature'].includes(value)
      ? 'amber'
      : 'gray';
  return <span className={`status ${tone}`}>{value}</span>;
}

const portalDateFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function dateLabel(date: string): string {
  return portalDateFormatter.format(new Date(`${date}T12:00:00Z`));
}

export function Panel({
  title,
  note,
  children,
  action,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="portal-panel">
      <header>
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {action}
      </header>
      <div className="portal-panel-body">{children}</div>
    </section>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'Not recorded'}</dd>
    </div>
  );
}

export function PageList({
  items,
  children,
  label,
  pageSize = 2,
}: {
  items: ReactNode[];
  children?: ReactNode;
  label: string;
  pageSize?: number;
}) {
  const [requested, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pages - 1);
  return (
    <>
      {children}
      {items.slice(page * pageSize, page * pageSize + pageSize)}
      {pages > 1 && (
        <nav className="portal-list-pagination" aria-label={label}>
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span role="status">
            {page + 1} / {pages}
          </span>
          <button type="button" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </nav>
      )}
    </>
  );
}

export type ClientBookingsModel = {
  title: string;
  history: boolean;
  page: number;
  pageCount: number;
  offset: number;
  total: number;
  bookings: {
    id: string;
    service: string;
    date: string;
    time: string;
    worker: string;
    status: string;
  }[];
  requests: { id: string; service: string; message: string; status: string; outcome?: string }[];
};

export function ClientBookingsPage({ model }: { model: ClientBookingsModel }) {
  return (
    <div className="portal-page client-bookings-page">
      <PageHeading
        model={{
          title: model.title,
          eyebrow: 'Your care',
          subtitle: 'Your services and booking requests.',
        }}
      >
        <a className="btn primary" href="#/client/home">
          Request a booking
          <ArrowRight size={16} />
        </a>
      </PageHeading>
      <div className="portal-tabs" role="group" aria-label="Booking views">
        <button
          type="button"
          data-action="client-bookings-view"
          data-value="upcoming"
          aria-pressed={!model.history}
        >
          Upcoming
        </button>
        <button
          type="button"
          data-action="client-bookings-view"
          data-value="history"
          aria-pressed={model.history}
        >
          Past bookings
        </button>
      </div>
      <Panel
        title={model.history ? 'Past bookings' : 'Upcoming bookings'}
        note={`${model.total} service${model.total === 1 ? '' : 's'}`}
      >
        {model.bookings.length ? (
          <div className="portal-bookings">
            {model.bookings.map((booking) => (
              <article key={booking.id} className="client-booking-card">
                <div className="portal-booking-day">
                  <strong>{new Date(`${booking.date}T12:00:00Z`).getUTCDate()}</strong>
                  <span>
                    {new Intl.DateTimeFormat('en-AU', { month: 'short', timeZone: 'UTC' }).format(
                      new Date(`${booking.date}T12:00:00Z`),
                    )}
                  </span>
                </div>
                <div className="portal-booking-body">
                  <div className="portal-row-heading">
                    <h3>{booking.service}</h3>
                    <Status value={booking.status} />
                  </div>
                  <p>
                    <Clock3 size={15} />
                    {dateLabel(booking.date)} · {booking.time}
                  </p>
                  <p>
                    <Users size={15} />
                    {booking.worker}
                  </p>
                  {!model.history && (
                    <div className="button-row">
                      <a className="btn" href={`#/client/map/${booking.id}`}>
                        <MapPin size={16} />
                        Arrival details
                      </a>
                      <button
                        className="btn"
                        type="button"
                        data-action="request-change"
                        data-id={booking.id}
                      >
                        Request change
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="portal-empty">
            <CalendarDays size={28} />
            <h3>{model.history ? 'No past bookings' : 'No upcoming bookings'}</h3>
            <p>
              {model.history
                ? 'Earlier services will appear here.'
                : 'Choose a service on Home to request support.'}
            </p>
            {!model.history && (
              <a className="btn" href="#/client/home">
                Book support
                <ArrowRight size={16} />
              </a>
            )}
          </div>
        )}
        {model.total > 2 && (
          <div className="client-pagination">
            <button
              className="btn"
              data-action="client-bookings-page"
              data-value="-1"
              type="button"
              disabled={model.page === 1}
            >
              Previous
            </button>
            <span role="status">
              {model.offset + 1}–{model.offset + model.bookings.length} of {model.total}
            </span>
            <button
              className="btn"
              data-action="client-bookings-page"
              data-value="1"
              type="button"
              disabled={model.page === model.pageCount}
            >
              Next
            </button>
          </div>
        )}
      </Panel>
      {!!model.requests.length && (
        <Panel
          title="Booking requests"
          note="Your five most recent requests. A request is not a confirmed booking."
        >
          <div className="portal-request-list">
            <PageList
              label="Booking request pages"
              items={model.requests.map((request) => (
                <article key={request.id}>
                  <div className="portal-row-heading">
                    <h3>{request.service}</h3>
                    <Status value={request.status} />
                  </div>
                  <p>{request.message}</p>
                  {request.outcome && <p>{request.outcome}</p>}
                </article>
              ))}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

export type ClientAccountModel = {
  name: string;
  email: string;
  phone: string;
  preference: string;
  service: string;
  representative: string;
};

export function ClientAccountPage({
  model,
  tools,
}: {
  model: ClientAccountModel;
  tools?: ReactNode;
}) {
  return (
    <div className="portal-page">
      <PageHeading
        model={{
          title: 'My account',
          eyebrow: 'Your care',
          subtitle: 'Your contact details and support preferences.',
        }}
      >
        <a className="btn" href="#/client/documents">
          <FileText size={16} />
          My documents
        </a>
        {tools}
      </PageHeading>
      <div className="portal-personal-layout">
        <Panel
          title="Contact & service preferences"
          note="Send an update for the office to review."
        >
          <form data-form="client-details" className="portal-form">
            <div className="portal-form-row">
              <label>
                Email
                <input name="email" type="email" required defaultValue={model.email} />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" required defaultValue={model.phone} />
              </label>
            </div>
            <label>
              Service preferences
              <textarea name="preference" required defaultValue={model.preference} />
            </label>
            <div className="form-actions">
              <button className="btn primary" type="submit">
                Request update
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Panel>
        <aside className="portal-stack">
          <Panel title="Your support">
            <dl className="portal-fields single">
              <Field label="Participant" value={model.name} />
              <Field label="Service" value={model.service} />
              <Field label="Representative" value={model.representative} />
            </dl>
          </Panel>
          <div className="portal-note">
            <ShieldCheck size={20} />
            <p>
              Other participants’ records and internal staff notes are not available in your portal.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export type ClientHomeModel = {
  name: string;
  representative: boolean;
  today: string;
  homeView: string;
  services: string[];
  selection: { service: string; date: string; month: string };
  previous?: { id: string; service: string; date: string; time: string };
  confirmation?: { service: string; date: string; reference: string };
  upcoming: ClientBookingsModel['bookings'];
  requests: ClientBookingsModel['requests'];
  calendarBookings: { date: string; service: string }[];
  agreementPending: boolean;
  workers: { id: string; name: string; role: string; specialties: string }[];
  preferredWorkerId?: string;
};

function ClientCalendar({ model }: { model: ClientHomeModel }) {
  const month = model.selection.month || `${model.today.slice(0, 7)}-01`;
  const start = new Date(`${month}T12:00:00Z`);
  const offset = (start.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const count = Math.ceil((offset + days) / 7) * 7;
  return (
    <div className="client-calendar" aria-label="Choose a preferred date">
      <div className="client-calendar-heading">
        <button
          className="btn"
          type="button"
          data-action="client-month"
          data-value="-1"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 aria-live="polite">
          {new Intl.DateTimeFormat('en-AU', {
            timeZone: 'UTC',
            month: 'long',
            year: 'numeric',
          }).format(start)}
        </h3>
        <button
          className="btn"
          type="button"
          data-action="client-month"
          data-value="1"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="client-calendar-weekdays" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div className="client-calendar-days">
        {Array.from({ length: count }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > days) return <span key={index} aria-hidden="true" />;
          const date = `${month.slice(0, 7)}-${String(day).padStart(2, '0')}`;
          const bookings = model.calendarBookings.filter((booking) => booking.date === date);
          return (
            <button
              key={date}
              type="button"
              data-action="client-date"
              data-value={date}
              disabled={date < model.today}
              aria-pressed={date === model.selection.date}
              aria-current={date === model.today ? 'date' : undefined}
              aria-label={`${dateLabel(date)}${bookings.length ? `: ${bookings.length} existing booking(s), ${bookings.map((booking) => booking.service).join(', ')}` : ''}`}
            >
              <span>{day}</span>
              {!!bookings.length && <span className="client-calendar-marker" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className="form-note">
        Dot = an existing booking. Dates are preferences; the office checks availability.
      </p>
    </div>
  );
}

export function ClientHomePage({ model }: { model: ClientHomeModel }) {
  const demoWorkers = model.workers.map((worker) => ({
    ...worker,
    rating: demoRating(worker.name).average.toFixed(1),
    reviews: demoRating(worker.name).count,
  }));

  const [favourites, setFavourites] = useState<string[]>(
    model.preferredWorkerId ? [model.preferredWorkerId] : [],
  );
  const [suggestedWorkerId, setSuggestedWorkerId] = useState(model.preferredWorkerId);
  const suggestedWorker =
    demoWorkers.find((worker) => worker.id === suggestedWorkerId) || demoWorkers[0];
  const selected = !!model.selection.service;
  // Give every service a distinct visual cue so the choices can be scanned quickly.
  const serviceIcons = [House, Users, Heart, Car, Compass, ShieldCheck];
  return (
    <div className="portal-page portal-client-home">
      <div className="client-greeting">
        <div>
          <p>Hello, {model.representative ? 'Samira' : model.name.split(' ')[0]}</p>
          <h1>Your support</h1>
          <p>
            {model.representative
              ? 'You’re arranging support for Farah.'
              : 'Request a service, check a visit or ask us for help.'}
          </p>
        </div>
        <a className="btn" href="#/client/bookings">
          <CalendarDays size={18} />
          My bookings
        </a>
      </div>
      {model.confirmation && (
        <section className="portal-confirmation" role="status">
          <Check size={20} />
          <div>
            <h2>Booking request saved</h2>
            <p>
              {model.confirmation.service} · {dateLabel(model.confirmation.date)} ·{' '}
              {model.confirmation.reference}
            </p>
            <p>
              Sent to the office for review. Your service, worker and price still need confirmation.
            </p>
          </div>
          <button className="btn" data-action="client-booking-dismiss" type="button">
            Request another service
          </button>
        </section>
      )}
      <div className="client-home-tabs portal-tabs" role="group" aria-label="Home views">
        {[
          ['book', 'Book support'],
          ['upcoming', 'Upcoming'],
          ['requests', 'Requests'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            data-action="client-home-view"
            data-value={value}
            aria-pressed={model.homeView === value}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="client-booking-layout" data-home-view={model.homeView}>
        <section
          className={`portal-panel panel client-booking-panel${selected ? ' client-booking-selected' : ''}`}
          aria-label="Request a booking"
        >
          {!selected && model.previous && (
            <div className="portal-repeat">
              <div>
                <h2>Book again</h2>
                <p>
                  {model.previous.service} · {dateLabel(model.previous.date)}
                </p>
                <small>Availability and price will be reviewed.</small>
              </div>
              <div className="button-row">
                <button
                  className="btn primary"
                  type="button"
                  data-action="client-repeat"
                  data-id={model.previous.id}
                >
                  Same as before
                  <ArrowRight size={16} />
                </button>
                <button className="btn" type="button" data-action="client-different">
                  Different services / new video
                </button>
              </div>
            </div>
          )}
          {selected ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Preferred date</span>
                  <h2>{model.selection.service}</h2>
                </div>
                <button className="btn" type="button" data-action="client-service-back">
                  Change service
                </button>
              </div>
              <div className="client-inline-calendar">
                <ClientCalendar model={model} />
              </div>
              <label className="client-date-label">
                Preferred date (Perth)
                <input
                  key={model.selection.service}
                  id="client-booking-date"
                  type="date"
                  min={model.today}
                  defaultValue={model.selection.date}
                  aria-describedby="client-booking-note"
                />
              </label>
              <p id="client-booking-note" className="form-note" role="status">
                {model.selection.date
                  ? `Selected: ${dateLabel(model.selection.date)}`
                  : 'Choose a date to continue.'}
              </p>
              <button
                className="btn primary client-booking-cta"
                type="button"
                data-action="client-booking-review"
                disabled={!model.selection.date}
              >
                Review booking request
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <h2>What support do you need?</h2>
              <p className="portal-copy">Choose a service. We’ll confirm the details with you.</p>
              <div className="client-service-grid">
                {[
                  [0, 2],
                  [1, 3],
                  [5, 4],
                ].map((indices, group) => (
                  <div className="client-service-group" key={group}>
                    <div className="client-service-category">
                      <h3>{['At home', 'Out & about', 'Specialist care'][group]}</h3>
                    </div>
                    {indices.map((index) => {
                      const Icon = serviceIcons[index];
                      return (
                        <button
                          key={index}
                          className={`client-service-tile service-tone-${index}`}
                          type="button"
                          data-action="client-service"
                          data-value={model.services[index]}
                        >
                          <span className="client-service-icon" aria-hidden="true">
                            <Icon size={20} />
                            <i />
                          </span>
                          <span>{model.services[index]}</span>
                          <ArrowRight size={16} />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="form-note">
                The office confirms your service, worker and price before booking.
              </p>
            </>
          )}
        </section>
        <section className="portal-panel panel client-calendar-panel">
          <h2>Your calendar</h2>
          <ClientCalendar model={model} />
        </section>
        <section className="portal-panel panel client-upcoming">
          <div className="section-heading">
            <h2>Upcoming bookings</h2>
            <a className="portal-link" href="#/client/bookings">
              View all
              <ArrowRight size={15} />
            </a>
          </div>
          {model.upcoming.length ? (
            model.upcoming.slice(0, 1).map((booking) => (
              <article key={booking.id} className="client-booking-card">
                <Status value={booking.status} />
                <h3>{booking.service}</h3>
                <p>
                  {dateLabel(booking.date)} · {booking.time}
                </p>
                <p>{booking.worker}</p>
                <div className="button-row">
                  <a className="btn" href={`#/client/map/${booking.id}`}>
                    Arrival details
                  </a>
                  <button
                    className="btn"
                    type="button"
                    data-action="request-change"
                    data-id={booking.id}
                  >
                    Request change
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="portal-empty compact">
              <CalendarDays size={24} />
              <h3>No upcoming bookings</h3>
              <p>Choose a service to request support.</p>
              <a href="#/client/bookings">
                View earlier bookings
                <ArrowRight size={14} />
              </a>
            </div>
          )}
        </section>
        <section className="portal-panel panel client-request-panel">
          <div className="section-heading">
            <h2>Your requests</h2>
            <a className="portal-link" href="#/client/bookings">
              View all
              <ArrowRight size={15} />
            </a>
          </div>
          <p className="form-note">Demo requests need office confirmation.</p>
          {model.requests.length ? (
            model.requests.slice(0, 1).map((request) => (
              <article className="client-booking-card" key={request.id}>
                <Status value={request.status} />
                <h3>{request.service}</h3>
                <p>{request.message}</p>
              </article>
            ))
          ) : (
            <div className="portal-empty compact">
              <FileText size={24} />
              <h3>No requests waiting</h3>
              <p>Your saved requests will appear here.</p>
            </div>
          )}
          <div className="client-workers">
            <div className="section-heading">
              <div>
                <h2>Preferred workers</h2>
                <p className="form-note">Save a favourite or let us suggest a great match.</p>
              </div>
              <button
                className="btn"
                type="button"
                onClick={() =>
                  setSuggestedWorkerId(
                    demoWorkers[Math.floor(Math.random() * demoWorkers.length)]?.id,
                  )
                }
              >
                <Shuffle size={15} />
                Suggest for me
              </button>
            </div>
            <div className="client-worker-list">
              {demoWorkers.map((worker) => {
                const favourite = favourites.includes(worker.id);
                return (
                  <article
                    className={`client-worker-card${suggestedWorker?.id === worker.id ? ' is-suggested' : ''}`}
                    key={worker.id}
                  >
                    <div className="client-worker-avatar" aria-hidden="true">
                      {worker.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')}
                    </div>
                    <div className="client-worker-copy">
                      <a href={`#/client/workers/${worker.id}`}>
                        <strong>{worker.name}</strong>
                      </a>
                      <span>{worker.role}</span>
                      <small>
                        <Star size={13} aria-hidden="true" /> {worker.rating} · {worker.reviews}{' '}
                        demo reviews
                      </small>
                      <a className="portal-link" href={`#/client/workers/${worker.id}`}>
                        View profile & reviews
                        <ArrowRight size={14} />
                      </a>
                      <em>{worker.specialties}</em>
                    </div>
                    <button
                      className={`client-favourite${favourite ? ' is-favourite' : ''}`}
                      type="button"
                      aria-pressed={favourite}
                      aria-label={`${favourite ? 'Remove' : 'Add'} ${worker.name} ${favourite ? 'from' : 'to'} favourites`}
                      onClick={() =>
                        setFavourites((current) =>
                          favourite
                            ? current.filter((id) => id !== worker.id)
                            : [...current, worker.id],
                        )
                      }
                    >
                      <Star size={19} />
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
        <section className="portal-panel panel client-help-panel">
          <div className="portal-help-icon">
            <Users size={24} />
          </div>
          <h2>Choose your support worker</h2>
          <p>Save a favourite or get a suggestion based on ratings and availability.</p>
          <button
            className="btn client-suggest-button"
            type="button"
            onClick={() =>
              setSuggestedWorkerId(demoWorkers[Math.floor(Math.random() * demoWorkers.length)]?.id)
            }
          >
            <Shuffle size={15} />
            Suggest for me
          </button>
          <div className="client-featured-workers">
            <PageList
              key={suggestedWorker?.id}
              label="Support worker pages"
              pageSize={1}
              items={[
                ...(suggestedWorker ? [suggestedWorker] : []),
                ...demoWorkers.filter((worker) => worker.id !== suggestedWorker?.id),
              ].map((worker) => {
                const favourite = favourites.includes(worker.id);
                return (
                  <article
                    className={`client-featured-worker${suggestedWorker?.id === worker.id ? ' is-suggested' : ''}`}
                    key={worker.id}
                  >
                    <div className="client-worker-avatar" aria-hidden="true">
                      {worker.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')}
                    </div>
                    <div className="client-worker-copy">
                      <a href={`#/client/workers/${worker.id}`}>
                        <strong>{worker.name}</strong>
                      </a>
                      <span>{worker.role}</span>
                      <small>
                        <Star size={13} aria-hidden="true" /> {worker.rating} · {worker.reviews}{' '}
                        demo reviews
                      </small>
                      <a className="portal-link" href={`#/client/workers/${worker.id}`}>
                        View profile & reviews
                        <ArrowRight size={14} />
                      </a>
                    </div>
                    <button
                      className={`client-favourite${favourite ? ' is-favourite' : ''}`}
                      type="button"
                      aria-pressed={favourite}
                      aria-label={`${favourite ? 'Remove' : 'Add'} ${worker.name} ${favourite ? 'from' : 'to'} favourites`}
                      onClick={() =>
                        setFavourites((current) =>
                          favourite
                            ? current.filter((id) => id !== worker.id)
                            : [...current, worker.id],
                        )
                      }
                    >
                      <Star size={18} />
                    </button>
                  </article>
                );
              })}
            />
          </div>
          <button className="btn client-office-help" type="button" data-action="client-feedback">
            Ask the office for help
            <ArrowRight size={16} />
          </button>
          <a className="client-agreement-link" href="#/client/documents">
            {model.agreementPending ? 'Review your service agreement' : 'My documents'}
            <ArrowRight size={14} />
          </a>
        </section>
      </div>
    </div>
  );
}
