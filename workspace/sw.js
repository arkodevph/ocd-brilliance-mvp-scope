const CACHE = "ocd-brilliance-operations-v61";
const SHELL = [
  "/",
  "/workspace/",
  "/workspace/generated/landing.js",
  "/workspace/generated/landing.css",
  "/assets/landing/logo.png",
  "/workspace/styles.css",
  "/workspace/crm.css",
  "/workspace/maps.css",
  "/workspace/pwa.css",
  "/workspace/data.js",
  "/workspace/invoices.js",
  "/workspace/maps.js",
  "/workspace/journey-api.js",
  "/workspace/pwa.js",
  "/workspace/transcript.js",
  "/workspace/generated/frontend.js",
  "/workspace/employee-portal.js",
  "/workspace/employee-portal.css",
  "/workspace/ui-layout.js",
  "/workspace/intake-documents.js",
  "/workspace/shiftcare.js",
  "/workspace/integration-proof.js",
  "/workspace/integration-proof.css",
  "/workspace/booking-rules.js",
  "/workspace/automation-engine.js",
  "/workspace/automation.js",
  "/workspace/automation.css",
  "/workspace/client-presentation.js",
  "/workspace/client-presentation.css",
  "/workspace/map-config.js",
  "/workspace/manifest.webmanifest",
  "/assets/ocd-brilliance-logo.png",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  ...Array.from({ length: 6 }, (_, i) => `/assets/profiles/profile-${i + 1}.svg`)
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("ocd-brilliance-") && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname) || url.pathname.includes("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(url.pathname.startsWith('/workspace') ? '/workspace/' : '/')));
    return;
  }
  event.respondWith(fetch(request).then(async response => {
    if (response.ok) await caches.open(CACHE).then(cache => cache.put(request, response.clone())).catch(() => {});
    return response;
  }).catch(() => caches.match(request)));
});

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch (_) { /* use the generic demo message */ }
  const title = typeof payload.title === "string" ? payload.title : "OCD Brilliance";
  const body = typeof payload.body === "string" ? payload.body : "An operations update is ready.";
  const route = ["office/overview", "office/schedule", "client/home", "worker/today"].includes(payload.route) ? payload.route : "office/overview";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/assets/app-icon-192.png",
    badge: "/assets/app-icon-192.png",
    tag: payload.tag || "ocd-operations-update",
    data: { route }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const route = event.notification.data?.route || "office/overview";
  const target = new URL(`./#/${route}`, self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
    const open = clients.find(client => client.url.startsWith(self.registration.scope));
    if (open) { await open.navigate(target); return open.focus(); }
    return self.clients.openWindow(target);
  }));
});
