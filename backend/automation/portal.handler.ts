import crypto from 'node:crypto';
import type { Request, Response } from '../http';
import { PortalIdentity, type PortalAccount } from './portal-identity';
import { createAutomationRuntime } from './runtime';
import { AutomationError, object, string, type Data } from './types';
import { ShiftCareGateway, nativeId, unwrap } from './shiftcare-gateway';
import { hash, policy } from './service';
import { localDate } from './handlers';
const { originAllowed } = require('../../lib/staff-auth.cjs');
const rows = (data: unknown): Data[] => Array.isArray(data) ? data.map(object) : [];

export function createPortalHandler(env = process.env, fetchImpl: typeof fetch = fetch) {
  const identities = new PortalIdentity(env), gateway = new ShiftCareGateway(env, fetchImpl);
  function assigned(shift: Data, account: PortalAccount) {
    if (!rows(account.kind === 'worker' ? shift.staff : shift.clients).some(p => String(p.id) === account.nativeId)) throw new AutomationError(403, 'This service is not assigned to your account.');
  }
  function active(shift: Data) {
    if (shift.cancelled_at || shift.is_approved === true || !shift.published || rows(shift.staff).length !== 1 || rows(shift.clients).length !== 1) throw new AutomationError(409, 'Arrival sharing requires a current published service with one participant and one worker.');
    const start = Date.parse(String(shift.start_at)), end = Date.parse(String(shift.end_at));
    if (!Number.isFinite(start) || !Number.isFinite(end) || Date.now() < start - 4 * 3600000 || Date.now() > end) throw new AutomationError(409, 'Arrival sharing is available only near the scheduled service.');
  }
  function projection(shift: Data, arrival?: Data) {
    const permitted = !shift.cancelled_at && shift.is_approved !== true && arrival?.assignmentHash === hash({ staff: shift.staff, startAt: shift.start_at, endAt: shift.end_at }) && arrival?.consent === true;
    const current = permitted && arrival?.phase === 'en-route' && Number(arrival?.updatedAt) <= Date.now() && Date.now() - Number(arrival?.updatedAt) <= policy(env).etaFreshSeconds * 1000;
    return { id: String(shift.id), startAt: shift.start_at, endAt: shift.end_at, cancelled: Boolean(shift.cancelled_at), completed: shift.is_approved === true, workers: rows(shift.staff).map(w => ({ id: w.id, name: w.name })), clients: rows(shift.clients).map(c => ({ id: c.id, name: [c.first_name,c.family_name].filter(Boolean).join(' ') })), arrival: { phase: current ? 'en-route' : permitted && arrival?.phase === 'arrived' ? 'arrived' : 'unavailable', remainingMinutes: current ? arrival!.remainingMinutes : null, updatedAt: current ? arrival!.updatedAt : null } };
  }
  return async (req: Request, res: Response): Promise<void> => {
    function send(status: number, data: unknown, headers: Record<string,string> = {}) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(JSON.stringify(data)); }
    try {
      if (!['GET','POST'].includes(req.method || '')) throw new AutomationError(405, 'Use GET or POST.');
      if (!originAllowed(req)) throw new AutomationError(403, 'Request origin is not allowed.');
      const url = new URL(req.url || '/', 'http://localhost'), action = url.searchParams.get('action') || 'session';
      let data: Data = {};
      if (req.method === 'POST') {
        let text = '';
        if (req.body) text = JSON.stringify(req.body);
        else for await (const part of req) { text += part; if (Buffer.byteLength(text) > 10000) throw new AutomationError(413, 'Service request is too large.'); }
        if (Buffer.byteLength(text) > 10000) throw new AutomationError(413, 'Service request is too large.');
        try { data = object(JSON.parse(text)); } catch { throw new AutomationError(400, 'Supply valid JSON.'); }
      }
      const account = identities.session(req);
      if (action === 'session' && req.method === 'GET') return send(200, { configured: identities.configured(), account: account ? { name: account.name || account.email, kind: account.kind } : null, arrivalsEnabled: env.OCD_ARRIVAL_ENABLED === 'true' });
      if (action === 'logout' && req.method === 'POST') return send(200, { ok: true }, { 'Set-Cookie': 'ocd_portal=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
      const runtime = createAutomationRuntime({ env, fetchImpl });
      if (action === 'login' && req.method === 'POST') {
        if (!identities.configured()) throw new AutomationError(503, 'Service access needs a verified ShiftCare identity and account configuration.');
        const key = `portal-login:${hash(req.socket?.remoteAddress || 'unknown').slice(0,24)}`;
        await runtime.store.mutate(state => {
          const limit = state.connectors[key] ||= {};
          let record = object(limit.cursor ? JSON.parse(limit.cursor) : {});
          if (!record.until || Number(record.until) < Date.now()) record = { until: Date.now() + 15 * 60000, count: 0 };
          if (Number(record.count) >= 20) throw new AutomationError(429, 'Too many sign-in attempts. Try again later.');
          record.count = Number(record.count) + 1; limit.cursor = JSON.stringify(record);
        });
        const user = await identities.authenticate(string(data.email), string(data.password,200));
        if (!user) throw new AutomationError(401, 'Email or password is incorrect.');
        const person = unwrap(await gateway.json(`${user.kind === 'worker' ? 'staff' : 'clients'}/${nativeId(user.nativeId)}`));
        if (String(person.id) !== user.nativeId || (user.kind === 'worker' && person.role !== 'staff')) throw new AutomationError(403, 'The linked ShiftCare identity could not be verified.');
        return send(200, { account: { name: user.name || user.email, kind: user.kind } }, { 'Set-Cookie': identities.cookie(user, req) });
      }
      if (!account) throw new AutomationError(401, 'Sign in with your own verified service account.');
      if (action === 'bookings' && req.method === 'GET') {
        const today = localDate(new Date(), policy(env).timeZone), to = new Date(`${today}T00:00:00Z`); to.setUTCDate(to.getUTCDate()+7);
        const shifts = await gateway.list('shifts', 'shifts', { ...gateway.window(today,to.toISOString().slice(0,10)), [account.kind === 'worker' ? 'staff_id' : 'client_id']: [account.nativeId], include_clients: true, include_staff: true, time_zone: 'account' }, 15);
        const state = await runtime.store.read();
        const bookings = shifts.filter(shift => rows(account.kind === 'worker' ? shift.staff : shift.clients).some(p => String(p.id) === account.nativeId)).map(shift => {
          const item = projection(shift, state.arrivals?.[String(shift.id)]);
          if (account.kind === 'client') item.clients = item.clients.filter(c => String(c.id) === account.nativeId);
          return item;
        });
        const requests = state.jobs.filter(j => j.sourceKind === 'native-portal' && j.payload.portalAccount === hash({ email: account.email, scope: runtime.store.scope })).slice(-20).map(j => ({ id: j.id, workflow: j.workflow, status: ['completed','rejected'].includes(j.status) ? j.status : 'office-review', createdAt: j.createdAt, shiftId: j.payload.shiftId }));
        return send(200, { bookings, requests, arrivalsEnabled: env.OCD_ARRIVAL_ENABLED === 'true' });
      }
      if (req.method !== 'POST') throw new AutomationError(404, 'Unknown service query.');
      const shift = unwrap(await gateway.json(`shifts/${nativeId(data.shiftId)}`, { include_clients: true, include_staff: true, time_zone: 'account' }));
      assigned(shift, account);
      if (action === 'request') {
        const kind = string(data.kind), requestId = string(data.requestId,100), reason = string(data.reason,2000);
        if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId) || !['confirm','cancel','change','sickness'].includes(kind) || (kind !== 'confirm' && !reason)) throw new AutomationError(422, 'Choose a request, supply its reason and retry identifier.');
        if (account.kind === 'worker' && !['sickness','change'].includes(kind)) throw new AutomationError(403, 'Workers can report sickness or a change for their own service.');
        if (account.kind === 'client' && kind === 'sickness') throw new AutomationError(403, 'Choose a participant service request.');
        if (shift.cancelled_at || shift.is_approved) throw new AutomationError(409, 'The service is already cancelled or completed. Contact the office.');
        const workflow = kind === 'confirm' ? 'W06' : kind === 'cancel' ? 'W07' : 'W08';
        const job = await runtime.service.enqueue({ workflow, sourceId: `portal:${account.email}:${requestId}`, sourceKind: 'native-portal', payload: { evidenceReference: `Authenticated ${account.kind} service request`, portalAccount: hash({ email: account.email, scope: runtime.store.scope }), shiftId: String(shift.id), nativeId: account.kind === 'client' ? account.nativeId : '', workerId: account.kind === 'worker' ? account.nativeId : '', response: kind === 'confirm' ? 'yes' : kind, reason, scopeChecked: false, participantAgreed: account.kind === 'client', nativeContext: { clients: rows(shift.clients).map(c=>({id:c.id})), staff: rows(shift.staff).map(s=>({id:s.id})) }, nativeSnapshotHash: hash(shift) } }, account.email);
        await runtime.service.process(); return send(201, { request: { id: job.id, status: 'office-review' } });
      }
      if (!['start','eta','stop','arrive','unavailable'].includes(action)) throw new AutomationError(404, 'Unknown service action.');
      if (account.kind !== 'worker' || env.OCD_ARRIVAL_ENABLED !== 'true') throw new AutomationError(403, 'Arrival sharing is available only to the assigned worker when enabled.');
      active(shift);
      const assignmentHash = hash({ staff: shift.staff, startAt: shift.start_at, endAt: shift.end_at });
      if (action === 'start') {
        if (data.consent !== true) throw new AutomationError(422, 'Choose to share the journey before starting.');
        const journey = { workerId: account.nativeId, sessionId: crypto.randomUUID(), assignmentHash, phase: 'locating', consent: true, updatedAt: Date.now(), remainingMinutes: null };
        await runtime.store.mutate(state => { state.arrivals ||= {}; state.arrivals[String(shift.id)] = journey; });
        return send(200, { journey });
      }
      const previous = (await runtime.store.read()).arrivals?.[String(shift.id)];
      if (!previous || previous.workerId !== account.nativeId || previous.sessionId !== data.sessionId || previous.assignmentHash !== assignmentHash || previous.consent !== true) throw new AutomationError(409, 'The journey ended or the service assignment changed.');
      let minutes: number | null = null, observedAt = Date.now();
      if (action === 'eta') {
        const coords = data.coordinates, accuracy = data.accuracy;
        observedAt = Number(data.observedAt);
        if (!Array.isArray(coords) || coords.length !== 2 || !coords.every(Number.isFinite) || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) >= 85 || typeof accuracy !== 'number' || accuracy < 0 || accuracy > 150 || !Number.isFinite(observedAt) || observedAt > Date.now() || Date.now()-observedAt > policy(env).etaFreshSeconds*1000 || observedAt <= Number(previous.updatedAt)) throw new AutomationError(422, 'A fresh, accurate device location is required.');
        const token = env.MAPBOX_PUBLIC_TOKEN;
        if (!token?.startsWith('pk.') || !string(shift.address,1000)) throw new AutomationError(503, 'A Mapbox connection and verified service address are required.');
        const geo = new URL('https://api.mapbox.com/search/geocode/v6/forward');
        geo.search = new URLSearchParams({ q: String(shift.address).slice(0,256), access_token: token, limit: '1', types:'address', autocomplete:'false' }).toString();
        const geocoded = await fetchImpl(geo, { redirect: 'error', signal: AbortSignal.timeout(8000) });
        const result = object(await geocoded.json()), features = rows(result.features), destination = object(features[0]?.geometry).coordinates, properties = object(features[0]?.properties);
        if (!geocoded.ok || !Array.isArray(destination) || destination.length !== 2 || !destination.every(Number.isFinite) || Math.abs(destination[0]) > 180 || Math.abs(destination[1]) >= 85 || !['exact','high'].includes(string(object(properties.match_code).confidence))) throw new AutomationError(502, 'The service address could not be matched confidently. Contact the office to check the address.');
        const directions = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords.join(',')};${destination.join(',')}`);
        directions.search = new URLSearchParams({ access_token: token, overview: 'false', steps: 'false' }).toString();
        const routed = await fetchImpl(directions, { redirect: 'error', signal: AbortSignal.timeout(8000) });
        const route = object(await routed.json()), duration = rows(route.routes)[0]?.duration;
        if (!routed.ok || route.code !== 'Ok' || typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) throw new AutomationError(502, 'The arrival estimate could not be calculated.');
        minutes = Math.max(1,Math.ceil(duration/60));
        // Recheck authorization after the external route request. Coordinates are never stored.
        const latest = unwrap(await gateway.json(`shifts/${nativeId(shift.id)}`, { include_clients: true, include_staff: true, time_zone: 'account' }));
        assigned(latest,account); active(latest);
        if (hash({staff:latest.staff,startAt:latest.start_at,endAt:latest.end_at}) !== assignmentHash) throw new AutomationError(409, 'The service changed while calculating the arrival estimate.');
      }
      const journey = await runtime.store.mutate(state => {
        const current = state.arrivals?.[String(shift.id)];
        if (!current || current.sessionId !== previous.sessionId || current.consent !== true || Number(current.updatedAt) > observedAt) throw new AutomationError(409, 'The journey changed while updating it.');
        Object.assign(current, { phase: action === 'eta' ? 'en-route' : action === 'arrive' ? 'arrived' : action === 'stop' ? 'stopped' : 'stale', consent: action === 'stop' ? false : true, updatedAt: observedAt, remainingMinutes: minutes });
        return structuredClone(current);
      });
      return send(200, { journey });
    } catch (error) { send(error instanceof AutomationError ? error.status : 503, { error: error instanceof AutomationError ? error.message : 'The live service is unavailable. Contact the office or retry later.' }); }
  };
}
export const handlePortal = createPortalHandler();
