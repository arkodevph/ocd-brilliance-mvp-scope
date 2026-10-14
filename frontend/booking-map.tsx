import { Car, Check, ChevronLeft, ChevronRight, Expand, MapPin, ShieldCheck } from './solar-icons';
export type BookingMapModel = {
  area: 'office' | 'worker' | 'client';
  title: string;
  subtitle: string;
  date: string;
  threeD: boolean;
  worker: string;
  workers: { id: string; name: string }[];
};

export function BookingMapView({ model }: { model: BookingMapModel }) {
  const { area, title, subtitle } = model;
  return (
    <>
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <details className="context-help">
            <summary>Map help</summary>
            <p>{subtitle}</p>
          </details>
        </div>
        <span className="map-demo-badge">
          <Car size={16} />
          Arrival preview
        </span>
      </header>
      <section id="booking-map-workspace" data-map-area={area} aria-label={title}>
        <div className="map-toolbar">
          <div className="map-date-control">
            <button
              className="btn map-day-button"
              data-map-action="previous-day"
              aria-label="Previous service day"
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <label htmlFor="map-service-date">
              <span>Service date</span>
              <input id="map-service-date" type="date" defaultValue={model.date} required />
            </label>
            <button
              className="btn map-day-button"
              data-map-action="next-day"
              aria-label="Next service day"
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {area === 'office' ? (
            <label className="map-worker-filter" htmlFor="map-worker-filter">
              Assignment
              <select id="map-worker-filter" defaultValue={model.worker}>
                <option value="">All workers</option>
                {model.workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="map-scope-note">
              <Check size={15} />
              {area === 'worker'
                ? 'Only your assigned services'
                : 'Only your participant’s bookings'}
            </span>
          )}
          <span className="map-timezone">Perth time · AWST</span>
        </div>
        <div className="map-stats" data-map-stats />
        <div className="booking-map-layout">
          <section className="booking-map-panel" aria-label="Interactive booking map">
            <div className="booking-map-surface">
              <div id="booking-map-canvas" aria-label="Mapbox map of service locations" />
              <div className="map-view-controls">
                <div className="map-view-toggle" role="group" aria-label="Map perspective">
                  <button type="button" data-map-action="3d" aria-pressed={model.threeD}>
                    3D
                  </button>
                  <button type="button" data-map-action="2d" aria-pressed={!model.threeD}>
                    2D
                  </button>
                </div>
                <button className="btn" type="button" data-map-action="fit">
                  <Expand size={16} />
                  <span>Show all</span>
                </button>
              </div>
              <div className="map-fallback" data-map-fallback role="status">
                <span className="map-fallback-symbol">
                  <MapPin size={28} />
                </span>
                <h2>Preparing your booking map</h2>
                <p>Loading service locations.</p>
              </div>
              <div className="map-selected-label" data-map-selected-label hidden />
            </div>
            <footer className="map-footer">
              <span className="map-connection-state" data-map-connection>
                Connecting to Mapbox…
              </span>
              <div className="map-legend">
                <span>
                  <i />
                  Service location
                </span>
                {area !== 'client' && (
                  <span>
                    <i className="worker" />
                    Demo worker
                  </span>
                )}
                <span>
                  <i className="cover" />
                  Needs cover
                </span>
              </div>
              {area === 'office' && (
                <button className="link-button" type="button" data-map-action="connection">
                  Map connection
                </button>
              )}
            </footer>
          </section>
          <aside className="map-side-panel">
            <section className="map-booking-section">
              <div className="section-heading">
                <h2>{area === 'office' ? 'Service bookings' : 'Your bookings'}</h2>
                <span className="map-booking-count" data-map-count />
              </div>
              <div className="map-booking-list" data-map-list />
            </section>
            <section className="map-arrival-section" data-map-detail />
          </aside>
        </div>
        <div className="map-demo-note">
          <ShieldCheck size={17} />
          <span>
            Service pins are approximate demo locations. Clients see an arrival estimate and a
            nearby indicator, never an employee’s GPS pin.
          </span>
        </div>
        <p className="muted" data-shared-arrival-status role="status" />
        {area === 'office' && (
          <>
            <button className="btn small" type="button" data-map-action="publish-bookings">
              Publish prototype bookings to shared arrivals
            </button>
            <section className="panel map-connection-panel" data-map-settings hidden>
              <h2>Connect Mapbox</h2>
              <p className="muted">
                Use a public token from your{' '}
                <a
                  href="https://account.mapbox.com/access-tokens/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mapbox account
                </a>
                . This connection is saved only in this browser.
              </p>
              <form data-map-form="connection">
                <label htmlFor="map-public-token">
                  Public access token
                  <input
                    id="map-public-token"
                    name="token"
                    type="password"
                    placeholder="pk.…"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </label>
                <p className="field-error" data-map-token-error role="alert" />
                <div className="button-row">
                  <button className="btn primary" type="submit">
                    Connect map
                  </button>
                  <button className="btn" type="button" data-map-action="clear-token">
                    Use configured connection
                  </button>
                  <button className="btn" type="button" data-map-action="connection">
                    Close
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </section>
    </>
  );
}

export type BookingMapOverview = {
  services: number;
  travelling: number;
  thirdLabel: string;
  thirdValue: string | number;
  bookings: {
    id: string;
    selected: boolean;
    title: string;
    time: string;
    suburb: string;
    worker: string;
    phase: string;
  }[];
};

export function BookingMapStats({ overview }: { overview: BookingMapOverview }) {
  return (
    <>
      <div>
        <span>Services on this day</span>
        <strong>{overview.services}</strong>
      </div>
      <div>
        <span>Workers on the way</span>
        <strong>{overview.travelling}</strong>
      </div>
      <div>
        <span>{overview.thirdLabel}</span>
        <strong className="map-stat-name">{overview.thirdValue}</strong>
      </div>
    </>
  );
}

export function BookingMapList({ bookings }: { bookings: BookingMapOverview['bookings'] }) {
  if (!bookings.length)
    return (
      <div className="map-no-bookings">
        <strong>No bookings for this day</strong>
        <p>Choose another service date to see bookings on the map.</p>
      </div>
    );
  return (
    <>
      {bookings.map((booking, index) => (
        <button
          key={booking.id}
          className={`map-booking-card${booking.selected ? ' selected' : ''}`}
          type="button"
          data-map-booking={booking.id}
          aria-pressed={booking.selected}
        >
          <span className="map-booking-number">{index + 1}</span>
          <span className="map-booking-copy">
            <strong>{booking.title}</strong>
            <span>
              {booking.time} · {booking.suburb}
            </span>
            <small>{booking.worker}</small>
            <span className="map-booking-phase" data-booking-phase={booking.id}>
              {booking.phase}
            </span>
          </span>
          <ChevronRight size={15} className="map-card-chevron" aria-hidden="true" />
        </button>
      ))}
    </>
  );
}
