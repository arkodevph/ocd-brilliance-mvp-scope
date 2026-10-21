import { useRef } from 'react';
import { CalendarDays } from '../../solar-icons';
import { ClientCalendar } from './booking-calendar';
import type { ClientHomeModel } from './home-model';

export function CalendarPreview({ model }: { model: ClientHomeModel }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <section className="client-calendar-disclosure">
      <button type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <CalendarDays size={18} /> View your calendar
        <span aria-hidden="true">+</span>
      </button>
      <dialog
        ref={dialog}
        className="client-calendar-preview"
        aria-labelledby="client-calendar-title"
      >
        <header className="section-heading">
          <h2 id="client-calendar-title">Your calendar</h2>
          <button
            className="btn"
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close calendar"
          >
            Close
          </button>
        </header>
        <ClientCalendar model={model} />
      </dialog>
    </section>
  );
}
