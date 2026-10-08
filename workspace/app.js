/* Full operations workspace. ShiftCare remains authoritative for delivered services. */
(async () => {
  const STORE = "ocd-brilliance-operations-v1";
  const app = document.getElementById("app");
  const modal = document.getElementById("modal");
  const toastNode = document.getElementById("toast");
  let sessionEmail = "";
  try {
    const response = await fetch("/api/workflow?action=session", { cache: "no-store" });
    if (response.ok) sessionEmail = (await response.json()).email || "";
  } catch (_) { /* the public journey remains available if office access is offline */ }
  const demoWeek = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"];
  const serviceTypes = ["Domestic assistance", "Support work", "Cleaning", "Transport", "Support coordination", "Nursing"];
  const ui = { enquiryQuery: "", enquiryStatus: "All statuses", participantQuery: "", participantTab: "Overview", callTab: "Bookings", publicTab: "Book", selectedSlot: "", publicConfirmation: null, areaCheck: null, workFilter: "All", scheduleWeekStart: "2026-10-05", scheduleWorkerId: "", scheduleStatus: "", officeCalendarMonth: "2026-10-01", officeCalendarDate: "2026-10-05", workerCalendarMonth: "2026-10-01", workerCalendarDate: "2026-10-05", feeTab: "Routes", feePreview: null, routeBooking: "BKG-499", cancellationBooking: "BKG-506", workerId: "WRK-01", clientId: "PAR-101" };
  let state = load();
  let toastTimer;

  function localStatus(serverStatus) {
    return ({ New: "New", Contacting: "In progress", Reviewing: "In progress", "Ready for ShiftCare": "Ready for service", "Entered in ShiftCare": "Active", Closed: "Closed" })[serverStatus] || "New";
  }
  function localHandoff(serverStatus) {
    return ({ New: "Needs review", Contacting: "Needs review", Reviewing: "Needs review", "Ready for ShiftCare": "Ready for ShiftCare", "Entered in ShiftCare": "Entered in ShiftCare", Closed: "Closed" })[serverStatus] || "Needs review";
  }
  function serverEnquiry(record) {
    const notes = record.notes || "No support notes were supplied.";
    return {
      id: record.id,
      name: record.name,
      email: record.email || "Not provided",
      phone: record.phone || "Not provided",
      suburb: record.suburb || "To confirm",
      postcode: record.postcode || "",
      service: record.service,
      source: record.source,
      preferredContact: record.email ? "Email" : "Phone",
      owner: record.owner || "Unassigned",
      status: localStatus(record.status),
      serverStatus: record.status,
      serverNextAction: record.nextAction,
      shiftCareId: record.shiftCareId || "",
      received: record.createdAt.slice(0, 10),
      nextAction: record.followUp || record.updatedAt.slice(0, 10),
      intake: { submitted: record.createdAt.slice(0, 10), support: notes, preference: "", funding: "To confirm", consent: Boolean(record.consentAt) },
      handoff: { status: localHandoff(record.status), service: record.service, suburb: record.suburb, summary: notes, followUp: record.nextAction, reviewedBy: record.owner },
      history: record.history || [],
      aiReview: null,
      emailDraft: null,
      emailStatus: "Not drafted",
      serverRecord: true
    };
  }
  async function syncServerIntakes() {
    if (!sessionEmail) return;
    const response = await fetch("/api/workflow?action=intakes", { cache: "no-store" });
    if (response.status === 401) { sessionEmail = ""; return; }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Requests could not be loaded.");
    state.enquiries = [...result.records.map(serverEnquiry), ...state.enquiries.filter(enquiry => !enquiry.serverRecord)];
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && Array.isArray(saved.enquiries) && Array.isArray(saved.bookings)) return migrateMapData(saved);
    } catch (_) { /* corrupt local demo data is replaced by the seed */ }
    return migrateMapData(structuredClone(window.OCD_DEMO_SEED));
  }
  function migrateMapData(data) {
    if (!data.journeys || typeof data.journeys !== "object" || Array.isArray(data.journeys)) data.journeys = structuredClone(window.OCD_DEMO_SEED.journeys);
    if (!data.mapOffice) data.mapOffice = structuredClone(window.OCD_DEMO_SEED.mapOffice);
    if (!data.bookings.some(b => b.id === "BKG-500")) data.bookings.push(structuredClone(window.OCD_DEMO_SEED.bookings.find(b => b.id === "BKG-500")));
    if (!data.visits.some(v => v.bookingId === "BKG-500")) data.visits.push(structuredClone(window.OCD_DEMO_SEED.visits.find(v => v.bookingId === "BKG-500")));
    data.participants?.forEach(p => {
      const seed = window.OCD_DEMO_SEED.participants.find(original => original.id === p.id);
      if (!p.location && seed?.location && p.address === seed.address && p.suburb === seed.suburb) p.location = structuredClone(seed.location);
    });
    data.coverOffers ||= [];
    data.updates ||= structuredClone(window.OCD_DEMO_SEED.updates);
    data.workerDocs ||= structuredClone(window.OCD_DEMO_SEED.workerDocs);
    for (const doc of window.OCD_DEMO_SEED.workerDocs) if (!data.workerDocs.some(d => d.id === doc.id)) data.workerDocs.push(structuredClone(doc));
    data.inbound ||= structuredClone(window.OCD_DEMO_SEED.inbound);
    data.enquiries?.forEach(e => { if (e.intake && !e.handoff) e.handoff = { status: "Needs review" }; });
    window.OCD_MAPS.reconcileJourneys(data);
    window.OCD_AUTOMATION_ENGINE.ensure(data);
    window.OCD_AUTOMATION_ENGINE.sync(data);
    return data;
  }
  function save() {
    window.OCD_MAPS.reconcileJourneys(state);
    const localState = structuredClone(state);
    localState.enquiries = localState.enquiries.filter(enquiry => !enquiry.serverRecord);
    localStorage.setItem(STORE, JSON.stringify(localState));
  }
  function reset() { const serverEnquiries = state.enquiries.filter(e => e.serverRecord); state = migrateMapData(structuredClone(window.OCD_DEMO_SEED)); state.enquiries.unshift(...serverEnquiries); localStorage.removeItem(STORE); ui.publicConfirmation = null; ui.areaCheck = null; ui.feePreview = null; ui.scheduleWeekStart = "2026-10-05"; ui.officeCalendarMonth = "2026-10-01"; ui.officeCalendarDate = "2026-10-05"; ui.workerCalendarMonth = "2026-10-01"; ui.workerCalendarDate = "2026-10-05"; ui.cancellationBooking = "BKG-506"; ui.clientId = "PAR-101"; ui.workerId = "WRK-01"; window.OCD_MAPS.resetViews(); render(); toast("Sample records restored; server enquiries retained."); }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
  function attr(value) { return esc(value); }
  function val(form, name) { return String(new FormData(form).get(name) ?? "").trim(); }
  function id(prefix, items) { return `${prefix}-${Math.max(0, ...items.map(x => Number(x.id.split("-").pop()) || 0)) + 1}`; }
  function find(items, idValue) { return items.find(x => x.id === idValue); }
  function participant(idValue) { return find(state.participants, idValue); }
  function worker(idValue) { return find(state.workers, idValue); }
  function booking(idValue) { return find(state.bookings, idValue); }
  function visitForBooking(bookingId) { return state.visits.find(v => v.bookingId === bookingId); }
  function agreementFor(participantId) { return [...state.agreements].reverse().find(x => x.participantId === participantId); }
  function dateObj(value) { return new Date(`${value}T12:00:00Z`); }
  function dateLabel(value, options = { weekday: "short", day: "numeric", month: "short" }) { return value ? new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", ...options }).format(dateObj(value)) : "—"; }
  function weekday(value) { return new Date(`${value}T12:00:00Z`).getUTCDay(); }
  function todayPerth() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  function timePerth() { return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Perth", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); }
  function statusClass(status) {
    if (["Needs cover", "Missing", "Missing note", "Rejected", "Cancelled", "Declined", "Expired"].includes(status)) return "red";
    if (["Pending", "Due soon", "Needs review", "Awaiting signature", "Needs approval", "Waiting on participant", "In progress", "Draft", "Onboarding", "Change requested"].includes(status)) return "amber";
    if (["New", "Proposed", "Booked", "Ready for review", "Ready for ShiftCare", "Accepted"].includes(status)) return "blue";
    if (["Closed", "Not drafted", "Not started"].includes(status)) return "gray";
    return "dark";
  }
  function pill(status) { return `<span class="status ${statusClass(status)}">${esc(status)}</span>`; }
  function icon(name) {
    const paths = {
      overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      inbox: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h5l2 3h4l2-3h5"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
      people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M19 20v-2a5 5 0 0 0-3-4.5"/>',
      file: '<path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15 3v5h5M8 13h8M8 17h8"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h7a5 5 0 0 1 0 10H9a4 4 0 0 0 0 8h8"/>',
      map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4m0 4h.01"/>',
      activity: '<path d="M3 12h4l3-6 4 12 3-6h4"/>',
      home: '<path d="m3 11 9-8 9 8v10H3V11Z"/><path d="M9 21v-7h6v7"/>',
      edit: '<path d="M4 20h4l11-11-4-4L4 16v4ZM13 7l4 4"/>',
      download: '<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',
      reset: '<path d="M3 11a9 9 0 1 1 2 6M3 17v-6h6"/>',
      shield: '<path d="M12 2 4 5v7c0 5 3 8 8 10 5-2 8-5 8-10V5l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
      layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
  }
  function activity(text, detail) { state.activity.unshift({ id: id("ACT", state.activity), text, detail, date: todayPerth() }); state.activity = state.activity.slice(0, 35); }
  function addUpdate(to, title, detail, href) { state.updates.unshift({ id: id("UPD", state.updates), to, title, detail, href, date: todayPerth(), read: false }); }
  function updateFeed(to) {
    const rows = state.updates.filter(u => u.to === to);
    return `<section class="panel update-feed"><div class="section-heading"><div><h2>Messages &amp; updates</h2><p>In-app demo history for this view. No SMS, email or event push is sent.</p></div><span class="status blue">${rows.filter(u => !u.read).length} unread</span></div>${rows.length ? rows.map(u => `<div class="update-item ${u.read ? "read" : ""}"><span class="priority-icon">${icon("bell")}</span><span class="body"><strong>${esc(u.title)}</strong><small>${esc(u.detail)}</small><small>${dateLabel(u.date)} · ${u.read ? "Read" : "New"}</small></span><span class="update-actions"><a class="btn small" href="#/${attr(u.href)}">View</a>${u.read ? "" : `<button class="btn small" data-action="read-update" data-id="${attr(u.id)}" type="button">Mark read</button>`}</span></div>`).join("") : empty("No updates", "Service updates will appear here.")}</section>`;
  }
  function toast(message) { clearTimeout(toastTimer); toastNode.textContent = message; toastNode.classList.add("show"); toastTimer = setTimeout(() => toastNode.classList.remove("show"), 3500); }
  function go(route) { location.hash = `#/${route}`; render(); window.scrollTo(0, 0); }
  function routeParts() { return (location.hash.replace(/^#\/?/, "") || "office/overview").split("/").filter(Boolean); }
  function pageHeader(eyebrow, title, subtitle = "", actions = "") { return `<header class="page-header"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>${actions ? `<div class="header-actions">${actions}</div>` : ""}</header>`; }
  function crumb(label, parent, parentLabel) { return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/${parent}">${esc(parentLabel)}</a><span class="chev">/</span><span>${esc(label)}</span></nav>`; }
  function routeBreadcrumbs(area, section, detail) {
    if (area === "public") return "";
    const sectionLabel = nav[area]?.find(item => item[0] === section)?.[1] || "Workspace";
    const home = area === "office" ? "office/overview" : area === "worker" ? "worker/today" : "client/home";
    const homeLabel = area === "office" ? "Home" : area === "worker" ? "My visits" : "Home";
    const detailNames = {
      enquiries: find(state.enquiries, detail)?.name,
      participants: participant(detail)?.name,
      agreements: detail,
      schedule: detail,
      visits: detail,
      today: detail,
      map: detail
    };
    const items = [{ label: homeLabel, href: home }];
    if (section !== home.split("/")[1]) items.push({ label: sectionLabel, href: `${area}/${section}` });
    if (detail) items.push({ label: detailNames[section] || detail, current: true });
    else if (items.length === 1) items[0].current = true;
    else items[items.length - 1].current = true;
    return `<nav class="breadcrumbs app-breadcrumbs" aria-label="Breadcrumb"><ol>${items.map(item => `<li>${item.current ? `<span aria-current="page">${esc(item.label)}</span>` : `<a href="#/${item.href}">${esc(item.label)}</a>`}</li>`).join("")}</ol></nav>`;
  }
  function inspector(master, detail, closeHref, label) {
    return `<div class="split-workspace"><section class="split-master" aria-label="${esc(label)} list">${master}</section><aside class="split-inspector" aria-label="${esc(label)} details"><div class="inspector-toolbar"><a href="#/${closeHref}" class="inspector-back">${icon("arrow")} Back to ${esc(label.toLowerCase())}</a><span>Record details</span></div><div class="inspector-content">${detail}</div></aside></div>`;
  }
  function pair(label, value) { return `<div class="data-pair"><span>${esc(label)}</span><strong>${esc(value || "—")}</strong></div>`; }
  function empty(title, detail) { return `<div class="empty"><strong>${esc(title)}</strong>${esc(detail)}</div>`; }
  function option(value, selected = "") { return `<option value="${attr(value)}" ${selected === value ? "selected" : ""}>${esc(value)}</option>`; }
  function serviceOptions(selected = "") { return serviceTypes.map(s => option(s, selected)).join(""); }
  function participantOptions(selected = "") { return state.participants.map(p => `<option value="${attr(p.id)}" ${p.id === selected ? "selected" : ""}>${esc(p.name)}</option>`).join(""); }
  function workerOptions(selected = "") { return state.workers.map(w => `<option value="${attr(w.id)}" ${w.id === selected ? "selected" : ""}>${esc(w.name)}${w.approved ? "" : " · approval pending"}</option>`).join(""); }
  function bookingOptions(selected = "", includeCompleted = true) { return state.bookings.filter(b => includeCompleted || b.status !== "Completed").map(b => `<option value="${attr(b.id)}" ${b.id === selected ? "selected" : ""}>${esc(b.id)} · ${esc(participant(b.participantId)?.name)} · ${dateLabel(b.date)}</option>`).join(""); }
  function completedBookingOptions(selected = "") { return state.bookings.filter(b => b.status === "Completed").map(b => `<option value="${attr(b.id)}" ${b.id === selected ? "selected" : ""}>${esc(b.id)} · ${esc(participant(b.participantId)?.name)} · ${dateLabel(b.date)}</option>`).join(""); }
  function cancelledBookingOptions(selected = "") { return state.bookings.filter(b => b.status === "Cancelled" && b.cancellation).map(b => `<option value="${attr(b.id)}" ${b.id === selected ? "selected" : ""}>${esc(b.id)} · ${esc(participant(b.participantId)?.name)} · ${dateLabel(b.date)}</option>`).join(""); }
  function viewSelect(current) { return `<label class="view-select"><span>Explore as</span><select id="view-switch" aria-label="Explore a demo view">${[["office", "Office"], ["worker", "Worker"], ["client", "Client"], ["public", "Public"]].map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>`; }
  function appToolsButton() { return `<button class="app-tools-trigger" data-app-tools-open type="button" aria-label="App and alerts">${icon("bell")}<span>App & alerts</span></button>`; }

  const nav = {
    office: [["overview", "Home", "home"], ["schedule", "Schedule", "calendar"], ["work", "Work queue", "layers"], ["calendar", "Calendar", "calendar"], ["participants", "Participants", "people"], ["staff", "Staff", "people"], ["enquiries", "Enquiries", "inbox"], ["calls", "Discovery calls", "calendar"], ["agreements", "Agreements", "file"], ["visits", "Visit records", "clock"], ["map", "Booking map", "map"], ["fees", "Routes & fees", "route"]],
    worker: [["today", "My visits", "calendar"], ["map", "Visit map", "map"], ["calendar", "My calendar", "calendar"], ["availability", "Availability", "clock"], ["review", "Hours & documents", "file"]],
    client: [["home", "Home", "home"], ["bookings", "My bookings", "calendar"], ["map", "Arrival status", "clock"], ["documents", "Documents", "file"], ["intake", "My details", "people"]]
  };
  nav.office.push(["shiftcare", "ShiftCare", "layers"]);
  nav.office.splice(3, 0, ["automation", "Automation", "activity"]);
  nav.office.push(["finance", "Bookkeeping", "file"]);
  nav.office.push(["verification", "Integration proof", "shield"]);
  const officeNavGroups = [
    ["Daily work", ["overview", "automation", "schedule", "work", "calendar"]],
    ["People", ["participants", "staff"]],
    ["Records", ["enquiries", "calls", "agreements", "visits", "finance"]],
    ["Planning", ["map", "fees"]],
    ["Connection", ["shiftcare", "verification"]]
  ];
  function renderLogin() {
    app.innerHTML = `<main class="auth-page"><section class="auth-card"><img src="/assets/ocd-brilliance-logo.png" alt="OCD Brilliance"><span class="eyebrow">Operations platform</span><h1>Office sign in</h1><p>Sign in to open the complete office, worker and client workspaces.</p><form id="staff-login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><p class="field-error" role="alert" hidden></p><button class="btn primary" type="submit">Sign in</button></form><a href="#/public/intake">Open public intake</a></section></main>`;
    app.querySelector("#staff-login").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const error = form.querySelector(".field-error");
      const button = form.querySelector("button");
      button.disabled = true;
      error.hidden = true;
      try {
        const response = await fetch("/api/workflow?action=login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Sign in failed.");
        sessionEmail = result.email;
        await syncServerIntakes();
        render();
      } catch (reason) {
        error.textContent = reason.message;
        error.hidden = false;
      } finally { button.disabled = false; }
    });
  }
  function shell(area, section, content) {
    const title = nav[area]?.find(x => x[0] === section)?.[1] || "Workspace";
    const counts = { work: state.bookings.filter(b => b.status === "Needs cover").length + state.enquiries.filter(e => e.handoff && !["Entered in ShiftCare", "Closed"].includes(e.handoff.status)).length + state.requests.filter(r => r.status === "Pending").length + state.visits.filter(v => v.status !== "Reviewed").length + state.workerDocs.filter(d => d.status !== "Valid").length + state.inbound.filter(m => m.status === "New").length, enquiries: state.enquiries.filter(e => e.status === "New").length, schedule: state.bookings.filter(b => b.status === "Needs cover").length };
    const primaryMobile = ["overview", "schedule", "work", "participants"];
    const navLink = ([path, label, glyph]) => `<a class="nav-link ${section === path ? "active" : ""} ${area === "office" && !primaryMobile.includes(path) ? "mobile-extra" : ""}" ${section === path ? 'aria-current="page"' : ""} href="#/${area}/${path}">${icon(glyph)}<span>${area === "office" && path === "participants" ? '<span class="mobile-label">People</span><span class="desktop-label">Participants</span>' : esc(label)}</span>${counts[path] ? `<span class="nav-count">${counts[path]}</span>` : ""}</a>`;
    const links = area === "office" ? officeNavGroups.map(([group, paths]) => `<div class="nav-group"><p class="nav-group-label">${group}</p>${paths.map(path => navLink(nav.office.find(item => item[0] === path))).join("")}</div>`).join("") : nav[area].map(navLink).join("");
    const more = area === "office" ? `<button class="nav-link mobile-more ${primaryMobile.includes(section) ? "" : "active"}" data-action="mobile-menu" type="button" aria-label="More office sections">${icon("overview")}<span>More</span></button>` : "";
    const representative = area === "client" && ui.clientId === "PAR-103";
    const avatarName = area === "office" ? "Mia Roberts" : area === "worker" ? worker(ui.workerId)?.name || "Worker" : representative ? "Samira Ali" : participant(ui.clientId)?.name || "Participant";
    const avatarInitials = area === "office" ? "MR" : area === "worker" ? worker(ui.workerId)?.initials || "WK" : representative ? "SA" : participant(ui.clientId)?.name.split(" ").map(x => x[0]).join("") || "PT";
    const portalAccount = area === "client" ? `<div class="portal-account"><span>Demo portal account</span><select id="client-persona" aria-label="Choose a demo portal account">${state.participants.map(p => `<option value="${attr(p.id)}" ${p.id === ui.clientId ? "selected" : ""}>${p.id === "PAR-103" ? "Samira Ali · Farah's representative" : esc(p.name) + " · participant"}</option>`).join("")}</select></div>` : "";
    const workerAccount = area === "worker" ? `<div class="automation-persona"><span>Demo worker persona</span><select id="worker-persona" aria-label="Choose a demo worker">${state.workers.map(w => `<option value="${attr(w.id)}" ${w.id === ui.workerId ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select><small>Acceptance and care entry below simulate native ShiftCare actions.</small></div>` : "";
    const [, , detail] = routeParts();
    return `<div class="app-shell"><aside class="sidebar"><div class="brand"><img src="/assets/ocd-brilliance-logo.png" alt="OCD Brilliance"></div><span class="brand-caption">Operations platform</span>${area === "office" ? "" : `<p class="nav-section-label">${area === "worker" ? "Worker workspace" : "Client portal"}</p>`}<nav class="nav-list" aria-label="Main navigation">${links}${more}</nav><div class="sidebar-bottom"><strong>Operations workspace</strong>Intake records are stored on the server. Scheduling, payroll and delivered services remain in ShiftCare.</div></aside><div class="workspace"><header class="topbar"><div class="topbar-left"><span class="topbar-title">${esc(title)}</span><span class="topbar-sub">/ OCD Brilliance</span></div><div class="topbar-actions">${viewSelect(area)}${appToolsButton()}<span class="signed-in">${esc(sessionEmail)}</span><button class="link-button" data-action="sign-out" type="button">Sign out</button><span class="avatar" aria-label="${avatarName}">${avatarInitials}</span></div></header>${portalAccount}${workerAccount}<main class="page" id="main-content">${routeBreadcrumbs(area, section, detail)}${content}</main></div></div>`;
  }
  function publicShell(section, content) {
    return `<div class="public-shell"><header class="public-top"><a href="#/public/book" aria-label="OCD Brilliance public demo"><img src="assets/ocd-brilliance-logo.png" alt="OCD Brilliance"></a><nav class="public-nav" aria-label="Public navigation"><a class="${section === "book" ? "active" : ""}" href="#/public/book">Book a call</a><a class="${section === "intake" ? "active" : ""}" href="#/public/intake">Intake form</a><span class="back-demo">${viewSelect("public")}</span></nav><div class="public-tools">${appToolsButton()}</div></header><main class="public-main">${content}</main></div>`;
  }
  function mapContext(area, bookingId = "") { return { area, bookingId, state, workerId: ui.workerId, clientId: ui.clientId, save }; }
  function automationContext() { return { state, workerId: ui.workerId, clientId: ui.clientId, save, render, go, toast }; }
  function openAutomation(job) { save(); closeModal(); go(`office/automation/${job.id}`); }
  function bookingMap(area, bookingId) { return window.OCD_MAPS.page(mapContext(area, bookingId)); }
  function shiftCarePage() { return `${pageHeader("Connection", "ShiftCare", "Check the account connection and read the current roster, clients and staff.")}<div class="notice">Live reads are available to the office. Booking changes and intake handoff remain in ShiftCare.</div><div class="spacer"></div><section class="panel shiftcare-panel" id="shiftcare-connection" aria-live="polite"></section>`; }
  function render() {
    window.OCD_MAPS.unmount();
    window.OCD_SHIFTCARE.unmount();
    window.OCD_INTEGRATION_PROOF.unmount();
    const [area, section, detail] = routeParts();
    const pages = {
      office: { overview: officeOverview, work: officeWorkQueue, enquiries: () => detail ? inspector(enquiriesPage(), enquiryDetail(detail), "office/enquiries", "Enquiries") : enquiriesPage(), calls: callsPage, participants: () => detail ? inspector(participantsPage(), participantDetail(detail), "office/participants", "Participants") : participantsPage(), staff: staffPage, agreements: () => detail ? inspector(agreementsPage(), agreementDetail(detail), "office/agreements", "Agreements") : agreementsPage(), calendar: () => calendarPage("office"), map: () => bookingMap("office", detail), schedule: () => detail ? inspector(schedulePage(), bookingDetail(detail), "office/schedule", "Schedule") : schedulePage(), visits: () => detail ? inspector(visitsPage(), visitDetail(detail), "office/visits", "Visit records") : visitsPage(), fees: feesPage },
      worker: { today: () => detail ? inspector(workerToday(), workerVisit(detail), "worker/today", "Visits") : workerToday(), map: () => bookingMap("worker", detail), calendar: () => calendarPage("worker"), availability: workerAvailability },
      client: { home: clientHome, bookings: clientBookings, map: () => clientArrival(detail), documents: clientDocuments, intake: clientIntake },
      public: { book: publicBook, intake: publicIntake }
    };
    pages.worker.review = workerReview;
    pages.office.shiftcare = shiftCarePage;
    pages.office.automation = () => window.OCD_AUTOMATION.page(automationContext(), detail);
    pages.office.finance = () => window.OCD_AUTOMATION.finance(automationContext());
    pages.office.verification = () => '<section id="integration-proof-dashboard" aria-live="polite"></section>';
    const actualArea = pages[area] ? area : "office";
    const actualSection = pages[actualArea][section] ? section : (actualArea === "office" ? "overview" : actualArea === "worker" ? "today" : actualArea === "client" ? "home" : "book");
    if (actualArea !== "public" && !sessionEmail) { renderLogin(); document.title = "Sign in · OCD Brilliance"; return; }
    const content = pages[actualArea][actualSection]();
    app.innerHTML = actualArea === "public" ? publicShell(actualSection, content) : shell(actualArea, actualSection, content);
    document.title = `${actualArea === "public" ? "Public" : nav[actualArea]?.find(n => n[0] === actualSection)?.[1] || "Demo"} · OCD Brilliance`;
    window.OCD_MAPS.mount(mapContext(actualArea, actualSection === "map" ? detail : ""));
    if (actualArea === "office" && actualSection === "shiftcare") window.OCD_SHIFTCARE.mount(document.getElementById("shiftcare-connection"));
    if (actualArea === "office" && actualSection === "verification") window.OCD_INTEGRATION_PROOF.mount(document.getElementById("integration-proof-dashboard"));
  }

  function officeOverview() {
    const priorities = [
      ...state.bookings.filter(b => b.status === "Needs cover").map(b => ({ icon: "alert", tone: "amber", title: `Cover needed · ${participant(b.participantId)?.name}`, detail: `${dateLabel(b.date)} · ${b.start}–${b.end}`, href: `office/schedule/${b.id}`, action: "Arrange cover" })),
      ...state.enquiries.filter(e => e.nextAction < todayPerth() && !["Active", "Closed"].includes(e.status)).map(e => ({ icon: "clock", tone: "amber", title: `Follow-up overdue · ${e.name}`, detail: `${e.id} · due ${dateLabel(e.nextAction)}`, href: `office/enquiries/${e.id}`, action: "Open enquiry" })),
      ...state.enquiries.filter(e => e.handoff?.status === "Needs review").map(e => ({ icon: "inbox", tone: "", title: `Intake handoff · ${e.name}`, detail: `${e.service} · ${e.suburb}`, href: "office/work", action: "Review intake" })),
      ...state.enquiries.filter(e => (e.aiReview && !e.aiReview.reviewed) || e.emailStatus === "Needs approval").map(e => ({ icon: "inbox", tone: "", title: `Intake or draft to review · ${e.name}`, detail: `${e.service} · ${e.suburb}`, href: `office/enquiries/${e.id}`, action: "Review draft" })),
      ...state.calls.filter(c => c.status === "Change requested").map(c => ({ icon: "calendar", tone: "", title: `Call change requested · ${c.name}`, detail: c.id, href: "office/calls", action: "Review change" })),
      ...state.calls.filter(c => c.transcriptSummary && !c.transcriptSummary.reviewed).map(c => ({ icon: "file", tone: "", title: `Call summary to review · ${c.name}`, detail: c.id, href: "office/calls", action: "Review summary" })),
      ...state.agreements.filter(a => ["Draft", "Awaiting signature"].includes(a.status)).map(a => ({ icon: "file", tone: "", title: `Agreement awaiting action · ${participant(a.participantId)?.name}`, detail: `${a.id} · ${a.status}`, href: `office/agreements/${a.id}`, action: "Open agreement" })),
      ...state.requests.filter(r => r.status === "Pending").map(r => ({ icon: "people", tone: "", title: `Portal request · ${participant(r.participantId)?.name}`, detail: r.type, href: `office/participants/${r.participantId}`, action: "Review request" })),
      ...state.visits.filter(v => v.status !== "Reviewed").map(v => ({ icon: "clock", tone: "", title: `Visit record · ${participant(booking(v.bookingId)?.participantId)?.name}`, detail: v.status, href: `office/visits/${v.id}`, action: "Review record" })),
      ...state.feeProposals.filter(f => f.status === "Proposed").map(f => ({ icon: "route", tone: "", title: `${f.type} fee needs approval`, detail: f.id, href: "office/fees", action: "Review proposal" }))
    ];
    const demoDate = demoWeek[0];
    const todayBookings = state.bookings.filter(b => b.date === demoDate && b.status !== "Cancelled").sort((a, b) => a.start.localeCompare(b.start));
    const recentVisits = [...state.visits].filter(v => v.clockIn || v.clockOut).sort((a, b) => (booking(b.bookingId)?.date || "").localeCompare(booking(a.bookingId)?.date || "")).slice(0, 3);
    const coverCount = state.bookings.filter(b => b.status === "Needs cover").length;
    const reviewCount = state.visits.filter(v => v.status !== "Reviewed").length;
    const metrics = [
      { value: todayBookings.length, label: "Services today", href: "office/schedule" },
      { value: coverCount, label: "Need cover", href: "office/work" },
      { value: reviewCount, label: "Records to review", href: "office/visits" }
    ];
    const stages = [
      { title: "Enquiry", detail: "Check area and request", href: "office/enquiries" },
      { title: "Intake", detail: "Review the source", href: "office/work" },
      { title: "Agreement", detail: "Confirm the supports", href: "office/agreements" },
      { title: "Schedule", detail: "Assign and confirm", href: "office/schedule" },
      { title: "Visit record", detail: "Check time and note", href: "office/visits" }
    ];
    const serviceRows = todayBookings.map(b => {
      const v = visitForBooking(b.id);
      const recorded = v?.clockIn || v?.clockOut;
      return `<li class="desk-visit"><span class="desk-visit-marker" aria-hidden="true"></span><span class="desk-visit-time"><strong>${esc(b.start)}</strong><small>${esc(b.end)}</small></span><a class="desk-visit-detail" href="#/office/schedule/${attr(b.id)}"><span class="desk-visit-title">${esc(participant(b.participantId)?.name || "Participant")} ${icon("arrow")}</span><span class="desk-visit-sub">${esc(b.service)} · ${esc(worker(b.workerId)?.name || "Unassigned")}</span><span class="desk-visit-clock">${recorded ? `Time in ${esc(v.clockIn || "—")} · Time out ${esc(v.clockOut || "—")}` : "Time in — · Time out —"}</span></a><span class="desk-visit-status">${pill(b.status)}</span></li>`;
    }).join("");
    const actionRows = priorities.slice(0, 3).map((p, index) => `<li><a href="#/${p.href}"><span class="desk-action-index">${String(index + 1).padStart(2, "0")}</span><span class="desk-action-content"><strong>${esc(p.title)}</strong><small>${esc(p.detail)}</small><em>${esc(p.action)} ${icon("arrow")}</em></span></a></li>`).join("");
    const recordRows = recentVisits.map(v => {
      const b = booking(v.bookingId);
      return `<li><a href="#/office/visits/${attr(v.id)}"><span><strong>${esc(worker(b?.workerId)?.name || "Unassigned")}</strong><small>${esc(participant(b?.participantId)?.name || "Participant")} · ${esc(dateLabel(b?.date))}</small></span><span class="desk-record-clock">In <b>${esc(v.clockIn || "—")}</b><br>Out <b>${esc(v.clockOut || "—")}</b></span>${icon("arrow")}</a></li>`;
    }).join("");
    return `${window.OCD_AUTOMATION.banner(automationContext())}<div class="desk-home">
      <header class="desk-intro"><div class="desk-intro-copy"><span class="desk-eyebrow">OFFICE / MONDAY 5 OCTOBER 2026</span><h1>Monday's work, in one view.</h1><p>Check the next office action, then follow each service from schedule to visit record.</p></div><nav class="desk-metrics" aria-label="Office overview totals">${metrics.map(m => `<a href="#/${m.href}"><strong>${m.value}</strong><span>${esc(m.label)}</span></a>`).join("")}</nav></header>
      <div class="desk-home-grid"><section class="desk-card desk-services" aria-labelledby="desk-services-title"><header class="desk-card-head"><div><span class="desk-eyebrow">TODAY'S PLAN · AUSTRALIA/PERTH</span><h2 id="desk-services-title">Services &amp; clock times</h2><p>Open a visit to see its assignment and details.</p></div><a class="desk-circle-link" href="#/office/schedule" aria-label="Open full schedule">${icon("arrow")}</a></header><ol class="desk-visit-list">${serviceRows || `<li class="desk-empty">No services scheduled for Monday. <a href="#/office/schedule">Open schedule</a></li>`}</ol><div class="desk-card-footer"><span>Times appear after the worker records them.</span><a href="#/office/schedule">Full schedule ${icon("arrow")}</a></div></section>
      <section class="desk-card desk-actions" aria-labelledby="desk-actions-title"><header class="desk-card-head"><div><span class="desk-eyebrow">OFFICE DECISIONS</span><h2 id="desk-actions-title">Handle next</h2><p>${priorities.length} item${priorities.length === 1 ? "" : "s"} waiting across the demo.</p></div><a class="desk-circle-link" href="#/office/work" aria-label="Open work queue">${icon("arrow")}</a></header><ol class="desk-action-list">${actionRows || `<li class="desk-empty">Nothing needs an office decision right now.</li>`}</ol><div class="desk-card-footer"><span>Showing the first ${Math.min(priorities.length, 3)}</span><a href="#/office/work">All work ${icon("arrow")}</a></div></section>
      <section class="desk-card desk-flow" aria-labelledby="desk-flow-title"><header class="desk-card-head"><div><span class="desk-eyebrow">A CLEAR PATH</span><h2 id="desk-flow-title">From first contact to completed visit</h2><p>Automation prepares owned cases. Native outcomes are checked before the sample records change.</p></div></header><ol class="desk-flow-list">${stages.map((s, index) => `<li><a href="#/${s.href}"><span class="desk-flow-index">${index + 1}</span><strong>${esc(s.title)}</strong><small>${esc(s.detail)}</small>${icon("arrow")}</a></li>`).join("")}</ol></section>
      <section class="desk-card desk-records" aria-labelledby="desk-records-title"><header class="desk-card-head"><div><span class="desk-eyebrow">RECORDED BY WORKERS</span><h2 id="desk-records-title">Recent visit times</h2><p>Actual entries, not scheduled hours.</p></div><a class="desk-circle-link" href="#/office/visits" aria-label="Open all visit records">${icon("arrow")}</a></header><ul class="desk-record-list">${recordRows || `<li class="desk-empty">No visit times recorded yet.</li>`}</ul></section></div>
      <p class="desk-prototype-note">${icon("shield")} Sample data is saved in this browser. ShiftCare, invoicing and verified kilometres remain in the current systems during the pilot.</p>
    </div>`;
  }

  function officeWorkQueue() {
    const intakes = state.enquiries.filter(e => e.intake);
    const cover = state.bookings.filter(b => b.status === "Needs cover");
    const requests = state.requests.filter(r => r.status === "Pending");
    const reviews = state.visits.filter(v => v.status !== "Reviewed");
    const docChecks = state.workerDocs.filter(d => d.status !== "Valid").length;
    const messages = state.inbound.filter(m => m.status === "New").length + state.updates.filter(u => u.to === "office" && !u.read).length;
    const filters = [["All", "All work", null], ["Cover", "Cover & requests", cover.length + requests.length], ["Intake", "Intake", intakes.filter(e => !["Entered in ShiftCare", "Closed"].includes(e.handoff?.status)).length], ["Checks", "Checks", reviews.length + docChecks], ["Messages", "Messages", messages]];
    const visible = filter => ui.workFilter === "All" || ui.workFilter === filter;
    return `${pageHeader("Office / Work queue", "Review the work that needs a person", "Owned intake, change and cover tasks. Automation cases track approvals and sample native outcomes.", `<a class="btn primary" href="#/office/automation">Automation cases</a><a class="btn" href="#/office/enquiries">All enquiries</a>`)}
      <nav class="queue-filters" aria-label="Work queue categories">${filters.map(([key, label, count]) => `<button class="queue-filter ${ui.workFilter === key ? "active" : ""}" data-action="work-filter" data-value="${key}" type="button" aria-pressed="${ui.workFilter === key}">${label}${count === null ? "" : `<span>${count}</span>`}</button>`).join("")}</nav>
      <div class="workflow-strip"><span><strong>1</strong> Receive</span><span><strong>2</strong> Check</span><span><strong>3</strong> Record in ShiftCare</span><span><strong>4</strong> Confirm to people</span></div>
      <div class="work-grid" ${visible("Intake") || visible("Cover") ? "" : "hidden"}><section class="panel" ${visible("Intake") ? "" : "hidden"}><div class="section-heading"><div><h2>Intake handoff</h2><p>Compare the draft with the source before recording it.</p></div><span class="status amber">${intakes.filter(e => !["Entered in ShiftCare", "Closed"].includes(e.handoff?.status)).length} to check</span></div>${intakes.length ? intakes.map(e => `<div class="work-item"><div class="work-item-main"><strong>${esc(e.name)}</strong><span>${esc(e.service)} · ${esc(e.suburb)} · ${esc(e.id)}</span><small>${esc(e.intake.support)}</small></div><div class="work-item-actions">${pill(e.handoff?.status || "Needs review")}${e.handoff?.status === "Ready for ShiftCare" ? `<button class="btn small primary" data-action="record-handoff" data-id="${attr(e.id)}" type="button">Complete handoff</button>` : ["Entered in ShiftCare", "Closed"].includes(e.handoff?.status) ? "" : `<a class="btn small" href="#/office/enquiries/${attr(e.id)}">Review request</a>`}</div></div>`).join("") : empty("No intakes", "A submitted public intake appears here.")}</section>
      <section class="panel" ${visible("Cover") ? "" : "hidden"}><div class="section-heading"><div><h2>Changes and cover</h2><p>Requests do not change the roster until the office confirms them.</p></div><span class="status amber">${cover.length + requests.length} open</span></div>${cover.map(b => { const offers = state.coverOffers.filter(o => o.bookingId === b.id); const accepted = offers.find(o => o.status === "Accepted"); return `<div class="work-item"><div class="work-item-main"><strong>Cover · ${esc(participant(b.participantId)?.name)}</strong><span>${dateLabel(b.date)} · ${esc(b.start)}–${esc(b.end)} · ${esc(b.service)}</span><small>${offers.length ? offers.map(o => `${worker(o.workerId)?.name}: ${o.status}`).join(" · ") : "No worker has been offered this shift."}</small></div><div class="work-item-actions">${pill(b.status)}${accepted ? `<button class="btn small primary" data-action="confirm-offer" data-id="${attr(accepted.id)}" type="button">Confirm cover</button>` : `<button class="btn small" data-action="offer-cover" data-id="${attr(b.id)}" type="button">Offer shift</button>`}</div></div>`; }).join("")}${requests.map(r => `<div class="work-item"><div class="work-item-main"><strong>${esc(r.type)} · ${esc(participant(r.participantId)?.name)}</strong><span>${esc(r.bookingId || "General message")} · ${dateLabel(r.created)}</span><small>${esc(r.message)}</small></div><div class="work-item-actions">${pill(r.status)}<button class="btn small" data-action="review-request" data-id="${attr(r.id)}" type="button">Review request</button></div></div>`).join("")}${!cover.length && !requests.length ? empty("No open changes", "New requests and cover needs will appear here.") : ""}</section></div>
      <div class="work-grid work-grid-secondary" ${visible("Checks") || visible("Messages") ? "" : "hidden"}><section class="panel" ${visible("Checks") ? "" : "hidden"}><h2>Visit and document checks</h2><p class="muted">${reviews.length} visit record${reviews.length === 1 ? "" : "s"} need review. Document dates below are fictional examples.</p>${state.workerDocs.filter(d => d.status !== "Valid").map(d => `<div class="work-item"><div class="work-item-main"><strong>${esc(worker(d.workerId)?.name)} · ${esc(d.name)}</strong><span>${d.expires ? `Expires ${dateLabel(d.expires)}` : "Evidence missing"}</span></div><div class="work-item-actions">${pill(d.status)}<button class="btn small" data-action="review-doc" data-id="${attr(d.id)}" type="button">Review</button></div></div>`).join("") || `<p class="muted">No document checks are open.</p>`}<div class="button-row"><a class="btn" href="#/office/visits">Review visit records</a></div></section><section class="panel" ${visible("Checks") ? "" : "hidden"}><h2>Finance review preview</h2><p class="muted">${state.visits.length} recorded visits; ${reviews.length} require a note or office review before totals can be checked.</p><div class="notice">${icon("shield")} Rates, travel, kilometres and invoice rules remain in the current systems. This demo does not calculate payroll or submit a claim.</div><div class="spacer"></div><a class="btn" href="#/office/fees">Open routes &amp; fee proposals</a></section><section class="panel" ${visible("Messages") ? "" : "hidden"}><div class="section-heading"><div><h2>Incoming email triage</h2><p>Fictional messages for the presentation; no mailbox is connected.</p></div><span class="status amber">${state.inbound.filter(m => m.status === "New").length} new</span></div>${state.inbound.map(m => `<div class="work-item"><div class="work-item-main"><strong>${esc(m.subject)}</strong><span>${esc(m.from)} · ${esc(m.name)}</span><small>${esc(m.body)}</small>${m.linkedEnquiry ? `<a href="#/office/enquiries/${attr(m.linkedEnquiry)}">Open ${esc(m.linkedEnquiry)}</a>` : m.officeNote ? `<small>Office: ${esc(m.officeNote)}</small>` : ""}</div><div class="work-item-actions">${pill(m.status)}${m.urgent ? `<span class="status red">Urgent example</span>` : ""}${m.status === "New" ? `<button class="btn small" data-action="triage-email" data-id="${attr(m.id)}" type="button">Triage</button>` : ""}</div></div>`).join("")}</section></div><div ${visible("Messages") ? "" : "hidden"}>${updateFeed("office")}</div>`;
  }

  function enquiriesPage() {
    const rows = state.enquiries.filter(e => (ui.enquiryStatus === "All statuses" || e.status === ui.enquiryStatus) && `${e.name} ${e.service} ${e.suburb} ${e.id}`.toLowerCase().includes(ui.enquiryQuery.toLowerCase())).sort((a, b) => b.received.localeCompare(a.received));
    return `${pageHeader("Office / Enquiries", "Enquiries & intake", "Track the first contact, review intake and keep every follow-up owned.", `<button class="btn" data-action="export-enquiries" type="button">${icon("download")} Export CSV</button><button class="btn primary" data-action="new-enquiry" type="button">${icon("plus")} New enquiry</button>`)}
      <div class="toolbar"><div class="filters"><label class="search">${icon("search")}<input id="enquiry-search" aria-label="Search enquiries" placeholder="Search enquiries" value="${attr(ui.enquiryQuery)}"></label><select id="enquiry-status" class="filter-select" aria-label="Filter enquiry status">${["All statuses", "New", "In progress", "Waiting on participant", "Ready for agreement", "Ready for service", "Active", "Closed"].map(x => option(x, ui.enquiryStatus)).join("")}</select></div><span class="muted tiny">${rows.length} enquiry${rows.length === 1 ? "" : "ies"}</span></div>
      <section class="panel tight"><div class="table-wrap"><table><thead><tr><th>Enquiry</th><th>Service</th><th>Status</th><th>Next action</th><th>Owner</th></tr></thead><tbody>${rows.map(e => `<tr><td><a href="#/office/enquiries/${attr(e.id)}">${esc(e.name)}</a><span class="cell-sub">${esc(e.id)} · ${esc(e.source)}</span></td><td>${esc(e.service)}<span class="cell-sub">${esc(e.suburb)}</span></td><td>${pill(e.status)}</td><td>${dateLabel(e.nextAction)}<span class="cell-sub">${e.intake ? "Intake received" : "Intake pending"}</span></td><td>${esc(e.owner)}</td></tr>`).join("") || `<tr><td colspan="5">${empty("No matching enquiries", "Try a different search or status.")}</td></tr>`}</tbody></table></div></section>`;
  }

  function enquiryDetail(enquiryId) {
    const e = find(state.enquiries, enquiryId);
    if (!e) return `${pageHeader("Enquiries", "Enquiry not found")}<a class="btn" href="#/office/enquiries">Back to enquiries</a>`;
    const intake = e.intake;
    const linkedParticipant = state.participants.find(p => p.email.toLowerCase() === e.email.toLowerCase());
    if (e.serverRecord) {
      const statusOptions = ["New", "Contacting", "Reviewing", "Ready for ShiftCare", "Entered in ShiftCare", "Closed"].map(status => option(status, e.serverStatus)).join("");
      const history = e.history.map(entry => `<li><strong>${esc(entry.event)}</strong><span>${esc(entry.by)} · ${esc(new Date(entry.at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }))}</span></li>`).join("");
      return `${pageHeader(e.id, e.name, `${e.service} · ${e.suburb}${e.postcode ? ` ${e.postcode}` : ""}`, pill(e.serverStatus))}<div class="record-summary"><span>${icon("inbox")} Request received ${dateLabel(e.received)}</span><span>${icon("people")} ${esc(e.owner)}</span><span>${icon("clock")} Follow-up ${e.nextAction ? dateLabel(e.nextAction) : "not scheduled"}</span></div><div class="record-layout"><div class="stack"><section class="panel"><div class="section-heading"><div><h2>Request details</h2><p>The submitted information stays visible while the office reviews it.</p></div></div><div class="grid-half"><div>${pair("Requested support", intake.support)}${pair("Service", e.service)}${pair("Source", e.source)}</div><div>${pair("Email", e.email)}${pair("Phone", e.phone)}${pair("Service area", `${e.suburb}${e.postcode ? ` ${e.postcode}` : ""}`)}</div></div></section><section class="panel"><h2>Activity</h2><ol class="record-history">${history || `<li><span>No activity recorded.</span></li>`}</ol></section></div><aside class="stack"><section class="panel workflow-panel"><div class="section-heading"><div><h2>Next action</h2><p>Assign ownership, record the decision, then complete the verified ShiftCare handoff.</p></div></div><form data-form="server-record" data-id="${attr(e.id)}"><label>Owner<input name="owner" value="${attr(e.owner === "Unassigned" ? "" : e.owner)}" placeholder="Staff name or office email"></label><div class="form-grid"><label>Status<select name="status">${statusOptions}</select></label><label>Follow-up date<input name="followUp" type="date" value="${attr(e.nextAction || "")}"></label><label>Suburb<input name="suburb" value="${attr(e.suburb === "To confirm" ? "" : e.suburb)}"></label><label>Postcode<input name="postcode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" value="${attr(e.postcode)}"></label><label class="full">Next action<textarea name="nextAction" required>${esc(e.serverNextAction)}</textarea></label><label class="full">ShiftCare reference<input name="shiftCareId" value="${attr(e.shiftCareId)}" placeholder="Required when entered in ShiftCare"></label></div><p class="form-note">The system checks the service postcode before a request can be marked ready for ShiftCare.</p><div class="form-actions"><button class="btn primary" type="submit">Save request</button></div></form></section>${linkedParticipant ? `<section class="panel"><h2>Participant record</h2><p class="muted tiny">Linked to ${esc(linkedParticipant.name)}.</p><a class="btn" href="#/office/participants/${attr(linkedParticipant.id)}">Open participant</a></section>` : ""}</aside></div>`;
    }
    const participantAction = linkedParticipant ? `<section class="panel"><h2>Participant record</h2><p class="muted tiny">This enquiry is linked to ${esc(linkedParticipant.name)}.</p><a class="btn" href="#/office/participants/${attr(linkedParticipant.id)}">Open participant</a></section>` : ["Ready for agreement", "Ready for service"].includes(e.status) ? `<section class="panel"><h2>Accepted for onboarding</h2><p class="muted tiny">Create a participant record before preparing an agreement.</p><button class="btn primary" data-action="create-participant" data-id="${attr(e.id)}" type="button">Create participant</button></section>` : "";
    return `${crumb(e.name, "office/enquiries", "Enquiries")}${pageHeader(e.id, e.name, `${e.service} · ${e.suburb} · received ${dateLabel(e.received)}`, pill(e.status))}
      <div class="grid-detail"><div class="stack"><section class="panel"><div class="section-heading"><div><h2>Intake source</h2><p>Original information remains visible during review.</p></div>${intake ? pill("Received") : pill("Pending")}</div>${intake ? `<div class="grid-half"><div>${pair("Requested support", intake.support)}${pair("Preference", intake.preference)}</div><div>${pair("Funding", intake.funding)}${pair("Submitted", dateLabel(intake.submitted))}</div></div>` : empty("No intake submitted", "The office can follow up or share the public intake link.")}</section>
        <section class="panel"><div class="section-heading"><div><h2>AI intake review</h2><p>Demo-generated suggestion. Staff check it against the source above.</p></div>${e.aiReview ? pill(e.aiReview.reviewed ? "Reviewed" : "Needs approval") : ""}</div>${intake ? e.aiReview ? `<div class="review-box"><h3>Suggested summary</h3><p>${esc(e.aiReview.summary)}</p><h3>Missing information</h3><p>${esc(e.aiReview.missing)}</p><h3>Possible service match</h3><p>${esc(e.aiReview.match)}</p></div><div class="button-row" style="margin-top:14px"><button class="btn soft" data-action="edit-ai" data-id="${attr(e.id)}" type="button">Edit suggestion</button>${!e.aiReview.reviewed ? `<button class="btn primary" data-action="approve-ai" data-id="${attr(e.id)}" type="button">Mark reviewed</button>` : ""}</div>` : `<div class="notice">${icon("shield")} The suggestion is generated from this demo intake only. No external AI service is called.</div><div class="spacer"></div><button class="btn primary" data-action="generate-ai" data-id="${attr(e.id)}" type="button">Prepare review suggestion</button>` : empty("Intake needed", "AI review is available after intake information is recorded.")}</section>
        <section class="panel"><div class="section-heading"><div><h2>Email draft</h2><p>Only a named staff review can send an AI-assisted message.</p></div>${pill(e.emailStatus)}</div>${e.emailStatus === "Sent (demo)" ? `<div class="review-box"><h3>Approved message · simulated send</h3><p style="white-space:pre-line">${esc(e.emailDraft)}</p></div><p class="form-note">Reviewed by Mia Roberts. No real email was sent.</p>` : e.emailDraft ? `<form data-form="send-email" data-id="${attr(e.id)}"><label>Message to ${esc(e.email)}<textarea name="message" rows="7" required>${esc(e.emailDraft)}</textarea></label><div class="form-actions"><button class="btn" data-action="discard-email" data-id="${attr(e.id)}" type="button">Discard draft</button><button class="btn primary" type="submit">Review &amp; send (demo)</button></div></form>` : `<p class="muted">Create a suggested follow-up from the enquiry details. You can edit it before sending.</p><button class="btn primary" data-action="draft-email" data-id="${attr(e.id)}" type="button">Prepare email draft</button>`}</section></div>
        <aside class="stack"><section class="panel"><h2>Enquiry details</h2><div class="spacer"></div>${pair("Email", e.email)}${pair("Phone", e.phone)}${pair("Preferred contact", e.preferredContact)}${pair("Source", e.source)}${pair("Owner", e.owner)}${pair("Next action", dateLabel(e.nextAction))}</section><section class="panel"><h2>Next step</h2><p class="muted tiny">The office records the service decision and follow-up date.</p><form data-form="enquiry-status" data-id="${attr(e.id)}"><label>Status<select name="status">${["New", "In progress", "Waiting on participant", "Ready for agreement", "Ready for service", "Active", "Closed"].map(s => option(s, e.status)).join("")}</select></label><div class="spacer" style="height:12px"></div><label>Next action date<input name="nextAction" type="date" value="${attr(e.nextAction)}" required></label><div class="form-actions"><button class="btn primary" type="submit">Save follow-up</button></div></form></section>${participantAction}<div class="side-note">Participant acceptance, clinical judgments and fee decisions remain with OCD Brilliance staff.</div></aside></div>`;
  }

  function callsPage() {
    const bookings = state.calls.map(c => ({ ...c, slot: find(state.slots, c.slotId) })).sort((a, b) => `${a.slot?.date}${a.slot?.time}`.localeCompare(`${b.slot?.date}${b.slot?.time}`));
    const available = availableSlots();
    return `${pageHeader("Office / Discovery calls", "Discovery calls", "Publish call times, keep bookings linked to enquiries, and review transcript summaries.", `<a class="btn" href="#/public/book">Open public booking ${icon("arrow")}</a><button class="btn primary" data-action="add-slot" type="button">${icon("plus")} Add a slot</button>`)}<div class="tabs" role="tablist"><button class="tab ${ui.callTab === "Bookings" ? "active" : ""}" data-action="call-tab" data-value="Bookings" type="button">Bookings</button><button class="tab ${ui.callTab === "Available slots" ? "active" : ""}" data-action="call-tab" data-value="Available slots" type="button">Available slots</button></div>
      ${ui.callTab === "Bookings" ? `<section class="panel tight"><div class="table-wrap"><table><thead><tr><th>Visitor</th><th>Call time</th><th>Reference</th><th>Enquiry</th><th>Call status</th><th>Summary</th><th></th></tr></thead><tbody>${bookings.map(c => { const summaryStatus = c.transcriptSummary ? c.transcriptSummary.reviewed ? "Reviewed" : "Needs approval" : "Not started"; return `<tr><td><strong>${esc(c.name)}</strong><span class="cell-sub">${esc(c.email)}</span></td><td>${dateLabel(c.slot?.date)}<span class="cell-sub">${esc(c.slot?.time)} · ${c.slot?.duration || 30} min</span></td><td>${esc(c.id)}</td><td>${c.enquiryId ? `<a href="#/office/enquiries/${attr(c.enquiryId)}">${esc(c.enquiryId)}</a>` : "—"}</td><td>${pill(c.status)}</td><td>${pill(summaryStatus)}</td><td><div class="button-row">${c.status === "Change requested" ? `<button class="btn small" data-action="resolve-call" data-id="${attr(c.id)}" type="button">Resolve</button>` : ""}${c.status !== "Cancelled" ? `<button class="btn small ${c.transcriptSummary && !c.transcriptSummary.reviewed ? "primary" : ""}" data-action="call-transcript" data-id="${attr(c.id)}" type="button">${c.transcriptSummary ? "Review summary" : "Add transcript"}</button>` : ""}</div></td></tr>`; }).join("") || `<tr><td colspan="7">${empty("No calls booked", "New public bookings will appear here.")}</td></tr>`}</tbody></table></div></section>` : `<div class="grid-half"><section class="panel"><h2>Published slots</h2><div class="spacer"></div>${available.length ? available.map(s => `<div class="visit-row"><span class="date-badge"><strong>${dateObj(s.date).getUTCDate()}</strong><small>${dateLabel(s.date, { weekday: "short" })}</small></span><span class="body"><strong>${esc(s.time)} · ${s.duration} min</strong><small>${dateLabel(s.date, { weekday: "long", day: "numeric", month: "long" })}</small></span><button class="btn small" data-action="remove-slot" data-id="${attr(s.id)}" type="button">Remove</button></div>`).join("") : empty("No open slots", "Add a new slot for the public calendar.")}</section><section class="panel"><h2>How the public booking works</h2><div class="spacer"></div><p class="muted">A visitor sees only published times. Booking one slot removes it from availability, links or creates an enquiry, and gives the visitor a reference.</p><div class="notice">${icon("shield")} In this prototype, calendar events and email confirmations are simulated. A connected office calendar and email account are implementation decisions.</div></section></div>`}`;
  }

  function participantsPage() {
    const rows = state.participants.filter(p => `${p.name} ${p.service} ${p.suburb}`.toLowerCase().includes(ui.participantQuery.toLowerCase()));
    return `${pageHeader("Office / Participants", "Participants", "A clear record of service details, agreements and client portal requests.", `<a class="btn" href="#/office/staff">View staff ${icon("arrow")}</a>`)}
      <div class="toolbar"><label class="search">${icon("search")}<input id="participant-search" aria-label="Search participants" placeholder="Search participants" value="${attr(ui.participantQuery)}"></label><span class="muted tiny">${rows.length} participant${rows.length === 1 ? "" : "s"}</span></div><section class="panel tight"><div class="table-wrap"><table><thead><tr><th>Participant</th><th>Service</th><th>Agreement</th><th>Portal requests</th><th>Status</th></tr></thead><tbody>${rows.map(p => { const a = agreementFor(p.id); const openRequests = state.requests.filter(r => r.participantId === p.id && r.status === "Pending").length; return `<tr><td><a href="#/office/participants/${attr(p.id)}">${esc(p.name)}</a><span class="cell-sub">${esc(p.suburb)} · ${esc(p.id)}</span></td><td>${esc(p.service)}<span class="cell-sub">${esc(p.funding)}</span></td><td>${a ? pill(a.status) : pill("Pending")}</td><td>${openRequests ? `<span class="status amber">${openRequests} pending</span>` : "—"}</td><td>${pill(p.status)}</td></tr>`; }).join("") || `<tr><td colspan="5">${empty("No matching participants", "Try another search.")}</td></tr>`}</tbody></table></div></section>`;
  }

  function staffPage() {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekDays = Array.from({ length: 5 }, (_, index) => addDays(ui.scheduleWeekStart, index));
    return `${pageHeader("Office / People", "Staff", `Eligibility, regular days and visits for the schedule week of ${dateLabel(ui.scheduleWeekStart)}.`, `<a class="btn" href="#/office/participants">Participants</a><a class="btn primary" href="#/office/schedule">Open schedule ${icon("arrow")}</a>`)}
      <div class="staff-list">${state.workers.map(w => {
        const visits = state.bookings.filter(b => b.workerId === w.id && weekDays.includes(b.date) && b.status !== "Cancelled").length;
        const checks = state.workerDocs.filter(d => d.workerId === w.id && d.status !== "Valid");
        return `<section class="panel staff-card"><div class="staff-heading"><span class="avatar">${esc(w.initials)}</span><div><h2>${esc(w.name)}</h2><span class="muted tiny">${esc(w.id)}</span></div>${pill(w.approved ? "Approved" : "Pending")}</div><p class="staff-services">${esc(w.services.join(" · "))}</p><div class="staff-facts"><span><strong>${visits}</strong> visits this week</span><span><strong>${esc(w.days.map(day => dayNames[day]).join(", "))}</strong> regular days</span></div>${checks.length ? `<p class="staff-check">${icon("alert")} ${checks.length} document check${checks.length === 1 ? "" : "s"} need attention</p>` : `<p class="staff-check clear">${icon("check")} Documents up to date in demo</p>`}<button class="btn small" data-action="schedule-worker" data-id="${attr(w.id)}" type="button">View in schedule</button></section>`;
      }).join("")}</div>`;
  }

  function participantDetail(participantId) {
    const p = participant(participantId);
    if (!p) return `${pageHeader("Participants", "Participant not found")}<a class="btn" href="#/office/participants">Back to participants</a>`;
    const a = agreementFor(p.id);
    const bookings = state.bookings.filter(b => b.participantId === p.id).sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`));
    const requests = state.requests.filter(r => r.participantId === p.id).sort((a, b) => b.created.localeCompare(a.created));
    const tab = ui.participantTab;
    let main = "";
    if (tab === "Overview") main = `<div class="grid-half"><section class="panel"><h2>Service profile</h2><div class="spacer"></div>${pair("Service", p.service)}${pair("Funding", p.funding)}${pair("Schedule preference", p.schedulePreference)}${pair("Preferred worker", worker(p.preferredWorker)?.name || "Not set")}${pair("Service address", p.address)}</section><section class="panel"><h2>Contact & access</h2><div class="spacer"></div>${pair("Email", p.email)}${pair("Phone", p.phone)}${pair("Representative", p.representative)}${pair("Emergency contact", p.emergencyContact)}</section></div><div class="spacer"></div><div class="notice">${icon("shield")} Portal access is limited to this participant's own bookings, agreement and shared documents. Internal staff notes stay in the office workspace.</div>`;
    if (tab === "Bookings") main = `<section class="panel tight"><div class="table-wrap"><table><thead><tr><th>Date & time</th><th>Service</th><th>Worker</th><th>Status</th></tr></thead><tbody>${bookings.map(b => `<tr><td><a href="#/office/schedule/${attr(b.id)}">${dateLabel(b.date)}</a><span class="cell-sub">${b.start}–${b.end}</span></td><td>${esc(b.service)}</td><td>${esc(worker(b.workerId)?.name || "Unassigned")}</td><td>${pill(b.status)}</td></tr>`).join("") || `<tr><td colspan="4">${empty("No bookings yet", "Create a booking after agreement review.")}</td></tr>`}</tbody></table></div></section>`;
    if (tab === "Documents") main = `<section class="panel"><div class="section-heading"><h2>Agreement</h2>${a ? `<a href="#/office/agreements/${attr(a.id)}">Open agreement</a>` : `<button class="btn small primary" data-action="generate-agreement" data-id="${attr(p.id)}" type="button">Generate agreement</button>`}</div>${a ? `<div class="document-item">${icon("file")}<span class="body"><strong>${esc(a.service)} service agreement</strong><small>${esc(a.id)} · ${esc(a.template)}</small></span>${pill(a.status)}</div>` : empty("No agreement generated", "A reviewed agreement is required before activation.")}<div class="content-section"><h3>Shared with client portal</h3><div class="document-list">${p.sharedDocs.length ? p.sharedDocs.map(d => `<div class="document-item">${icon("file")}<span class="body"><strong>${esc(d.name)}</strong><small>Shared ${dateLabel(d.date)}</small></span></div>`).join("") : `<p class="muted tiny">No other shared documents.</p>`}</div></div></section>`;
    if (tab === "Requests") main = `<section class="panel"><div class="section-heading"><h2>Portal requests</h2><span class="muted tiny">Requests do not change confirmed bookings automatically.</span></div>${requests.length ? requests.map(r => `<div class="visit-row"><span class="priority-icon">${icon("inbox")}</span><span class="body"><strong>${esc(r.type)}</strong><small>${esc(r.message)} · ${dateLabel(r.created)}</small>${r.bookingId ? `<small><a href="#/office/schedule/${attr(r.bookingId)}">Open ${esc(r.bookingId)}</a></small>` : ""}</span>${pill(r.status)}${r.status === "Pending" ? `<button class="btn small" data-action="review-request" data-id="${attr(r.id)}" type="button">Record outcome</button>` : ""}</div>`).join("") : empty("No portal requests", "New booking requests and feedback appear here.")}</section>`;
    return `${crumb(p.name, "office/participants", "Participants")}${pageHeader(p.id, p.name, `${p.service} · ${p.suburb}`, `${pill(p.status)}${p.status === "Onboarding" && a?.status === "Signed" ? `<button class="btn small primary" data-action="activate-participant" data-id="${attr(p.id)}" type="button">Mark active</button>` : ""}`)}<div class="tabs" role="tablist">${["Overview", "Bookings", "Documents", "Requests"].map(t => `<button class="tab ${t === tab ? "active" : ""}" data-action="participant-tab" data-value="${t}" type="button">${t}${t === "Requests" && requests.some(r => r.status === "Pending") ? ` · ${requests.filter(r => r.status === "Pending").length}` : ""}</button>`).join("")}</div>${main}`;
  }

  function agreementsPage() {
    return `${pageHeader("Office / Agreements", "Agreements", "Prepare an approved template, review it, then track electronic signing.", `<button class="btn primary" data-action="generate-agreement" type="button">${icon("plus")} Generate agreement</button>`)}<div class="notice" style="margin-bottom:17px">${icon("shield")} Document wording, pricing and cancellation terms shown here are sample placeholders. OCD Brilliance must approve the real template and signing provider.</div><section class="panel tight"><div class="table-wrap"><table><thead><tr><th>Agreement</th><th>Participant</th><th>Service</th><th>Template</th><th>Status</th></tr></thead><tbody>${[...state.agreements].reverse().map(a => `<tr><td><a href="#/office/agreements/${attr(a.id)}">${esc(a.id)}</a><span class="cell-sub">Generated ${dateLabel(a.generated)}</span></td><td><a href="#/office/participants/${attr(a.participantId)}">${esc(participant(a.participantId)?.name)}</a></td><td>${esc(a.service)}</td><td>${esc(a.template)}</td><td>${pill(a.status)}</td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function documentPreview(a) {
    const p = participant(a.participantId);
    return `<div class="document-sheet"><div class="doc-header"><img src="assets/ocd-brilliance-logo.png" alt="OCD Brilliance"><span>${esc(a.id)}<br>${esc(a.template)}</span></div><span class="doc-label">Prototype document · review before use</span><h2>Service agreement preview</h2><p>Generated from the selected sample template and reviewed participant record.</p><h3>Service details</h3><div class="doc-field"><span>Participant</span><strong>${esc(p?.name)}</strong></div><div class="doc-field"><span>Service</span><strong>${esc(a.service)}</strong></div><div class="doc-field"><span>Proposed schedule</span><strong>${esc(a.schedule)}</strong></div><div class="doc-field"><span>Pricing</span><strong>${esc(a.pricing)}</strong></div><div class="doc-field"><span>Cancellation terms</span><strong>${esc(a.cancellation)}</strong></div><h3>Agreement status</h3><p>${esc(a.status)}${a.signed ? ` · signed ${dateLabel(a.signed)}` : ""}</p><div class="doc-signatures"><div>Participant / authorised representative</div><div>OCD Brilliance representative</div></div></div>`;
  }

  function agreementDetail(agreementId) {
    const a = find(state.agreements, agreementId);
    if (!a) return `${pageHeader("Agreements", "Agreement not found")}<a class="btn" href="#/office/agreements">Back to agreements</a>`;
    return `${crumb(a.id, "office/agreements", "Agreements")}${pageHeader("Agreement / " + a.id, `${participant(a.participantId)?.name} · ${a.service}`, `Generated ${dateLabel(a.generated)} from ${a.template}`, pill(a.status))}<div class="grid-detail"><section class="panel print-target">${documentPreview(a)}</section><aside class="stack agreement-actions"><section class="panel"><h2>Approval & signing</h2><div class="spacer"></div>${pair("Status", a.status)}${pair("Sent", a.sent ? dateLabel(a.sent) : "Not sent")}${pair("Signed", a.signed ? dateLabel(a.signed) : "Not yet")}${a.status === "Draft" ? `<div class="notice warning">${icon("alert")} Confirm the template and terms before sending.</div><div class="spacer"></div><button class="btn primary" data-action="send-agreement" data-id="${attr(a.id)}" type="button">Approve &amp; send for signing (demo)</button>` : a.status === "Awaiting signature" ? `<div class="spacer"></div><button class="btn primary" data-action="record-signature" data-id="${attr(a.id)}" type="button">Record signed outcome (demo)</button>` : `<div class="notice">${icon("check")} Signed copy is represented in this prototype. Real e-signing requires the approved provider.</div>`}<div class="spacer"></div><button class="btn" data-action="print-agreement" type="button">${icon("download")} Print / save PDF</button></section><div class="side-note">The prototype demonstrates document preparation and status. It does not send a document to a real e-signature service.</div></aside></div>`;
  }

  function calendarEvents(area) {
    const services = state.bookings
      .filter(b => area === "office" ? b.status !== "Cancelled" : b.workerId === ui.workerId && ["Confirmed", "Completed"].includes(b.status))
      .map(b => ({
        date: b.date, time: b.start, type: "service",
        tone: b.status === "Needs cover" ? "cover" : b.status === "Proposed" ? "proposed" : "service",
        short: `${b.start} ${participant(b.participantId)?.name || "Service"}`,
        title: participant(b.participantId)?.name || "Service visit",
        detail: `${b.service} · ${area === "office" ? worker(b.workerId)?.name || "Unassigned" : participant(b.participantId)?.suburb || "Service area"}`,
        timeLabel: `${b.start}–${b.end}`, status: b.status,
        href: `#/${area === "office" ? "office/schedule" : "worker/today"}/${b.id}`
      }));
    const calls = area === "office" ? state.calls
      .filter(c => ["Booked", "Change requested"].includes(c.status))
      .map(c => { const slot = find(state.slots, c.slotId); return slot ? {
        date: slot.date, time: slot.time, type: "call", tone: "call",
        short: `${slot.time} Call · ${c.name}`, title: `Discovery call · ${c.name}`,
        detail: `${slot.duration} min · ${c.id}`, timeLabel: slot.time,
        status: c.status, href: "#/office/calls"
      } : null; })
      .filter(Boolean) : [];
    return [...services, ...calls].sort((a, b) => `${a.date}${a.time}${a.title}`.localeCompare(`${b.date}${b.time}${b.title}`));
  }

  function calendarPage(area) {
    const office = area === "office";
    const month = ui[office ? "officeCalendarMonth" : "workerCalendarMonth"];
    const selected = ui[office ? "officeCalendarDate" : "workerCalendarDate"];
    const events = calendarEvents(area);
    const monthEvents = events.filter(e => e.date.slice(0, 7) === month.slice(0, 7));
    const occupiedDays = new Set(monthEvents.filter(e => e.tone !== "proposed").map(e => e.date)).size;
    const serviceCount = monthEvents.filter(e => e.type === "service" && e.tone !== "proposed").length;
    const callCount = monthEvents.filter(e => e.type === "call").length;
    const proposedCount = monthEvents.filter(e => e.tone === "proposed").length;
    const firstOffset = (weekday(month) + 6) % 7;
    const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const cellCount = Math.ceil((firstOffset + daysInMonth) / 7) * 7;
    const gridStart = addDays(month, -firstOffset);
    const fullDate = date => dateLabel(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const cells = Array.from({ length: cellCount }, (_, index) => {
      const date = addDays(gridStart, index);
      const dayEvents = events.filter(e => e.date === date);
      const outside = date.slice(0, 7) !== month.slice(0, 7);
      const busy = dayEvents.some(e => e.tone !== "proposed");
      const calls = dayEvents.filter(e => e.type === "call").length;
      const services = dayEvents.length - calls;
      const description = dayEvents.length ? office ? `${services} service${services === 1 ? "" : "s"}, ${calls} discovery call${calls === 1 ? "" : "s"}` : `${services} assigned visit${services === 1 ? "" : "s"}` : office ? "No booked visits or calls" : "No assigned visits";
      return `<button class="calendar-day ${outside ? "outside" : ""} ${busy ? "occupied" : ""} ${date === selected ? "selected" : ""} ${date === todayPerth() ? "today" : ""}" data-action="calendar-day" data-date="${date}" type="button" aria-label="${attr(fullDate(date))}: ${attr(description)}" aria-pressed="${date === selected}"><span class="calendar-day-number">${dateObj(date).getUTCDate()}</span><span class="calendar-cell-events">${dayEvents.slice(0, 2).map(e => `<span class="calendar-event ${e.tone}">${esc(e.short)}</span>`).join("")}${dayEvents.length > 2 ? `<span class="calendar-more">+${dayEvents.length - 2} more</span>` : ""}</span><span class="calendar-dots" aria-hidden="true">${dayEvents.slice(0, 3).map(e => `<i class="${e.tone}"></i>`).join("")}</span></button>`;
    }).join("");
    const selectedEvents = events.filter(e => e.date === selected);
    const openSlots = office ? availableSlots().filter(s => s.date === selected) : [];
    const eventRows = selectedEvents.map(e => `<a class="calendar-agenda-item" href="${e.href}"><span class="calendar-agenda-time">${esc(e.timeLabel)}</span><span class="calendar-agenda-copy"><strong>${esc(e.title)}</strong><small>${esc(e.detail)}</small></span>${pill(e.status)}</a>`).join("");
    const action = office ? `<a class="btn" href="#/office/calls">Manage calls</a><a class="btn primary" href="#/office/schedule">Open schedule ${icon("arrow")}</a>` : `<a class="btn primary" href="#/worker/today">My visits ${icon("arrow")}</a>`;
    return `${pageHeader(office ? "Office / Calendar" : "Worker / Calendar", office ? "Calendar" : "My calendar", office ? "See service bookings and booked discovery calls across the month." : "See your confirmed and completed service visits across the month.", action)}
      <div class="calendar-summary"><span><strong>${occupiedDays}</strong> occupied day${occupiedDays === 1 ? "" : "s"}</span><span><strong>${serviceCount}</strong> service visit${serviceCount === 1 ? "" : "s"}</span>${office ? `<span><strong>${callCount}</strong> booked call${callCount === 1 ? "" : "s"}</span>${proposedCount ? `<span><strong>${proposedCount}</strong> proposed</span>` : ""}` : ""}<span class="calendar-timezone">Australia/Perth time</span></div>
      <div class="calendar-layout"><section class="panel calendar-panel" aria-label="Month calendar"><div class="calendar-toolbar"><h2>${dateLabel(month, { month: "long", year: "numeric" })}</h2><div class="calendar-nav"><button class="btn small" data-action="calendar-prev" type="button" aria-label="Previous month">←</button><button class="btn small" data-action="calendar-demo" type="button">Demo month</button><button class="btn small" data-action="calendar-next" type="button" aria-label="Next month">→</button></div></div><div class="calendar-legend"><span><i class="service"></i> Service visit</span>${office ? `<span><i class="call"></i> Discovery call</span><span><i class="cover"></i> Needs cover</span><span><i class="proposed"></i> Proposed</span>` : ""}</div><div class="calendar-weekdays" aria-hidden="true">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells}</div></section>
      <aside class="panel calendar-agenda" tabindex="-1" aria-label="Selected day details"><span class="eyebrow">Selected day</span><h2>${fullDate(selected)}</h2><p class="muted tiny">${selectedEvents.length ? `${selectedEvents.length} calendar item${selectedEvents.length === 1 ? "" : "s"}` : office ? "No service visits or booked calls" : "No assigned visits"}</p><div class="calendar-agenda-list">${eventRows || `<p class="calendar-agenda-empty">${office ? "No service visits or booked calls on this day." : "No confirmed or completed visits on this day."}</p>`}</div>${office ? `<div class="calendar-open-slots"><h3>Published call times still open</h3>${openSlots.length ? `<p>${openSlots.map(s => `${esc(s.time)} · ${s.duration} min`).join("<br>")}</p>` : `<p>None for this day.</p>`}<button class="btn small" data-action="add-slot" type="button">Add call slot</button></div>` : `<div class="calendar-open-slots"><p>Regular working days are managed separately from assigned visits.</p><a class="btn small" href="#/worker/availability">View availability</a></div>`}</aside></div>`;
  }

  function schedulePage() {
    const needsCover = state.bookings.filter(b => b.status === "Needs cover");
    const cancellations = state.bookings.filter(b => b.status === "Cancelled" && b.cancellation);
    const weekDays = Array.from({ length: 5 }, (_, index) => addDays(ui.scheduleWeekStart, index));
    const weekLabel = ui.scheduleWeekStart.slice(0, 7) === weekDays[4].slice(0, 7) ? `${dateLabel(ui.scheduleWeekStart, { day: "numeric" })}–${dateLabel(weekDays[4], { day: "numeric", month: "long", year: "numeric" })}` : `${dateLabel(ui.scheduleWeekStart, { day: "numeric", month: "short" })}–${dateLabel(weekDays[4], { day: "numeric", month: "short", year: "numeric" })}`;
    const shown = state.bookings.filter(b => weekDays.includes(b.date) && b.status !== "Cancelled" && (!ui.scheduleWorkerId || b.workerId === ui.scheduleWorkerId) && (!ui.scheduleStatus || b.status === ui.scheduleStatus));
    const rosterWorkers = state.workers.filter(w => (!ui.scheduleWorkerId || w.id === ui.scheduleWorkerId) && (shown.some(b => b.workerId === w.id) || (ui.scheduleWorkerId === w.id && !ui.scheduleStatus)));
    const unassigned = !ui.scheduleWorkerId && shown.some(b => !b.workerId);
    const rows = [...rosterWorkers, ...(unassigned ? [{ id: "", name: "Unassigned", initials: "?", services: [] }] : [])];
    return `${pageHeader("Team roster", "Schedule", "See assignments, visit times and the work that needs attention.", `<a class="btn" href="#/office/map">${icon("map")} View map</a><button class="btn primary" data-action="new-booking" type="button">${icon("plus")} New booking</button>`)}
      <section class="schedule-surface" aria-label="Weekly team schedule"><div class="schedule-toolbar"><div class="schedule-period"><span class="schedule-kicker">WEEK VIEW · AUSTRALIA/PERTH</span><h2>${weekLabel}</h2></div><div class="schedule-controls"><div class="week-nav" aria-label="Change schedule week"><button class="btn small" data-action="schedule-prev" type="button" aria-label="Previous week">←</button><button class="btn small" data-action="schedule-demo-week" type="button">Demo week</button><button class="btn small" data-action="schedule-next" type="button" aria-label="Next week">→</button></div><div class="schedule-filters"><label><span>Employee</span><select id="schedule-worker"><option value="">All employees</option>${state.workers.map(w => `<option value="${attr(w.id)}" ${ui.scheduleWorkerId === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label><label><span>Status</span><select id="schedule-status"><option value="">All statuses</option>${["Confirmed", "Needs cover", "Proposed", "Completed"].map(s => `<option value="${s}" ${ui.scheduleStatus === s ? "selected" : ""}>${s}</option>`).join("")}</select></label></div></div></div>
      <div class="schedule-subbar"><span class="schedule-result" role="status">${shown.length} visit${shown.length === 1 ? "" : "s"} · ${rows.length} employee${rows.length === 1 ? "" : "s"}</span><span class="schedule-subbar-note">Scheduled time and recorded time are shown separately</span></div>
      <p class="mobile-scroll-hint">Swipe across to see each day of the week.</p><div class="roster-scroll" tabindex="0" aria-label="Weekly employee roster"><table class="roster-table"><thead><tr><th scope="col" class="roster-name-col">Team members</th>${weekDays.map(date => `<th scope="col" class="${date === todayPerth() ? "today" : ""}"><span class="roster-day-label">${dateLabel(date, { weekday: "long" })}</span><span class="roster-day-date"><b>${dateObj(date).getUTCDate()}</b><small>${dateLabel(date, { month: "short" })}</small></span></th>`).join("")}</tr></thead><tbody>${rows.map(w => `<tr><th scope="row" class="roster-name-col"><span class="person-cell"><span class="avatar">${esc(w.initials)}</span><span><strong>${esc(w.name)}</strong><small>${w.id ? esc(w.services.slice(0, 1).join("")) : "Awaiting assignment"}</small></span></span></th>${weekDays.map(date => { const bookings = shown.filter(b => (b.workerId || "") === w.id && b.date === date).sort((a, b) => a.start.localeCompare(b.start)); return `<td class="${date === todayPerth() ? "today" : ""}">${bookings.map(b => { const v = visitForBooking(b.id); return `<a class="roster-shift" href="#/office/schedule/${attr(b.id)}"><span class="roster-shift-time">${esc(b.start)}–${esc(b.end)}</span><strong>${esc(participant(b.participantId)?.name)}</strong><small>${esc(b.service)}</small><span class="roster-shift-status ${statusClass(b.status)}">${esc(b.status)}</span><span class="roster-clock"><span>IN <b>${esc(v?.clockIn || "—")}</b></span><span>OUT <b>${esc(v?.clockOut || "—")}</b></span></span></a>`; }).join("") || `<span class="roster-empty" aria-label="No visit">—</span>`}</td>`; }).join("")}</tr>`).join("") || `<tr class="roster-no-results"><td colspan="6">${empty("No matching visits", "Choose another employee, status or week.")}</td></tr>`}</tbody></table></div><div class="schedule-foot"><span>IN and OUT are worker-recorded visit times. A dash means no entry yet.</span><a href="#/office/visits">Open visit records ${icon("arrow")}</a></div></section>
      <div class="spacer"></div><div class="grid-two"><section class="panel"><div class="section-heading"><h2>Needs cover</h2>${pill(`${needsCover.length} open`)}</div>${needsCover.length ? needsCover.map(b => `<div class="visit-row"><span class="priority-icon amber">${icon("alert")}</span><span class="body"><strong>${esc(participant(b.participantId)?.name)} · ${esc(b.service)}</strong><small>${dateLabel(b.date)} · ${b.start}–${b.end}</small></span><a class="btn small" href="#/office/schedule/${attr(b.id)}">Resolve</a></div>`).join("") : empty("No cover requests", "Worker absences will appear here.")}</section><section class="panel"><div class="section-heading"><h2>Worker eligibility</h2><span class="muted tiny">Approval is recorded by the office</span></div>${state.workers.map(w => `<div class="visit-row"><span class="avatar">${esc(w.initials)}</span><span class="body"><strong>${esc(w.name)}</strong><small>${esc(w.services.join(" · "))}</small></span>${pill(w.approved ? "Approved" : "Pending")}</div>`).join("")}</section></div><div class="spacer"></div><section class="panel"><div class="section-heading"><h2>Recorded cancellations</h2><a href="#/office/fees">Review fee rules</a></div>${cancellations.length ? cancellations.map(b => `<div class="visit-row"><span class="priority-icon">${icon("calendar")}</span><span class="body"><strong>${esc(participant(b.participantId)?.name)} · ${esc(b.service)}</strong><small>${dateLabel(b.date)} · ${esc(b.cancellation.cause)} cancellation</small></span><a class="btn small" href="#/office/schedule/${attr(b.id)}">Open record</a></div>`).join("") : `<p class="muted tiny">No cancellations have been recorded.</p>`}</section>`;
  }

  function bookingDetail(bookingId) {
    const b = booking(bookingId);
    if (!b) return `${pageHeader("Schedule", "Booking not found")}<a class="btn" href="#/office/schedule">Back to schedule</a>`;
    const p = participant(b.participantId);
    const w = worker(b.workerId);
    const v = state.visits.find(x => x.bookingId === b.id);
    return `${crumb(b.id, "office/schedule", "Schedule")}${pageHeader("Booking / " + b.id, `${p?.name} · ${b.service}`, `${dateLabel(b.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${b.start}–${b.end}`, pill(b.status) + `<a class="btn" href="#/office/map/${attr(b.id)}">${icon("map")} View on map</a>`)}<div class="grid-detail"><div class="stack"><section class="panel"><h2>Service details</h2><div class="spacer"></div><div class="grid-half"><div>${pair("Participant", p?.name)}${pair("Service", b.service)}${pair("Service area", p?.address)}</div><div>${pair("Worker", w?.name || "Not assigned")}${pair("Recurrence", b.recurrence)}${pair("Participant agreement", b.participantAgreed ? "Recorded" : "Needed before confirmation")}</div></div></section>
      ${b.status === "Needs cover" ? `<section class="panel"><h2>Arrange reviewed cover</h2><p class="muted">The office checks candidates, posts a native offer, waits for worker acceptance, then verifies the assignment.</p><div class="notice warning">For same-day or essential changes, also use the existing urgent contact process.</div><div class="form-actions"><button class="btn primary" data-action="offer-cover" data-id="${attr(b.id)}" type="button">Open cover case</button></div></section>` : ""}
      ${b.status === "Proposed" ? `<section class="panel"><h2>Confirm booking</h2><p class="muted">Check worker approval, overlap and the signed agreement before confirmation.</p><form data-form="confirm-booking" data-id="${attr(b.id)}"><label class="checkbox"><input name="agreed" type="checkbox" required><span>The participant agreed to this arrangement.</span></label><div class="form-actions"><button class="btn primary" type="submit">Review native confirmation</button></div></form></section>` : ""}
      ${b.status === "Confirmed" ? `<section class="panel"><h2>Manage this service</h2><p class="muted">A change is recorded before the roster is updated.</p><div class="button-row"><button class="btn" data-action="mark-cover" data-id="${attr(b.id)}" type="button">Worker cannot attend</button><button class="btn danger" data-action="cancel-booking" data-id="${attr(b.id)}" type="button">Record cancellation</button></div></section>` : ""}
      ${b.status === "Cancelled" && b.cancellation ? `<section class="panel"><h2>Recorded cancellation</h2><div class="spacer"></div>${pair("Cancelled by", b.cancellation.cause)}${pair("Notice received", `${dateLabel(b.cancellation.notice.slice(0, 10))} · ${b.cancellation.notice.slice(11, 16)}`)}${pair("Office note", b.cancellation.note)}<div class="spacer"></div><a class="btn" href="#/office/fees" data-action="open-cancellation" data-id="${attr(b.id)}">Review fee rule</a></section>` : ""}
      ${v ? `<section class="panel"><div class="section-heading"><h2>Visit record</h2><a href="#/office/visits/${attr(v.id)}">Open record</a></div>${pair("Clock in", v.clockIn)}${pair("Clock out", v.clockOut)}${pair("Note", v.note || "Missing")}</section>` : ""}</div><aside class="stack"><section class="panel"><h2>Participant</h2><div class="spacer"></div>${pair("Name", p?.name)}${pair("Preferred worker", worker(p?.preferredWorker)?.name || "Not set")}${pair("Agreement", agreementFor(p?.id)?.status || "Missing")}<div class="spacer"></div><a class="btn" href="#/office/participants/${attr(p?.id)}">Open participant</a></section><div class="side-note">A worker's absence never reassigns a booking or creates a participant charge automatically.</div></aside></div>`;
  }

  function visitsPage() {
    const rows = [...state.visits].sort((a, b) => booking(b.bookingId)?.date.localeCompare(booking(a.bookingId)?.date));
    return `${pageHeader("Office / Visit records", "Visit records", "Check clock times and progress notes; preserve original values when correcting a record.", `<button class="btn" data-action="export-visits" type="button">${icon("download")} Export CSV</button>`)}<section class="panel tight"><div class="table-wrap"><table><thead><tr><th>Service</th><th>Worker</th><th>Time in</th><th>Time out</th><th>Progress note</th><th>Status</th></tr></thead><tbody>${rows.map(v => { const b = booking(v.bookingId); return `<tr><td><a href="#/office/visits/${attr(v.id)}">${esc(participant(b?.participantId)?.name)}</a><span class="cell-sub">${dateLabel(b?.date)} · ${esc(b?.service)}</span></td><td>${esc(worker(b?.workerId)?.name)}</td><td class="time-value">${esc(v.clockIn || "—")}</td><td class="time-value">${esc(v.clockOut || "—")}</td><td>${v.note ? "Recorded" : `<span style="color:var(--red)">Missing</span>`}</td><td>${pill(v.status)}</td></tr>`; }).join("") || `<tr><td colspan="6">${empty("No visit records", "Worker clock times and notes will appear here.")}</td></tr>`}</tbody></table></div></section>`;
  }

  function visitDetail(visitId) {
    const v = find(state.visits, visitId);
    if (!v) return `${pageHeader("Visit records", "Visit not found")}<a class="btn" href="#/office/visits">Back to visits</a>`;
    const b = booking(v.bookingId);
    return `${crumb(v.id, "office/visits", "Visit records")}${pageHeader("Visit / " + v.id, `${participant(b?.participantId)?.name} · ${b?.service}`, `${dateLabel(b?.date)} · ${worker(b?.workerId)?.name}`, pill(v.status))}<div class="grid-detail"><div class="stack"><section class="panel"><h2>Recorded service</h2><div class="spacer"></div>${pair("Scheduled time", `${b?.start}–${b?.end}`)}${pair("Clock in", v.clockIn)}${pair("Clock out", v.clockOut)}${pair("Tasks", v.tasks || "Native evidence to check")}${pair("Goals / extra-time explanation", v.goals || "Native evidence to check")}${v.majorIssue ? `<div class="notice warning">Major issue flagged by worker — restricted office review. Use the existing urgent process.</div>` : ""}<div class="content-section"><h3>Progress note</h3>${v.note ? `<p>${esc(v.note)}</p>` : `<div class="notice warning">${icon("alert")} This record needs a progress note from the worker.</div>`}</div></section><section class="panel"><h2>Correction history</h2><div class="spacer"></div>${v.corrections?.length ? `<ol class="timeline">${v.corrections.map(c => `<li><strong>${esc(c.field)}: ${esc(c.oldValue)} → ${esc(c.newValue)}</strong><small>Reason: ${esc(c.reason)} · ${esc(c.by)}</small></li>`).join("")}</ol>` : `<p class="muted">No time corrections recorded.</p>`}</section></div><aside class="stack"><section class="panel"><h2>Office review</h2><p class="muted tiny">Original values remain in the correction history.</p><button class="btn" data-action="correct-visit" data-id="${attr(v.id)}" type="button">Correct a time</button>${v.note && v.clockIn && v.clockOut && v.status !== "Reviewed" ? `<div class="spacer"></div><button class="btn primary" data-action="review-visit" data-id="${attr(v.id)}" type="button">Mark reviewed</button>` : ""}</section><div class="side-note">Only assigned workers can record visit notes in the worker view. Office corrections require a reason.</div></aside></div>`;
  }

  function feeHistory() {
    return `<section class="panel tight"><div class="panel-header"><h2>Proposed fees</h2><span class="muted tiny">Office approval before billing</span></div><div class="table-wrap"><table><thead><tr><th>Reference</th><th>Type</th><th>Service</th><th>Calculation</th><th>Status</th><th></th></tr></thead><tbody>${state.feeProposals.length ? [...state.feeProposals].reverse().map(f => `<tr><td>${esc(f.id)}</td><td>${esc(f.type)}</td><td>${esc(participant(booking(f.bookingId)?.participantId)?.name)}<span class="cell-sub">${dateLabel(booking(f.bookingId)?.date)}</span></td><td>$${Number(f.amount).toFixed(2)}<span class="cell-sub">${esc(f.rule)}</span></td><td>${pill(f.status)}</td><td>${f.status === "Proposed" ? `<button class="btn small primary" data-action="approve-fee" data-id="${attr(f.id)}" type="button">Approve</button>` : ""}</td></tr>`).join("") : `<tr><td colspan="6">${empty("No proposed fees yet", "Try one of the calculation examples above.")}</td></tr>`}</tbody></table></div></section>`;
  }

  function cancellationPanel() {
    const cancelled = state.bookings.filter(b => b.status === "Cancelled" && b.cancellation);
    const b = cancelled.find(item => item.id === ui.cancellationBooking) || cancelled[0];
    if (!b) return `<div class="grid-two"><section class="panel"><h2>Cancellation fee proposal</h2><div class="spacer"></div>${empty("No recorded cancellations", "Record a booking cancellation in the office schedule first.")}<div class="spacer"></div><a class="btn primary" href="#/office/schedule">Open schedule</a></section></div>`;
    const cancellation = b.cancellation;
    const received = `${dateLabel(cancellation.notice.slice(0, 10))} · ${cancellation.notice.slice(11, 16)}`;
    return `<div class="grid-two"><section class="panel"><div class="section-heading"><div><h2>Cancellation fee proposal</h2><p>Start with recorded notice and apply an example rule for review.</p></div></div>
      <div class="notice warning" style="margin-bottom:17px">${icon("alert")} The public website contains differing notice periods. Enter an example rule here; it is not an approved business policy.</div>
      <label>Recorded cancellation<select id="cancellation-booking" aria-label="Recorded cancellation">${cancelledBookingOptions(b.id)}</select></label>
      <div class="inset" style="margin:14px 0">${pair("Cancelled by", cancellation.cause)}${pair("Notice received", received)}${pair("Service", `${dateLabel(b.date)} · ${b.start}–${b.end}`)}${pair("Office note", cancellation.note)}</div>
      <form data-form="cancellation-preview"><input type="hidden" name="bookingId" value="${attr(b.id)}"><div class="form-grid"><label>Clear working days required<input type="number" name="days" min="0" max="30" required placeholder="Enter approved threshold"></label><label>Agreed service fee (AUD)<input type="number" name="serviceFee" min="0" step="0.01" required placeholder="Enter agreed fee"></label><label>Charge percentage (%)<input type="number" name="percent" min="0" max="100" step="1" required placeholder="Enter approved percentage"></label><label>Example rule label / version<input name="ruleVersion" required placeholder="Enter a label for this example"></label><label class="full">WA public holidays in this example <span class="muted tiny">(comma-separated YYYY-MM-DD)</span><input name="holidays" placeholder="Enter any holidays in the period"></label></div><p class="form-note">Clear days exclude the notice day, visit day, weekends and dates entered above. Office-hours treatment and the final rule still need approval.</p><div class="form-actions"><button class="btn primary" type="submit">Calculate proposal</button></div></form>${ui.feePreview?.type === "Cancellation" && ui.feePreview.bookingId === b.id ? feePreview() : ""}</section>
      <aside class="panel"><h2>Human review</h2><div class="spacer"></div><p class="muted">The office checks notice evidence, any emergency exception, the applicable service agreement and current NDIS pricing rules before approving a charge.</p><div class="notice">${icon("shield")} Provider or worker cancellations produce no participant charge under the stated policy.</div></aside></div>`;
  }

  function feesPage() {
    const tab = ui.feeTab;
    let content = "";
    if (tab === "Routes") {
      const b = booking(ui.routeBooking) || state.bookings[0];
      const p = participant(b.participantId);
      const estimate = [...state.routeEstimates].reverse().find(r => r.bookingId === b.id);
      content = `<div class="grid-two"><section class="panel"><div class="section-heading"><div><h2>Route estimate</h2><p>Plan or quote from a map result; keep separate from actual kilometres.</p></div></div><label>Service booking<select id="route-booking">${bookingOptions(b.id)}</select></label><div class="route-line"><div class="route-stop"><small>Origin</small><strong>Joondalup office</strong></div><span class="route-connector"></span><div class="route-stop"><small>Destination</small><strong>${esc(p?.address)}</strong></div></div><button class="btn primary" data-action="estimate-route" data-id="${attr(b.id)}" type="button">Show sample estimate</button>${estimate ? `<div class="calculation"><div><span>Illustrative map response</span><strong>${estimate.distance.toFixed(1)} km</strong></div><span>${estimate.duration} min estimated drive</span></div><p class="form-note">Source: ${esc(estimate.source)} · ${dateLabel(estimate.created)}. This is not measured travel.</p>` : ""}</section><aside class="panel"><h2>For the final system</h2><div class="spacer"></div><p class="muted">A selected map service will provide a route and distance. The platform will retain the origin, destination and response used.</p><div class="notice warning">${icon("alert")} A route estimate must never be substituted for verified actual kilometres on a transport charge.</div></aside></div>`;
    }
    if (tab === "Transport") content = `<div class="grid-two"><section class="panel"><div class="section-heading"><div><h2>Transport fee proposal</h2><p>Use verified actual distance and an approved rate.</p></div></div><form data-form="transport-preview"><div class="form-grid"><label class="full">Completed service<select name="bookingId" required>${completedBookingOptions("BKG-499")}</select></label><label>Verified actual distance (km)<input type="number" name="actualKm" min="0" step="0.1" required placeholder="Enter actual kilometres"></label><label>Approved rate (AUD / km)<input type="number" name="rate" min="0" step="0.01" required placeholder="Enter approved rate"></label><label>Rate version / reference<input name="rateVersion" required placeholder="Enter approved rate reference"></label><label class="full">Source of actual distance<input name="source" required placeholder="e.g. approved mileage record"></label></div><div class="form-actions"><button class="btn primary" type="submit">Calculate proposal</button></div></form>${ui.feePreview?.type === "Transport" ? feePreview() : ""}</section><aside class="panel"><h2>Calculation record</h2><div class="spacer"></div><p class="muted">The final platform keeps the input distance, source, rate version and result so staff can reproduce the proposal.</p><div class="notice">${icon("shield")} No invoice is created here. Final invoicing remains in the current system during the pilot.</div></aside></div>`;
    if (tab === "Cancellation") content = cancellationPanel();
    return `${pageHeader("Office / Routes & fees", "Routes & fees", "Store route estimates and prepare transport or cancellation charges for office review.")}<div class="tabs" role="tablist">${["Routes", "Transport", "Cancellation"].map(t => `<button class="tab ${t === tab ? "active" : ""}" data-action="fee-tab" data-value="${t}" type="button">${t}</button>`).join("")}</div>${content}<div class="spacer"></div>${feeHistory()}`;
  }

  function feePreview() {
    const f = ui.feePreview;
    if (!f) return "";
    return `<div class="review-box" style="margin-top:17px"><h3>Calculation preview · ${esc(f.type)}</h3><p>${esc(f.explanation)}</p><div class="calculation"><div><span>Proposed participant charge</span><strong>$${f.amount.toFixed(2)}</strong></div><span>${esc(f.rule)}</span></div><p class="form-note">Example calculation only. An administrator must approve any saved proposal.</p><button class="btn primary" data-action="save-fee" type="button">Save proposed fee</button></div>`;
  }

  function workerToday() {
    const w = worker(ui.workerId);
    const jobs = state.bookings.filter(b => b.workerId === w.id && b.status !== "Cancelled").sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    const offers = state.coverOffers.filter(o => o.workerId === w.id && o.status === "Pending");
    const offerPanel = offers.length ? `<section class="panel offer-panel"><div class="section-heading"><h2>Shift offers awaiting your answer</h2><span class="status amber">${offers.length} new</span></div>${offers.map(o => { const b = booking(o.bookingId); return `<div class="work-item"><div class="work-item-main"><strong>${esc(b.service)} · ${esc(participant(b.participantId)?.suburb)}</strong><span>${dateLabel(b.date)} · ${esc(b.start)}–${esc(b.end)}</span><small>Simulate the worker response in ShiftCare. The office still verifies the current assignment.</small></div><div class="button-row"><button class="btn small primary" data-action="respond-offer" data-id="${attr(o.id)}" data-value="Accepted" type="button">Accept in ShiftCare (demo)</button><button class="btn small" data-action="respond-offer" data-id="${attr(o.id)}" data-value="Declined" type="button">Decline</button></div></div>`; }).join("")}</section>` : "";
    return `${pageHeader("Worker / My visits", "My visits", `Assigned services for ${w.name}. Only information needed for the service appears here.`, `<a class="btn" href="#/worker/map">${icon("map")} View visit map</a>`)}<div class="notice" style="margin-bottom:18px">${icon("shield")} If you cannot attend a same-day or essential service, phone the office as well as reporting it here.</div>${offerPanel}${updateFeed(`worker:${w.id}`)}<div class="grid-two"><section class="panel"><div class="section-heading"><h2>Assigned services</h2><span class="muted tiny">Demo week · Perth time</span></div>${jobs.length ? jobs.map(b => `<a class="visit-row" href="#/worker/today/${attr(b.id)}"><span class="date-badge"><strong>${dateObj(b.date).getUTCDate()}</strong><small>${dateLabel(b.date, { weekday: "short" })}</small></span><span class="body"><strong>${esc(participant(b.participantId)?.name)}</strong><small>${esc(b.service)} · ${b.start}–${b.end} · ${esc(participant(b.participantId)?.suburb)}</small></span>${pill(b.status)}</a>`).join("") : empty("No assigned services", "Confirmed bookings will appear here.")}</section><aside class="panel"><h2>For each visit</h2><div class="spacer"></div><ol class="timeline"><li><strong>Open the assigned booking</strong><small>Check the time and service address.</small></li><li><strong>Clock in and out</strong><small>Simulate native ShiftCare attendance; no live care record is changed.</small></li><li><strong>Complete the progress note</strong><small>The office can then review the record.</small></li></ol></aside></div>`;
  }

  function workerVisit(bookingId) {
    const b = booking(bookingId);
    if (!b || b.workerId !== ui.workerId) return `${pageHeader("Worker / My visits", "Visit not available")}<a class="btn" href="#/worker/today">Back to my visits</a>`;
    const p = participant(b.participantId);
    const v = state.visits.find(x => x.bookingId === b.id);
    return `${crumb(b.id, "worker/today", "My visits")}${pageHeader("Assigned visit", `${p.name} · ${b.service}`, `${dateLabel(b.date, { weekday: "long", day: "numeric", month: "long" })} · ${b.start}–${b.end}`, pill(b.status) + `<a class="btn" href="#/worker/map/${attr(b.id)}">${icon("map")} View on map</a>`)}<div class="grid-detail"><div class="stack"><section class="panel"><h2>Service details</h2><div class="spacer"></div>${pair("Time", `${b.start}–${b.end}`)}${pair("Service area", p.address)}${pair("Service", b.service)}${pair("Schedule", b.recurrence)}</section><section class="panel"><div class="section-heading"><h2>Visit record</h2>${v ? pill(v.status) : ""}</div>${v ? `<div class="grid-half"><div>${pair("Clock in", v.clockIn || "Not recorded")}</div><div>${pair("Clock out", v.clockOut || "Not recorded")}</div></div><div class="content-section"><h3>Progress note</h3>${`<form data-form="worker-note" data-id="${attr(b.id)}"><label>What was completed?<textarea name="note" required placeholder="Record the service delivered, in plain language.">${esc(v.note || "")}</textarea></label><label>Tasks completed<textarea name="tasks" required placeholder="Record the completed tasks and anything not done.">${esc(v.tasks || "")}</textarea></label><label>Goals / outcome<textarea name="goals" required placeholder="Record the participant outcome and extra-time explanation.">${esc(v.goals || "")}</textarea></label><label class="checkbox"><input name="majorIssue" type="checkbox" ${v.majorIssue ? "checked" : ""}><span>Flag a major issue for restricted office review.</span></label><div class="form-actions"><button class="btn primary" type="submit">Save native note (demo)</button></div></form>`}</div>` : `<p class="muted">Record the start of the assigned visit.</p>`}<div class="button-row">${b.status === "Confirmed" && !v?.clockIn ? `<button class="btn primary" data-action="clock-in" data-id="${attr(b.id)}" type="button">ShiftCare clock in (demo)</button>` : ""}${v?.clockIn && !v.clockOut ? `<button class="btn primary" data-action="clock-out" data-id="${attr(b.id)}" type="button">ShiftCare clock out (demo)</button>` : ""}</div></section></div><aside class="stack"><section class="panel"><h2>Unable to attend?</h2><p class="muted tiny">This alerts the office and marks the booking as needing cover.</p>${b.status === "Confirmed" && !v?.clockIn ? `<button class="btn danger" data-action="worker-absent" data-id="${attr(b.id)}" type="button">Report unavailability</button>` : `<p class="muted tiny">Contact the office directly if this service needs an urgent change.</p>`}</section><div class="side-note">The worker view shows assigned services only. Staff screening and assignment approval stay with the office.</div></aside></div>`;
  }

  function workerAvailability() {
    const w = worker(ui.workerId);
    return `${pageHeader("Worker / Availability", "Availability", "Keep your regular working days current for the office roster.")}<div class="grid-two"><section class="panel"><h2>Regular availability</h2><p class="muted tiny">These days guide scheduling. The office still confirms each assignment.</p><form data-form="availability"><div class="stack">${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => `<label class="checkbox inset"><input type="checkbox" name="day" value="${i === 6 ? 0 : i + 1}" ${w.days.includes(i === 6 ? 0 : i + 1) ? "checked" : ""}><span>${day}</span></label>`).join("")}</div><div class="form-actions"><button class="btn primary" type="submit">Save availability</button></div></form></section><aside class="panel"><h2>Assignment approval</h2><div class="spacer"></div>${pair("Status", w.approved ? "Approved" : "Pending")}${pair("Services", w.services.join(", "))}${pair("Review date", w.review)}<div class="spacer"></div><div class="notice">${icon("shield")} Worker approval is recorded by OCD Brilliance following its screening and competency process.</div></aside></div>`;
  }

  function workerReview() {
    const w = worker(ui.workerId);
    const rows = state.visits.map(v => ({ v, b: booking(v.bookingId) })).filter(({ b }) => b?.workerId === w.id);
    const minutes = time => /^\d{2}:\d{2}$/.test(time || "") ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null;
    const actual = v => { const start = minutes(v.clockIn), end = minutes(v.clockOut); return start !== null && end !== null && end >= start ? end - start : null; };
    const total = rows.reduce((sum, { v }) => sum + (actual(v) ?? 0), 0);
    return `${pageHeader("Worker / Review", "Hours & documents", "Recorded sample attendance and your document follow-up. Pay totals are provisional until the native payroll review.")}<div class="notice">${icon("shield")} ${Math.floor(total / 60)} h ${total % 60} min recorded across the visible sample visits. Incomplete times are excluded. Kilometres, travel, pay rules and release stay with the bookkeeper.</div><div class="spacer"></div><div class="grid-two"><section class="panel"><h2>My recorded visits</h2>${rows.map(({ v, b }) => `<a class="visit-row" href="#/worker/today/${attr(b.id)}"><span class="body"><strong>${esc(b.id)} · ${dateLabel(b.date)}</strong><small>${esc(v.clockIn || "Unknown")}–${esc(v.clockOut || "Unknown")} · ${actual(v) === null ? "Incomplete; needs native review" : actual(v) + " recorded min"}</small><small>${v.note ? "Note recorded" : "Note missing"} · ${v.tasks && v.goals ? "Tasks/goals recorded" : "Task/goal evidence to check"}</small></span>${pill(v.status)}</a>`).join("") || empty("No recorded visits", "Native sample attendance will appear here.")}</section><aside class="panel"><h2>My documents</h2>${state.workerDocs.filter(d => d.workerId === w.id).map(d => `<div class="document-item"><span class="body"><strong>${esc(d.name)}</strong><small>${d.noExpiration ? "Verified never expires (demo)" : d.expires ? "Expiry " + dateLabel(d.expires) : "Evidence to check"}</small></span>${pill(d.status)}</div>`).join("") || `<p class="muted">No document checks in this sample.</p>`}<p class="muted tiny">Original evidence and worker approval remain in ShiftCare. The office handles missing/expired records.</p></aside></div>`;
  }

  function clientHome() {
    const p = participant(ui.clientId);
    const representative = ui.clientId === "PAR-103";
    const upcoming = state.bookings.filter(b => b.participantId === p.id && ["Confirmed", "Needs cover"].includes(b.status)).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    const a = agreementFor(p.id);
    const requests = state.requests.filter(r => r.participantId === p.id).slice(-5).reverse();
    return `${pageHeader("Client portal", representative ? "Farah's services" : "Your services", "Bookings, shared documents and requests in one place.", `<a class="btn" href="#/client/map">${icon("clock")} Arrival status</a>`)}${window.OCD_MAPS.summary(state, upcoming[0])}<div class="portal-welcome"><div><h2>Welcome, ${representative ? "Samira" : esc(p.name.split(" ")[0])}</h2><p>${representative ? "You are viewing Farah Ali's permitted portal information as her recorded representative. " : ""}You can ask the office to change a booking. The schedule stays the same until they confirm it.</p></div><span class="avatar">${representative ? "SA" : esc(p.name.split(" ").map(x => x[0]).join(""))}</span></div>${updateFeed(`client:${p.id}`)}<div class="grid-two"><div class="stack"><section class="panel"><div class="section-heading"><h2>Upcoming bookings</h2><a href="#/client/bookings">See all bookings</a></div>${upcoming.length ? upcoming.slice(0, 3).map(b => `<div class="visit-row"><span class="date-badge"><strong>${dateObj(b.date).getUTCDate()}</strong><small>${dateLabel(b.date, { weekday: "short" })}</small></span><span class="body"><strong>${esc(b.service)}</strong><small>${dateLabel(b.date)} · ${b.start}–${b.end} · ${esc(worker(b.workerId)?.name)}</small></span>${pill(b.status)}</div>`).join("") : empty("No upcoming bookings", "The office will confirm any new service.")}</section><section class="panel"><div class="section-heading"><h2>Your requests</h2></div>${requests.length ? requests.map(r => `<div class="visit-row"><span class="priority-icon">${icon("inbox")}</span><span class="body"><strong>${esc(r.type)}</strong><small>${esc(r.message)}</small>${r.outcome ? `<small>Office response: ${esc(r.outcome)}</small>` : ""}</span>${pill(r.status)}</div>`).join("") : `<p class="muted">No requests have been sent.</p>`}</section></div><aside class="stack"><section class="panel"><h2>Agreement</h2><div class="spacer"></div><div class="document-item">${icon("file")}<span class="body"><strong>${esc(a?.service || "Service agreement")}</strong><small>${esc(a?.id || "Not prepared")}</small></span>${pill(a?.status || "Pending")}</div><a class="btn" href="#/client/documents">View documents</a></section><section class="panel"><h2>Need to tell us something?</h2><p class="muted tiny">Requests and feedback go to the office for review.</p><div class="button-row">${upcoming.length ? `<a class="btn soft" href="#/client/bookings">Request a booking change</a>` : ""}<button class="btn" data-action="client-feedback" type="button">Send feedback</button></div></section></aside></div>`;
  }

  function clientBookings() {
    const p = participant(ui.clientId);
    const rows = state.bookings.filter(b => b.participantId === p.id && b.status !== "Proposed").sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`));
    return `${pageHeader("Client portal / Bookings", ui.clientId === "PAR-103" ? "Farah's bookings" : "My bookings", "See confirmed services and send change requests to the office.", `<a class="btn" href="#/client/map">${icon("clock")} Arrival status</a>`)}<div class="notice" style="margin-bottom:17px">${icon("shield")} Sending a request does not change a confirmed booking. The office will contact you about the outcome.</div><section class="panel"><h2>Service schedule</h2><div class="spacer"></div>${rows.map(b => `<div class="visit-row"><span class="date-badge"><strong>${dateObj(b.date).getUTCDate()}</strong><small>${dateLabel(b.date, { weekday: "short" })}</small></span><span class="body"><strong>${esc(b.service)}</strong><small>${dateLabel(b.date)} · ${b.start}–${b.end} · ${esc(worker(b.workerId)?.name)}</small></span>${pill(b.status)}${b.status === "Confirmed" ? `<a class="btn small" href="#/client/map/${attr(b.id)}">View arrival status</a>` : ""}${["Confirmed", "Needs cover"].includes(b.status) ? `<button class="btn small" data-action="request-change" data-id="${attr(b.id)}" type="button">Request change</button>` : ""}</div>`).join("") || empty("No bookings", "Confirmed bookings will appear here.")}</section>`;
  }

  function clientArrival(bookingId) {
    const rows = state.bookings.filter(b => b.participantId === ui.clientId && ["Confirmed", "Needs cover"].includes(b.status)).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    const selected = rows.find(b => b.id === bookingId) || rows[0];
    if (!selected) return `${pageHeader("Client portal / Arrival", "Arrival status", "Your next confirmed service will appear here.")}${empty("No upcoming service", "The office will confirm a booking before arrival information is available.")}`;
    return bookingMap("client", selected.id);
  }

  function clientDocuments() {
    const p = participant(ui.clientId);
    const a = agreementFor(p.id);
    return `${pageHeader("Client portal / Documents", "Documents", "Only documents shared with your portal account appear here.")}<div class="grid-two"><section class="panel"><h2>Service agreement</h2><div class="spacer"></div>${a ? `<div class="document-item">${icon("file")}<span class="body"><strong>${esc(a.service)} agreement</strong><small>${esc(a.id)} · ${esc(a.template)}</small></span>${pill(a.status)}</div><button class="btn" data-action="client-preview-agreement" data-id="${attr(a.id)}" type="button">View agreement preview</button>` : empty("Agreement not available", "The office will share it when ready.")}</section><aside class="panel"><h2>Shared documents</h2><div class="spacer"></div>${p.sharedDocs.length ? p.sharedDocs.map(d => `<div class="document-item">${icon("file")}<span class="body"><strong>${esc(d.name)}</strong><small>Shared ${dateLabel(d.date)}</small></span></div>`).join("") : `<p class="muted">No other documents have been shared.</p>`}</aside></div>`;
  }

  function clientIntake() {
    const p = participant(ui.clientId);
    return `${pageHeader("Client portal / My details", "My details", "Request a change to permitted details; the office reviews it before updating the authoritative record.")}<div class="grid-two"><section class="panel"><h2>Contact & service preferences</h2><div class="spacer"></div><form data-form="client-details"><div class="form-grid"><label>Email<input name="email" type="email" required value="${attr(p.email)}"></label><label>Phone<input name="phone" type="tel" required value="${attr(p.phone)}"></label><label class="full">Service preferences<textarea name="preference" required>${esc(p.intakeUpdate)}</textarea></label></div><div class="form-actions"><button class="btn primary" type="submit">Request update</button></div></form></section><aside class="panel"><h2>Access</h2><div class="spacer"></div>${pair("Participant", p.name)}${pair("Service", p.service)}${pair("Representative", p.representative)}<div class="spacer"></div><div class="notice">${icon("shield")} Other participants' records and internal staff notes are not available in the client portal.</div></aside></div>`;
  }

  function availableSlots() { return state.slots.filter(s => !state.calls.some(c => c.slotId === s.id && ["Booked", "Change requested"].includes(c.status))).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)); }
  function publicBook() {
    if (ui.publicConfirmation) {
      const c = ui.publicConfirmation;
      return `<div class="panel confirmation"><div class="check">✓</div><h1>Discovery call booked</h1><p>${esc(c.name)}, your demo call is reserved for <strong>${dateLabel(c.date, { weekday: "long", day: "numeric", month: "long" })} at ${esc(c.time)}</strong>.</p><p>Reference <strong>${esc(c.id)}</strong>. A real implementation will send the confirmation through the approved office email service.</p><div class="button-row" style="justify-content:center;margin-top:20px"><a class="btn primary" href="#/public/intake">Continue to intake form</a><button class="btn" data-action="book-another" type="button">Book another call</button></div></div>`;
    }
    const slots = availableSlots();
    if (!slots.some(s => s.id === ui.selectedSlot)) ui.selectedSlot = slots[0]?.id || "";
    const grouped = [...new Set(slots.map(s => s.date))];
    return `<div class="public-intro"><span class="eyebrow">OCD Brilliance / Demo first contact</span><h1>Book a discovery call</h1><p>Choose an available 30-minute time to discuss the support you are looking for. You can also <a href="#/public/intake" style="color:var(--green);font-weight:700">complete the intake form</a> first.</p><p class="form-note">Interactive demo: details stay in this browser and do not reach OCD Brilliance.</p></div><div class="tabs" role="tablist"><button class="tab ${ui.publicTab === "Book" ? "active" : ""}" data-action="public-tab" data-value="Book" type="button">Book a call</button><button class="tab ${ui.publicTab === "Manage" ? "active" : ""}" data-action="public-tab" data-value="Manage" type="button">Manage a booking</button></div>${ui.publicTab === "Book" ? `<div class="public-layout"><section class="panel"><h2>Available times</h2><p class="muted tiny">Only published call slots are shown.</p><div class="spacer"></div>${grouped.length ? grouped.map(date => `<div class="slot-group"><h3>${dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}</h3><div class="slot-list">${slots.filter(s => s.date === date).map(s => `<button class="slot ${s.id === ui.selectedSlot ? "selected" : ""}" data-action="select-slot" data-id="${attr(s.id)}" type="button" aria-pressed="${s.id === ui.selectedSlot}">${esc(s.time)}</button>`).join("")}</div></div>`).join("") : empty("No open call times", "Please contact the office for availability.")}</section><section class="panel"><h2>Your details</h2><p class="muted tiny">No portal account is needed.</p><div class="spacer"></div><form data-form="public-book"><label>Name<input name="name" autocomplete="name" required></label><div class="spacer" style="height:12px"></div><label>Email<input name="email" type="email" autocomplete="email" required></label><div class="spacer" style="height:12px"></div><label>Phone<input name="phone" type="tel" autocomplete="tel" required></label><div class="form-actions"><button class="btn primary" type="submit" ${ui.selectedSlot ? "" : "disabled"}>Confirm call</button></div></form><p class="form-note">This is a browser-only demo; no email is sent.</p></section></div>` : `<div class="public-layout"><section class="panel"><h2>Manage a booking</h2><p class="muted tiny">Use the reference and email from your booking confirmation.</p><div class="spacer"></div><form data-form="manage-call"><div class="form-grid"><label>Booking reference<input name="reference" required placeholder="CALL-..."></label><label>Email<input name="email" type="email" required></label><label class="full">Action<select name="action">${option("Request a change")}${option("Cancel booking")}</select></label></div><div class="form-actions"><button class="btn primary" type="submit">Submit request</button></div></form></section><aside class="panel"><h2>What happens next?</h2><p class="muted">A change request goes to the office. A cancellation releases the call time in this demo.</p></aside></div>`}`;
  }

  function publicIntake() {
    const area = ui.areaCheck;
    const canContinue = area?.status === "covered";
    const resultClass = area?.status === "covered" ? "covered" : area?.status === "outside" ? "outside" : "review";
    const resultTitle = area?.status === "covered" ? "Request available" : area?.status === "outside" ? "Outside current service area" : "Service area unavailable";
    return `<div class="public-intro"><span class="eyebrow">Request support</span><h1>Check your service area</h1><p>Enter the service postcode first. If it is covered, you can send a request directly to the office queue.</p></div><div class="public-layout"><section class="panel"><div class="step-heading"><span>01</span><div><h2>Service postcode</h2><p>We confirm capacity and worker availability after the office review.</p></div></div><form data-form="area-check" class="area-check-form"><label>Australian postcode<input name="postcode" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{4}" maxlength="4" placeholder="e.g. 6027" value="${attr(area?.postcode || "")}" required></label><button class="btn primary" type="submit">Check postcode</button></form>${area ? `<div class="area-result ${resultClass}" role="status"><strong>${esc(resultTitle)}</strong><p>${esc(area.message)}</p></div>` : ""}${canContinue ? `<div class="step-heading step-heading-next"><span>02</span><div><h2>Tell us what you need</h2><p>The office will receive this request and assign the next action.</p></div></div><form data-form="public-intake"><input type="hidden" name="postcode" value="${attr(area.postcode)}"><div class="form-grid"><label>Name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Phone<input name="phone" type="tel" autocomplete="tel" required></label><label>Suburb<input name="suburb" autocomplete="address-level2" required></label><label>Requested service<select name="service">${serviceOptions()}</select></label><label>Preferred contact<select name="preferredContact">${option("Email")}${option("Phone")}</select></label><label class="full">What support are you looking for?<textarea name="support" required></textarea></label><label class="full">Schedule or worker preferences<textarea name="preference" placeholder="Optional"></textarea></label><label class="full checkbox"><input name="consent" type="checkbox" required><span>I agree to share these details with OCD Brilliance so the office can review and respond to my request.</span></label></div><div class="form-actions"><button class="btn primary" type="submit">Send request</button></div></form>` : ""}</section><aside class="panel next-steps"><h2>What happens next</h2><ol class="timeline"><li><strong>Office reviews the request</strong><small>Your request appears in the shared office queue.</small></li><li><strong>A staff member contacts you</strong><small>They confirm support needs, capacity and any missing information.</small></li><li><strong>Approved details go to ShiftCare</strong><small>Only a verified staff member records the final service details.</small></li></ol></aside></div>`;
  }

  function openModal(title, subtitle, body) {
    modal.innerHTML = `<div class="modal-head"><div><h2 id="modal-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div><button class="modal-close" data-action="close-modal" aria-label="Close dialog" type="button">×</button></div><div class="modal-body">${body}</div>`;
    if (!modal.open) modal.showModal();
    modal.querySelector("input, select, textarea, button")?.focus();
  }
  function closeModal() { if (modal.open) modal.close(); }
  function formError(form, message) {
    form.querySelector(".field-error")?.remove();
    const note = document.createElement("p"); note.className = "field-error"; note.setAttribute("role", "alert"); note.textContent = message;
    const actions = form.querySelector(".form-actions");
    if (actions) actions.before(note); else form.append(note);
    note.scrollIntoView({ block: "nearest" });
  }
  function workerCheck(workerId, service, date, start, end, excludeId = "") {
    const w = worker(workerId);
    if (!w) return "Choose a worker.";
    if (!w.approved) return `${w.name} has not been approved for assignment.`;
    if (!w.services.includes(service)) return `${w.name} is not approved for ${service}.`;
    if (!w.days.includes(weekday(date))) return `${w.name} is not available on ${dateLabel(date, { weekday: "long" })}.`;
    if (start >= end) return "The end time must be later than the start time.";
    const conflict = state.bookings.find(b => b.id !== excludeId && b.workerId === workerId && b.date === date && b.status !== "Cancelled" && start < b.end && end > b.start);
    if (conflict) return `${w.name} already has ${conflict.id} at that time.`;
    return "";
  }
  function addDays(dateString, count) { const d = dateObj(dateString); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
  function mondayOf(dateString) { return addDays(dateString, -((weekday(dateString) + 6) % 7)); }
  function clearWorkingDays(noticeDate, serviceDate, holidays) {
    let days = 0;
    for (let d = addDays(noticeDate, 1); d < serviceDate; d = addDays(d, 1)) {
      if (![0, 6].includes(weekday(d)) && !holidays.includes(d)) days++;
    }
    return days;
  }
  function csvDownload(filename, headers, rows) {
    const cell = x => `"${String(x ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("CSV downloaded from sample records.");
  }

  document.addEventListener("click", async event => {
    const autoButton = event.target.closest("[data-auto-action]");
    if (autoButton) { event.preventDefault(); if (sessionEmail && routeParts()[0] === "office") window.OCD_AUTOMATION.click(automationContext(), autoButton); return; }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.action;
    const itemId = button.dataset.id;
    const value = button.dataset.value;
    if (action === "close-modal") return closeModal();
    if (action === "sign-out") { await fetch("/api/workflow?action=logout", { method: "POST" }); sessionEmail = ""; render(); return; }
    if (action === "read-update") { const u = find(state.updates, itemId); const [area] = routeParts(); const recipient = area === "office" ? "office" : area === "worker" ? `worker:${ui.workerId}` : `client:${ui.clientId}`; if (!u || u.to !== recipient) return; u.read = true; save(); render(); return; }
    if (action === "refresh-arrival") { render(); toast("Arrival status refreshed from the demo journey."); return; }
    if (action === "triage-email") { const m = find(state.inbound, itemId); if (!m || m.status !== "New") return; return openModal("Triage incoming email", "Decide where this fictional message belongs; no email is sent.", `<div class="review-box"><h3>${esc(m.subject)}</h3><p>${esc(m.body)}</p><p>From ${esc(m.from)}</p></div><div class="spacer"></div><form data-form="triage-email" data-id="${attr(m.id)}"><div class="form-grid"><label>Route to<select name="category">${["Enquiry", "Finance query", "Office follow-up"].map(x => option(x, m.service ? "Enquiry" : "Finance query")).join("")}</select></label><label>Priority<select name="priority">${["Routine", "Urgent"].map(x => option(x, m.urgent ? "Urgent" : "Routine")).join("")}</select></label><label>Contact name<input name="contact" value="${attr(m.name)}" required></label><label>Suburb for new enquiry<input name="suburb" value="${attr(m.suburb)}"></label><label>Service for new enquiry<select name="service">${serviceOptions(m.service)}</select></label><label class="full">Office note<textarea name="note" required placeholder="Record the next step and owner."></textarea></label></div><div class="form-actions"><button class="btn primary" type="submit">Save triage decision</button></div></form>`); }
    if (action === "review-doc") return openAutomation(window.OCD_AUTOMATION_ENGINE.document(state, itemId));
    if (action === "review-handoff") {
      const e = find(state.enquiries, itemId);
      if (!e?.intake) return toast("No intake is available for review.");
      return openModal("Review intake handoff", "Compare the draft with the original intake before recording it in ShiftCare.", `<div class="review-box"><h3>Original intake</h3><p>${esc(e.intake.support)}</p><p><strong>Preference:</strong> ${esc(e.intake.preference || "Not provided")}</p></div><div class="spacer"></div><form data-form="handoff-review" data-id="${attr(e.id)}"><div class="form-grid"><label>Service<select name="service">${serviceOptions(e.handoff?.service || e.service)}</select></label><label>Suburb<input name="suburb" value="${attr(e.handoff?.suburb || e.suburb)}" required></label><label class="full">Support summary<textarea name="summary" required>${esc(e.handoff?.summary || e.intake.support)}</textarea></label><label class="full">Office follow-up or missing detail<textarea name="followUp" required>${esc(e.handoff?.followUp || "Confirm service capacity and preferred schedule.")}</textarea></label></div><div class="form-actions"><button class="btn primary" type="submit">Approve draft for handoff</button></div></form>`);
    }
    if (action === "record-handoff") { const e = find(state.enquiries, itemId); if (e?.serverRecord) { go(`office/enquiries/${e.id}`); return toast("Verify the native ShiftCare ID in the shared request workflow."); } return openAutomation(window.OCD_AUTOMATION_ENGINE.intake(state, itemId)); }
    if (action === "offer-cover") return openAutomation(window.OCD_AUTOMATION_ENGINE.cover(state, itemId));
    if (action === "respond-offer") { try { window.OCD_AUTOMATION_ENGINE.workerResponse(state, itemId, ui.workerId, value === "Accepted"); activity("Native worker response simulated", `${itemId} · assignment still needs office verification`); save(); render(); toast("Native response simulated. Assignment is unchanged until office review and read-back."); } catch (error) { toast(error.message); } return; }
    if (action === "confirm-offer") { const offer = find(state.coverOffers, itemId); const job = offer?.automationJobId ? window.OCD_AUTOMATION_ENGINE.get(state, offer.automationJobId) : window.OCD_AUTOMATION_ENGINE.cover(state, offer.bookingId); return openAutomation(job); }
    if (action === "mobile-menu") return openModal("More office sections", "Jump to any part of the prototype.", `<nav class="mobile-menu-list" aria-label="Office sections">${officeNavGroups.map(([group, paths]) => `<div class="mobile-menu-group"><h3>${group}</h3>${paths.map(path => { const [, label, glyph] = nav.office.find(item => item[0] === path); return `<a href="#/office/${path}">${icon(glyph)}<span>${esc(label)}</span><span>›</span></a>`; }).join("")}</div>`).join("")}</nav><div class="form-actions"><button class="btn" data-action="reset-demo" type="button">Restore sample data</button></div>`);
    if (action === "work-filter") { ui.workFilter = value; render(); document.querySelector(`[data-action="work-filter"][data-value="${value}"]`)?.focus({ preventScroll: true }); return; }
    if (action === "schedule-worker") { ui.scheduleWorkerId = itemId; go("office/schedule"); return; }
    if (action === "reset-demo") { if (window.confirm("Restore the original fictional demo records?")) { closeModal(); reset(); } return; }
    if (action === "new-enquiry") return openModal("Log an enquiry", "Add a phone, email or coordinator request to the shared office queue.", `<form data-form="new-enquiry"><div class="form-grid"><label>Name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email"></label><label>Phone<input name="phone" type="tel" autocomplete="tel"></label><label>Suburb<input name="suburb" autocomplete="address-level2"></label><label>Postcode<input name="postcode" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{4}" maxlength="4"></label><label>Requested service<select name="service">${serviceOptions()}</select></label><label>Source<select name="source">${["Phone", "Email", "Coordinator"].map(x => option(x)).join("")}</select></label><label class="full">Request notes<textarea name="notes" required placeholder="Record what the person needs and the next useful context."></textarea></label></div><div class="form-actions"><button class="btn" data-action="close-modal" type="button">Cancel</button><button class="btn primary" type="submit">Add to queue</button></div></form>`);
    if (action === "create-participant") { const e = find(state.enquiries, itemId); if (e?.serverRecord) { go(`office/enquiries/${e.id}`); return toast("Use the verified native handoff for this shared request."); } return openAutomation(window.OCD_AUTOMATION_ENGINE.intake(state, itemId)); }
    if (action === "generate-ai") {
      const e = find(state.enquiries, itemId);
      if (!e?.intake) return toast("An intake is needed first.");
      e.aiReview = { summary: `${e.name} requested ${e.service.toLowerCase()} in ${e.suburb}. ${e.intake.support}`, missing: e.intake.preference ? "Confirm the preferred day, service goals and any outstanding details." : "Confirm schedule preferences, service goals and any outstanding details.", match: `${e.service} — staff to verify suitability.`, reviewed: false };
      activity(`Intake suggestion prepared for ${e.name}`, `${e.id} · awaiting staff review`); save(); render(); toast("Demo suggestion ready for review."); return;
    }
    if (action === "edit-ai") { const e = find(state.enquiries, itemId); return openModal("Edit intake suggestion", "Compare every change with the source intake.", `<form data-form="edit-ai" data-id="${attr(e.id)}"><label>Summary<textarea name="summary" required>${esc(e.aiReview.summary)}</textarea></label><div class="spacer" style="height:12px"></div><label>Missing information<textarea name="missing" required>${esc(e.aiReview.missing)}</textarea></label><div class="spacer" style="height:12px"></div><label>Possible match<textarea name="match" required>${esc(e.aiReview.match)}</textarea></label><div class="form-actions"><button class="btn primary" type="submit">Save suggestion</button></div></form>`); }
    if (action === "approve-ai") { const e = find(state.enquiries, itemId); e.aiReview.reviewed = true; activity(`${e.name}'s intake suggestion reviewed`, `${e.id} · Mia Roberts`); save(); render(); toast("Review recorded by Mia Roberts."); return; }
    if (action === "draft-email") { const e = find(state.enquiries, itemId); e.emailDraft = `Hi ${e.name.split(" ")[0]},\n\nThank you for contacting OCD Brilliance about ${e.service.toLowerCase()}. We have received your enquiry and will be in touch to discuss the details and next steps.\n\nKind regards,\nOCD Brilliance`; e.emailStatus = "Needs approval"; save(); render(); toast("Draft prepared. Review it before sending."); return; }
    if (action === "discard-email") { const e = find(state.enquiries, itemId); e.emailDraft = null; e.emailStatus = "Not drafted"; save(); render(); toast("Draft discarded."); return; }
    if (action === "call-tab") { ui.callTab = value; render(); return; }
    if (action === "add-slot") { const date = routeParts().slice(0, 2).join("/") === "office/calendar" ? ui.officeCalendarDate : "2026-10-08"; return openModal("Add a public call slot", "Only these available times appear on the public booking page.", `<form data-form="add-slot"><div class="form-grid"><label>Date<input name="date" type="date" required value="${attr(date)}"></label><label>Start time<input name="time" type="time" required value="14:00"></label><label>Duration<select name="duration">${[30, 45, 60].map(x => option(String(x))).join("")}</select></label></div><div class="form-actions"><button class="btn primary" type="submit">Publish slot</button></div></form>`); }
    if (action === "resolve-call") { const c = find(state.calls, itemId), slots = availableSlots(); if (!slots.length) return toast("Publish another open slot before rescheduling."); return openModal("Resolve call change", "Choose a published time and record the office response.", `<form data-form="resolve-call" data-id="${attr(c.id)}"><p class="muted">${esc(c.name)} · ${esc(c.id)}</p><label>New call time<select name="slotId">${slots.map(s => `<option value="${attr(s.id)}">${dateLabel(s.date)} · ${esc(s.time)}</option>`).join("")}</select></label><div class="spacer" style="height:12px"></div><label>Participant communication<textarea name="response" required placeholder="Record the new time and how it was confirmed."></textarea></label><div class="form-actions"><button class="btn primary" type="submit">Confirm new time</button></div></form>`); }
    if (["call-transcript", "edit-call-transcript"].includes(action)) {
      const c = find(state.calls, itemId);
      if (!c || c.status === "Cancelled") return toast("This call is not available for transcript review.");
      if (action === "edit-call-transcript" || !c.transcriptSummary) {
        return openModal("Prepare transcript summary", "Paste the discovery-call transcript to create a local draft for staff review.", `<form data-form="generate-call-summary" data-id="${attr(c.id)}"><p class="muted">${esc(c.name)} · ${esc(c.id)}</p><label>Call transcript<textarea name="transcript" rows="12" minlength="40" maxlength="20000" required placeholder="Paste the call transcript here…">${esc(c.transcript || "")}</textarea></label><p class="form-note">This browser-only prototype extracts important sentences locally. Check the source before approving the draft.</p><div class="form-actions"><button class="btn primary" type="submit">${c.transcriptSummary ? "Regenerate draft" : "Prepare summary"}</button></div></form>`);
      }
      const draft = c.transcriptSummary;
      return openModal("Review transcript summary", "Compare the draft with the source, edit it, and record the named staff review.", `<div class="review-box"><h3>Source transcript</h3><p style="white-space:pre-line;max-height:180px;overflow:auto">${esc(c.transcript)}</p></div><div class="spacer"></div><form data-form="review-call-summary" data-id="${attr(c.id)}"><label>Summary<textarea name="summary" rows="5" required>${esc(draft.summary)}</textarea></label><div class="spacer" style="height:12px"></div><label>Key points<textarea name="keyPoints" rows="5" required>${esc(draft.keyPoints)}</textarea></label><div class="spacer" style="height:12px"></div><label>Next steps<textarea name="nextSteps" rows="4" required>${esc(draft.nextSteps)}</textarea></label><div class="form-actions"><button class="btn" data-action="edit-call-transcript" data-id="${attr(c.id)}" type="button">Replace transcript</button><button class="btn primary" type="submit">${draft.reviewed ? "Save reviewed summary" : "Approve summary"}</button></div></form>`);
    }
    if (action === "remove-slot") { const slot = find(state.slots, itemId); if (state.calls.some(c => c.slotId === itemId && c.status === "Booked")) return toast("A booked slot cannot be removed."); state.slots = state.slots.filter(s => s.id !== itemId); activity("Public call slot removed", `${dateLabel(slot.date)} · ${slot.time}`); save(); render(); toast("Slot removed."); return; }
    if (action === "participant-tab") { ui.participantTab = value; render(); return; }
    if (action === "review-request") return openAutomation(window.OCD_AUTOMATION_ENGINE.request(state, find(state.requests, itemId)));
    if (action === "activate-participant") { const p = participant(itemId); if (agreementFor(p.id)?.status !== "Signed") return toast("A signed agreement is required first."); p.status = "Active"; activity(`${p.name} marked Active`, `${p.id} · signed agreement checked`); save(); render(); toast("Participant status updated."); return; }
    if (action === "generate-agreement") { const selected = itemId || state.participants[0].id; const p = participant(selected); return openModal("Generate agreement", "A sample template is filled for staff review. Legal wording and terms need approval.", `<form data-form="generate-agreement"><div class="form-grid"><label>Participant<select name="participantId">${participantOptions(selected)}</select></label><label>Service<select name="service">${serviceOptions(p.service)}</select></label><label class="full">Proposed schedule<input name="schedule" required value="${attr(p.schedulePreference)}"></label><label>Template version<input name="template" value="Demo template v1" required></label><label>Pricing wording<input name="pricing" value="Per approved service agreement" required></label><label class="full">Cancellation wording<input name="cancellation" value="Per approved service agreement" required></label></div><div class="form-actions"><button class="btn primary" type="submit">Generate draft</button></div></form>`); }
    if (action === "send-agreement") { const a = find(state.agreements, itemId); return openModal("Approve agreement for signing", "This demonstrates the staff approval step. No real document will be sent.", `<form data-form="send-agreement" data-id="${attr(a.id)}"><p><strong>${esc(participant(a.participantId)?.name)}</strong> · ${esc(a.service)} · ${esc(a.template)}</p><label class="checkbox"><input name="reviewed" type="checkbox" required><span>I reviewed the participant, service, schedule, pricing and cancellation wording in this demo draft.</span></label><div class="form-actions"><button class="btn primary" type="submit">Record approval &amp; send (demo)</button></div></form>`); }
    if (action === "record-signature") return openAutomation(window.OCD_AUTOMATION_ENGINE.signedFile(state, itemId));
    if (action === "print-agreement") { window.print(); return; }
    if (action === "new-booking") return openModal("New booking", "The office checks eligibility and participant agreement before confirmation.", `<form data-form="new-booking"><div class="form-grid"><label>Participant<select name="participantId">${participantOptions()}</select></label><label>Service<select name="service">${serviceOptions("Domestic assistance")}</select></label><label>Worker<select name="workerId">${workerOptions("WRK-02")}</select></label><label>Service date<input name="date" type="date" required value="2026-10-09"></label><label>Start time<input name="start" type="time" value="09:00" required></label><label>End time<input name="end" type="time" value="11:00" required></label><label class="full">Recurrence<select name="recurrence">${["One-off", "Weekly", "Fortnightly"].map(x => option(x)).join("")}</select><span class="form-help">The demo creates four occurrences for a recurring booking.</span></label></div><div class="form-actions"><button class="btn primary" type="submit">Create proposed booking</button></div></form>`);
    if (action === "schedule-prev") { ui.scheduleWeekStart = addDays(ui.scheduleWeekStart, -7); render(); return; }
    if (action === "schedule-next") { ui.scheduleWeekStart = addDays(ui.scheduleWeekStart, 7); render(); return; }
    if (action === "schedule-demo-week") { ui.scheduleWeekStart = "2026-10-05"; render(); return; }
    if (["calendar-prev", "calendar-next", "calendar-demo", "calendar-day"].includes(action)) {
      const area = routeParts()[0] === "worker" ? "worker" : "office";
      const monthKey = area === "office" ? "officeCalendarMonth" : "workerCalendarMonth";
      const dateKey = area === "office" ? "officeCalendarDate" : "workerCalendarDate";
      if (action === "calendar-day") { ui[dateKey] = button.dataset.date; ui[monthKey] = `${button.dataset.date.slice(0, 7)}-01`; }
      else if (action === "calendar-demo") { ui[monthKey] = "2026-10-01"; ui[dateKey] = "2026-10-05"; }
      else { const next = dateObj(ui[monthKey]); next.setUTCMonth(next.getUTCMonth() + (action === "calendar-next" ? 1 : -1)); ui[monthKey] = next.toISOString().slice(0, 10); ui[dateKey] = calendarEvents(area).find(e => e.date.slice(0, 7) === ui[monthKey].slice(0, 7))?.date || ui[monthKey]; }
      render();
      if (action === "calendar-day" && window.innerWidth <= 760) { const agenda = document.querySelector(".calendar-agenda"); agenda?.focus({ preventScroll: true }); agenda?.scrollIntoView({ block: "start" }); }
      else document.querySelector(action === "calendar-day" ? ".calendar-day.selected" : `[data-action="${action}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (action === "mark-cover") { const b = booking(itemId); if (b.status !== "Confirmed") return; b.status = "Needs cover"; window.OCD_AUTOMATION_ENGINE.cover(state, b.id); activity(`Cover needed for ${participant(b.participantId)?.name}`, `${b.id} · office to resolve`); addUpdate("office", "Cover needs attention", `${b.id} needs a replacement worker.`, "office/work"); save(); render(); toast("Booking marked Needs cover."); return; }
    if (action === "cancel-booking") return openAutomation(window.OCD_AUTOMATION_ENGINE.cancellation(state, itemId, ""));
    if (action === "correct-visit") { const v = find(state.visits, itemId); return openModal("Correct visit time", "The original value and reason stay in the history.", `<form data-form="correct-visit" data-id="${attr(v.id)}"><div class="form-grid"><label>Field<select name="field">${option("Clock in")}${option("Clock out")}</select></label><label>Corrected time<input name="time" type="time" required></label><label class="full">Reason<textarea name="reason" required placeholder="Why is this correction needed?"></textarea></label></div><div class="form-actions"><button class="btn primary" type="submit">Save correction</button></div></form>`); }
    if (action === "review-visit") { const v = find(state.visits, itemId); if (!v.note || !v.clockIn || !v.clockOut) return toast("Complete times and a note are required."); v.status = "Reviewed"; window.OCD_AUTOMATION_ENGINE.captureCare(state, v.bookingId); activity("Visit record reviewed", `${v.id} · Mia Roberts`); save(); render(); toast("Visit review recorded."); return; }
    if (action === "open-cancellation") { ui.feeTab = "Cancellation"; ui.cancellationBooking = itemId; ui.feePreview = null; go("office/fees"); return; }
    if (action === "fee-tab") { ui.feeTab = value; ui.feePreview = null; render(); return; }
    if (action === "estimate-route") { const b = booking(itemId); const p = participant(b.participantId); const fixtures = { Woodvale: [11.4, 18], Kingsley: [13.6, 21], Ellenbrook: [35.4, 38] }; const [distance, duration] = fixtures[p.suburb] || [12.0, 20]; const record = { id: id("RTE", state.routeEstimates), bookingId: b.id, origin: "Joondalup office", destination: p.address, distance, duration, created: todayPerth(), source: "Illustrative map response" }; state.routeEstimates.push(record); activity("Route estimate displayed", `${b.id} · illustrative map response`); save(); render(); toast("Sample estimate saved; actual distance remains separate."); return; }
    if (action === "save-fee") { if (!ui.feePreview) return; const f = { ...ui.feePreview, id: id("FEE", state.feeProposals), status: "Proposed", created: todayPerth() }; state.feeProposals.push(f); activity(`${f.type} fee proposed`, `${f.id} · awaiting office approval`); ui.feePreview = null; save(); render(); toast("Proposed fee saved for office approval."); return; }
    if (action === "approve-fee") { const f = find(state.feeProposals, itemId); return openModal("Review proposed fee", "Confirm the evidence and record any override before billing elsewhere.", `<form data-form="approve-fee" data-id="${attr(f.id)}"><p class="muted">${esc(f.type)} · ${esc(f.rule)}</p><div class="form-grid"><label>Approved amount (AUD)<input name="amount" type="number" min="0" step="0.01" value="${f.amount.toFixed(2)}" required></label><label class="full">Review note / override reason<textarea name="reason" required placeholder="Record the evidence reviewed, and a reason if the amount changes."></textarea></label></div><div class="form-actions"><button class="btn primary" type="submit">Approve proposal</button></div></form>`); }
    if (action === "worker-absent") { const b = booking(itemId); return openModal("Report unavailability", "This creates a cover task for the office.", `<form data-form="worker-absent" data-id="${attr(b.id)}"><label>Reason / message to office<textarea name="reason" required placeholder="Briefly explain that you cannot attend."></textarea></label><div class="notice warning" style="margin-top:13px">${icon("alert")} For a same-day or essential service, also phone the office.</div><div class="form-actions"><button class="btn danger" type="submit">Report to office</button></div></form>`); }
    if (action === "clock-in") { const b = booking(itemId); if (!b || b.workerId !== ui.workerId || b.status !== "Confirmed") return toast("This assigned visit is not ready for clock-in."); if (state.visits.some(v => v.bookingId === b.id)) return toast("Clock-in is already recorded."); const v = { id: id("VIS", state.visits), bookingId: b.id, clockIn: timePerth(), clockOut: "", note: "", status: "In progress", corrections: [] }; state.visits.push(v); window.OCD_AUTOMATION_ENGINE.captureCare(state, b.id); activity("Visit clock-in recorded (demo)", `${v.id} · ${worker(ui.workerId)?.name}`); save(); render(); toast("Demo clock-in recorded in Perth time."); return; }
    if (action === "clock-out") { const b = booking(itemId), v = state.visits.find(x => x.bookingId === b?.id); if (!v?.clockIn || v.clockOut) return toast("Clock in first, or this visit is already ended."); v.clockOut = timePerth(); v.status = v.note ? "Ready for review" : "Missing note"; b.status = "Completed"; window.OCD_AUTOMATION_ENGINE.captureCare(state, b.id); activity("Visit clock-out recorded (demo)", `${v.id} · progress note ${v.note ? "ready" : "needed"}`); save(); render(); toast("Clock-out saved. Complete the progress note."); return; }
    if (action === "request-change") { const b = booking(itemId); return openModal("Request a booking change", "The office will review your request before the schedule changes.", `<form data-form="request-change" data-id="${attr(b.id)}"><p class="muted">${dateLabel(b.date)} · ${b.start}–${b.end} · ${esc(b.service)}</p><label>Request type<select name="type">${option("Reschedule request")}${option("Cancellation request")}${option("Other booking change")}</select></label><div class="spacer" style="height:12px"></div><label>Reason and preferred next step<textarea name="message" required placeholder="Tell us what needs to change and when you would prefer."></textarea></label><p class="form-note">For an urgent or same-day change, phone the office as well.</p><div class="form-actions"><button class="btn primary" type="submit">Send request</button></div></form>`); }
    if (action === "client-feedback") return openModal("Send feedback", "Your message goes to the office for review.", `<form data-form="client-feedback"><label>Your feedback<textarea name="message" required placeholder="Tell the office what you would like them to know."></textarea></label><div class="form-actions"><button class="btn primary" type="submit">Send feedback</button></div></form>`);
    if (action === "client-preview-agreement") { const a = find(state.agreements, itemId); return openModal("Agreement preview", "Only your own agreement is available in this demo portal.", documentPreview(a)); }
    if (action === "select-slot") { ui.selectedSlot = itemId; render(); return; }
    if (action === "public-tab") { ui.publicTab = value; render(); return; }
    if (action === "book-another") { ui.publicConfirmation = null; ui.publicTab = "Book"; render(); return; }
    if (action === "export-enquiries") return csvDownload("ocd-demo-enquiries.csv", ["Reference", "Name", "Email", "Service", "Suburb", "Status", "Owner", "Next action"], state.enquiries.map(e => [e.id, e.name, e.email, e.service, e.suburb, e.status, e.owner, e.nextAction]));
    if (action === "export-visits") return csvDownload("ocd-demo-visits.csv", ["Reference", "Booking", "Participant", "Service date", "Clock in", "Clock out", "Status"], state.visits.map(v => { const b = booking(v.bookingId); return [v.id, v.bookingId, participant(b?.participantId)?.name, b?.date, v.clockIn, v.clockOut, v.status]; }));
  });

  document.addEventListener("submit", async event => {
    const autoForm = event.target.closest("form[data-auto-form]");
    if (autoForm) { event.preventDefault(); if (sessionEmail && routeParts()[0] === "office") window.OCD_AUTOMATION.submit(automationContext(), autoForm); return; }
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const kind = form.dataset.form;
    const itemId = form.dataset.id;
    let message = "";
    if (kind === "area-check") {
      const postcode = val(form, "postcode");
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Checking…";
      try {
        const response = await fetch(`/api/workflow?action=area&postcode=${encodeURIComponent(postcode)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The service area could not be checked.");
        ui.areaCheck = { postcode, ...result };
        render();
      } catch (reason) {
        button.disabled = false;
        button.textContent = "Check postcode";
        formError(form, reason.message);
      }
      return;
    }
    if (["cancel-booking", "resolve-cover", "confirm-offer", "offer-cover", "review-request", "create-participant", "review-doc", "record-signature"].includes(kind)) { return formError(form, "Open the Automation case for approval, native handoff and verified outcome. This older shortcut is disabled."); }
    if (kind === "triage-email") { const m = find(state.inbound, itemId); if (!m || m.status !== "New") return formError(form, "This email has already been triaged."); const category = val(form, "category"); if (category === "Enquiry" && !val(form, "suburb")) return formError(form, "Add a suburb before creating an enquiry."); m.status = "Triaged"; m.category = category; m.priority = val(form, "priority"); m.officeNote = val(form, "note"); if (category === "Enquiry") { const e = { id: id("ENQ", state.enquiries), name: val(form, "contact"), email: m.from, phone: "To confirm", suburb: val(form, "suburb"), service: val(form, "service"), source: "Email", preferredContact: "Email", owner: "Mia Roberts", status: "New", received: todayPerth(), nextAction: todayPerth(), intake: null, aiReview: null, emailDraft: null, emailStatus: "Not drafted" }; state.enquiries.push(e); m.linkedEnquiry = e.id; } activity(`Incoming email routed to ${category.toLowerCase()}`, `${m.id} · ${m.priority} · ${m.officeNote}`); closeModal(); save(); render(); toast(category === "Enquiry" ? "Demo enquiry created from email. No mailbox was changed." : "Demo email routed for office follow-up."); return; }

    if (kind === "handoff-review") { const e = find(state.enquiries, itemId); if (!e?.intake) return formError(form, "This intake is no longer available."); e.handoff = { status: "Ready for ShiftCare", service: val(form, "service"), suburb: val(form, "suburb"), summary: val(form, "summary"), followUp: val(form, "followUp"), reviewedBy: "Mia Roberts" }; activity(`Intake handoff reviewed for ${e.name}`, `${e.id} · ready for manual ShiftCare entry`); closeModal(); save(); render(); toast("Draft approved for handoff. No ShiftCare record was changed."); return; }

    if (kind === "new-enquiry") {
      const payload = { name: val(form, "name"), email: val(form, "email").toLowerCase(), phone: val(form, "phone"), suburb: val(form, "suburb"), postcode: val(form, "postcode"), service: val(form, "service"), source: val(form, "source"), notes: val(form, "notes") };
      const duplicate = state.enquiries.find(enquiry => (payload.email && enquiry.email.toLowerCase() === payload.email) || (payload.phone && enquiry.phone === payload.phone));
      if (duplicate && !window.confirm(`Possible duplicate: ${duplicate.name} (${duplicate.id}). Add a separate request anyway?`)) return formError(form, "Review the existing request before creating another record.");
      try {
        const response = await fetch("/api/workflow?action=staff-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The enquiry could not be saved.");
        closeModal();
        await syncServerIntakes();
        go(`office/enquiries/${result.record.id}`);
        toast("Enquiry added to the shared queue.");
      } catch (reason) { formError(form, reason.message); }
      return;
    }

    if (kind === "edit-ai") { const e = find(state.enquiries, itemId); e.aiReview.summary = val(form, "summary"); e.aiReview.missing = val(form, "missing"); e.aiReview.match = val(form, "match"); e.aiReview.reviewed = false; activity(`Intake suggestion edited for ${e.name}`, `${e.id} · needs final review`); message = "Suggestion saved for review."; closeModal(); save(); render(); }
    if (kind === "send-email") { const e = find(state.enquiries, itemId); e.emailDraft = val(form, "message"); e.emailStatus = "Sent (demo)"; activity(`Email approved for ${e.name}`, `${e.id} · Mia Roberts · simulated send`); message = "Staff approval recorded; no real email was sent."; save(); render(); }
    if (kind === "server-record") {
      const payload = { id: itemId, owner: val(form, "owner"), status: val(form, "status"), nextAction: val(form, "nextAction"), followUp: val(form, "followUp"), suburb: val(form, "suburb"), postcode: val(form, "postcode"), shiftCareId: val(form, "shiftCareId") };
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Saving…";
      try {
        const response = await fetch("/api/workflow?action=record", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The request could not be updated.");
        await syncServerIntakes();
        render();
        toast("Request updated.");
      } catch (reason) {
        button.disabled = false;
        button.textContent = "Save request";
        formError(form, reason.message);
      }
      return;
    }
    if (kind === "enquiry-status") { const e = find(state.enquiries, itemId), nextStatus = val(form, "status"); if (nextStatus === "Active") { const p = state.participants.find(x => x.email.toLowerCase() === e.email.toLowerCase()); if (!p || agreementFor(p.id)?.status !== "Signed") return formError(form, "A linked participant and signed agreement are required before Active status."); } e.status = nextStatus; e.nextAction = val(form, "nextAction"); activity(`${e.name}'s enquiry follow-up saved`, `${e.id} · ${e.status} · next ${e.nextAction}`); message = "Enquiry follow-up saved."; save(); render(); }
    if (kind === "add-slot") { const date = val(form, "date"), time = val(form, "time"); if (state.slots.some(s => s.date === date && s.time === time)) return formError(form, "That call time is already published or booked."); const s = { id: id("SLOT", state.slots), date, time, duration: Number(val(form, "duration")) }; state.slots.push(s); activity("Public call slot published", `${dateLabel(date)} · ${time}`); ui.callTab = "Available slots"; message = "Slot published on the public booking page."; closeModal(); save(); render(); }
    if (kind === "resolve-call") { const c = find(state.calls, itemId), slotId = val(form, "slotId"); if (!availableSlots().some(s => s.id === slotId)) return formError(form, "That time is no longer available."); c.slotId = slotId; c.status = "Booked"; c.resolution = val(form, "response"); activity(`Discovery call rescheduled for ${c.name}`, `${c.id} · office confirmation recorded`); message = "New call time recorded; no real email was sent."; closeModal(); save(); render(); }

    if (kind === "generate-agreement") { const p = participant(val(form, "participantId")); const a = { id: id("AGR", state.agreements), participantId: p.id, service: val(form, "service"), schedule: val(form, "schedule"), template: val(form, "template"), pricing: val(form, "pricing"), cancellation: val(form, "cancellation"), status: "Draft", generated: todayPerth(), sent: "", signed: "" }; state.agreements.push(a); activity(`Agreement draft generated for ${p.name}`, `${a.id} · ${a.template}`); message = "Draft generated for staff review."; closeModal(); save(); go(`office/agreements/${a.id}`); }
    if (kind === "send-agreement") { const a = find(state.agreements, itemId); if (!form.querySelector('[name="reviewed"]').checked) return formError(form, "Confirm that you reviewed the draft."); a.status = "Awaiting signature"; a.sent = todayPerth(); activity(`Agreement sent for signing (demo)`, `${a.id} · ${participant(a.participantId)?.name}`); message = "Signing status updated. No real document was sent."; closeModal(); save(); render(); }

    if (kind === "new-booking") {
      const p = participant(val(form, "participantId")); const workerId = val(form, "workerId"), service = val(form, "service"), date = val(form, "date"), start = val(form, "start"), end = val(form, "end"), recurrence = val(form, "recurrence");
      const count = recurrence === "One-off" ? 1 : 4, interval = recurrence === "Weekly" ? 7 : 14;
      const dates = Array.from({ length: count }, (_, i) => addDays(date, i * interval));
      for (const d of dates) { const error = workerCheck(workerId, service, d, start, end); if (error) return formError(form, `${dateLabel(d)}: ${error}`); }
      const records = dates.map(d => { const b = { id: id("BKG", state.bookings), participantId: p.id, workerId, service, date: d, start, end, recurrence, status: "Proposed", participantAgreed: false }; state.bookings.push(b); return b; });
      activity(`${records.length} booking${records.length > 1 ? "s" : ""} proposed for ${p.name}`, `${records[0].id} · staff confirmation needed`); message = `${records.length} proposed booking${records.length > 1 ? "s" : ""} created.`; ui.scheduleWeekStart = mondayOf(date); closeModal(); save(); go(`office/schedule/${records[0].id}`);
    }
    if (kind === "confirm-booking") { try { openAutomation(window.OCD_AUTOMATION_ENGINE.bookingProposal(state, itemId)); } catch (error) { formError(form, error.message); } return; }
    if (kind === "correct-visit") { const v = find(state.visits, itemId); const field = val(form, "field") === "Clock in" ? "clockIn" : "clockOut", oldValue = v[field], newValue = val(form, "time"); if (oldValue === newValue) return formError(form, "Enter a different time."); v.corrections ||= []; v.corrections.push({ field: field === "clockIn" ? "Clock in" : "Clock out", oldValue, newValue, reason: val(form, "reason"), by: "Mia Roberts" }); v[field] = newValue; if (v.status === "Reviewed") v.status = "Ready for review"; window.OCD_AUTOMATION_ENGINE.captureCare(state, v.bookingId); activity("Visit time corrected", `${v.id} · original retained`); message = "Correction saved with its original value."; closeModal(); save(); render(); }
    if (kind === "transport-preview") { const b = booking(val(form, "bookingId")); if (b.status !== "Completed") return formError(form, "Choose a completed service for a transport proposal."); const km = Number(val(form, "actualKm")), rate = Number(val(form, "rate")), rateVersion = val(form, "rateVersion"); if (!Number.isFinite(km) || !Number.isFinite(rate) || km <= 0) return formError(form, "Enter a positive actual distance and approved rate."); ui.feePreview = { type: "Transport", bookingId: b.id, amount: Math.round(km * rate * 100) / 100, rule: `${rateVersion} · $${rate.toFixed(2)}/km · demo`, explanation: `${km.toFixed(1)} verified actual km × $${rate.toFixed(2)}/km. Source: ${val(form, "source")}.`, inputs: { actualKm: km, rate, rateVersion, source: val(form, "source") } }; render(); return; }
    if (kind === "cancellation-preview") {
      const b = booking(val(form, "bookingId"));
      if (!b || b.status !== "Cancelled" || !b.cancellation) return formError(form, "Choose a recorded cancellation first.");
      const { notice, cause } = b.cancellation;
      const days = Number(val(form, "days"));
      const serviceFee = Number(val(form, "serviceFee"));
      const percent = Number(val(form, "percent"));
      const ruleVersion = val(form, "ruleVersion");
      if (notice.slice(0, 10) > b.date) return formError(form, "The notice date must be on or before the service date.");
      if (![days, serviceFee, percent].every(Number.isFinite)) return formError(form, "Complete the example rule and service fee.");
      const holidays = val(form, "holidays").split(",").map(x => x.trim()).filter(Boolean);
      if (holidays.some(x => !/^\d{4}-\d{2}-\d{2}$/.test(x))) return formError(form, "Enter public holidays as YYYY-MM-DD dates, separated by commas.");
      const clearDays = clearWorkingDays(notice.slice(0, 10), b.date, holidays);
      const chargeable = cause === "Participant" && clearDays < days;
      const amount = chargeable ? Math.round(serviceFee * percent) / 100 : 0;
      ui.feePreview = {
        type: "Cancellation", bookingId: b.id, amount,
        rule: `${ruleVersion} · ${days} clear days · ${percent}% · demo`,
        explanation: cause !== "Participant" ? "Provider / worker cancellation: no participant charge." : `${clearDays} clear working day${clearDays === 1 ? "" : "s"} between notice and service. ${chargeable ? "Below" : "Meets"} the entered example threshold.`,
        inputs: { notice, cause, days, serviceFee, percent, ruleVersion, holidays, clearDays }
      };
      render();
      return;
    }
    if (kind === "approve-fee") { const f = find(state.feeProposals, itemId); const amount = Number(val(form, "amount")); if (!Number.isFinite(amount) || amount < 0) return formError(form, "Enter a valid amount."); const oldAmount = f.amount; f.amount = amount; f.status = "Approved"; f.reviewedBy = "Mia Roberts"; f.reviewNote = val(form, "reason"); f.override = amount !== oldAmount ? { from: oldAmount, to: amount, reason: f.reviewNote } : null; activity(`${f.type} proposal approved`, `${f.id} · Mia Roberts${f.override ? " · amount overridden" : ""}`); message = "Proposal approved for use in the current billing process."; closeModal(); save(); render(); }
    if (kind === "worker-absent") { const b = booking(itemId); if (b.workerId !== ui.workerId || b.status !== "Confirmed") return formError(form, "This booking is no longer available for an absence report."); b.status = "Needs cover"; b.absenceReason = val(form, "reason"); window.OCD_AUTOMATION_ENGINE.cover(state, b.id); activity(`${worker(ui.workerId)?.name} reported unavailability`, `${b.id} · office cover needed`); addUpdate("office", "Worker unavailable", `${b.id} needs cover. Review the booking and contact the participant.`, "office/work"); message = "Office alerted. Phone them for urgent services."; closeModal(); save(); render(); }
    if (kind === "worker-note") { const b = booking(itemId), v = state.visits.find(x => x.bookingId === b.id); if (!v?.clockIn) return formError(form, "Clock in before writing the visit note."); v.note = val(form, "note"); v.tasks = val(form, "tasks"); v.goals = val(form, "goals"); v.majorIssue = form.elements.majorIssue?.checked === true; if (v.clockOut) { v.status = "Ready for review"; b.status = "Completed"; } window.OCD_AUTOMATION_ENGINE.captureCare(state, b.id); activity("Progress note saved", `${v.id} · ${worker(ui.workerId)?.name}`); message = "Progress note saved."; save(); render(); }
    if (kind === "availability") { const w = worker(ui.workerId); w.days = new FormData(form).getAll("day").map(Number); activity(`${w.name} updated availability`, w.days.length ? `${w.days.length} regular days` : "No regular days selected"); message = "Availability updated for office scheduling."; save(); render(); }
    if (kind === "request-change") { const b = booking(itemId); if (b.participantId !== ui.clientId) return formError(form, "This booking is not available in your portal."); const r = { id: id("REQ", state.requests), participantId: ui.clientId, bookingId: b.id, type: val(form, "type"), message: val(form, "message"), status: "Pending", created: todayPerth() }; state.requests.push(r); window.OCD_AUTOMATION_ENGINE.request(state, r); activity(`${participant(ui.clientId)?.name} requested a booking change`, `${r.id} · ${b.id}`); addUpdate("office", r.type, `${participant(ui.clientId)?.name} requested a change to ${b.id}.`, "office/work"); addUpdate(`client:${ui.clientId}`, "Request received", `The office will review your ${r.type.toLowerCase()}. Your booking is unchanged.`, "client/bookings"); message = "Request sent to the office. Your booking has not changed."; closeModal(); save(); render(); }
    if (kind === "client-feedback") { const r = { id: id("REQ", state.requests), participantId: ui.clientId, bookingId: "", type: "Feedback", message: val(form, "message"), status: "Pending", created: todayPerth() }; state.requests.push(r); window.OCD_AUTOMATION_ENGINE.request(state, r); activity(`${participant(ui.clientId)?.name} sent feedback`, `${r.id} · office review`); addUpdate("office", "Participant feedback", `${participant(ui.clientId)?.name} sent feedback for office review.`, "office/work"); message = "Feedback sent to the office."; closeModal(); save(); render(); }
    if (kind === "client-details") { const p = participant(ui.clientId); const r = { id: id("REQ", state.requests), participantId: p.id, bookingId: "", type: "Profile update", message: "Please review my contact details and service preference.", fields: { email: val(form, "email"), phone: val(form, "phone"), preference: val(form, "preference") }, status: "Pending", created: todayPerth() }; state.requests.push(r); window.OCD_AUTOMATION_ENGINE.request(state, r); message = "Update requested. Your ShiftCare sample profile is unchanged until review and read-back."; save(); render(); }
    if (kind === "public-book") { const slot = find(state.slots, ui.selectedSlot); if (!slot || state.calls.some(c => c.slotId === slot.id && ["Booked", "Change requested"].includes(c.status))) return formError(form, "That time is no longer available. Choose another slot."); const email = val(form, "email").toLowerCase(); let e = state.enquiries.find(x => x.email.toLowerCase() === email); if (!e) { e = { id: id("ENQ", state.enquiries), name: val(form, "name"), email, phone: val(form, "phone"), suburb: "To confirm", service: "To confirm", source: "Public call", preferredContact: "Email", owner: "Mia Roberts", status: "New", received: todayPerth(), nextAction: slot.date, intake: null, aiReview: null, emailDraft: null, emailStatus: "Not drafted" }; state.enquiries.push(e); } const c = { id: id("CALL", state.calls), slotId: slot.id, name: val(form, "name"), email, phone: val(form, "phone"), enquiryId: e.id, status: "Booked" }; state.calls.push(c); activity(`Discovery call booked for ${c.name}`, `${c.id} · ${dateLabel(slot.date)} ${slot.time}`); ui.publicConfirmation = { ...c, date: slot.date, time: slot.time }; ui.selectedSlot = ""; message = "Call booked in this demo."; save(); render(); }
    if (kind === "manage-call") { const reference = val(form, "reference").toUpperCase(), email = val(form, "email").toLowerCase(); const c = state.calls.find(x => x.id === reference && x.email.toLowerCase() === email); if (!c) return formError(form, "No demo booking matches that reference and email."); if (c.status === "Cancelled") return formError(form, "This booking has already been cancelled."); const requested = val(form, "action"); c.status = requested === "Cancel booking" ? "Cancelled" : "Change requested"; activity(`Discovery call ${requested.toLowerCase()}`, `${c.id} · ${c.name}`); message = c.status === "Cancelled" ? "Call cancelled; the time is available again." : "Change request sent to the office."; save(); render(); }
    if (kind === "public-intake") {
      if (ui.areaCheck?.status !== "covered" || val(form, "postcode") !== ui.areaCheck.postcode) return formError(form, "Check a covered postcode before continuing.");
      const payload = {
        name: val(form, "name"),
        email: val(form, "email").toLowerCase(),
        phone: val(form, "phone"),
        suburb: val(form, "suburb"),
        postcode: val(form, "postcode"),
        service: val(form, "service"),
        notes: [val(form, "support"), val(form, "preference") ? `Schedule or worker preference: ${val(form, "preference")}` : "", `Preferred contact: ${val(form, "preferredContact")}`].filter(Boolean).join("\n"),
        consent: form.elements.consent.checked
      };
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Sending…";
      try {
        const response = await fetch("/api/workflow?action=intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The request could not be sent.");
        form.reset();
        ui.areaCheck = null;
        openModal("Request received", result.message, `<p>Your reference is <strong>${esc(result.id)}</strong>.</p><p>The office will review the request and contact you using the details supplied.</p><div class="form-actions"><button class="btn primary" data-action="close-modal" type="button">Done</button></div>`);
        toast("Request sent to the office queue.");
      } catch (reason) {
        button.disabled = false;
        button.textContent = "Send request";
        formError(form, reason.message);
      }
      return;
    }
    if (message) toast(message);
  });

  document.addEventListener("change", event => {
    const target = event.target;
    if (target.id === "view-switch") { const routes = { office: "office/overview", worker: "worker/today", client: "client/home", public: "public/book" }; go(routes[target.value]); }
    if (target.id === "worker-persona") { ui.workerId = target.value; render(); }
    if (target.id === "client-persona") { ui.clientId = target.value; render(); }
    if (target.id === "enquiry-status") { ui.enquiryStatus = target.value; render(); }
    if (target.id === "schedule-worker") { ui.scheduleWorkerId = target.value; render(); document.getElementById("schedule-worker")?.focus({ preventScroll: true }); }
    if (target.id === "schedule-status") { ui.scheduleStatus = target.value; render(); document.getElementById("schedule-status")?.focus({ preventScroll: true }); }
    if (target.id === "route-booking") { ui.routeBooking = target.value; render(); }
    if (target.id === "cancellation-booking") { ui.cancellationBooking = target.value; ui.feePreview = null; render(); }
  });
  document.addEventListener("input", event => {
    const target = event.target;
    if (!target || !["enquiry-search", "participant-search"].includes(target.id)) return;
    const caret = target.selectionStart;
    if (target.id === "enquiry-search") ui.enquiryQuery = target.value; else ui.participantQuery = target.value;
    render();
    const replacement = document.getElementById(target.id);
    replacement?.focus(); replacement?.setSelectionRange(caret, caret);
  });
  document.addEventListener("click", event => { if (event.target === modal || event.target.closest("#modal a[href^='#/']")) closeModal(); });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  window.addEventListener("ocd-session-expired", () => { sessionEmail = ""; render(); });
  window.addEventListener("storage", event => { if (event.key === STORE) { state = load(); render(); } });

  if (sessionEmail) {
    try { await syncServerIntakes(); }
    catch (reason) { console.error("Request sync failed:", reason); }
  }
  render();
})();
