# Shared prototype arrivals

The existing booking map uses a NestJS backend written in strict TypeScript. Nest's module and controller handle HTTP routing; request processing and storage use plain functions. This does not change the existing login system or write to ShiftCare.

Run `npm start` from the project root. It compiles `backend/` into `.backend/`, then starts the existing workspace server on port 8001 (or `PORT`). Restart an older running server to load the new API. `npm run build` compiles both the backend and static workspace. `npm test` compiles the backend before running tests.

## Try it on separate browsers

Use the same running server URL in each browser, with the existing prototype session. Select Worker → Visit map → a confirmed assigned booking, check consent, and select Start journey / retry location. Allow the browser's location request. Select Client → Worker arrival in the other browser, using the participant assigned to that booking. Updates are polled every five seconds, including the client home arrival card.

The client gets an ETA first. At five minutes or less, an illustrative nearby car appears; it is not an exact GPS pin. GPS loss withdraws the ETA. Estimates older than two minutes are unavailable. Arrival, stopping, cancellation, assignment changes, or leaving the worker map end the active location session. Keep the worker page open; browser updates may pause when another app opens. Real phone location access requires HTTPS. Service destinations are still fictional, approximate demo pins.

Office → Booking map → Publish prototype bookings to shared arrivals sends changes to the seeded booking statuses, assignments, dates and start times. Publishing cancellations, completed visits, or assignment changes invalidates existing journey sessions. This currently supports the seeded booking IDs, not a new shared rostering system. Other prototype records remain in browser storage.

## Storage and privacy

Local development stores the shared roster and ETA/status fields in `WORKFLOW_DATA_DIR/journeys.json` (default `.local/journeys.json`). Writes are serialized in the local Node process and files replaced atomically. For multiple server instances or Vercel, configure the existing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Redis uses revision checks to retry concurrent writes; Vercel returns unavailable if shared storage is unconfigured.

Set `MAPBOX_PUBLIC_TOKEN` for server-side driving estimates. The browser's configured public token can also be supplied for prototype testing. Coordinates go transiently to the server and Mapbox to calculate duration. Worker coordinates, accuracy, Mapbox tokens and route geometry are never written to journey storage or returned in arrival responses. Client responses omit journey session IDs and service coordinates. Late requests cannot resume a stopped or replaced journey.

`GET /api/journeys?area=client&id=PAR-101` returns that participant's shared statuses. Worker and office views use `area=worker&id=WRK-01` and `area=office`. `POST /api/journeys` accepts `start`, `eta`, `unavailable`, `arrive`, `stop`, and `publish` actions. Client-selected identities remain prototype views under the existing staff session, not separate production permissions. No new login or account system is included.

## Checks

Run `npm run build:backend` and `node --test tests/journeys.test.cjs tests/maps.test.cjs`. The API tests use the real Nest adapter with a temporary data directory and stub Mapbox responses. They verify shared reads, persistence, scope filtering, coordinate privacy, stale updates, cancellation, stopped-session races and Redis conflict retries.
