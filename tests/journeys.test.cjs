const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const test = require('node:test');

test('Nest arrival backend persists shared ETA, protects origins and rejects late updates', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ocd-arrivals-'));
  const keys = [
    'WORKFLOW_DATA_DIR',
    'WORKFLOW_STAFF_ACCOUNTS',
    'WORKFLOW_SESSION_SECRET',
    'MAPBOX_PUBLIC_TOKEN',
    'VERCEL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  Object.assign(process.env, {
    WORKFLOW_DATA_DIR: directory,
    WORKFLOW_SESSION_SECRET: 'fictional-arrival-secret-longer-than-32-characters',
    WORKFLOW_STAFF_ACCOUNTS: JSON.stringify([
      { email: 'office@example.test', password: 'test', role: 'admin' },
      { email: 'reader@example.test', password: 'test', role: 'reader' },
    ]),
    MAPBOX_PUBLIC_TOKEN: 'pk.test',
  });
  const realFetch = global.fetch;
  let duration = 1200,
    routeCalls = 0,
    pendingRoute;
  global.fetch = async (url, init) => {
    if (!String(url).startsWith('https://api.mapbox.com/')) return realFetch(url, init);
    routeCalls++;
    assert.match(String(url), /overview=false/);
    if (pendingRoute)
      return new Promise((resolve) => {
        pendingRoute.resolve = resolve;
      });
    return new Response(JSON.stringify({ code: 'Ok', routes: [{ duration }] }));
  };
  const { sessionCookie } = require('../lib/staff-auth.cjs');
  const cookie = (email) => sessionCookie(email, { headers: {} }).split(';')[0];
  let server = http.createServer(require('../api/journeys.js'));
  async function listen() {
    server.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
  }
  await listen();
  t.after(async () => {
    global.fetch = realFetch;
    await new Promise((resolve) => server.close(resolve));
    const { getApplication } = require('../.backend/application.js');
    await (await getApplication()).close();
    await fs.rm(directory, { recursive: true, force: true });
    for (const key of keys)
      original[key] === undefined ? delete process.env[key] : (process.env[key] = original[key]);
  });
  const call = async (data, query = '', email = 'office@example.test', origin) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await realFetch(`${base}/api/journeys${query}`, {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(email ? { Cookie: cookie(email) } : {}),
        Origin: origin || base,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    return { status: response.status, body: await response.json() };
  };
  const start = async (bookingId = 'BKG-501', workerId = 'WRK-01') =>
    call({ action: 'start', bookingId, workerId, consent: true });
  const eta = (journey) => ({
    action: 'eta',
    bookingId: 'BKG-501',
    workerId: 'WRK-01',
    sessionId: journey.sessionId,
    coordinates: [115.123456, -31.123456],
    accuracy: 10,
    observedAt: Date.now(),
  });
  assert.equal((await call(null, '?area=office', '')).status, 401);
  assert.equal((await call({ action: 'start' }, '', 'reader@example.test')).status, 403);
  assert.equal(
    (await call(null, '?area=office', 'office@example.test', 'https://different.test')).status,
    403,
  );
  assert.equal((await start('BKG-501', 'WRK-02')).status, 403);
  assert.equal((await start('BKG-502', 'WRK-02')).status, 409);
  assert.equal(
    (
      await call({
        action: 'start',
        bookingId: 'BKG-501',
        workerId: 'WRK-01',
        consent: false,
      })
    ).status,
    422,
  );

  let journey = (await start()).body.journey;
  assert.equal((await call({ ...eta(journey), accuracy: 500 })).status, 422);
  assert.equal((await call({ ...eta(journey), observedAt: Date.now() - 130000 })).status, 422);
  assert.equal((await call({ ...eta(journey), coordinates: [999, 0] })).status, 422);
  assert.equal(routeCalls, 0);
  assert.equal((await call(eta(journey))).body.journey.remainingMinutes, 20);
  const client = await call(null, '?area=client&id=PAR-101');
  assert.equal(client.body.journeys['BKG-501'].remainingMinutes, 20);
  assert.equal(client.body.journeys['BKG-501'].sessionId, undefined);
  assert.equal(
    client.body.bookings.every((b) => b.participantId === 'PAR-101'),
    true,
  );
  assert.doesNotMatch(JSON.stringify(client.body), /115\.123456|-31\.123456|destination|geometry/);
  assert.equal((await call(null, '?area=client&id=PAR-102')).body.journeys['BKG-501'], undefined);
  const persisted = await fs.readFile(path.join(directory, 'journeys.json'), 'utf8');
  assert.doesNotMatch(persisted, /115\.123456|-31\.123456|pk\.test|accuracy|geometry/);
  await new Promise((resolve) => server.close(resolve));
  server = http.createServer(require('../api/journeys.js'));
  await listen();
  assert.equal(
    (await call(null, '?area=client&id=PAR-101')).body.journeys['BKG-501'].remainingMinutes,
    20,
  );

  duration = 180;
  assert.equal((await call(eta(journey))).body.journey.remainingMinutes, 3);
  assert.equal(
    (
      await call({
        action: 'unavailable',
        bookingId: 'BKG-501',
        workerId: 'WRK-01',
        sessionId: journey.sessionId,
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(null, '?area=client&id=PAR-101')).body.journeys['BKG-501'].remainingMinutes,
    null,
  );
  journey = (await start()).body.journey;
  pendingRoute = {};
  const delayed = call(eta(journey));
  for (let i = 0; !pendingRoute.resolve && i < 100; i++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(pendingRoute.resolve);
  assert.equal(
    (
      await call({
        action: 'stop',
        bookingId: 'BKG-501',
        workerId: 'WRK-01',
        sessionId: journey.sessionId,
      })
    ).status,
    200,
  );
  pendingRoute.resolve(new Response(JSON.stringify({ code: 'Ok', routes: [{ duration: 120 }] })));
  assert.equal((await delayed).status, 409);
  pendingRoute = null;
  assert.equal((await call(eta(journey))).status, 409);
  const next = (await start()).body.journey;
  assert.notEqual(next.sessionId, journey.sessionId);
  assert.equal((await call(eta(journey))).status, 409);
  assert.equal(
    (
      await call({
        action: 'arrive',
        bookingId: 'BKG-501',
        workerId: 'WRK-01',
        sessionId: next.sessionId,
      })
    ).status,
    200,
  );
  assert.equal((await call(eta(next))).status, 409);

  journey = (await start()).body.journey;
  const roster = (await call(null, '?area=office')).body.bookings;
  const b = roster.find((b) => b.id === 'BKG-501');
  b.status = 'Cancelled';
  assert.equal((await call({ action: 'publish', bookings: roster })).status, 200);
  assert.equal((await call(eta(journey))).status, 409);
  assert.equal((await call(null, '?area=client&id=PAR-101')).body.journeys['BKG-501'], undefined);
  b.status = 'Confirmed';
  b.workerId = 'WRK-02';
  assert.equal((await call({ action: 'publish', bookings: roster })).status, 200);
  assert.equal((await start()).status, 403);

  const { read, update, storage } = require('../.backend/journeys/journey-store.js');
  const store = storage();
  await update(store, (data) => {
    const j = (data.journeys['BKG-503'] = {
      ...next,
      workerId: 'WRK-01',
      date: '2026-10-06',
      start: '10:00',
      phase: 'en-route',
      remainingMinutes: 2,
      updatedAt: Date.now() - 130000,
    });
    return j;
  });
  assert.equal(
    (await call(null, '?area=client&id=PAR-101')).body.journeys['BKG-503'].phase,
    'stale',
  );
  assert.equal((await read(storage())).journeys['BKG-503'].remainingMinutes, 2);
});

test('procedural store retries Redis revision conflicts without dropping another update', async () => {
  const { read, update } = require('../.backend/journeys/journey-store.js');
  let record = { revision: 'old', bookings: [], journeys: {} },
    calls = 0;
  const store = {
    redis: {
      get: async () => structuredClone(record),
      eval: async (_, keys, args) => {
        assert.deepEqual(keys, ['ocd:journeys']);
        if (++calls === 1) {
          record = {
            ...record,
            revision: 'changed',
            journeys: { other: { phase: 'arrived' } },
          };
          return 0;
        }
        assert.equal(args[0], record.revision);
        record = JSON.parse(args[1]);
        return 1;
      },
    },
  };
  await update(store, (data) => {
    data.journeys.new = { phase: 'locating' };
    return 'done';
  });
  assert.equal((await read(store)).journeys.other.phase, 'arrived');
  assert.equal((await read(store)).journeys.new.phase, 'locating');
  assert.equal(calls, 2);
});
