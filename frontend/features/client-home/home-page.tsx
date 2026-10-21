import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  ShieldCheck,
  Users,
  House,
  Heart,
  Car,
  Compass,
} from '../../solar-icons';
import { Status } from '../../shared/portal/status';
import { dateLabel } from '../../shared/portal/date-label';
import { ClientCalendar } from './booking-calendar';
import { WorkerPanel } from './worker-panel';
import { CalendarPreview } from './calendar-preview';
import type { ClientHomeModel } from './home-model';

export function ClientHomePage({ model }: { model: ClientHomeModel }) {
  const selected = !!model.selection.service;
  // Give every service a distinct visual cue so the choices can be scanned quickly.
  const serviceIcons = [House, Users, Heart, Car, Compass, ShieldCheck];
  return (
    <div className="portal-page portal-client-home client-home-workspace">
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
          ['upcoming', `Upcoming (${model.upcoming.length})`],
          ['requests', `Requests (${model.requests.length})`],
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
                The office confirms availability, your worker and price before booking.
              </p>
              <CalendarPreview model={model} />
            </>
          )}
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
          <p className="form-note">The office will confirm your service, worker and price.</p>
          {model.requests.length ? (
            model.requests.slice(0, 1).map((request) => (
              <article className="client-booking-card" key={request.id}>
                <Status value={request.status} />
                <h3>{request.service}</h3>
                <p>
                  {request.message.startsWith(request.service)
                    ? request.message.slice(request.service.length).replace(/^\s*[·—–-]\s*/, '')
                    : request.message}
                </p>
              </article>
            ))
          ) : (
            <div className="portal-empty compact">
              <FileText size={24} />
              <h3>No requests waiting</h3>
              <p>Your saved requests will appear here.</p>
            </div>
          )}
        </section>
        <WorkerPanel model={model} />
      </div>
    </div>
  );
}
