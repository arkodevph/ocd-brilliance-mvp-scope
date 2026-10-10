const CACHE = "ocd-brilliance-operations-v31";
const SHELL = [
  "/",
  "/workspace/styles.css",
  "/workspace/crm.css",
  "/workspace/maps.css",
  "/workspace/pwa.css",
  "/workspace/data.js",
  "/workspace/invoices.js",
  "/workspace/maps.js",
  "/workspace/pwa.js",
  "/workspace/transcript.js",
  "/workspace/app.js",
  "/workspace/ui-layout.js",
  "/workspace/intake-documents.js",
  "/workspace/shiftcare.js",
  "/workspace/integration-proof.js",
  "/workspace/integration-proof.css",
  "/workspace/automation-engine.js",
  "/workspace/automation.js",
  "/workspace/automation.css",
  "/workspace/map-config.js",
  "/workspace/manifest.webmanifest",
  "/assets/ocd-brilliance-logo.png",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png"
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
    event.respondWith(fetch(request).catch(() => caches.match("/")));
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
