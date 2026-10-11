export type Coordinates = [number, number];
export interface Booking {
  id: string;
  workerId: string;
  participantId: string;
  date: string;
  start: string;
  status: string;
  visited: boolean;
  destination: Coordinates | null;
}
export interface Journey {
  workerId: string;
  date: string;
  start: string;
  mode: 'location';
  backendShared: true;
  consent: boolean;
  phase: 'locating' | 'en-route' | 'stale' | 'arrived' | 'not-started';
  updatedAt: number;
  remainingMinutes: number | null;
  progress: number;
  running: false;
  sessionId: string;
}
export interface ArrivalData {
  revision: string;
  bookings: Booking[];
  journeys: Record<string, Journey>;
}
export interface JourneyInput {
  action: string;
  bookingId: string;
  workerId: string;
  sessionId: string;
  consent?: boolean;
  coordinates?: Coordinates;
  accuracy?: number;
  observedAt?: number;
  token?: string;
  bookings?: Array<Omit<Booking, 'destination' | 'participantId'>>;
}
export interface SeedData {
  bookings: Array<Omit<Booking, 'destination' | 'visited'>>;
  visits: Array<{ bookingId: string; clockIn?: string }>;
  participants: Array<{ id: string; location?: { coordinates: Coordinates } }>;
}
