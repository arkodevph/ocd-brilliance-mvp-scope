# OCD prototype — workflow plan and validation

**Date:** 7 October 2026  
**Design reference:** [Researched ShiftCare integration design](OCD_ShiftCare_Integration_and_Automation_Design.md) and its four Archify diagrams.  
**Scope:** Build an interactive, fictional demonstration of the researched workflow. Real ShiftCare writes, mailbox ingestion, financial release and live GPS remain gated integrations.

## Review findings and build plan

Before this revision, the presentation had most workspace screens, server-backed enquiry ownership, an office-only REST read connector, maps and local sample records. It did not demonstrate the connected automation journey. Local clicks could skip approval, remote verification, separate accounting onboarding and worker acceptance. The following plan was used to implement and verify those steps.

| Design workflows | Existing gap | Planned prototype improvement | Work that remains native/manual |
| --- | --- | --- | --- |
| W01 area/ownership | Area check exists; uncertain areas and ownership are not integrated with automation cases. | Connect enquiries to owned cases and show area/capacity exceptions. | Actual approved area/capacity decisions. |
| W02 email | Manual fictional triage only; no repeat-message protection or source trail. | Sample inbox, automatic deterministic routing, evidence and message-ID deduplication. | Mailbox authorization and real extraction/matching. |
| W03/W04 participant/employee onboarding | No employee pipeline; no required DOB/mapping or separate Xero verification. | Editable source-to-field mapping, missing-field/duplicate checks, native handoff, read-back and accounting checklist. | Native profile creation, field verification, payroll/Xero onboarding. |
| W05 agreements/files | Signing outcome can be marked without filing evidence. | Returned-file case with person/version/signature review and verified filing. | Existing signing provider and native document filing; no invented upload API. |
| W06/W07 reminders/cancellation | No reply matching; cancellation directly changes the local roster. | Native reminder/reply examples, scoped matching, reason/charge review, one-occurrence mutation and read-back. | Approved policy and exact ShiftCare UI/MCP action; group/locked cases need human treatment. |
| W08 cover | One form can bypass acceptance; only one worker persona. | Owned cover case, reviewed offer, selectable worker persona, simulated native acceptance and assignment verification. | Smart Match/Job Board, personal availability and native worker acceptance. |
| W09/W10/W11 care/finance | No consolidated Tuesday/fortnightly exceptions; notes lack goals/tasks/major-issue fields. | Exception reports based on sample visit data, private major-issue review, human checklist and existing-export handoff. | Care entry, rates/travel/funding decisions, invoice approval and payroll release. |
| W12 documents | Forces expiry dates even for non-expiring evidence. | Explicit never-expires treatment, evidence review and verified correction. | Native metadata changes and qualification approval. |
| W13 communication | Local notifications look complete without a delivery state. | Own message audit, pending/failed/delivered demo states and safe recipient updates. | Native chat history and actual delivery integrations. |
| W14 booking/ETA | Journey starts pre-seeded; no explicit consent or stale-data withdrawal. | Worker-only consent/start/stop, update freshness, stale ETA and safe participant booking map. | Real role identities, device location and production privacy/device tests. |
| All | No durable-looking job transitions or recovery examples. | Persist demo cases in the browser; expose approval, verification, reconciliation, retry and human ownership. | A production server job runner, account entitlement and endpoint contracts. |

## Implementation approach

1. Add a reusable, testable demo workflow engine. Keep its fictional ShiftCare source snapshot separate from app proposals and show roster/profile changes only after read-back.
2. Add an Automation workspace with sample inbox, case details, mapping, approval, native handoff, recovery and communication history. Connect existing requests and cover actions to it.
3. Add Bookkeeping review for the Tuesday and fortnightly workflows, with incomplete data and manual release visible.
4. Remove shortcuts in the existing screens, improve worker selection and document/ETA handling, and keep all live connectors read-only.
5. Verify state transitions, duplicate handling, missing data, concurrent changes, unknown write outcomes, cover acceptance, private data and browser navigation. Record actual results and remaining gaps below.

## Validation results

**Result:** The prototype now demonstrates all fourteen researched workflow areas, including their human checkpoints and failure paths. It provides a connected demonstration of the main administration pain points. It does **not** establish that those workflows run unattended against the client's production ShiftCare account.

### Delivered implementation

| Component | Delivered behaviour |
| --- | --- |
| [Workflow engine](../workspace/automation-engine.js) | Separate fictional native records and app proposals; source-ID deduplication; field validation and matching; approval; native handoff; read-back; accounting checks; owned exceptions; reconciliation and bounded pre-dispatch retries. No network calls. |
| [Automation workspace](../workspace/automation.js) | **Office → Automation** (`/#/office/automation`): incoming evidence, cases, editable mapping, exact proposal review, native-step simulation, accounting/manual outcomes, communication audit and pilot readiness. |
| Bookkeeping review | **Office → Bookkeeping** (`/#/office/finance`): inclusive review period, Tuesday invoice / fortnightly payroll / care exception checklists, missing-source simulation, owned cases and downloadable review evidence. No invoice export or pay run is created. |
| [Existing workspace integration](../workspace/app.js) | Intake, cancellation, cover, signed-file review and permitted profile-update actions enter owned cases. New booking confirmation requires participant agreement and native worker acceptance. Worker care entry includes tasks, goals and a restricted major-issue flag. Worker personas and **Hours & documents** are available. |
| [Booking and arrival maps](../workspace/maps.js) | Office booking map, selected Worker's map and participant's own service map. Only the assigned Worker can start the consented fictional journey; stale estimates are withdrawn. Participants receive an ETA, without the worker's origin, route or exact position. |
| Static build / offline assets | The new modules and styles are included in the Vercel build and static service-worker cache. API responses remain outside the cache. |
| Mapbox configuration | Fixed the existing gap where `.env.local` contained a public token but local/static maps received an empty configuration. The local route and build now use a shared public-token-only configuration helper; tokens are not committed. |

Cases persist in this browser. Resetting sample data retains server-backed enquiries and does not delete server records. Real enquiries remain on their existing server-backed, manually verified ShiftCare-ID handoff; they cannot enter the fictional write adapter.

### How the prototype represents the proposed architecture

The four researched diagrams remain the design reference:

- [Architecture and integration boundaries](../.archify/architecture-ocd-shiftcare-20261006-185221/ocd-shiftcare.html)
- [Participant / employee intake and documents](../.archify/architecture-ocd-shiftcare-intake-20261006-185221/ocd-shiftcare-intake.html)
- [Confirmation, cancellation and cover](../.archify/architecture-ocd-shiftcare-service-20261006-185221/ocd-shiftcare-service.html)
- [Care review, Tuesday invoicing and fortnightly payroll](../.archify/architecture-ocd-shiftcare-finance-20261006-185221/ocd-shiftcare-finance.html)

The prototype implements their decision paths using fictional data. The proposed automation layer owns requests, evidence, proposals, review tasks and its message audit. ShiftCare remains authoritative for care, roster and profile outcomes; Xero and the confirmed payroll platform retain financial responsibilities. The diagrams' proposed integration services are not made live by these UI changes.

| Data flow | Prototype implementation | Actual integration boundary |
| --- | --- | --- |
| Mail / scan / reply → automation | Eight labelled fixture sources, retained source IDs and evidence; deterministic routing. | No real mailbox ingestion or OCR. Existing server-backed public enquiries are separate. |
| ShiftCare → automation | A separate `automation.remote` sample snapshot supplies the native records used for checks. | **Office → ShiftCare** retains its authenticated, GET-only REST connector. Its live results are not mixed into fictional cases. Credential configuration and a successful read remain separate steps. |
| Automation → ShiftCare | Review the exact fields, simulate the native action, then verify the sample result. Unknown outcomes block another dispatch. | No website write connector was added. The design's native UI / supervised MCP handoff remains necessary until the specific server operations are validated. |
| ShiftCare → Xero / payroll | Separate checked reference and evidence after profile read-back; existing export/release handoff on finance cases. | No second accounting contact, invoice, export or pay run is sent. |
| Worker care → office review | Explicitly labelled native-care examples copy sample attendance, original notes, tasks, goals and flags into the sample native source. | Real workers continue their ShiftCare care workflow. This demo form is not a verified care-write integration. |
| Verified outcome → participant | Own-recipient sample outbox with pending / failed / delivered states. | No real email, SMS or push is sent by the new automation engine; it does not ingest native chat history. Existing opt-in push functionality is a separate feature. |
| Worker journey → participant | Explicit consent, assigned occurrence, last update, stop and stale handling. | The journey is simulated. Mapbox can render maps/routes when connected; it does not supply a live worker GPS feed. |

The integration capability conclusions are those recorded in the [6 October researched design](OCD_ShiftCare_Integration_and_Automation_Design.md) and [redacted capability evidence](ShiftCare_Capability_Validation_2026-10-06.json). No new upstream capability is assumed. That design's implementation inventory describes the earlier build; this document records the subsequent prototype revision.

## Workflow and client-needs coverage

These rows validate the prototype against the researched workflows, rather than treating every visible screen as a completed production automation.

| Workflow / requirement | Trigger and demonstrated outcome | Remaining native or human step / production gap |
| --- | --- | --- |
| **W01 — A02/A03: area and ownership** | Existing postcode-first enquiry flow; **Check enquiry ownership** creates owned sample review cases with area outcome and next action. Uncertain/outside areas remain follow-up tasks. | Approved postcode list, capacity and adjacent-area decisions are required. Sample area cases do not implement automatic capacity calculations. |
| **W02 — A03: email handling** | **Process received mail** routes participant/employee paperwork, an urgent invoice complaint and enquiries once by source ID. Ambiguous replies go to a person. | Authorised mailbox access, real extraction, invoice-ID correlation, response sending and confidence/matching rules remain to build. |
| **W03 — A01: participant intake** | Scan → editable fields → required DOB/consent/area check → existing-record match or sample creation → read-back → separate Xero reference → closure. | The real forms, unsupported fields and contact/participant matching must be validated. Native entry and Xero review stay human in the live system. |
| **W04 — A01: employee onboarding** | Employee evidence → mapping → sample native staff profile → verification → separate payroll onboarding check. New staff remain unapproved for work. | HR screening, qualifications, worker approval, employment classification and actual payroll setup remain native/human. |
| **W05 — A10: agreements and filing** | Existing agreement preparation remains; returned signature case requires correct person/version/signature review and native filing read-back before **Signed** appears. | Signing provider and original document filing remain native. No new-file upload API is assumed. The fixture demonstrates filing evidence, not upload of a real file. |
| **W06 — A04/A11: confirmations** | **Run three-day check**, matching a yes reply, and an ambiguous reply create review/audit tasks. Participant yes is separate from worker acceptance. | Native reminders remain. Real SMS/event threading, silence deadlines and daily scheduling are not connected; no duplicate reminder is sent. |
| **W07 — A04: cancellation** | Matched cancellation → reviewed reason, charge/code and one occurrence → sample native action → read-back → recipient delivery. Other occurrences remain unchanged. | Policy approval and actual native action are required. Group services, approved/invoiced shifts and unknown charges stop for office/bookkeeper review. Autonomous cancellation is not enabled. |
| **W08 — A05/A06: change and cover** | Existing service-change/absence requests become cases. Cover requires availability/eligibility review, native offer read-back, selected Worker's acceptance, office contact review and assignment verification. New bookings have separate participant and worker checks. | Native Smart Match/Job Board, actual personal availability and approved rescheduling remain necessary. No-cover/refusal cases require office contact; deadlines and escalation are not scheduled services. |
| **W09 — A08: visit exceptions** | Worker records sample actual time, notes, tasks/goals and a major-issue flag. Care/finance checks find missing or invalid attendance, missing outcomes and duration discrepancies. Major flags reach office review. | Real care reads, confidentiality rules and urgent response procedures remain native. No AI clinical interpretation or replacement incident process is claimed. |
| **W10 — A09: Tuesday invoices** | Agreed-period review produces owned duration/note/funding/recipient checks. Interrupted reads visibly mark the report incomplete. Updated native sample evidence refreshes the same case. | Recipient, funding, travel, rates and approval require bookkeeper checks; existing Excel/Xero export remains. Those checks are not automated rate/funding calculations. |
| **W11 — A09/P02: fortnightly payroll** | Pay-period exception checklist and own recorded worker hours. Incomplete attendance is excluded from worker totals. | Actual payroll vendor, pay items, kilometres, travel, award/rate/rounding rules, contractor treatment and release remain to validate and perform natively. No pay amount is calculated or released. |
| **W12 — A07: documents** | **Check documents** creates evidence cases. Verified expiry or explicit never-expires treatment clears the false-expiry example only after read-back. | Original evidence, native metadata changes, renewal contact and qualification approval remain human. Expiry scheduling and real renewal delivery are not connected. |
| **W13 — A11: communications** | Verified cancellation/cover/profile outcomes create recipient-scoped delivery records; failure/retry is separate from the native action. Audit persists after reload. | Native chat/history is not imported. Real channel integration, retention rules, urgent fallback contact and server identity permissions are required. |
| **W14 — A12/L01: booking maps and arrival** | Office, existing Worker and participant map views; worker consent/start/stop; safe own-service ETA; stale or changed-assignment estimates withdrawn. | Live role-scoped booking projection, device location, server feed, privacy approval and actual-phone/background tests remain. A scheduled start never starts a trip. |

### Remaining requirements in the 27-item register

| Register items | Coverage / scope decision |
| --- | --- |
| **P01 — participant portal** | Own sample bookings, requests, preferred-worker/profile preferences, documents and arrival views are represented. Permitted contact updates now enter review cases. Secure individual login, native message history and verified shared-file delivery remain missing. |
| **P02 — worker portal** | Persona-specific assignments, availability, native-offer response example, attendance/notes, document follow-up, recorded hours and next-visit map are represented. Actual pay totals and secure worker identity remain missing. |
| **P03 — office workspace** | Existing overview, calendar, people, service/worker filters and records now connect to Automation and Bookkeeping. Shared server job state and live operational projection remain missing. |
| **T01/T02 — newsletters / incentives** | Team proposals, not confirmed first-phase requirements. No promotional campaign or incentive automation was added. |
| **T03 — broad AI quality checks** | Deterministic missing-field/time/outcome checks are demonstrated. General AI financial validation is not implemented or represented as authoritative. |
| **T04 — fewer discovery calls** | Existing public area/intake and call-booking presentation remain available. No automatic decision to replace or skip a necessary call is made. |
| **T05 — automatic matching** | Reviewable eligible sample candidates and a worker-acceptance workflow are present. Autonomous ranking/reassignment and complete real availability checks remain gated. |
| **T06 — live integration** | Existing office REST reads remain separate from assistant MCP authentication. Website ShiftCare writes, Xero writes and unattended synchronization are still missing. |
| **B01–B04 — HR, subcontractors, marketing, portability** | Broader business directions recorded in the requirements. They do not establish approved recruitment, contract, marketing or migration modules; these remain scope decisions. |
| **B05 — owner workload / reliability** | The demo makes ownership, repeated checks and exceptions reviewable. A reduction in workload, cost or missed services has not been measured; the pilot must establish those outcomes. |

Together with A01–A12 and L01 in the workflow table, this accounts for all 27 register items. It is a coverage review of the documented proposal, not confirmation that discovery is complete or that the client has approved every feature.

## Demonstration walkthrough

Start with `npm start`, open `http://127.0.0.1:8001/`, and sign in with the existing local office account. Use **Explore as** for sample Worker/Client views. Those selectors demonstrate personas and do not constitute real user access control.

1. **Office → Automation → Incoming sources:** review the fictional evidence, then **Process received mail**. Repeat it to see the same source IDs skipped. Open cases show their owner, next action and source.
2. **Ava's participant intake:** compare fields with the original source. Clear DOB to demonstrate missing information, restore the source value, and review consent/area/matching. Approve; use **Try an interruption → Lost response after the action**. The app remains unchanged until reconciliation. Complete the separate Xero check before closing.
3. **Employee and returned agreement:** review Noah's staff mapping and separate payroll check; staff screening remains pending. Review the returned agreement's person/version/signature, simulate native filing and read it back before the document status changes.
4. **Cancellation:** review the sample reason, occurrence and billing treatment. After the native step, verify the outcome; try a failed participant delivery and retry it. A notification retry does not repeat the cancellation.
5. **Cover for BKG-502:** choose **Elena Cruz**, check real-availability evidence for the scenario, post and verify the sample native offer. Switch to **Worker → Elena**, accept the offer, return to the office case, review participant contact, perform and verify assignment. The earlier worker stays assigned until verification. Decline/no-cover outcomes require a person.
6. **Care, documents and bookkeeping:** use **Worker → Sam Walker → BKG-498** to record the sample original note, tasks/goals and a major issue. In **Bookkeeping**, prepare a Tuesday review with missing source data, then a fortnightly review. Open an owned exception and record a checked native resolution. Use **Check documents** to review the induction acknowledgement that truly has no expiry.
7. **Arrival:** on **Worker → Elena → Visit map → BKG-501**, explicitly consent and start the fictional journey. Switch to **Client → Olivia → Arrival status** to see the own-booking estimate. Return to the Worker to try a stale update or stop sharing; the participant ETA becomes unavailable or withdrawn. Actual map rendering requires the configured Mapbox connection.

**Pilot readiness** lists all fourteen workflows and the missing live integrations. **More office sections → Restore sample data** restarts the fictional scenario while retaining server-backed enquiries.

## Verification evidence

| Check | Result and practical limit |
| --- | --- |
| `npm test` | **35 tests passed**, including **22** automation/arrival tests. Existing office auth, public intake, push and REST-fixture tests also passed. These do not contact ShiftCare. |
| `npm run build` / `git diff --check` | Both passed. The build includes the engine, Automation UI/styles, maps and updated static service-worker assets. |
| `npm run verify:prototype` | **11 browser scenarios passed**, zero uncaught browser exceptions, eight desktop/mobile captures. Uses an isolated temporary server and test credentials. |
| Separate live Mapbox browser check | **3 rendering scenarios passed**, zero uncaught browser exceptions, three screenshots. Actual Mapbox Standard loaded in Office, Worker and Client views using the configured public token and fictional coordinates. The style read returned HTTP 200. |
| Workflow failure checks | Missing/invalid DOB; duplicate source/person; separate accounting; group/financial locks; changed native record; changed worker eligibility/roster/proposal; lost response; failed read-back; bounded pre-dispatch retry; worker acceptance; invalid attendance; message retry; stale/reassigned ETA. |
| Browser journey checks | Intake → reconciliation → accounting, employee → payroll check, returned file, cancellation → failed/delivered update, Office → Worker → Office cover, document cleanup, restricted care → finance, consented Worker → Client ETA, reload persistence and responsive layouts. |
| Map verification | External Mapbox calls were blocked in the eleven-scenario acceptance run to test fallback, privacy, consent and arrival state. A separate real-network WebGL check verified 3D rendering in all three workspaces, participant booking scope and no participant Directions request. Neither run certifies device GPS, production traffic/ETA accuracy or background-phone behaviour. |
| Visual evidence | [Browser receipt and capture hashes](prototype-review-2026-10-07/browser-review.json); [Automation](prototype-review-2026-10-07/automation-desktop.png), [mapping](prototype-review-2026-10-07/intake-mapping-desktop.png), [recovery](prototype-review-2026-10-07/unknown-outcome-desktop.png), [Bookkeeping](prototype-review-2026-10-07/bookkeeping-desktop.png), [participant map](prototype-review-2026-10-07/participant-map-mobile.png), [stale ETA](prototype-review-2026-10-07/stale-arrival-mobile.png), [mobile workspace](prototype-review-2026-10-07/automation-mobile.png), [completed case](prototype-review-2026-10-07/completed-case-mobile.png). Inspected captures show no horizontal overflow at 1440×1000 and 390×900; this is not a full device/accessibility certification. |
| Live-map visual evidence | [Mapbox browser receipt](prototype-mapbox-review-2026-10-07/browser-review.json); [Office 3D](prototype-mapbox-review-2026-10-07/office-mapbox-3d.png), [Worker 3D](prototype-mapbox-review-2026-10-07/worker-mapbox-3d.png), [Client 3D mobile](prototype-mapbox-review-2026-10-07/client-mapbox-3d.png). Inspected service markers, tilted map rendering, own booking panels and the participant view without worker-origin/route details. |

The build and visual review receipts are finalized alongside these browser artifacts. No real ShiftCare records, external messages, accounting contacts, invoices or pay runs were changed for this work. This local revision has not been deployed by this task.

## Gaps before a production pilot

1. **Client process and policy:** obtain the actual participant/employee forms and scans; confirm required fields, duplicate matching, approved areas/capacity, account time zone, cancellation codes/charges/series exceptions, financial recipients/rates/travel and the payroll vendor. The fixture values and Perth scenario are not client configuration.
2. **Supported machine interfaces:** verify REST entitlement and server credentials, then validate every chosen read/write and its fields in the authorised account. Assistant MCP OAuth is not a website credential. Preserve native UI / supervised MCP handoffs for unsupported steps. Public webhooks, general file upload, automated worker acceptance, native chat integration and a continuous ShiftCare GPS feed remain unverified.
3. **Real ingestion and jobs:** build authorised mailbox/extraction, original-evidence storage, server job persistence, atomic deduplication/claiming, scheduling, reconciliation, monitored deadlines/backoff and human escalation. Browser persistence is insufficient for unattended or shared-office work. Fixture known IDs do not prove upstream idempotency support.
4. **Complete native evidence:** validate paginated attendance, notes/tasks/goals, worker screening/leave/availability, file categories/visibility and actual financial records. Current candidate checks exercise same-day sample occurrences; complete overnight/cross-day conflicts and partial-source behaviour require the native integration pilot. Funding/travel/recipient checklist prompts do not prove those values were automatically checked.
5. **Secure identities and data:** add real worker, participant and representative identity linking, server-enforced record permissions, scoped APIs and appropriate care/document/message storage and retention. A role/persona selector behind the office login is only a demonstration. Major-issue examples are restricted by the demo view, not production access control.
6. **Delivery and journeys:** confirm use of native reminders, chat/Family Portal, Inbox Signals, referral and matching features before adding replacement channels. Implement real recipient delivery/fallback contact and consented device location only where approved, including stale/offline/background-device handling. Mapbox rendering passed the separate browser check; real journey routing/accuracy and phone/background behaviour still need device validation.
7. **Finance and acceptance:** keep invoice approval/export and payroll release native; test real checked references, no duplicate contact/export, recipient/amount discrepancies and contractor treatment. Run a supervised pilot and measure manual re-keying, unmatched replies, oldest cases, failed delivery, missed cover and bookkeeper exceptions against the current process before enabling any unattended action.

**Review conclusion:** The previously disconnected screens now demonstrate the client's paperwork, response, cover, document and bookkeeping journeys with explicit approvals, verification and recovery. The remaining manual steps are visible and owned. Production automation still depends on those integration and process gates; the prototype does not conceal them.
