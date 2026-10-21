import { Status } from './shared/portal/status';
import { dateLabel } from './shared/portal/date-label';
import { PageList } from './shared/portal/paginated-list';
export { Status, dateLabel, PageList };
export { ClientHomePage } from './features/client-home/home-page';
export type { ClientHomeModel } from './features/client-home/home-model';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  Users,
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
