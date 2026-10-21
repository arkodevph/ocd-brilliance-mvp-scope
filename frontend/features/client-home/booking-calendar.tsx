import type { ClientHomeModel } from './home-model';
import { dateLabel } from '../../shared/portal/date-label';

export function ClientCalendar({ model }: { model: ClientHomeModel }) {
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
