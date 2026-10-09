# OCD Brilliance operations workspace

The application at `/` covers the complete presentation flow across office, worker, client, and public workspaces:

- office overview, automation cases and source inbox, bookkeeping review, work queue, calendar, enquiries, discovery-call transcript summaries, participants, staff, agreements, schedules, visit records, booking map, routes, and fee review;
- selectable worker visits, calendar, availability, sample native time in/out, notes/tasks/goals, cover responses, recorded hours and document follow-up;
- client bookings, requests, arrival status, shared documents, and permitted profile updates;
- public service-area checking, intake requests, and discovery call booking;
- Add to Home Screen and opt-in Web Push notifications.

The intake path follows the 5 October 2026 meeting:

1. A person checks the postcode before completing intake.
2. A covered-area request is stored on the server and appears in the shared office queue. Staff can also log email, phone, or coordinator enquiries into the same queue.
3. Staff assign an owner, contact the person, review the request, confirm the service postcode, and set the next action.
4. Staff create or match the client in ShiftCare and record the ShiftCare client ID here.

ShiftCare remains authoritative for participant and worker records, rostering, delivered care, documents, funding configuration, and service billing records. Xero and the confirmed payroll platform retain their accounting and pay-run responsibilities. The office has a separate ShiftCare connection screen for authenticated, read-only client, staff, and booking lookups once API credentials are configured. Intake handoff is still verified and manual. The other operational modules use seeded presentation records stored in the browser so every workflow can be demonstrated. The presentation deck remains available at `/presentation.html`.

## Workflow and integration documentation

- [Client needs and 27-item transcript review](docs/OCD_Client_Needs_and_Automation_Requirements.md)
- [Researched ShiftCare integration and automation design](docs/OCD_ShiftCare_Integration_and_Automation_Design.md), including four interactive Archify diagrams
- [Prototype build plan, workflow coverage, demonstration walkthrough and remaining gaps](docs/OCD_Prototype_Workflow_Plan_and_Validation.md) — 7 October implementation and validation
- [ShiftCare demonstration, capability research and verification runbook](docs/OCD_ShiftCare_Live_Demo_and_Verification.md) — real MCP capture, dashboard evidence and remaining integration work
- [Current redacted MCP read receipts and 82-tool inventory](docs/ShiftCare_Demo_Capability_Evidence_2026-10-07.json)
- [Redacted ShiftCare capability evidence](docs/ShiftCare_Capability_Validation_2026-10-06.json)
- [Diagram validation and visual review record](docs/OCD_ShiftCare_Diagram_Review.json)

The design distinguishes verified native features, supervised MCP actions, proposed backend automation, and remaining acceptance gates. It is the implementation reference; its implementation inventory records the earlier 6 October build. The prototype validation document records the subsequent interactive workflow implementation. The presentation screens do not establish working ShiftCare writes or live worker tracking.

## Demonstrate the automation workflow

After office sign-in, open **Office → Automation** (`/#/office/automation`) and **Process received mail**. Review source fields, approve an exact proposal, perform the labelled native demo step, and read back its result before closing. Participant/employee onboarding also needs a separate checked Xero/payroll reference. **Try an interruption** demonstrates unknown outcomes, bounded retries, stale edits and permission failures.

Cover follows **Office offer → verified offer → selected Worker's native response → Office review → verified assignment**. Cancellation requires a reason and occurrence/billing review. **Office → Bookkeeping** prepares care, Tuesday invoice and fortnightly payroll exceptions; financial export and release remain native/manual. **Pilot readiness** lists all fourteen researched workflows and remaining integrations.

Automation workspace cases use fictional sources and a separate fictional native snapshot stored in this browser. They do not call ShiftCare or send real messages. Real server-backed enquiries, office REST reads and the Integration proof screen remain separate. Worker/Client selectors are demonstration personas, not production permissions. Arrival requires explicit worker consent and is a simulated estimate; stale updates are withdrawn.

### Demonstrate real ShiftCare evidence

Open **Office → Integration proof** (`/#/office/verification`). The connected assistant has collected a private authenticated MCP capture from the trial account. **Run captured-data checks** generates a server-saved exception review with native record links, query receipts and duplicate prevention. The screen distinguishes the assistant capture from fresh website REST reads. Native follow-up creation requires exact approval to the assistant and independent read-back; the browser has no write adapter.

After exact user approval, one standalone administrative action (**11221**) was created in the connected trial account and independently read back with all approved fields matching. The action remains Open; the dashboard shows verified creation. No roster or financial operation was performed.

The local evidence files are ignored and office-authenticated. This feature needs shared evidence/job storage before hosted runs can persist; the private capture is not uploaded in a static deployment. See the linked demonstration runbook for the actual verified scope and workflow coverage.

Discovery-call transcripts and their draft summaries stay in the browser-only presentation data. The prototype uses a local extractive summary and requires a named staff review; it does not send transcript content to an external AI service.

## Run locally

Requires Node.js 22.13 or newer (PDF.js also supports Node.js 24 and later).

```bash
npm install
npm start
```

Open `http://127.0.0.1:8001/`. A local office account is created on first start, saved with mode `0600` in `.local/seeded-staff.json`, and printed in the terminal. It is reused on later starts and is never created in production.

The server loads `.env.local` automatically before initializing its handlers. Environment variables already set in the shell take precedence. Restart `npm start` after changing the file.

`MAPBOX_PUBLIC_TOKEN` supplies the browser-safe `pk.` token to the local map configuration and the static build. The local token already configured in `.env.local` is used; no token is committed to source. Secret `sk.` tokens are excluded. Office map settings can override the public token in that browser.

Local startup supplies presentation postcodes `6024,6025,6026,6027,6065` only when `SERVICE_POSTCODES` is unset. Set OCD Brilliance's approved list before using the request form outside a presentation:

```bash
export SERVICE_POSTCODES='6000,6001'
npm start
```

The local server saves requests in `.local/intakes.json`, push subscriptions in `.local/push-subscriptions.json`, and generated development VAPID keys in `.local/push-keys.json`. All are excluded from Git.

## Vercel setup

Set these deployment environment variables:

- `SERVICE_POSTCODES`
- `MAPBOX_PUBLIC_TOKEN` (public `pk.` token for 3D maps)
- `WORKFLOW_STAFF_EMAIL`
- `WORKFLOW_STAFF_PASSWORD`
- `WORKFLOW_SESSION_SECRET` with at least 32 characters
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `PUSH_DEMO_ADMIN_TOKEN` for authorized broadcast requests
- `SHIFTCARE_API_REGION`, `SHIFTCARE_ACCOUNT_ID`, `SHIFTCARE_API_KEY`, and `SHIFTCARE_TIME_ZONE` to enable the office ShiftCare connection

Upstash Redis stores intake records and push subscriptions on Vercel. The app returns a clear unavailable state when required server storage or keys are missing.

`npm run build` publishes the application, manifest, app icons, service worker, and archived presentation. The service worker caches static assets and navigation fallback only; it does not cache intake records or API responses.

## Verification

The shared intake now validates server-owned `OCD_INTAKE_RULES` and `SERVICE_POSTCODES`. Set a version, `approvedBy`, and policy `source`, plus OCD's required fields/documents, field mappings, and optional knowledge entries (`id`, `text`, `source`). The default technical baseline is labelled as awaiting OCD approval and cannot authorize a handoff. Required document checkboxes record staff inspection; they do not establish authenticity automatically.

Before custom PDF/scan or AI extraction is enabled, record the Inbox Signals trial in the rules: `inboxSignals.tested: true`, a nonempty `evidence` reference and a `gaps` array describing what OCD still needs. Test representative OCD documents in Inbox Signals first and compare accuracy, field evidence, conflict handling and missing-document detection. This repository does not claim that trial has been performed. PDF.js reads digital PDF text; Tesseract.js processes scanned pages and PNG/JPEG images locally, using bundled English language data. Originals stay beside the draft and persist with it. Limits are 2 MB, 20 PDF pages and 12,000 extracted characters.

Optional AI arrangement uses `OCD_AI_API_KEY` and `OCD_AI_MODEL` on the server. Staff explicitly select it before extracted text is sent to OpenAI. Returned field values require verbatim source evidence; unsupported values fall back to labelled extraction. AI explanations remain advisory; explicit server checks decide readiness. The adapter uses [OpenAI's documented JSON mode](https://developers.openai.com/api/docs/guides/structured-outputs), and validates the returned content. No live AI evaluation has been performed without credentials.

Office → Work queue includes unresolved shared intakes with owners, next actions, due dates, missing information/documents, conflicts, potential matches and recorded failed manual transfers. New submissions receive an owner and a due date. `WORKFLOW_STAFF_ACCOUNTS` can contain server-configured `{email,password,role}` accounts: `reader` reads, `coordinator` prepares, and `admin` approves and verifies. The existing single office login defaults to admin. Browser persona selectors remain demonstrations.

Before copying a handoff, an admin checks existing people in ShiftCare and explicitly approves the displayed fields. Approval is bound to reviewed fields, required document checks and the current rule configuration. Field or policy changes block the old approval. Draft creation accepts a per-submission `idempotencyKey`; identical retries return the original result, and reuse with changed details fails. Replayed revision-based mutations also return their saved result. Local writes and Redis writes check duplicates atomically.

The website retains a labelled manual handoff because its ShiftCare adapter only supports reads. Saved-profile confirmation records a staff check and explicitly states that API read-back was not performed. Use “Record failed transfer” to return a failed handoff to the unresolved queue. Automated native creation and API verification remain unavailable until a supported application write/read-back adapter is configured and tested.

```bash
npm test
npm run build
npm run verify:prototype
```

The tests cover local seeded credentials, postcode-gated intake, staff authentication, ownership, verified ShiftCare handoff, device subscription, opt-out, targeted push delivery, and the ShiftCare read integration. Automation tests cover missing fields, duplicate input/person matching, approval/read-back, accounting checkpoints, worker acceptance, billing scope, stale source/worker/roster changes, unknown outcomes, retries, invalid times, delivery failure and ETA consent/freshness. API tests check credential isolation, authorization, bounded queries, pagination, daylight saving dates, and upstream failure handling. They use local fixtures and temporary data directories and do not contact ShiftCare.

`verify:prototype` requires Chrome at `/usr/bin/google-chrome` or `CHROME_PATH`. It starts an isolated temporary server/browser, exercises the Office/Worker/Client workflows and writes screenshots and a JSON receipt to `docs/prototype-review-2026-10-07` (override with `PROTOTYPE_REVIEW_DIR`). Mapbox calls are deliberately blocked to verify fallback and avoid quota use; this does not test live 3D rendering or GPS. Visual review remains a separate recorded step after screenshot capture.

For the separate real Mapbox rendering check with fictional coordinates, set `PROTOTYPE_MAPBOX_LIVE=1` and a separate `PROTOTYPE_REVIEW_DIR`. This requires `MAPBOX_PUBLIC_TOKEN` and contacts Mapbox using the normal map quota. The recorded 7 October run loaded Office, Worker and Client 3D views successfully; it does not establish live GPS or a live ShiftCare roster.

For the real-record evidence dashboard check, run `PROTOTYPE_INTEGRATION=1 npm run verify:prototype`. It copies `.local/shiftcare-evidence.json` into an isolated temporary server and checks authentication, source labels, generated findings, replay, native URLs, pending/verified proof and reload persistence. The verified run saved nine screenshots and a review receipt under `docs/shiftcare-proof-review-2026-10-07`. The browser check makes no native write.

## ShiftCare application API

The website uses ShiftCare's REST API v3. Its credentials are separate from the coding assistant's MCP OAuth connection. An Admin can generate an API key under **Integrations → API**; ShiftCare currently limits this to Premium and Enterprise plans. Authentication is HTTP Basic with the numeric account ID as the username and API key as the password. See [ShiftCare's API key guide](https://help.shiftcare.com/en/articles/13906196-managing-api-keys).

**Free trial:** ShiftCare's [pricing page](https://shiftcare.com/pricing) advertises full trial access, while the API key guide specifies Premium/Enterprise eligibility. Trial status alone does not establish whether API keys are enabled; check whether **Integrations → API → Generate New API Key** is available in the account before deciding that a paid plan is needed. The connected trial account's MCP access has already passed client, staff, and booking reads. Those assistant operations use browser OAuth and do not require a REST API key. If the API menu is unavailable, assistant workflows can continue through MCP while website REST reads remain awaiting configuration. Connecting the website through MCP would require its own OAuth integration; the assistant's authenticated session is not a website credential.

Copy the settings in `.env.example` into the ignored `.env.local`:

```dotenv
SHIFTCARE_API_REGION=au
SHIFTCARE_ACCOUNT_ID=your_numeric_account_id
SHIFTCARE_API_KEY=your_api_key
SHIFTCARE_TIME_ZONE=Australia/Sydney
```

Use the time zone configured in your ShiftCare account. Supported regions are `au`, `ca`, `us`, and `uk`; the server selects the corresponding official API host. Keep the API key in `.env.local` for development and in Vercel server environment variables for deployment. Set all four variables on Vercel, alongside the existing office login credentials, then redeploy to apply them. `.env.local` is not uploaded or included in the static build.

After restarting the local server, sign in and open **Office → ShiftCare** (`/#/office/shiftcare`). **Check connection** performs one small client read; **Load records** reads the selected page of bookings, clients, or staff. Adding credentials alone does not mark the connection verified. Booking queries require an inclusive date range of at most 31 days. Dates are converted from account-local days into explicit UTC instants, including daylight saving changes.

The `/api/shiftcare` function supports authenticated `GET` actions only:

| Action | Purpose | Parameters |
| --- | --- | --- |
| `status` | Check configuration without contacting ShiftCare | None |
| `check` | Verify a read with the configured credentials | None |
| `clients` / `staff` | Read IDs and names | `page`, `per_page` (maximum 20) |
| `shifts` | Read scheduled times, client names and staff assignments | `from`, `to` (`YYYY-MM-DD`), `page`, `per_page` |

Each result includes its fetch time and pagination. Only the displayed fields are returned to the browser; full care records, billing data, and upstream credentials are excluded. API responses are never cached by the service worker, and results are not saved to local storage. Missing assignment data is shown as unknown rather than treated as an empty roster.

This connection requires office authentication. The existing Worker and Client selectors are presentation views; real access to their own ShiftCare bookings needs separate user identities and server-enforced ShiftCare ID permissions. GPS arrival tracking, scheduled reports, record creation, and roster changes are additional integrations.

## ShiftCare MCP setup

This repository includes the Australian ShiftCare endpoint in `.codex/config.toml`. Open Codex in this repository so it can load the project configuration. The terminal commands below also register the server in Codex's shared user configuration for CLI login and workspaces opened from the parent folder. This connects the coding assistant; the deployed operations workspace still uses the existing manual ShiftCare handoff.

All 11 published ShiftCare skills are installed through the upstream `npx skills add` command under `.agents/skills`, including both compliance reference checklists. The installation includes Apache-2.0 license text and attribution; `skills-lock.json` records upstream sources and content hashes. The skills load when Codex is opened in this repository.

To reinstall the skills using ShiftCare's documented CLI:

```bash
npx skills add shiftcare/ai-skills --skill '*' --agent codex --yes
```

With MCP enabled under ShiftCare **Account → AI Settings**, complete the connection from this repository:

```bash
codex mcp add shiftcare-au --url https://mcp.au.shiftcare.com/mcp
codex mcp login shiftcare-au
codex mcp list
```

Complete OAuth in the browser using your own ShiftCare account, then restart the Codex extension or start a new Codex session in this repository. Installed skills are available on the next turn.

Verify the connection with the skill compatibility check, `whoami`, and a small read such as `list_clients` with `per_page: 1`. Confirm the target account, `mcp_available`, role, and `mcp_writes_enabled` before using its records. An Admin account with **Allow Write Actions** enabled can use the write tools actually exposed by its connection; back-office accounts remain read-only. Keep credentials in the OAuth client, outside application source and browser storage.

The AU connection was verified on 6 October 2026: OAuth succeeded, connection and daily-rundown skill compatibility checks passed, and client, staff, and bounded shift reads succeeded. The discovered catalog contained 81 tools, including client/staff creation, shift creation/updates/cancellations, and progress notes. Discovery confirms exposure, not that every feature is enabled: the account-location read returned `Feature not enabled`, and team and availability-schedule listing tools were absent. No record mutations were used for verification. The connected test account contained seeded sample records, so this check is not a production roster audit.

### Proposed automation

| Workspace flow | ShiftCare capability to verify after login | Application work required |
| --- | --- | --- |
| Office daily work queue | Read bounded shifts with `include_staff` and `include_clients`, leave, and exposed attendance records; identify vacancies and overlaps | Run a scheduled server job and save a report with source links and the last refresh time; retain office availability checks until an availability tool is exposed |
| Office, Worker, and Client bookings | Read clients, staff, shifts, and each shift's staff assignments | Store ShiftCare IDs and serve only the bookings each signed-in person may see |
| Intake handoff | Match with `list_clients`/`get_client`; `create_client` is exposed and requires `first_name` and `dob` | Collect a staff-verified date of birth, which the current intake form does not capture; review the match or creation, record the verified ShiftCare ID, and retain manual entry for unsupported fields |
| Booking changes and cover | Use exposed create, update, and cancellation tools; check leave and conflicting shifts | Show the exact proposed change and notification/billing effects, obtain approval, write once, and read it back before updating the local record |
| Visit documentation | Read with `list_progress_notes`/`get_progress_note`; `create_progress_note` is exposed | Preserve the worker's original note and review the exact content before submission |
| Staff document follow-up | Read staff qualifications and files with expiry data | Save dated findings and create office follow-up tasks; report records that could not be checked |
| Worker arrival map | Roster data supplies the booking and assignment; continuous GPS streaming is not established by the MCP documentation reviewed | Add worker location sharing, a server location feed, and Mapbox route estimates; the current journey remains simulated |

The application API above implements office client/staff/booking lookup with separate REST credentials. Scheduled reports and user-specific authorization are still needed for unattended automation and real worker/client access. Codex login alone does not provide website credentials. Attendance fields and available tools vary by account; missing data must be reported as unknown. Use the ShiftCare account's time zone and explicit datetime offsets for roster operations.

Setup and capability references: [ShiftCare's ChatGPT and Codex setup guide](https://help.shiftcare.com/en/articles/14630405-connecting-shiftcare-mcp-to-chatgpt), [ShiftCare AI Skills](https://github.com/shiftcare/ai-skills), [ShiftCare daily rundown](https://github.com/shiftcare/ai-skills/blob/main/skills/shiftcare-daily-rundown/SKILL.md), [ShiftCare concepts and tools](https://github.com/shiftcare/ai-skills/blob/main/skills/shiftcare-basics/SKILL.md), and [official OpenAI MCP documentation](https://developers.openai.com/codex/mcp/).

## Current screenshot presentation

The [presentation hub](docs/presentation/Start%20here.md) includes a nine-slide screenshot deck, a ten-minute presenter guide with exact demo steps, and a screenshot map. Open `docs/presentation/OCD Brilliance — Presentation.html` in a browser; use arrow keys to navigate and F for fullscreen. All seven screenshots use fictional records. The linked Markdown notes also support an Obsidian vault rooted at this repository.
