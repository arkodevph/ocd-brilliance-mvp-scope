const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const path = require('node:path');

test('the sedan asset includes every external texture needed by the GLB', () => {
  const modelPath = path.join(__dirname, '../assets/vehicles/sedan.glb');
  const bytes = fs.readFileSync(modelPath);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  const model = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  for (const image of model.images || []) {
    if (image.uri)
      assert.equal(
        fs.existsSync(path.join(path.dirname(modelPath), image.uri)),
        true,
        `Missing model texture: ${image.uri}`,
      );
  }
});

async function setup(area = 'worker', options = {}) {
  let now = 1000000;
  const nodes = new Map(),
    timers = new Map(),
    maps = [],
    markers = [];
  const node = () => ({
    innerHTML: '',
    textContent: '',
    hidden: false,
    style: {},
    checked: false,
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ top: 0, bottom: 600, left: 0, right: 350 }),
  });
  const root = {
    ...node(),
    addEventListener(event, handler) {
      this[event] = handler;
    },
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, node());
      return nodes.get(selector);
    },
  };
  class MapboxMap {
    constructor() {
      this.sources = new Map();
      this.layers = new Map();
      this.events = {};
      maps.push(this);
    }
    on(event, handler) {
      this.events[event] = handler;
    }
    addControl() {}
    addModel(id, url) {
      this.model = { id, url };
    }
    addSource(id, source) {
      this.sources.set(id, {
        data: source.data,
        setData(data) {
          this.data = data;
        },
      });
    }
    getSource(id) {
      return this.sources.get(id);
    }
    addLayer(layer) {
      this.layers.set(layer.id, layer);
    }
    setPaintProperty(id, property, value) {
      this.layers.get(id).paint[property] = value;
    }
    fitBounds() {}
    resize() {}
    remove() {
      this.removed = true;
    }
  }
  class Marker {
    constructor(options) {
      this.options = options;
      markers.push(this);
    }
    setLngLat(position) {
      this.position = position;
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      this.removed = true;
    }
  }
  const box = {
    window: {
      isSecureContext: true,
      location: { href: 'http://localhost/' },
      OCD_MAPBOX_CONFIG: { accessToken: 'pk.test' },
      mapboxgl: {
        Map: MapboxMap,
        Marker,
        supported: () => true,
        NavigationControl: class {},
        AttributionControl: class {},
        FullscreenControl: class {},
        LngLatBounds: class {
          extend() {
            return this;
          }
        },
      },
    },
    document: { getElementById: () => root, createElement: node },
    localStorage: { getItem: () => null },
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    matchMedia: () => ({ matches: false }),
    setInterval: (fn) => {
      const id = timers.size + 1;
      timers.set(id, fn);
      return id;
    },
    clearInterval: (id) => timers.delete(id),
    setTimeout: () => 1,
    clearTimeout() {},
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    AbortController,
    URL,
    URLSearchParams,
    navigator: { geolocation: options.geolocation },
    fetch: async (url, init) => {
      if (new URL(url).searchParams.get('overview') === 'false' && options.fetchEta)
        return options.fetchEta(url, init);
      throw new Error('Directions offline');
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/data.js'), 'utf8'), box);
  vm.runInNewContext(fs.readFileSync(require.resolve('../workspace/maps.js'), 'utf8'), box);
  const state = structuredClone(box.window.OCD_DEMO_SEED);
  let saves = 0;
  box.window.OCD_MAPS.mount({
    area,
    state,
    workerId: 'WRK-01',
    clientId: 'PAR-101',
    bookingId: 'BKG-501',
    save: () => saves++,
  });
  await new Promise((resolve) => setImmediate(resolve));
  maps[0].events.load();
  return {
    state,
    root,
    maps,
    markers,
    timers,
    window: box.window,
    access: box.window.OCD_MAPS,
    advance(ms) {
      now += ms;
      for (const tick of timers.values()) tick();
    },
    click(action) {
      root.click({
        target: {
          closest: (selector) =>
            selector === '[data-map-action]' ? { dataset: { mapAction: action } } : null,
        },
      });
    },
    saves: () => saves,
  };
}

test('offline directions still animate the installed sedan along a labelled sample route', async () => {
  const f = await setup();
  assert.match(f.root.querySelector('[data-map-detail]').innerHTML, /Illustrative demo route/);
  assert.equal(f.maps[0].model.url, 'http://localhost/assets/vehicles/sedan.glb');
  f.click('play');
  assert.equal(Boolean(f.state.journeys['BKG-501']?.consent), false);
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('play');
  const source = f.maps[0].getSource('booking-vehicle');
  const start = [...source.data.geometry.coordinates];
  f.advance(15000);
  assert.notDeepEqual([...source.data.geometry.coordinates], start);
  assert.equal(
    f.access.snapshot(
      f.state,
      f.state.bookings.find((b) => b.id === 'BKG-501'),
      1015000,
    ).progress,
    0.25,
  );
  assert.match(f.root.querySelector('[data-map-eta]').innerHTML, /min/);
  assert.equal(f.maps[0].getSource('booking-travelled').data.geometry.type, 'LineString');
  f.advance(45000);
  assert.equal(f.state.journeys['BKG-501'].phase, 'arrived');
  assert.deepEqual(
    [...source.data.geometry.coordinates],
    f.state.participants.find((p) => p.id === 'PAR-101').location.coordinates,
  );
  assert.equal(
    f.state.visits.some((v) => v.bookingId === 'BKG-501'),
    false,
  );
  f.click('play');
  assert.deepEqual([...source.data.geometry.coordinates], start);
  f.access.unmount();
  assert.equal(f.timers.size, 0);
});

async function locationFixture(area = 'worker', fetchEta) {
  const gps = {
    cleared: [],
    calls: 0,
    watchPosition(success, error) {
      this.calls++;
      this.success = success;
      this.error = error;
      return 7;
    },
    clearWatch(id) {
      this.cleared.push(id);
    },
  };
  let duration = 1200;
  const requests = [];
  const f = await setup(area, {
    geolocation: gps,
    fetchEta:
      fetchEta ||
      (async (url) => {
        requests.push(String(url));
        return {
          ok: true,
          json: async () => ({ code: 'Ok', routes: [{ duration }] }),
        };
      }),
  });
  const b = f.state.bookings.find((b) => b.id === 'BKG-501');
  const fix = {
    timestamp: 1000000,
    coords: { longitude: 115.123456, latitude: -31.123456, accuracy: 15 },
  };
  return {
    ...f,
    gps,
    requests,
    b,
    fix,
    setDuration(value) {
      duration = value;
    },
    async emit(position = fix) {
      gps.success(position);
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

test('location ETA needs its own consent, persists no origin, and shows the car only nearby', async (t) => {
  const f = await locationFixture();
  t.after(() => f.access.unmount());
  f.click('location');
  assert.equal(f.gps.calls, 0);
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('location');
  assert.match(f.root.querySelector('[data-map-detail]').innerHTML, /Getting location/);
  await f.emit();
  assert.equal(f.access.snapshot(f.state, f.b, 1000000).remainingMinutes, 20);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.features.length, 0);
  assert.equal(f.maps[0].getSource('booking-route').data.features.length, 0);
  assert.doesNotMatch(
    JSON.stringify(f.state.journeys),
    /115\.123456|-31\.123456|coordinates|geometry/,
  );
  assert.match(f.requests[0], /overview=false/);
  assert.doesNotMatch(
    f.root.querySelector('[data-map-detail]').innerHTML,
    /115\.123456|-31\.123456/,
  );
  f.advance(15000);
  f.setDuration(300);
  await f.emit({ ...f.fix, timestamp: 1015000 });
  assert.match(f.root.querySelector('[data-map-detail]').innerHTML, /Worker is nearby/);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.geometry.type, 'Point');
  assert.equal(f.maps[0].getSource('booking-travelled').data.features.length, 0);
  const summary = f.access.summary(f.state, f.b);
  assert.match(summary, /Worker is nearby/);
  f.advance(120001);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.features.length, 0);
  assert.match(f.access.summary(f.state, f.b), /ETA unavailable/);
});

test('denied location withdraws ETA; fresh fixes can recover; arrival stops watching', async (t) => {
  const f = await locationFixture();
  t.after(() => f.access.unmount());
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('location');
  f.setDuration(120);
  await f.emit();
  f.gps.error({ code: 1 });
  assert.equal(f.access.snapshot(f.state, f.b, 1000000).remainingMinutes, null);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.features.length, 0);
  f.advance(15000);
  await f.emit({ ...f.fix, timestamp: 1015000 });
  assert.equal(f.access.snapshot(f.state, f.b, 1015000).nearby, true);
  f.click('arrive');
  assert.deepEqual(f.gps.cleared, [7]);
  await f.emit({ ...f.fix, timestamp: 1015000 });
  assert.equal(f.state.journeys[f.b.id].phase, 'arrived');
});

test('old, inaccurate and future fixes never produce a fresh ETA', async (t) => {
  const f = await locationFixture();
  t.after(() => f.access.unmount());
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('location');
  for (const fix of [
    { ...f.fix, timestamp: 800000 },
    { ...f.fix, timestamp: 1000001 },
    { ...f.fix, coords: { ...f.fix.coords, accuracy: 500 } },
  ]) {
    await f.emit(fix);
    assert.equal(f.access.snapshot(f.state, f.b, 1000000).phase, 'stale');
  }
  assert.equal(f.requests.length, 0);
});

test('late ETA responses cannot restart stopped, cancelled or unmounted sharing', async () => {
  for (const action of ['stop', 'cancel', 'unmount']) {
    let resolve;
    const f = await locationFixture(
      'worker',
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    f.root.querySelector('[data-journey-consent]').checked = true;
    f.click('location');
    f.gps.success(f.fix);
    if (action === 'cancel') {
      f.b.status = 'Cancelled';
      f.advance(100);
    } else if (action === 'unmount') f.access.unmount();
    else f.click(action);
    resolve({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [{ duration: 120 }] }),
    });
    await new Promise((done) => setImmediate(done));
    assert.deepEqual(f.gps.cleared, [7]);
    assert.equal(f.access.snapshot(f.state, f.b, 1000000).remainingMinutes, null);
    f.access.unmount();
  }
});

test('client sees ETA first and an approximate nearby car without requesting employee GPS', async (t) => {
  const f = await locationFixture('client');
  t.after(() => f.access.unmount());
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('location');
  assert.equal(f.gps.calls, 0);
  assert.doesNotMatch(
    f.root.querySelector('[data-map-detail]').innerHTML,
    /Navigate with Google Maps|data-map-action="location"/,
  );
  f.state.journeys[f.b.id] = {
    workerId: f.b.workerId,
    date: f.b.date,
    start: f.b.start,
    mode: 'location',
    consent: true,
    phase: 'en-route',
    updatedAt: 1000000,
    remainingMinutes: 20,
  };
  f.advance(100);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.features.length, 0);
  f.state.journeys[f.b.id].remainingMinutes = 5;
  f.advance(100);
  assert.match(f.root.querySelector('[data-map-detail]').innerHTML, /Worker is nearby/);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.geometry.type, 'Point');
  assert.equal(f.maps[0].getSource('booking-route').data.features.length, 0);
  assert.equal(f.maps[0].getSource('booking-travelled').data.features.length, 0);
  f.advance(120000);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.features.length, 0);
});

test('missing GPS or Mapbox configuration offers manual arrival without a fabricated ETA', async (t) => {
  const f = await setup();
  t.after(() => f.access.unmount());
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('location');
  assert.match(f.root.querySelector('[data-journey-error]').textContent, /location support/);
  assert.equal(f.maps[0].getSource('booking-vehicle').data.features.length, 0);
  f.click('arrive');
  assert.equal(f.state.journeys['BKG-501'].phase, 'arrived');
  const g = await locationFixture();
  t.after(() => g.access.unmount());
  g.window.OCD_MAPBOX_CONFIG.accessToken = '';
  g.root.querySelector('[data-journey-consent]').checked = true;
  g.click('location');
  assert.match(g.root.querySelector('[data-journey-error]').textContent, /connect Mapbox/);
  assert.equal(g.gps.calls, 0);
});

test('directions failures and GPS errors during a request cannot leave a live estimate', async (t) => {
  const f = await locationFixture('worker', async () => ({ ok: false }));
  t.after(() => f.access.unmount());
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('location');
  await f.emit();
  assert.equal(f.state.journeys[f.b.id].phase, 'stale');
  let resolve;
  const g = await locationFixture(
    'worker',
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  t.after(() => g.access.unmount());
  g.root.querySelector('[data-journey-consent]').checked = true;
  g.click('location');
  g.gps.success(g.fix);
  g.gps.error({ code: 2 });
  resolve({
    ok: true,
    json: async () => ({ code: 'Ok', routes: [{ duration: 120 }] }),
  });
  await new Promise((done) => setImmediate(done));
  assert.equal(g.state.journeys[g.b.id].phase, 'stale');
});

test('pause holds the vehicle; resume continues; stopping removes location sharing', async () => {
  const f = await setup();
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('play');
  f.advance(20000);
  f.click('pause');
  const source = f.maps[0].getSource('booking-vehicle');
  const paused = [...source.data.geometry.coordinates];
  f.advance(10000);
  assert.deepEqual([...source.data.geometry.coordinates], paused);
  f.click('play');
  f.advance(10000);
  assert.notDeepEqual([...source.data.geometry.coordinates], paused);
  f.click('stop');
  assert.equal(f.state.journeys['BKG-501'].consent, false);
  assert.equal(source.data.features.length, 0);
  f.access.unmount();
});

test('the sedan nose faces its direction of travel on both legs of the route', async () => {
  const f = await setup();
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('play');
  const source = f.maps[0].getSource('booking-vehicle');
  for (const elapsed of [5000, 45000]) {
    f.advance(elapsed);
    const before = [...source.data.geometry.coordinates];
    const rotation =
      (f.maps[0].layers.get('booking-vehicle-model').paint['model-rotation'][2] * Math.PI) / 180;
    f.advance(100);
    const after = source.data.geometry.coordinates;
    const east = (after[0] - before[0]) * Math.cos((before[1] * Math.PI) / 180);
    const north = after[1] - before[1];
    const alignment =
      (-Math.sin(rotation) * east - Math.cos(rotation) * north) / Math.hypot(east, north);
    assert.ok(alignment > 0.99, `Car nose must face forward, alignment was ${alignment}`);
  }
  f.access.unmount();
});

test('stale estimates hide the car and cannot be mistaken for current arrival data', async () => {
  const f = await setup();
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('play');
  f.advance(5000);
  f.click('stale');
  assert.equal(f.maps[0].getSource('booking-vehicle').data.features.length, 0);
  assert.match(f.root.querySelector('[data-map-detail]').innerHTML, /Arrival update unavailable/);
  f.access.unmount();
});

test('client view cannot start a worker journey and does not expose the worker route', async () => {
  const f = await setup('client');
  f.root.querySelector('[data-journey-consent]').checked = true;
  f.click('play');
  assert.equal(f.state.journeys['BKG-501'], undefined);
  assert.equal(f.maps[0].getSource('booking-route').data.features.length, 0);
  assert.doesNotMatch(
    f.root.querySelector('[data-map-detail]').innerHTML,
    /data-map-action="play"/,
  );
  const b = f.state.bookings.find((b) => b.id === 'BKG-501');
  f.state.journeys[b.id] = {
    workerId: b.workerId,
    date: b.date,
    start: b.start,
    phase: 'en-route',
    consent: true,
    updatedAt: 1000000,
    startedAt: 1000000,
    progress: 0,
    running: true,
    playbackMs: 60000,
  };
  f.advance(10000);
  const clientCar = f.maps[0].getSource('booking-vehicle');
  assert.equal(clientCar.data.features.length, 0, 'ETA only until nearby');
  f.advance(35000);
  const before = [...clientCar.data.geometry.coordinates];
  f.advance(5000);
  assert.notDeepEqual([...clientCar.data.geometry.coordinates], before);
  assert.equal(f.maps[0].getSource('booking-route').data.features.length, 0);
  assert.equal(f.maps[0].getSource('booking-travelled').data.features.length, 0);
  f.access.unmount();
});
