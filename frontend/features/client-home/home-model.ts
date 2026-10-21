import type { ClientBookingsModel } from '../../portal-pages';

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
