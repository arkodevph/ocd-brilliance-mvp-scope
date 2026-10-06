# OCD Brilliance operations workspace

The application at `/` covers the complete presentation flow across office, worker, client, and public workspaces:

- office overview, work queue, calendar, enquiries, participants, staff, agreements, schedules, visit records, booking map, routes, and fee review;
- worker visits, calendar, availability, visit time in/out, notes, and cover responses;
- client bookings, requests, arrival status, shared documents, and permitted profile updates;
- public service-area checking, intake requests, and discovery call booking;
- Add to Home Screen and opt-in Web Push notifications.

The intake path follows the 5 October 2026 meeting:

1. A person checks the postcode before completing intake.
2. A covered-area request is stored on the server and appears in the shared office queue. Staff can also log email, phone, or coordinator enquiries into the same queue.
3. Staff assign an owner, contact the person, review the request, confirm the service postcode, and set the next action.
4. Staff create or match the client in ShiftCare and record the ShiftCare client ID here.

ShiftCare remains authoritative for rostering, delivered services, payroll, and NDIS processes. ShiftCare API access can be connected later; the current handoff is verified and manual. Operational modules other than intake use seeded presentation records stored in the browser so every workflow can be demonstrated. The presentation deck remains available at `/presentation.html`.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

Open `http://127.0.0.1:8001/`. A local office account is created on first start, saved with mode `0600` in `.local/seeded-staff.json`, and printed in the terminal. It is reused on later starts and is never created in production.

Local startup supplies presentation postcodes `6024,6025,6026,6027,6065` only when `SERVICE_POSTCODES` is unset. Set OCD Brilliance's approved list before using the request form outside a presentation:

```bash
export SERVICE_POSTCODES='6000,6001'
npm start
```

The local server saves requests in `.local/intakes.json`, push subscriptions in `.local/push-subscriptions.json`, and generated development VAPID keys in `.local/push-keys.json`. All are excluded from Git.

## Vercel setup

Set these deployment environment variables:

- `SERVICE_POSTCODES`
- `WORKFLOW_STAFF_EMAIL`
- `WORKFLOW_STAFF_PASSWORD`
- `WORKFLOW_SESSION_SECRET` with at least 32 characters
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `PUSH_DEMO_ADMIN_TOKEN` for authorized broadcast requests

Upstash Redis stores intake records and push subscriptions on Vercel. The app returns a clear unavailable state when required server storage or keys are missing.

`npm run build` publishes the application, manifest, app icons, service worker, and archived presentation. The service worker caches static assets and navigation fallback only; it does not cache intake records or API responses.

## Verification

```bash
npm test
npm run build
```

The tests cover local seeded credentials, postcode-gated intake, staff authentication, ownership, verified ShiftCare handoff, device subscription, opt-out, and targeted push delivery. They use temporary data directories and do not contact ShiftCare.
