/* Mapbox booking maps. Journey locations and arrival times are simulated demo data. */
(() => {
  "use strict";
  const TOKEN_STORE = "ocd-mapbox-public-token";
  const SDK_VERSION = "3.32.0";
  const preferences = new Map();
  const routeCache = new Map();
  let sdkPromise;
  let runtimeToken = "";
  let active;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const glyphs = {
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    car: '<path d="m5 8 2-4h10l2 4M4 8h16v10H4V8ZM7 18v3M17 18v3M7 12h.01M17 12h.01M8 15h8"/>',
    fit: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><circle cx="12" cy="12" r="3"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    play: '<path d="m8 4 12 8-12 8V4Z"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name] || glyphs.map}</svg>`;
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const dateLabel = date => new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00Z`));
  const validCoordinates = coords => Array.isArray(coords) && coords.length === 2 && coords.every(Number.isFinite) && Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) < 85;
  const locationFor = (ctx, b) => ctx.state.participants.find(p => p.id === b.participantId);
  const workerFor = (ctx, b) => ctx.state.workers.find(w => w.id === b.workerId);
  const officeFor = ctx => ctx.state.mapOffice || window.OCD_DEMO_SEED.mapOffice;
  const trackingAllowed = b => b?.status === "Confirmed";

  function token() {
    if (runtimeToken) return runtimeToken;
    try {
      const saved = localStorage.getItem(TOKEN_STORE);
      if (saved?.startsWith("pk.")) return saved;
    } catch (_) { /* use the configured token if browser storage is unavailable */ }
    const configured = window.OCD_MAPBOX_CONFIG?.accessToken?.trim() || "";
    return configured.startsWith("pk.") ? configured : "";
  }

  function scopedBookings(ctx) {
    return ctx.state.bookings.filter(b => b.status !== "Proposed" && (
      ctx.area === "office" ||
      ctx.area === "worker" && b.workerId === ctx.workerId ||
      ctx.area === "client" && b.participantId === ctx.clientId
    )).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  }

  function prepare(ctx) {
    const key = `${ctx.area}:${ctx.area === "worker" ? ctx.workerId : ctx.area === "client" ? ctx.clientId : "all"}`;
    if (!preferences.has(key)) {
      const bookings = scopedBookings(ctx);
      preferences.set(key, { date: bookings.some(b => b.date === "2026-10-05") ? "2026-10-05" : bookings.find(trackingAllowed)?.date || bookings[0]?.date || "2026-10-05", selected: "", worker: "", threeD: true });
    }
    const pref = preferences.get(key);
    const requested = scopedBookings(ctx).find(b => b.id === ctx.bookingId);
    if (requested && pref.requested !== requested.id) {
      pref.date = requested.date;
      pref.selected = requested.id;
      pref.worker = "";
      pref.requested = requested.id;
    }
    return pref;
  }

  function visibleBookings(ctx, pref) {
    return scopedBookings(ctx).filter(b => b.date === pref.date && (ctx.area !== "office" || !pref.worker || b.workerId === pref.worker));
  }

  function snapshot(state, b, now = Date.now()) {
    const journey = state.journeys?.[b?.id];
    if (!trackingAllowed(b) || !journey || journey.workerId !== b.workerId || journey.date !== b.date || journey.start !== b.start) return { phase: "not-started", progress: 0, running: false, remainingMinutes: null };
    let progress = clamp(journey.progress);
    if (journey.running && Number.isFinite(journey.startedAt) && Number.isFinite(journey.playbackMs) && journey.playbackMs > 0) {
      progress = clamp(progress + (1 - progress) * Math.max(0, now - journey.startedAt) / journey.playbackMs);
    }
    const phase = progress >= 1 || journey.phase === "arrived" ? "arrived" : journey.phase === "en-route" ? "en-route" : "not-started";
    return { phase, progress: phase === "arrived" ? 1 : progress, running: phase === "en-route" && Boolean(journey.running), remainingMinutes: phase === "en-route" ? Math.max(1, Math.ceil((journey.durationSeconds || 960) * (1 - progress) / 60)) : null, arrivalTime: journey.arrivalTime || b.start };
  }

  function reconcileJourneys(state) {
    for (const [id, journey] of Object.entries(state.journeys || {})) {
      const b = state.bookings.find(b => b.id === id);
      if (!trackingAllowed(b) || journey.workerId !== b.workerId || journey.date !== b.date || journey.start !== b.start) { delete state.journeys[id]; continue; }
      if (state.visits.some(v => v.bookingId === id && v.clockIn)) {
        journey.phase = "arrived"; journey.progress = 1; journey.running = false; delete journey.startedAt;
      }
    }
  }

  function phaseLabel(b, snap) {
    if (b.status === "Needs cover") return "Cover being arranged";
    if (b.status === "Cancelled") return "Booking cancelled";
    if (b.status === "Completed") return "Visit completed";
    if (!trackingAllowed(b)) return b.status;
    return snap.phase === "en-route" ? "Worker on the way" : snap.phase === "arrived" ? "Worker has arrived" : "Journey not started";
  }

  function page(ctx) {
    const pref = prepare(ctx);
    const titles = { office: ["Office / Booking map", "Booking map", "See service locations, assignments and worker arrivals in one place."], worker: ["Worker / Visit map", "My visit map", "Check your bookings and share a demo journey with the office and participant."], client: ["Client portal / Worker arrival", "Track my worker", "See your service bookings and follow your worker’s arrival."] };
    const [eyebrow, title, subtitle] = titles[ctx.area];
    return `<header class="page-header"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div><span class="map-demo-badge">${icon("car")} Simulated journey</span></header>
      <section id="booking-map-workspace" data-map-area="${ctx.area}" aria-label="${title}">
        <div class="map-toolbar"><div class="map-date-control"><button class="btn map-day-button" data-map-action="previous-day" aria-label="Previous service day" type="button">‹</button><label for="map-service-date">Service date<input id="map-service-date" type="date" value="${pref.date}" required></label><button class="btn map-day-button" data-map-action="next-day" aria-label="Next service day" type="button">›</button></div>
        ${ctx.area === "office" ? `<label class="map-worker-filter" for="map-worker-filter">Assignment<select id="map-worker-filter"><option value="">All workers</option>${ctx.state.workers.map(w => `<option value="${esc(w.id)}" ${pref.worker === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label>` : `<span class="map-scope-note">${icon("check")} ${ctx.area === "worker" ? "Only your assigned services" : "Only your participant’s bookings"}</span>`}
        <span class="map-timezone">Demo week · Perth time (AWST)</span></div>
        <div class="map-stats" data-map-stats></div>
        <div class="booking-map-layout"><section class="booking-map-panel" aria-label="Interactive booking map"><div class="booking-map-surface">
          <div id="booking-map-canvas" aria-label="Mapbox map of service locations"></div>
          <div class="map-view-controls"><div class="map-view-toggle" role="group" aria-label="Map perspective"><button type="button" data-map-action="3d" aria-pressed="${pref.threeD}">3D</button><button type="button" data-map-action="2d" aria-pressed="${!pref.threeD}">2D</button></div><button class="btn" type="button" data-map-action="fit">${icon("fit")} <span>Show all</span></button></div>
          <div class="map-fallback" data-map-fallback><span class="map-fallback-symbol">${icon("map")}</span><h2>Preparing your booking map</h2><p>Loading service locations.</p></div>
          <div class="map-selected-label" data-map-selected-label hidden></div>
        </div><footer class="map-footer"><span class="map-connection-state" data-map-connection>Mapbox · 3D service locations</span><div class="map-legend"><span><i></i>Service location</span><span><i class="worker"></i>Demo worker</span><span><i class="cover"></i>Needs cover</span></div>${ctx.area === "office" ? '<button class="link-button" type="button" data-map-action="connection">Map connection</button>' : ""}</footer></section>
        <aside class="map-side-panel"><section class="map-booking-section"><div class="section-heading"><h2>${ctx.area === "office" ? "Service bookings" : "Your bookings"}</h2><span class="map-booking-count" data-map-count></span></div><div class="map-booking-list" data-map-list></div></section><section class="map-arrival-section" data-map-detail></section></aside></div>
        <div class="map-demo-note">${icon("car")}<span>Demo playback uses fictional suburb locations and a simulated worker. It does not track a real person. Start a journey in Worker, then switch to Client to follow the same demo booking.</span></div>
        ${ctx.area === "office" ? '<section class="panel map-connection-panel" data-map-settings hidden><h2>Connect Mapbox</h2><p class="muted">Use a public token from your <a class="map-account-link" href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer">Mapbox account</a>. This connection is saved only in this browser.</p><form data-map-form="connection"><label for="map-public-token">Public access token<input id="map-public-token" name="token" type="password" placeholder="pk.…" autocomplete="off" spellcheck="false" required></label><p class="field-error" data-map-token-error role="alert"></p><div class="button-row"><button class="btn primary" type="submit">Connect map</button><button class="btn" type="button" data-map-action="clear-token">Use configured connection</button></div></form></section>' : ""}
      </section>`;
  }

  function summary(state, b) {
    if (!b) return "";
    const snap = snapshot(state, b);
    const worker = state.workers.find(w => w.id === b.workerId);
    return `<a class="arrival-preview" href="#/client/map/${esc(b.id)}" data-arrival-preview="${esc(b.id)}"><span class="arrival-preview-icon">${icon("car")}</span><span><small>YOUR NEXT SERVICE · ${dateLabel(b.date)}</small><strong data-arrival-title>${phaseLabel(b, snap)}</strong><span>${b.status === "Needs cover" ? "Office arranging cover" : esc(worker?.name || "Your worker")} · <span data-arrival-time>${snap.remainingMinutes ? `About ${snap.remainingMinutes} min away` : snap.phase === "arrived" ? "At your service location" : `Scheduled ${esc(b.start)}`}</span></span><small>Simulated arrival · open booking map</small></span>${icon("arrow")}</a>`;
  }

  function ensureSdk() {
    if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      if (!document.getElementById("mapbox-gl-css")) {
        const link = document.createElement("link");
        link.id = "mapbox-gl-css"; link.rel = "stylesheet"; link.href = `https://api.mapbox.com/mapbox-gl-js/v${SDK_VERSION}/mapbox-gl.css`; document.head.append(link);
      }
      const script = document.createElement("script");
      script.src = `https://api.mapbox.com/mapbox-gl-js/v${SDK_VERSION}/mapbox-gl.js`;
      script.onload = () => {
        if (window.mapboxgl) resolve(window.mapboxgl);
        else { sdkPromise = undefined; script.remove(); reject(new Error("Map SDK unavailable")); }
      };
      script.onerror = () => { sdkPromise = undefined; script.remove(); reject(new Error("Map SDK unavailable")); };
      document.head.append(script);
    });
    return sdkPromise;
  }

  function haversine(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
    const v = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, v)));
  }

  function routePosition(route, progress) {
    const points = route.geometry.coordinates;
    const lengths = points.slice(1).map((p, i) => haversine(points[i], p));
    const total = lengths.reduce((a, b) => a + b, 0);
    const target = total * clamp(progress);
    let covered = 0;
    for (let i = 0; i < lengths.length; i++) {
      if (covered + lengths[i] >= target || i === lengths.length - 1) {
        const ratio = lengths[i] ? clamp((target - covered) / lengths[i]) : 0;
        const position = points[i].map((value, axis) => value + (points[i + 1][axis] - value) * ratio);
        return { position, travelled: [...points.slice(0, i + 1), position] };
      }
      covered += lengths[i];
    }
    return { position: points[0], travelled: [] };
  }
  const lineData = points => points?.length >= 2 ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points } } : { type: "FeatureCollection", features: [] };

  class BookingMap {
    constructor(ctx, root) {
      this.ctx = ctx;
      this.root = root;
      this.pref = prepare(ctx);
      this.markers = [];
      this.disposed = false;
      this.routeVersion = 0;
      this.mapVersion = 0;
      this.routeState = "not-needed";
      this.onClick = this.onClick.bind(this);
      this.onChange = this.onChange.bind(this);
      this.onSubmit = this.onSubmit.bind(this);
      root.addEventListener("click", this.onClick);
      root.addEventListener("change", this.onChange);
      root.addEventListener("submit", this.onSubmit);
      this.refresh();
      this.createMap();
      this.loadRoute();
      this.timer = setInterval(() => this.tick(), 250);
    }
    get bookings() { return visibleBookings(this.ctx, this.pref); }
    get selected() { return this.bookings.find(b => b.id === this.pref.selected); }
    query(selector) { return this.root.querySelector(selector); }

    refresh() {
      const rows = this.bookings;
      if (!rows.some(b => b.id === this.pref.selected)) this.pref.selected = rows.find(trackingAllowed)?.id || rows[0]?.id || "";
      this.query("[data-map-count]").textContent = String(rows.length);
      this.query("[data-map-stats]").innerHTML = `<div><span>Services on this day</span><strong>${rows.length}</strong></div><div><span>Workers on the way</span><strong>${rows.filter(b => snapshot(this.ctx.state, b).phase === "en-route").length}</strong></div><div><span>${this.ctx.area === "client" ? "Participant" : this.ctx.area === "worker" ? "Assigned worker" : "Cover needed"}</span><strong class="map-stat-name">${this.ctx.area === "client" ? esc(this.ctx.state.participants.find(p => p.id === this.ctx.clientId)?.name) : this.ctx.area === "worker" ? esc(this.ctx.state.workers.find(w => w.id === this.ctx.workerId)?.name) : rows.filter(b => b.status === "Needs cover").length}</strong></div>`;
      this.query("[data-map-list]").innerHTML = rows.length ? rows.map((b, index) => {
        const p = locationFor(this.ctx, b), w = workerFor(this.ctx, b), snap = snapshot(this.ctx.state, b);
        return `<button class="map-booking-card ${this.pref.selected === b.id ? "selected" : ""}" type="button" data-map-booking="${esc(b.id)}" aria-pressed="${this.pref.selected === b.id}"><span class="map-booking-number ${b.status === "Needs cover" ? "cover" : b.status === "Cancelled" ? "inactive" : ""}">${index + 1}</span><span class="map-booking-copy"><strong>${this.ctx.area === "client" ? esc(b.service) : esc(p?.name || "Participant")}</strong><span>${esc(b.start)}–${esc(b.end)} · ${esc(p?.suburb || "Location pending")}</span><small>${b.status === "Needs cover" ? "Office arranging cover" : esc(w?.name || "Worker pending")}</small><span class="map-booking-phase" data-booking-phase="${esc(b.id)}">${phaseLabel(b, snap)}</span></span><span class="map-card-chevron">›</span></button>`;
      }).join("") : '<div class="map-no-bookings"><strong>No bookings for this day</strong><p>Choose another service date to see bookings on the map.</p></div>';
      this.renderDetails();
      const selectedLabel = this.query("[data-map-selected-label]");
      const b = this.selected, p = b && locationFor(this.ctx, b);
      const selectedSnap = snapshot(this.ctx.state, b);
      selectedLabel.hidden = !b;
      selectedLabel.innerHTML = b ? `${icon("pin")}<span><strong>${esc(p?.suburb || "Service location pending")}</strong><small>${esc(b.start)}–${esc(b.end)} · ${esc(b.service)}</small>${selectedSnap.phase === "en-route" || selectedSnap.phase === "arrived" ? `<small class="map-overlay-arrival" data-map-overlay-arrival>${selectedSnap.phase === "arrived" ? "Worker has arrived" : "Demo arrival · " + selectedSnap.remainingMinutes + " min away"}</small>` : ""}</span>` : "";
      this.refreshMarkers();
    }

    renderDetails() {
      const b = this.selected;
      if (!b) { this.query("[data-map-detail]").innerHTML = '<div class="map-no-bookings"><strong>Select a service booking</strong><p>Your booking and arrival details will appear here.</p></div>'; return; }
      const p = locationFor(this.ctx, b), w = workerFor(this.ctx, b), snap = snapshot(this.ctx.state, b);
      this.lastPhase = snap.phase;
      this.lastRunning = snap.running;
      const enRoute = snap.phase === "en-route", arrived = snap.phase === "arrived", allowed = trackingAllowed(b);
      const title = phaseLabel(b, snap);
      const eta = enRoute ? `${snap.remainingMinutes}<span> min</span>` : arrived ? "Arrived" : allowed ? esc(b.start) : "—";
      const explanation = b.status === "Needs cover" ? "The office will confirm the replacement worker. Arrival tracking will be available once the booking is confirmed." : b.status === "Cancelled" ? "This service was cancelled. No location is shared for this booking." : b.status === "Completed" ? "This visit is complete. Worker location sharing is off." : !allowed ? "Arrival tracking is available for confirmed services." : arrived ? "Your worker is at the demo service location. The visit record is completed separately." : enRoute ? "Follow the simulated journey to your service location." : "The arrival estimate appears when your assigned worker starts their journey.";
      let playback = "";
      if (allowed && !this.ctx.state.visits.some(v => v.bookingId === b.id && v.clockIn) && (this.ctx.area !== "client" || enRoute || arrived)) {
        playback = `<div class="map-playback"><span class="map-playback-label">${this.ctx.area === "worker" ? "JOURNEY CONTROLS · DEMO" : "ARRIVAL PREVIEW · DEMO"}</span><div class="button-row"><button class="btn primary" type="button" data-map-action="${snap.running ? "pause" : "play"}">${icon(snap.running ? "pause" : "play")} ${snap.running ? "Pause demo" : arrived ? "Replay demo" : enRoute ? "Play journey" : this.ctx.area === "worker" ? "Start journey (demo)" : "Preview arrival"}</button>${this.ctx.area === "worker" && enRoute ? '<button class="btn" type="button" data-map-action="arrive">Mark arrived</button><button class="link-button map-stop-sharing" type="button" data-map-action="stop">Stop sharing</button>' : ""}</div><small>Playback is accelerated. Location updates are simulated.</small></div>`;
      }
      this.query("[data-map-detail]").innerHTML = `<div class="map-worker-heading"><span class="avatar">${b.status === "Needs cover" ? "?" : esc(w?.initials || "—")}</span><span><small>${b.status === "Needs cover" ? "Assignment pending" : this.ctx.area === "client" ? "Your assigned worker" : this.ctx.area === "worker" ? "Your journey" : "Assigned worker"}</small><strong>${b.status === "Needs cover" ? "Awaiting cover" : esc(w?.name || "To be assigned")}</strong></span><span class="map-location-indicator ${enRoute ? "on" : ""}" aria-label="${enRoute ? "Simulated location available" : "Location sharing off"}"></span></div>
        <div class="map-arrival-card ${enRoute || arrived ? "active" : ""}"><span class="map-arrival-status" data-map-arrival-status aria-live="polite">${title}</span><strong class="map-eta-value" data-map-eta>${eta}</strong><span class="map-eta-caption" data-map-eta-caption>${enRoute ? `Est. arrival ${esc(snap.arrivalTime)} AWST` : arrived ? "At the service location" : allowed ? "Scheduled service start · AWST" : dateLabel(b.date)}</span>${enRoute || arrived ? `<div class="map-journey-track"><span data-map-progress style="width:${Math.round(snap.progress * 100)}%"></span></div><div class="map-journey-steps"><span>On the way</span><span>Arrived</span></div>` : ""}<p>${explanation}</p></div>
        <div class="map-booking-facts"><div><span>${icon("clock")}</span><span><small>Service booking</small><strong>${dateLabel(b.date)} · ${esc(b.start)}–${esc(b.end)}</strong></span></div><div><span>${icon("pin")}</span><span><small>Service location</small><strong>${esc(p?.address || "To be confirmed")}</strong><small>${validCoordinates(p?.location?.coordinates) ? "Approximate suburb location for this demo" : "Map coordinates have not been added"}</small></span></div></div>
        <p class="map-route-source" data-map-route-source>${this.routeDescription()}</p>
        <div class="button-row map-focus-actions">${validCoordinates(p?.location?.coordinates) ? `<button class="btn small" type="button" data-map-action="focus">${icon("pin")} Service location</button>` : ""}${this.route ? `<button class="btn small" type="button" data-map-action="route">${icon("map")} Full route</button>` : ""}<a class="btn small" href="#/${this.ctx.area}/${this.ctx.area === "office" ? "schedule/" + esc(b.id) : this.ctx.area === "worker" ? "today/" + esc(b.id) : "bookings"}">Booking details</a></div>
        ${playback}<span class="map-update-note" data-map-update-note>${enRoute ? snap.running ? "Demo location updating" : "Sample location · playback paused" : "Location sharing is limited to this booking"}</span>`;
    }

    routeDescription() {
      return this.route ? `${(this.route.distance / 1000).toFixed(1)} km · ${Math.ceil(this.route.duration / 60)} min driving estimate · Mapbox` : this.routeState === "loading" ? "Calculating the driving route…" : this.routeState === "unavailable" ? "Driving route unavailable. The arrival preview uses sample timings." : trackingAllowed(this.selected) ? "Driving route appears when Mapbox is connected." : "No worker journey is shared for this service.";
    }

    fallback(title, message) {
      const node = this.query("[data-map-fallback]");
      node.hidden = false;
      node.innerHTML = `<span class="map-fallback-symbol">${icon("map")}</span><h2>${esc(title)}</h2><p>${esc(message)}</p>${this.ctx.area === "office" ? '<button class="btn primary" type="button" data-map-action="connection">Connect Mapbox</button>' : '<button class="btn" type="button" data-map-action="retry">Retry map</button>'}`;
    }

    async createMap() {
      const version = ++this.mapVersion;
      clearTimeout(this.mapTimeout);
      this.map?.remove();
      this.map = null;
      this.markers = [];
      this.workerMarker = null;
      this.ready = false;
      this.connectionError = false;
      if (!token()) {
        this.query("[data-map-connection]").textContent = "Map connection pending";
        this.fallback(this.ctx.area === "office" ? "Connect your 3D booking map" : "Map is not connected yet", this.ctx.area === "office" ? "Add your Mapbox public token to display 3D buildings, service locations and driving routes. Booking details and demo arrival playback are ready." : "Your booking details and demo arrival preview are available. The office can connect the Mapbox map.");
        return;
      }
      this.query("[data-map-fallback]").hidden = false;
      this.query("[data-map-fallback]").innerHTML = `<span class="map-fallback-symbol">${icon("map")}</span><h2>Loading your 3D map</h2><p>Preparing service locations around Perth.</p>`;
      this.query("[data-map-connection]").textContent = "Connecting to Mapbox…";
      try {
        const sdk = await ensureSdk();
        if (this.disposed || version !== this.mapVersion) return;
        if (!sdk.supported()) throw new Error("WebGL unavailable");
        this.map = new sdk.Map({
          container: this.query("#booking-map-canvas"),
          accessToken: token(),
          style: window.OCD_MAPBOX_CONFIG?.style || "mapbox://styles/mapbox/standard",
          config: { basemap: { lightPreset: "day", show3dObjects: true, showPointOfInterestLabels: false } },
          center: officeFor(this.ctx).coordinates, zoom: 13, pitch: this.pref.threeD ? 60 : 0, bearing: this.pref.threeD ? -20 : 0,
          attributionControl: false, cooperativeGestures: true
        });
        this.map.addControl(new sdk.NavigationControl({ visualizePitch: true }), "bottom-right");
        this.map.addControl(new sdk.AttributionControl({ compact: true }), "bottom-left");
        this.map.addControl(new sdk.FullscreenControl({ container: this.query(".booking-map-surface") }), "bottom-right");
        this.map.on("load", () => {
          if (this.disposed || version !== this.mapVersion || this.connectionError) return;
          clearTimeout(this.mapTimeout);
          this.ready = true;
          this.query("[data-map-fallback]").hidden = true;
          this.query("[data-map-connection]").textContent = "Mapbox · 3D buildings available";
          for (const source of ["booking-route", "booking-travelled"]) this.map.addSource(source, { type: "geojson", data: lineData([]) });
          this.map.addLayer({ id: "route-casing", type: "line", source: "booking-route", slot: "middle", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.92 } });
          this.map.addLayer({ id: "route-line", type: "line", source: "booking-route", slot: "middle", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#4b80b1", "line-width": 5, "line-emissive-strength": 0.7 } });
          this.map.addLayer({ id: "travelled-line", type: "line", source: "booking-travelled", slot: "middle", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#08734c", "line-width": 5, "line-emissive-strength": 0.7 } });
          this.refreshMarkers(); this.drawRoute(); this.fitVisible();
        });
        this.map.on("error", event => {
          if (this.disposed || version !== this.mapVersion) return;
          const status = event.error?.status;
          if (status === 401 || status === 403 || status === 404 && !this.ready) {
            this.connectionError = true;
            this.query("[data-map-connection]").textContent = "Mapbox connection needs attention";
            this.fallback("Mapbox could not load this map", "Check the public token, its allowed website URLs and the Mapbox account connection. Booking details are still available.");
          }
        });
        this.mapTimeout = setTimeout(() => {
          if (!this.ready && !this.disposed) this.fallback("The map is taking longer to load", "Check your connection or try connecting Mapbox again. Your booking details are still available.");
        }, 20000);
        this.resizeObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(() => this.map?.resize());
        this.resizeObserver.observe(this.query(".booking-map-surface"));
      } catch (_) {
        if (!this.disposed && version === this.mapVersion) {
          this.query("[data-map-connection]").textContent = "Map unavailable";
          this.fallback("The 3D map could not start", "Try a browser with WebGL support and check your network connection. Your booking and arrival details are still available.");
        }
      }
    }

    refreshMarkers() {
      if (!this.ready || !this.map) return;
      this.markers.forEach(marker => marker.remove()); this.markers = [];
      const groups = new Map();
      this.bookings.forEach((b, i) => {
        const p = locationFor(this.ctx, b), coords = p?.location?.coordinates;
        if (!validCoordinates(coords)) return;
        const key = coords.join(",");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ b, p, i, coords });
      });
      groups.forEach(group => {
        const item = group.find(item => item.b.id === this.pref.selected) || group[0];
        const el = document.createElement("button");
        el.type = "button";
        el.className = `map-service-pin ${group.some(item => item.b.id === this.pref.selected) ? "selected" : ""} ${item.b.status === "Needs cover" ? "cover" : item.b.status === "Cancelled" ? "inactive" : ""}`;
        el.textContent = group.length > 1 ? String(group.length) : String(item.i + 1);
        el.setAttribute("aria-label", `${group.length > 1 ? group.length + " bookings at " : ""}${item.p.suburb}, ${item.b.start}. Select booking.`);
        el.addEventListener("click", () => this.selectBooking(item.b.id));
        this.markers.push(new window.mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(item.coords).addTo(this.map));
      });
    }

    async loadRoute() {
      const version = ++this.routeVersion;
      this.routeAbort?.abort();
      clearTimeout(this.routeTimeout);
      this.route = null;
      this.workerMarker?.remove(); this.workerMarker = null;
      this.drawRoute();
      const b = this.selected, coords = b && locationFor(this.ctx, b)?.location?.coordinates;
      if (!trackingAllowed(b) || !validCoordinates(coords) || !token()) { this.routeState = "not-needed"; this.renderDetails(); return; }
      const origin = officeFor(this.ctx).coordinates;
      const key = origin.join(",") + ";" + coords.join(",");
      if (routeCache.has(key)) { this.route = routeCache.get(key); this.routeState = "ready"; this.renderDetails(); this.drawRoute(); this.fitVisible(); return; }
      this.routeState = "loading"; this.renderDetails();
      const abort = new AbortController(); this.routeAbort = abort;
      const timeout = setTimeout(() => abort.abort(), 12000); this.routeTimeout = timeout;
      try {
        const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${key}`);
        url.search = new URLSearchParams({ access_token: token(), geometries: "geojson", overview: "full", steps: "false" }).toString();
        const response = await fetch(url, { signal: abort.signal });
        if (!response.ok) throw new Error("Route unavailable");
        const data = await response.json(), route = data.routes?.[0];
        if (data.code !== "Ok" || route?.geometry?.type !== "LineString" || route.geometry.coordinates.length < 2 || !route.geometry.coordinates.every(validCoordinates) || !Number.isFinite(route.duration) || !Number.isFinite(route.distance)) throw new Error("Invalid route");
        if (this.disposed || version !== this.routeVersion) return;
        this.route = route; routeCache.set(key, route); this.routeState = "ready";
      } catch (_) {
        if (this.disposed || version !== this.routeVersion) return;
        this.routeState = "unavailable";
      } finally { clearTimeout(timeout); }
      if (this.disposed || version !== this.routeVersion) return;
      this.renderDetails(); this.drawRoute(); this.fitVisible();
    }

    drawRoute() {
      if (!this.ready || !this.map) return;
      this.lastDrawnRoute = null;
      this.map.getSource("booking-route")?.setData(lineData(this.route?.geometry.coordinates));
      this.map.getSource("booking-travelled")?.setData(lineData([]));
      this.updateWorkerPosition();
    }

    updateWorkerPosition() {
      if (!this.ready || !this.map) return;
      const b = this.selected, snap = snapshot(this.ctx.state, b);
      if (!this.route || !b || snap.phase === "not-started") {
        this.workerMarker?.remove(); this.workerMarker = null;
        this.map.getSource("booking-travelled")?.setData(lineData([]));
        return;
      }
      if (this.workerMarker && this.lastDrawnRoute === this.route && this.lastDrawnProgress === snap.progress) return;
      this.lastDrawnRoute = this.route; this.lastDrawnProgress = snap.progress;
      const position = routePosition(this.route, snap.progress);
      if (!this.workerMarker) {
        const el = document.createElement("div");
        el.className = "map-worker-pin"; el.innerHTML = icon("car"); el.setAttribute("role", "img");
        el.setAttribute("aria-label", `Simulated position of ${workerFor(this.ctx, b)?.name || "assigned worker"}`);
        this.workerMarker = new window.mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(position.position).addTo(this.map);
      }
      this.workerMarker.setLngLat(position.position);
      this.map.getSource("booking-travelled")?.setData(lineData(snap.progress > 0 ? position.travelled : []));
    }

    fitVisible() {
      if (!this.ready || !this.map) return;
      const coords = this.bookings.map(b => locationFor(this.ctx, b)?.location?.coordinates).filter(validCoordinates);
      if (this.route) coords.push(...this.route.geometry.coordinates);
      if (!coords.length) { this.map.easeTo({ center: officeFor(this.ctx).coordinates, zoom: 12, duration: 600 }); return; }
      if (coords.length === 1) { this.map.easeTo({ center: coords[0], zoom: 15.7, duration: 600 }); return; }
      const bounds = coords.reduce((bounds, point) => bounds.extend(point), new window.mapboxgl.LngLatBounds(coords[0], coords[0]));
      this.map.fitBounds(bounds, { padding: { top: 95, bottom: 95, left: 55, right: 55 }, maxZoom: 15.7, pitch: this.pref.threeD ? 60 : 0, bearing: this.pref.threeD ? -20 : 0, duration: 700 });
    }

    selectBooking(id) {
      if (!this.bookings.some(b => b.id === id) || this.pref.selected === id) return;
      this.pref.selected = id; this.route = null; this.routeState = "not-needed";
      this.refresh(); this.loadRoute();
    }

    tick() {
      if (this.disposed) return;
      const b = this.selected;
      if (!b) return;
      const snap = snapshot(this.ctx.state, b), journey = this.ctx.state.journeys?.[b.id];
      if (snap.phase === "arrived" && journey?.running) {
        journey.phase = "arrived"; journey.progress = 1; journey.running = false; delete journey.startedAt; this.ctx.save();
      }
      if (snap.phase !== this.lastPhase || snap.running !== this.lastRunning) this.refresh();
      if (snap.phase === "en-route") {
        this.query("[data-map-eta]").innerHTML = `${snap.remainingMinutes}<span> min</span>`;
        this.query("[data-map-progress]").style.width = `${snap.progress * 100}%`;
        const overlay = this.query("[data-map-overlay-arrival]");
        if (overlay) overlay.textContent = `Demo arrival · ${snap.remainingMinutes} min away`;
      }
      this.updateWorkerPosition();
    }

    controlJourney(action) {
      const b = this.selected;
      if (!trackingAllowed(b)) return;
      if (this.ctx.state.visits.some(v => v.bookingId === b.id && v.clockIn)) return;
      const snap = snapshot(this.ctx.state, b);
      if (this.ctx.area === "client" && snap.phase === "not-started") return;
      if (["arrive", "stop"].includes(action) && this.ctx.area !== "worker") return;
      const journey = this.ctx.state.journeys[b.id] ||= { workerId: b.workerId, date: b.date, start: b.start, progress: 0, phase: "not-started", durationSeconds: this.route?.duration || 960, arrivalTime: b.start, running: false };
      if (journey.workerId !== b.workerId || journey.date !== b.date || journey.start !== b.start) Object.assign(journey, { workerId: b.workerId, date: b.date, start: b.start, progress: 0, phase: "not-started", running: false, arrivalTime: b.start });
      if (action === "play") {
        journey.phase = "en-route"; journey.progress = snap.phase === "arrived" ? 0 : snap.progress;
        journey.startedAt = Date.now(); journey.playbackMs = Math.max(5000, 60000 * (1 - journey.progress)); journey.running = true;
      } else if (action === "pause") {
        journey.progress = snap.progress; journey.running = false; delete journey.startedAt;
      } else if (action === "arrive") {
        journey.progress = 1; journey.phase = "arrived"; journey.running = false; delete journey.startedAt;
      } else if (action === "stop") {
        journey.progress = 0; journey.phase = "not-started"; journey.running = false; delete journey.startedAt;
      }
      this.ctx.save(); this.refresh(); this.drawRoute();
    }

    onClick(event) {
      const bookingButton = event.target.closest("[data-map-booking]");
      if (bookingButton) { this.selectBooking(bookingButton.dataset.mapBooking); this.query(`[data-map-booking="${CSS.escape(bookingButton.dataset.mapBooking)}"]`)?.focus({ preventScroll: true }); return; }
      const button = event.target.closest("[data-map-action]");
      if (!button) return;
      const action = button.dataset.mapAction;
      if (["play", "pause", "arrive", "stop"].includes(action)) return this.controlJourney(action);
      if (["3d", "2d"].includes(action)) {
        this.pref.threeD = action === "3d";
        this.query('[data-map-action="3d"]').setAttribute("aria-pressed", String(this.pref.threeD));
        this.query('[data-map-action="2d"]').setAttribute("aria-pressed", String(!this.pref.threeD));
        this.map?.easeTo({ pitch: this.pref.threeD ? 60 : 0, bearing: this.pref.threeD ? -20 : 0, duration: 600 });
      }
      if (["previous-day", "next-day"].includes(action)) {
        const date = new Date(`${this.pref.date}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + (action === "next-day" ? 1 : -1));
        this.pref.date = date.toISOString().slice(0, 10); this.query("#map-service-date").value = this.pref.date;
        this.route = null; this.routeState = "not-needed"; this.refresh(); this.loadRoute(); this.fitVisible();
      }
      if (action === "fit" || action === "route") this.fitVisible();
      if (action === "focus") {
        const coords = this.selected && locationFor(this.ctx, this.selected)?.location?.coordinates;
        if (validCoordinates(coords)) this.map?.flyTo({ center: coords, zoom: 16.7, pitch: this.pref.threeD ? 65 : 0, duration: 900 });
      }
      if (action === "connection" && this.ctx.area === "office") {
        const settings = this.query("[data-map-settings]"); settings.hidden = !settings.hidden;
        if (!settings.hidden) { settings.scrollIntoView({ behavior: "smooth", block: "nearest" }); this.query("#map-public-token").focus({ preventScroll: true }); }
      }
      if (action === "retry") { this.createMap(); this.loadRoute(); }
      if (action === "clear-token" && this.ctx.area === "office") {
        runtimeToken = ""; try { localStorage.removeItem(TOKEN_STORE); } catch (_) { /* default connection still works */ }
        routeCache.clear(); this.createMap(); this.loadRoute();
      }
    }

    onChange(event) {
      if (event.target.id === "map-service-date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(event.target.value) || !Number.isFinite(Date.parse(event.target.value))) { event.target.value = this.pref.date; return; }
        this.pref.date = event.target.value;
      } else if (event.target.id === "map-worker-filter" && this.ctx.area === "office") this.pref.worker = event.target.value;
      else return;
      this.route = null; this.routeState = "not-needed"; this.refresh(); this.loadRoute(); this.fitVisible();
    }

    onSubmit(event) {
      const form = event.target.closest("[data-map-form]");
      if (!form || this.ctx.area !== "office") return;
      event.preventDefault();
      const value = String(new FormData(form).get("token") || "").trim();
      const error = this.query("[data-map-token-error]");
      if (!/^pk\.[A-Za-z0-9._-]+$/.test(value) || value.length < 30) { error.textContent = "Use a Mapbox public token starting with pk. Secret tokens are not accepted."; return; }
      error.textContent = ""; runtimeToken = value;
      try { localStorage.setItem(TOKEN_STORE, value); } catch (_) { /* connection remains available for this page session */ }
      form.reset(); this.query("[data-map-settings]").hidden = true;
      routeCache.clear(); this.createMap(); this.loadRoute();
    }

    destroy() {
      this.disposed = true; this.routeVersion++; this.mapVersion++;
      clearInterval(this.timer); clearTimeout(this.mapTimeout); clearTimeout(this.routeTimeout);
      this.routeAbort?.abort(); this.resizeObserver?.disconnect();
      this.root.removeEventListener("click", this.onClick); this.root.removeEventListener("change", this.onChange); this.root.removeEventListener("submit", this.onSubmit);
      this.map?.remove();
    }
  }

  function unmount() { active?.destroy(); active = undefined; }
  function mount(ctx) {
    unmount();
    const root = document.getElementById("booking-map-workspace");
    if (root) { active = new BookingMap(ctx, root); return; }
    const preview = document.querySelector("[data-arrival-preview]");
    if (preview) {
      const timer = setInterval(() => {
        const b = ctx.state.bookings.find(b => b.id === preview.dataset.arrivalPreview);
        if (!b) return;
        const snap = snapshot(ctx.state, b);
        preview.querySelector("[data-arrival-title]").textContent = phaseLabel(b, snap);
        preview.querySelector("[data-arrival-time]").textContent = snap.remainingMinutes ? `About ${snap.remainingMinutes} min away` : snap.phase === "arrived" ? "At your service location" : `Scheduled ${b.start}`;
      }, 1000);
      active = { destroy: () => clearInterval(timer) };
    }
  }
  window.OCD_MAPS = { page, mount, unmount, summary, reconcileJourneys, resetViews: () => preferences.clear() };
})();
