import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import type { ArrivalData, Journey, JourneyInput, Coordinates } from './types';
import { storage, read, update } from './journey-store';
const { staffSession, permits, originAllowed } = require('../../lib/staff-auth.cjs');

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}
function coordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(Number.isFinite) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) < 85
  );
}
function booking(data: ArrivalData, id: string, workerId: string) {
  const b = data.bookings.find((b) => b.id === id);
  if (!b || b.workerId !== workerId)
    fail(403, 'This booking is not assigned to the selected worker.');
  if (b.status !== 'Confirmed' || b.visited)
    fail(409, 'Arrival sharing is not available for this booking.');
  return b;
}
function current(data: ArrivalData, input: JourneyInput) {
  booking(data, input.bookingId, input.workerId);
  const journey = data.journeys[input.bookingId];
  if (
    !journey ||
    journey.sessionId !== input.sessionId ||
    !journey.consent ||
    journey.phase === 'arrived'
  )
    fail(409, 'Journey sharing ended or changed.');
  return journey;
}
async function body(req: Request): Promise<JourneyInput> {
  let text = '';
  if (req.body) text = JSON.stringify(req.body);
  else
    for await (const part of req) {
      text += part;
      if (Buffer.byteLength(text) > 50000) fail(413, 'Request too large.');
    }
  if (Buffer.byteLength(text) > 50000) fail(413, 'Request too large.');
  let value;
  try {
    value = JSON.parse(text);
  } catch (_) {
    fail(400, 'Invalid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(400, 'Request must be an object.');
  return value as JourneyInput;
}

// Only status/ETA fields leave the API. Worker coordinates exist only during the route request.
export async function handleJourneyRequest(req: Request, res: Response): Promise<void> {
  function send(status: number, value: unknown): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(value));
  }
  try {
    if (!['GET', 'POST'].includes(req.method || ''))
      return send(405, { error: 'Method not allowed.' });
    if (!originAllowed(req)) fail(403, 'Request origin is not allowed.');
    const staff = staffSession(req);
    if (!staff) fail(401, 'Use the existing office session to test shared arrivals.');
    if (!permits(staff, req.method === 'GET' ? 'read' : 'write'))
      fail(403, 'Your role does not permit this action.');
    const store = storage();
    if (!store) fail(503, 'Shared arrival storage is not configured.');
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost'),
        area = url.searchParams.get('area'),
        id = url.searchParams.get('id');
      if (!['office', 'worker', 'client'].includes(area || '') || (area !== 'office' && !id))
        fail(400, 'Select a map view and identity.');
      const data = await read(store);
      const bookings = data.bookings.filter(
        (b) =>
          area === 'office' ||
          (area === 'worker' && b.workerId === id) ||
          (area === 'client' && b.participantId === id),
      );
      const journeys: Record<string, Omit<Journey, 'sessionId'> & { sessionId?: string }> = {};
      for (const b of bookings) {
        const journey = data.journeys[b.id];
        if (journey && b.status === 'Confirmed' && !b.visited) {
          const { sessionId, ...visible } = journey;
          journeys[b.id] = area === 'client' ? visible : journey;
          if (visible.phase !== 'arrived' && Date.now() - visible.updatedAt > 120000)
            journeys[b.id] = {
              ...journeys[b.id],
              phase: 'stale',
              remainingMinutes: null,
            };
        }
      }
      return send(200, {
        journeys,
        bookings: bookings.map(({ destination, ...b }) => b),
        prototype: true,
      });
    }
    const input = await body(req);
    if (input.action === 'publish') {
      if (!Array.isArray(input.bookings) || input.bookings.length > 500)
        fail(422, 'Invalid prototype bookings.');
      const bookings = input.bookings;
      await update(store, (data) => {
        // Existing fictional IDs only: this is a prototype roster, not an intake or live ShiftCare write.
        const ids = new Set();
        for (const value of bookings) {
          if (!value || typeof value !== 'object' || Array.isArray(value))
            fail(422, 'Invalid prototype booking.');
          const b = data.bookings.find((b) => b.id === value.id);
          if (
            !b ||
            ids.has(b.id) ||
            !['Confirmed', 'Needs cover', 'Cancelled', 'Completed', 'Proposed'].includes(
              value.status,
            ) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(value.date || '') ||
            !/^\d{2}:\d{2}$/.test(value.start || '') ||
            typeof value.workerId !== 'string'
          )
            fail(422, 'Invalid prototype booking.');
          ids.add(b.id);
          if (
            b.workerId !== value.workerId ||
            b.date !== value.date ||
            b.start !== value.start ||
            value.status !== 'Confirmed' ||
            value.visited
          )
            delete data.journeys[b.id];
          Object.assign(b, {
            workerId: value.workerId,
            date: value.date,
            start: value.start,
            status: value.status,
            visited: value.visited === true,
          });
        }
      });
      return send(200, { ok: true });
    }
    if (input.action === 'start') {
      if (input.consent !== true) fail(422, 'Journey consent is required.');
      const journey = await update(store, (data) => {
        const b = booking(data, input.bookingId, input.workerId);
        return (data.journeys[b.id] = {
          workerId: b.workerId,
          date: b.date,
          start: b.start,
          mode: 'location',
          backendShared: true,
          consent: true,
          phase: 'locating',
          updatedAt: Date.now(),
          remainingMinutes: null,
          progress: 0,
          running: false,
          sessionId: crypto.randomUUID(),
        });
      });
      return send(200, { journey });
    }
    if (input.action === 'eta') {
      const data = await read(store);
      current(data, input);
      const destination = booking(data, input.bookingId, input.workerId).destination;
      if (
        !coordinates(input.coordinates) ||
        !coordinates(destination) ||
        typeof input.accuracy !== 'number' ||
        !Number.isFinite(input.accuracy) ||
        input.accuracy < 0 ||
        input.accuracy > 150 ||
        typeof input.observedAt !== 'number' ||
        !Number.isFinite(input.observedAt) ||
        Date.now() < input.observedAt ||
        Date.now() - input.observedAt > 120000
      )
        fail(422, 'A fresh accurate location is required.');
      const token = process.env.MAPBOX_PUBLIC_TOKEN || input.token;
      if (typeof token !== 'string' || !/^pk\.[A-Za-z0-9._-]+$/.test(token))
        fail(503, 'Connect Mapbox to calculate a driving ETA.');
      const url = new URL(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${input.coordinates.join(',')};${destination.join(',')}`,
      );
      url.search = new URLSearchParams({
        access_token: token,
        overview: 'false',
        steps: 'false',
      }).toString();
      let duration;
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          cache: 'no-store',
        });
        const result = await response.json();
        if (
          !response.ok ||
          result.code !== 'Ok' ||
          !Number.isFinite(result.routes?.[0]?.duration) ||
          result.routes[0].duration < 0
        )
          throw new Error();
        duration = result.routes[0].duration;
      } catch (_) {
        fail(503, 'Driving estimate unavailable.');
      }
      const observedAt = input.observedAt;
      const journey = await update(store, (data) => {
        const j = current(data, input);
        if (
          observedAt < j.updatedAt ||
          (j.phase === 'stale' && observedAt <= j.updatedAt) ||
          Date.now() - observedAt > 120000
        )
          fail(409, 'This location update is too old.');
        Object.assign(j, {
          phase: 'en-route',
          updatedAt: observedAt,
          remainingMinutes: Math.max(1, Math.ceil(duration / 60)),
        });
        return j;
      });
      return send(200, { journey });
    }
    if (!['stop', 'arrive', 'unavailable'].includes(input.action))
      fail(400, 'Unknown journey action.');
    const journey = await update(store, (data) => {
      const j = current(data, input);
      Object.assign(j, {
        phase:
          input.action === 'arrive' ? 'arrived' : input.action === 'stop' ? 'not-started' : 'stale',
        remainingMinutes: null,
        updatedAt: Date.now(),
        progress: input.action === 'arrive' ? 1 : 0,
      });
      if (input.action === 'stop') j.consent = false;
      return j;
    });
    return send(200, { journey });
  } catch (error) {
    const failure = error as Error & { status?: number };
    send(failure.status || 500, {
      error: failure.status ? failure.message : 'Shared arrival service unavailable.',
    });
  }
}
