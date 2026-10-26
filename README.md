# OCD Brilliance operations workspace

The application at `/` covers the complete presentation flow across office, worker, client, and public workspaces:

- office overview, automation cases and source inbox, bookkeeping review, work queue, calendar, enquiries, discovery-call transcript summaries, participants, staff, agreements, schedules, visit records, booking map, routes, and fee review;
- selectable worker visits, calendar, availability, sample native time in/out, notes/tasks/goals, cover responses, recorded hours and document follow-up;
- client bookings, requests, arrival status, shared documents, and permitted profile updates;
- public service-area checking, intake requests, and discovery call booking;
- Add to Home Screen and frontend-only demo notifications.

The intake path follows the 5 October 2026 meeting:

1. A person checks the postcode before completing intake.
2. A covered-area request is stored on the server and appears in the shared office queue. Staff can also log email, phone, or coordinator enquiries into the same queue.
3. Staff assign an owner, contact the person, review the request, confirm the service postcode, and set the next action.
4. Staff create or match the client in ShiftCare and record the ShiftCare client ID here.

ShiftCare remains authoritative for participant and worker records, rostering, delivered care, documents, funding configuration, and service billing records. Xero and the confirmed payroll platform retain their accounting and pay-run responsibilities. The office has a ShiftCare connection screen for authenticated, read-only client, staff, and booking lookups once API credentials are configured. The existing intake screen retains its checked manual handoff. **Office → Automation → Shared workflows** adds server-backed cases for all fourteen workflows, Microsoft 365 mailbox ingestion, our own worker, and opt-in ShiftCare API operations with exact approvals and independent read-back. The remaining operational demonstration modules use seeded presentation records stored in the browser. The presentation deck remains available at `/presentation.html`.

## Comprehensive frontend prototype — 25 October 2026

Open **Daily work → Operations hub** at `/workspace/#/office/operations/overview`. The new React workspace covers all 35 identified processes with the selected 20 core / five gated / ten later-native scope. It includes an overview, filtered work queue, intake/people, documents/renewals, rostering/cover, finance/payroll, care/feedback, communications, workflow library and case activity.

Each example retains its original source, editable proposal, reviewer checks, exact approval, browser-only execution or native handoff, checked result and required follow-through. The interruption examples demonstrate stale approvals, uncertain responses, partial cancellation and failed follow-through. Hub examples save separately in this browser; existing prototype features and records are preserved. Native methods, identities, branch permissions and financial releases are demonstrations or retained manual responsibilities, not live integrations.

See the [prototype guide and walkthrough](docs/OCD_Comprehensive_Prototype_Guide.md). Run `npm run verify:operations` for the isolated browser acceptance check and screenshots. The detailed scope and production gates remain in the implementation plan.

## Selected implementation direction — 24 October 2026

OCD has selected a **custom supporting application** for its internal operations and future branches. The application owns source ingestion, case tracking, workflow rules, approvals, background processing, reconciliation, and audit history. ShiftCare retains care operations and Xero retains accounting; the confirmed payroll platform retains payroll. n8n is outside the selected delivery architecture.

Extend the existing React workspace and Hono/TypeScript backend, with PostgreSQL, a durable job queue, a separate application worker, and protected evidence storage. The current runtime is a foundation; durable approved-action execution, scalable case storage, branch permissions, and live integration acceptance remain delivery work. Start with the shared foundation and intake/onboarding, then reviewed roster workflows and financial reconciliation. The [implementation direction and delivery sequence](docs/OCD_Native_Automation_Implementation.md#selected-implementation-direction--24-october-2026) records responsibilities, boundaries, and acceptance criteria.

## Workflow and integration documentation

- [Custom system implementation plan](docs/OCD_Custom_System_Implementation_Plan.md) — complete Markdown blueprint, architecture/data design, phased roadmap, source traceability, security risks, testing/deployment strategy and separate final plan review; implementation has not started under this plan
- [Automation feasibility and workflow priorities](docs/OCD_Automation_Feasibility_and_Priorities_2026-10-25.pdf) and [35-item feasibility matrix](docs/automation-feasibility-2026-10-25/feasibility-matrix.csv) — 20 core workflows, five gated additions, technical integration requirements and retained manual responsibilities
- [35 automation opportunities](docs/OCD_35_Automation_Opportunities.pdf) and [editable Word document](docs/OCD_35_Automation_Opportunities.docx) — problems, proposed automations, staff decisions and completion criteria, plus supporting operational actions and rules to confirm
- [96-item automation and architecture assessment](docs/OCD_Automation_Architecture_Assessment_2026-10-24.pdf) and [opportunity matrix](docs/automation-assessment-2026-10-24/opportunity-matrix.csv) — evidence and proposed treatments behind the selected custom architecture
- [Native automation architecture and implementation](docs/OCD_Native_Automation_Implementation.md) — all 14 backend handlers, shared review queue, Microsoft 365 attachments/OCR, native evidence collectors, gated writes, staff handoffs, authenticated service access, worker execution and activation steps
- [Complete workflow use cases](docs/OCD_Workflow_Use_Cases.md) — all 14 workflows: purpose, client pain points, steps, automation/subsystems, ShiftCare data and handoffs, failures, benefits, outcomes, and prototype limits
- [All 14 workflow connections](.archify/architecture-ocd-all-14-workflows-20261008-223845/ocd-all-14-workflows.html) — interactive map of W01–W14, triggers, review gates, 29 handoffs, actions, data outputs and failures
- [ShiftCare integration and data ownership](.archify/architecture-ocd-shiftcare-integration-20261008-223845/ocd-shiftcare-integration.html) — native authority, supervised MCP, gated REST jobs, human review, finance and consented journeys
- [All-workflow diagram coverage and delivery evidence](docs/OCD_All_Workflows_Diagram_Review_2026-10-08.json)
- [Client presentation, business benefits, practical demo script and pilot reporting guide](docs/OCD_Client_Presentation_and_Pilot_Report.md) — open Office → Client walkthrough for the five-section presentation and downloadable Markdown report
- [Client needs and 27-item transcript review](docs/OCD_Client_Needs_and_Automation_Requirements.md)
- [Researched ShiftCare integration and automation design](docs/OCD_ShiftCare_Integration_and_Automation_Design.md), including four interactive Archify diagrams
- [Hono backend and ShiftCare integration preparation](docs/shiftcare-integration-readiness.md), including official roster/booking screenshots, customer studies and account readiness checks
- [Prototype build plan, workflow coverage, demonstration walkthrough and remaining gaps](docs/OCD_Prototype_Workflow_Plan_and_Validation.md) — 7 October implementation and validation
- [Prototype review, corrected defects, client requirement coverage and remaining integrations](docs/OCD_Prototype_Review_2026-10-08.md) — 8 October review; 52 tests and 23 browser scenarios
- [ShiftCare demonstration, capability research and verification runbook](docs/OCD_ShiftCare_Live_Demo_and_Verification.md) — real MCP capture, dashboard evidence and remaining integration work
- [Current redacted MCP read receipts and 82-tool inventory](docs/ShiftCare_Demo_Capability_Evidence_2026-10-07.json)
- [Redacted ShiftCare capability evidence](docs/ShiftCare_Capability_Validation_2026-10-06.json)
- [Diagram validation and visual review record](docs/OCD_ShiftCare_Diagram_Review.json)

The design distinguishes verified native features, supervised MCP actions, proposed backend automation, and remaining acceptance gates. It is the implementation reference; its implementation inventory records the earlier 6 October build. The prototype validation document records the subsequent interactive workflow implementation. The presentation screens do not establish working ShiftCare writes or live worker tracking.

## Demonstrate the automation workflow

For a client meeting, start at **Office → Client walkthrough** (`/#/office/presentation`). Explain the business overview, seven core areas / fourteen planned workflows, and a guided intake example linked to the working cases. **Presentation view** hides office navigation; Escape restores it. **Measure value** provides an unfilled baseline/pilot scorecard and clearly labelled capacity assumptions. Download the client report as Markdown. **Pilot & proof** summarizes only the loaded dated evidence and matching saved checks; it never runs native actions. Presentation entries stay in page memory until reload. See the presentation guide above for a 15-minute script and measurement plan.

Start with **Daily work → Operations hub** (`/workspace/#/office/operations/overview`) and the [comprehensive prototype guide](docs/OCD_Comprehensive_Prototype_Guide.md). The hub demonstrates the 35 scoped opportunities, reviewed proposals, linked reply exceptions, checked outcomes and interruption recovery. New requests require source-backed fields; they do not inherit another sample's booking context. Follow-up can be reassigned after a saved step without repeating it.

The older **Automation** workspace (`/workspace/#/office/automation`) has separate examples. Use **Add message** or **Inbox tasks → Add message**, review the suggested routing, and confirm the responsible team to create an owned task. For the existing lifecycle examples, open the named case, approve its exact proposal, perform the labelled demo step and verify the result. Participant/employee onboarding also needs a separate checked Xero/payroll reference. **Home → Demo guide** opens the presentation screens. Hub changes do not synchronize the older examples or the authenticated shared account workflow queue.

Cover follows **Office offer → verified offer → selected Worker's native response → Office review → verified assignment**. Open **Team schedule → booking → Cancellation assistant** to review the reason, notice, travel evidence and charge treatment for one occurrence. The assistant verifies the simulated cancellation and keeps the case open until participant and assigned-worker updates are delivered. Failed updates can be retried; unresolved native exceptions stay open. Travel and financial decisions are recorded review evidence, not live payroll or invoice changes. **Team & finance → Financial checks** compares invoice, attendance, payroll, charge and payment-follow-up evidence for a selected service period. Assign an owner, open the source record, correct it and recheck; explained time differences require evidence and reopen when the source changes. Payment status is manually recorded from verified accounting evidence; financial export and release remain native/manual. See [bookkeeping usage and verification](docs/financial-checks-review-2026-10-21/review.md). **Pilot readiness** lists all fourteen researched workflows and remaining integrations.

Open **Team & finance → Payroll preparation** (`#/office/payroll`) to choose a period, approve payable hours and actual mileage from completed, reviewed visits, and prepare a saved draft. Add dated hours, kilometre or AUD adjustments with evidence, review worker totals, then mark the draft reviewed to download its review CSV. Missing approvals and changed source records block final review/export; refreshing preserves the previous draft snapshot. Route estimates are not actual mileage. This browser-local worksheet does not calculate wage rates, tax or super, import into a payroll vendor, or release pay. Feature files live in `frontend/features/payroll/`.

Saved transport and cancellation proposals have their own **Team & finance → Proposed fees** page (`#/office/proposed-fees`). Saving a calculation opens that page for approval; proposal history is no longer repeated under the Routes & fees tabs.

Open **Team & finance → Routes & fees → Routes → Travel checker**, or **Work queue → Checks → Review travel**. Saved estimates are flagged when the worker/dispatch area, address, booking or preceding visit changes, when kilometres/minutes are invalid, or when drive time exceeds the gap between visits. Review the route source and enter checked values; the original estimate is retained. A timing exception needs an explicit acknowledgement and recorded scheduling outcome. This checks the browser's workspace records; it does not fetch live routes or alter travel claims, payroll or invoices. Feature files live in `frontend/features/travel-checker/`.

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

### Icon attribution

The React interface uses [Solar Icons](https://github.com/saoudi-h/solar-icons) via `@solar-icons/react`. The icon artwork is by 480 Design and is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

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

The initial PostgreSQL schema is in `backend/database/migrations/001_initial_schema.sql`. Run `DATABASE_URL='postgresql://…' npm run db:migrate` against the intended database. The TypeScript runner applies numbered migrations in numeric order, records checksums, serializes concurrent runs and rolls back pending changes on failure. Add a new numbered migration for subsequent changes; do not edit an applied migration. Tables are created in dependency order (participants/workers → bookings → journeys), then foreign keys and indexes. Intake JSON retains its review history, idempotency metadata and video references; video files remain in private storage. When `DATABASE_URL` is configured, intake, shared automation state and original evidence use PostgreSQL after these migrations. Development falls back to private files; shared Redis remains supported. Existing records are not imported or switched automatically.

`SELECT * FROM participant_bookings_from('2026-05-05');` lists every participant with bookings on or after the cutoff. Its date condition is inside `LEFT JOIN … ON`, so participants with no bookings or only older bookings still appear with null booking fields. Putting that condition in `WHERE`, even with `OR booking_id IS NULL`, would lose participants whose only bookings are older. `npm test` checks these cases and migration rollback on a temporary PostgreSQL instance when local `initdb` and `pg_ctl` are available; otherwise that test reports a skip.

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

`verify:prototype` requires Chrome at `/usr/bin/google-chrome` or `CHROME_PATH`. It starts an isolated temporary server/browser, exercises the Office/Worker/Client workflows and writes screenshots and a JSON receipt to `docs/prototype-review-YYYY-MM-DD` using the current UTC date (override with `PROTOTYPE_REVIEW_DIR`). Mapbox calls are deliberately blocked to verify fallback and avoid quota use; this does not test live 3D rendering or GPS. Visual review remains a separate recorded step after screenshot capture.

For the separate real Mapbox rendering check with fictional coordinates, set `PROTOTYPE_MAPBOX_LIVE=1`. Its default output is `docs/prototype-mapbox-review-YYYY-MM-DD`; `PROTOTYPE_REVIEW_DIR` can override it. This requires `MAPBOX_PUBLIC_TOKEN` and contacts Mapbox using the normal map quota. The recorded 7 October run loaded Office, Worker and Client 3D views successfully; it does not establish live GPS or a live ShiftCare roster.

For the real-record evidence dashboard check, run `PROTOTYPE_INTEGRATION=1 npm run verify:prototype`. It copies `.local/shiftcare-evidence.json` into an isolated temporary server and checks authentication, source labels, generated findings, replay, native URLs, pending/verified proof and reload persistence. Its default output is `docs/shiftcare-proof-review-YYYY-MM-DD`. The 8 October review saved nine screenshots using the native capture from 7 October; it did not fetch new native records. The browser check makes no native write.

For the client presentation, run `PROTOTYPE_PRESENTATION=1 npm run verify:prototype` with the saved private trial capture available locally. This checks guided sample preparation, links to working cases, presentation mode, capacity assumptions, scorecard direction, historical proof, missing-evidence handling and the Markdown download. Screenshots and receipts go to `docs/client-presentation-review-YYYY-MM-DD`. It runs only local checks on the existing capture; no new ShiftCare write is made. Unit tests also cover missing/zero/negative capacity inputs, all fourteen workflow IDs and report privacy boundaries.

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

The public landing page at `/` uses the existing React redesign copied from `/home/nami/Desktop/projects/ocd-brilliance` into `frontend/landing`, with its assets under `assets/landing`. The build is self-contained and does not depend on that external folder. **Request support** opens the native React intake at `/intake`, retaining the selected service. It checks postcode coverage and submits contact details, consent and up to five private 100 MB videos directly to `/api/workflow`; chunked uploads can resume on retry, and submissions have an idempotency key and a saved reference. **Open demo** opens `/portal`, where you can select the seeded office coordinator, any employee or any client without logging in. `/login` remains a compatibility alias for the account chooser. Account → Switch seeded account reopens the chooser; employee/client selectors also switch fictional accounts inside the workspace. Demo edits persist in this browser. Private backend intake records and connected services still require an authorized server session; choosing a seeded persona never grants backend permissions. The legacy `/#office` URL opens `/workspace/#/office/intake` directly without a login; existing `/#/office/...` links redirect to the workspace. API errors and missing server configuration are shown explicitly. Local backend staff credentials are seeded by `npm start` when no staff configuration exists. The hosted demo needs no login configuration; shared intake storage still requires Redis, and real private backend operations require staff credentials/session secret. Hosted video uploads need durable object storage and currently return an explicit configuration error without it. Marketing pages support direct navigation and reloads locally and have matching deployment rewrites. General contact forms remain explicitly labelled demonstrations; support intake sends requests to the existing backend. The original website's files and uncommitted changes were preserved.

The frontend now boots from `frontend/main.tsx` using React and TypeScript, bundled locally with esbuild. `npm start` and `npm run build` compile both frontend and Hono backend; run `npm run build:frontend` after frontend edits when running `node server.cjs` directly. Sign-in is a native React component with pending/error state. Workspace routes and booking dialogs render as React elements through `frontend/renderer.tsx`, which adapts the existing escaped templates. Existing workflow state, delegated handlers and imperative map/OCR/connection widgets remain during the gradual conversion to native TSX components. This is a React entry and rendering migration, not a completed rewrite of every screen's state and handlers. The OCD styles and API endpoints are retained.

The employee portal at `#/worker/home` follows the supplied self-service dashboard reference: horizontal navigation, an employee profile and quick links, notification categories with an unread ring, an interactive monthly calendar and leave balance rings. Use the demo employee selector to show nurses, cleaners and support workers. Fictional notifications, training and approved/pending leave examples are seeded once per employee. Marking updates read, creating a leave request and withdrawing your own pending request persist in browser storage; overlapping requests are rejected. Existing visits, clock-in/out, availability and hours/document screens remain connected. Sample leave requests do not change the roster, deduct balances or write to ShiftCare/payroll.

The client portal uses separate desktop and mobile layouts. Wide desktop has horizontal header navigation, a calendar beside three coloured service groups, and three aligned lower panels for bookings, requests and help. Smaller desktops use two columns. Phones have four bottom navigation items, large service tiles, an inline date picker after selecting a service and a booking review sheet. Past visits stay in paginated booking history. Returning clients can choose “Same as before” from their latest completed demo visit, or choose different services and upload new service videos. Booking requests are validated by the Hono backend and persisted in the office intake queue, with the preferred date, service list and client-supplied prior reference. Videos use the existing private chunked upload flow. The office verifies the existing client, scope, availability and price; a returning booking request does not enter the new-client profile handoff. Duplicate pending requests for the same contact, services and date are blocked. The portal still uses demo identities; production client authentication remains separate work. No request confirms a booking or writes to ShiftCare. Office booking and cover suggestions check approved services, recorded skills, availability and overlaps, then rank by approximate straight-line distance from fictional dispatch areas. Missing distance is shown explicitly; employee home addresses are not used. Worker categories appear in staff profiles, roster rows and worker selection. Reference selection and accessibility rationale: [client booking UX](docs/client-booking-ux.md).

Staff role labels come from recorded roles; fictional seed roles are not credential verification. Public intake accepts up to five optional MP4, MOV or WebM service videos, up to 100 MB each. Clients can add clips in several selections, preview them and remove individual clips. Uploads use 1 MB chunks with progress and retry support; intake records contain file references, not large base64 payloads. Files persist privately under `WORKFLOW_DATA_DIR/intake-videos` (default `.local/intake-videos`), and authenticated office playback supports byte ranges. Management acknowledges all videos when reviewing work and pricing follow-up; reviewer identity and time are saved. Pricing remains a management decision. Existing small inline clips remain readable. Videos are not sent to AI or transferred to ShiftCare.

Large video storage currently works on the persistent local Hono backend. Vercel uploads return an explicit storage-configuration error; durable object storage must be connected before enabling large hosted uploads. Text intake remains available. MOV playback depends on the recording codec supported by the browser.

The website in `/home/nami/Desktop/projects/ocd-brilliance` links its header and support enquiry page to `/intake`, which embeds this same public form. For deployment, set `VITE_WORKFLOW_URL` to the operations app's HTTPS origin before building the website. Development defaults to `http://127.0.0.1:8001/`; an unconfigured production build shows office contact details instead. Keep the existing service postcode and intake owner configuration enabled.

The [presentation hub](docs/presentation/Start%20here.md) includes a nine-slide screenshot deck, a ten-minute presenter guide with exact demo steps, and a screenshot map. Open `docs/presentation/OCD Brilliance — Presentation.html` in a browser; use arrow keys to navigate and F for fullscreen. All seven screenshots use fictional records. The linked Markdown notes also support an Obsidian vault rooted at this repository.

The booking, visit and arrival maps now render their layout, booking list and summary counts in native React components (`frontend/booking-map.tsx`) within the existing office sidebar, employee portal and client portal designs. Mapbox Standard provides the map in 3D and 2D. Configure `MAPBOX_PUBLIC_TOKEN` in ignored `.env.local` for development or in the deployment environment. Missing or rejected connections display guidance and retry controls instead of replacing the map with the fictional Three.js neighbourhood.

## Office companion

Set `COMPANION_ENABLED` in `workspace/app.js` to `true` to enable Companion or `false` to disable it. Rebuild with `npm run build:frontend` and reload the app; deployments use `npm run build`. It is currently disabled.

Open **Companion** at the bottom right of any office workspace page (or press **Alt+K**). It is part of the existing app: Today reads the same work queue and opens its existing review actions; Travel shows the saved booking estimates and opens the existing travel workspace; Messages edits unsent drafts on the existing local demo enquiries. Drafts use the workspace's normal browser storage and remain visible on the enquiry after reload. No separate account, service or browser extension is required.

The panel stays open across office pages and is removed when switching to an employee, client or public view. Escape minimizes it. Guide contains fixed demo workflow notes, not an AI assistant or approved company policy. The companion sends no messages or new API requests and does not add a live ShiftCare sync. Private server-backed enquiries retain their existing review flow.

## Mobile presentation

Public intake at `/intake` groups new videos into Living room, Bedroom, Master bedroom, Kitchen, Bathroom, Toilet, Dining room, Laundry, Study / home office, Hallway, Stairs and Garage. The generic Other rooms choice is hidden for new uploads; older videos saved under it remain readable. The returning-client booking review dialog and workspace public intake use the same room categories for file uploads; selected clips show their room before submission and retain that category in office review. Record directly in the page using the camera preview, **Start recording** and **Stop and keep video**, or choose an existing video. Recordings can be played inline and removed before submission; cancelling or leaving intake releases the camera. The browser chooses a supported MP4 or WebM recording format. Recordings stop after two minutes; the existing five-video and 100 MB limits apply. Room categories are saved with uploaded references and shown in office review. Older uncategorized videos remain readable.

Use **Install app** in the public page's top bar, or **Add to Home Screen** in its phone menu. Both public and workspace pages share the manifest and installation UI. Browsers that expose an install prompt can use it; other browsers show their manual steps, with Safari on iPhone and Chrome on Android as fallbacks. The installed app opens `/portal`, and its shell supports offline reopening.

**Continue in browser** opens the workspace without installation, including browsers with no install prompt or service-worker support. **Show install steps** reveals instructions for Android, iPhone, iPad, and desktop browsers. The desktop steps also cover Safari's Add to Dock.

On Android, the browser and Android control **Installing…**. The page cannot display download progress. The browser's `appinstalled` event can fire before the Android package is ready ([Chrome installation detection guidance](https://web.dev/learn/pwa/detection#app-installation)). The app labels browser acceptance as **Installation requested** and confirms app mode only when it runs in a standalone window.

If Brave stays on Installing without creating an icon, open the same HTTPS address in Chrome and use **⋮ → Add to Home screen → Install**. You can also choose **Continue in browser**. Android installation still needs verification on the target device.

For a presentation, open **App & alerts → Demo notifications → Turn on demo alerts → Show sample notification**. This displays a dismissible sample booking banner inside the page, with a link to the demo workspace. The preference is saved in this browser (separately for each selected employee). It works without notification permission, API requests, Redis or VAPID keys and is labelled **Presentation demo**. Turning demo alerts off removes the banner. The installed app uses the same frontend flow; alerts appear only while the app is open. The existing push backend is not used by this demo UI. Embedded recording and playback can be demonstrated on Vercel; submitting videos there still needs durable private object storage, which this presentation change does not provision.

## Code conventions

Backend routing and request handling use procedural functions. Existing domain services and repositories keep their stateful classes. Keep related behavior in cohesive modules; do not add a separate file or class for each small function. Follow DRY for shared rules: HTTP response formatting and bounded body reading live in `backend/http.ts`, and portal date labels use the shared formatter in `frontend/portal-pages.tsx`. Keep endpoint-specific validation and access policies explicit.

Use readable names and multiline formatting for complex expressions and JSX. Separate completed functions, types and blocks from the next statement with a blank line. Keep imports together at the top of the file, followed by a blank line. Run `npm run format` to format source files and `npm run format:check` to check formatting. Generated bundles and deployment output are excluded. Run `npm test` and `npm run build` before handing changes over for review.

**Daily work → Inbox tasks** turns pasted booking, cancellation and document emails into reviewed tasks with owners, deadlines and next actions. Follow-ups appear in Work queue and can be completed in their task detail, with original email and evidence retained. Relevant record changes stay in Scheduling, staff/client documents or finance. This local prototype does not connect a mailbox or send notifications. See [inbox task review](docs/inbox-tasks-review-2026-10-21/review.md).

**Team & finance → Financial checks** (`#/office/finance`) compares saved attendance, invoice, payroll and charge records for a selected service period. Findings link to their sources and retain owners, evidence and history. Corrected sources resolve on recheck; changed evidenced time explanations reopen. Verified external invoice status can be recorded for returned, overdue and due follow-up; no reminder is sent. Financial release stays in the existing systems.

The new-feature study guide is available at `docs/ocd-new-features-study.pdf` and `docs/feature-study-2026-10-21/ocd-new-features-study.pdf`, with editable source and local screenshots beside the latter. The 23 October revision adds draft manual finance, operations and training procedures, nine open decisions, and 35 transcript coverage items with timestamps, CSV rows, PDF pages and remaining staff actions. The appendices document work and do not establish new application features or approved policies. The coverage data is also available in `docs/feature-study-2026-10-21/transcript-coverage.csv`; edit `transcript-coverage.json` to maintain it. Rebuild both PDF copies and the CSV with `python3 scripts/build-feature-study.py` (requires Python Markdown, Chrome or `CHROME_PATH`, and Poppler's `pdfinfo`/`pdftotext`). The build checks section pagination and transcript references; inspect rendered pages after any rebuild and record that review in `verification.json`.

The consolidated pain point inventory is available in `docs/OCD_Pain_Points_and_Bottlenecks.pdf` and the editable `docs/OCD_Pain_Points_and_Bottlenecks.docx`. It contains 96 numbered items in ten areas, clarification questions and source references. Editable Markdown, structured content and a detailed source register are in `docs/pain-points-2026-10-23/`. Rebuild with `python3 scripts/build-pain-points.py` using the same Python Markdown, Chrome and Poppler prerequisites as the study guide; inspect the rendered PDF after rebuilding.

## Native workflow operation

Local `npm start` runs the application’s own preparation worker unless `AUTOMATION_RUN_WORKER=false`. It imports configured sources, prepares owned reviews and marks explicit deadlines; native mutations still require office approval. A persistent production server can set `AUTOMATION_RUN_WORKER=true`, run `npm run automation:worker`, or invoke the private tick endpoint from a host scheduler.

Open `/workspace/#/office/automation/shared` for server cases and `/workspace/#/live/services` for verified worker/participant service access. Live service sessions use salted account entries linked to native IDs, independently of demo personas. Configure credentials, approved mapping/scope and review periods using `.env.example` and the [implementation guide](docs/OCD_Native_Automation_Implementation.md). Outbound updates use staff handoffs through ShiftCare. PostgreSQL deployments must apply migration 003 before importing original files.
