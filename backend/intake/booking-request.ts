const { WorkflowError } = require('../../lib/intake-domain.cjs');
const services = [
  'Domestic assistance',
  'Support work',
  'Cleaning',
  'Transport',
  'Support coordination',
  'Nursing',
];
export interface BookingRequest {
  mode: 'same-as-before' | 'different-services';
  services: string[];
  preferredDate: string;
  previousBookingId: string;
  preferredStart: string;
  preferredEnd: string;
}
export function bookingRequest(value: unknown): BookingRequest | null {
  if (value === undefined || value === null) return null;
  const invalid = (): never => {
    throw new WorkflowError(
      422,
      'Choose valid services, a future preferred date and repeat booking details.',
    );
  };
  if (typeof value !== 'object' || Array.isArray(value)) return invalid();
  const input = value as Record<string, unknown>;
  if (
    !['same-as-before', 'different-services'].includes(String(input.mode)) ||
    !Array.isArray(input.services) ||
    !input.services.length ||
    input.services.length > services.length ||
    input.services.some((service) => typeof service !== 'string' || !services.includes(service)) ||
    new Set(input.services).size !== input.services.length
  )
    return invalid();
  const date = String(input.preferredDate || '');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Perth',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < today
  )
    return invalid();
  const reference = String(input.previousBookingId || '');
  if (
    (reference && !/^BKG-[\w-]{1,50}$/.test(reference)) ||
    (input.mode === 'same-as-before' && (!reference || input.services.length !== 1))
  )
    return invalid();
  const start = String(input.preferredStart || ''),
    end = String(input.preferredEnd || '');
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if ((start || end) && (!time.test(start) || !time.test(end) || start >= end)) return invalid();
  return {
    mode: input.mode as BookingRequest['mode'],
    services: input.services as string[],
    preferredDate: date,
    previousBookingId: reference,
    preferredStart: start,
    preferredEnd: end,
  };
}
