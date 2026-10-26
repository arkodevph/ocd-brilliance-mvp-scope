# Architecture and Data Design

This is a proposed design for the existing OCD application. Final choices depend on the discovery gates in the [main plan](../OCD_Custom_System_Implementation_Plan.md) and [decision register](discovery-and-decisions.md). It specifies responsibilities and invariants without installing packages, creating migrations or claiming live vendor capability.

## Components and trust boundaries

| Boundary | Trusted responsibility | Untrusted or external input |
|---|---|---|
| Browser to API | Authenticated server session, CSRF protection, typed commands and scoped projection. | Form values, persona selections, IDs, role flags, HTML and uploaded bytes. |
| Identity provider to API | Accepted issuer/tenant, token validation, MFA policy and local permission membership. | Callback parameters, expired/replayed tokens and unapproved subjects. |
| Sources to ingestion | Authorized mailbox/form/source scope, immutable version/provenance and central triage owner. | Email sender/text, quoted references, attachment content, claimed urgency and requested privileged fields. |
| Domain to DB/jobs | Atomic local transitions, constraints, scoped transaction and outbox. | Repeated jobs, expired leases, stale API revisions and incompatible old job payloads. |
| Application to ShiftCare | Server credential selected by approved connector binding; narrowly allowed operation and fields. | Vendor schema/error changes, native users/integrations editing concurrently and unknown outcomes. |
| Application to other vendors | Approved Graph, file, routing or later ledger adapter and purpose-limited data. | Redirects/URLs, provider receipts, partial pages and claims of delivery/identity. |
| Operators to production | Least-privilege deployment/recovery roles, audited changes and explicit environment identity. | Untrusted build artifacts, accidental scope selection and compromised credentials. |

Keep modules in the present codebase. Likely extension locations are `backend/automation`, `backend/shiftcare`, database migrations, current frontend/shared-workflow views and the worker entry point. These are logical boundaries, not instructions to create a generic workflow engine or multiple services. API and worker can share domain code and deploy independently from the same tested artifact.

### Component contracts

- **API/BFF:** authenticates; authorizes object/field/relationship scope; validates typed payloads; records domain commands and returns case/action status. It never acts as an arbitrary proxy to a client-provided vendor URL.
- **Workflow domain:** typed W01–W14 case types and selected opportunity subtypes; explicit proposal/evidence requirements; exact approvals; child outcomes; deterministic readiness/completion. No source-supplied code or conditions are executed.
- **Source adapter:** authorized pages/messages/files to immutable source versions and owned triage cases. It advances a cursor only with durable capture and signals incomplete sources.
- **Native adapter:** allowlisted request/response mapping, preflight, actual operation and independent outcome read. Its contract declares native account scope, correlation/idempotency support and uncertain-result treatment.
- **Queue/worker:** leases/fences attempts, respects per-account/operation budgets and current approvals, and records outcomes. It cannot grant itself a business approval or silently switch a manual method to an API write.
- **Evidence service:** quarantined/private objects, integrity hashes, allowed access, scanning/extraction state and retention. Only approved worker identities read required original bytes.
- **Scheduler/outbox:** persists due slots/events and delivers them at least once to idempotent consumers. Business state is independent of queue history.
- **Read projections:** office views and accepted own-service portal/maps; minimum fields and freshness metadata. Native care entry and acceptance stay in ShiftCare.
- **Operations:** protected audit, redacted metrics, stop/hold controls, manual reconciliation and documented native handoffs. Support does not require raw care data in alerts.

An accepted vendor operation is not itself an enabled business workflow. The server release manifest binds accepted case/opportunity types to connector/account, operation/field whitelist, policy/guard versions and tested method. Every new, legacy and worker path checks this manifest before mutation or sensitive feature exposure. A held AUTO-15 cancellation or optional AUTO-35 arrival path stays held even if a generic cancel or location component exists in the prototype.

## Proposed database structure

Use PostgreSQL business tables with native UUID keys, explicit timestamps and optimistic revisions. Treat JSON as a versioned typed evidence/payload field, not the entire database or unrestricted native request. Do not copy full native care/ledger tables.

| Record group | Essential fields and constraints | Purpose |
|---|---|---|
| organizations, branches | Internal OCD organization; branch identity/timezone/status; approved configuration version. | Internal security/operational boundaries; not a SaaS tenancy product. |
| subjects, memberships, permission grants | `(issuer, subject)` unique; approved role/capability scope; validity/revocation version; sensitive field grants. | Stable actors and least privilege rather than environment email/password lists. |
| sessions | Hashed opaque token ID, subject, created/authenticated/idle/absolute expiry, revoked/grant version. | Revocable sessions; no browser credential payload as authority. |
| connector_accounts, branch_connector_bindings | Provider, external account/tenant, region, secret reference, approved operations; explicit branch/organization binding. | Correct native account selection; secrets are not stored in command JSON. |
| person_references, entity_links | Minimal internal reference; `(organization, provider, connector, entity kind, external ID)` unique; verification/source link. | Native identity links; no automatic global merge by name/email. |
| source_items, source_versions | Connector/source key, immutable external ID/version/content hash, original references, scope/owner/due state; unique scoped source version. | Deduplicated provenance and atomic source checkpoints. |
| cases, case_sources | Organization, branch/scope type, workflow/opportunity type, owner, state/revision, due time; source-version links. | Owned work and explicit source dependencies. |
| proposals, policy_versions | Canonical exact fields, source IDs, relevant native snapshots, policy/grant version, validation results and digest. | Reproducible readiness and approval boundaries. |
| approvals, approval revocations | Proposal digest, actor, verified authentication context/time, scope/permission version, reason; append-only original and revocation history. | Preserve what was approved while allowing invalidation. |
| actions, action_dependencies | Stable intent/action key, operation/target/account, exact payload version/hash, approval ID, dispatch status; dependency DAG. | Individual external effects and prerequisite outcomes. |
| attempts, receipts | Action/attempt sequence, lease/fence token, dispatch marker, correlation/reference, outcome; independent observations and API/manual method. | Recovery without mistaking dispatch for success. |
| case_required_outcomes | Case, required action/handoff/receipt, completion policy and checked evidence. | Parent closure only when all required outcomes pass. |
| files, file associations | Storage backend/key/version, hash/MIME/size, case/source relation, scan/extraction state, classification, retention/hold. | Safe evidence integrity and authorized access for private PostgreSQL bytes or an accepted private object store. |
| communication records, notification records | Approved recipient/context, channel/method, action/handoff ID, dispatch/failure/response/acknowledgement evidence. | Tracked existing-channel follow-through, not a new chat product. |
| outbox_events, consumer receipts | Aggregate/version/event type/reference, durable event ID; unique consumer/event. | Atomic local intent plus replay-safe event delivery. |
| schedules, schedule_slots | Scope, policy/period/timezone/cadence/anchor, enabled version; unique version/due-slot key. | Bounded catch-up and no duplicate periods. |
| connector_cursors | Connector/folder/version, encrypted opaque cursor, last committed source/read time and lease. | Durable Graph/native polling progress. |
| audit_events | Server actor/service, scope, action, proposal/source/policy refs, timestamps and restricted evidence links. | Protected history independent of execution pruning. |
| job-library tables | Queue library schema under its approved bootstrap/runtime permission model. | Transport/scheduling attempts, not business audit. |

### Scope invariants

Every domain row carries organization scope. Ordinary service cases require an approved branch. Only the explicit unassigned-enquiry/triage type can have a null branch; it also requires a restricted central intake scope, owner and deadline. The DB check and authorization policy must reject branch-null native actions. Central triage access is not implicit access to every HR/care case.

Use composite foreign keys to prevent a case from linking another organization's branch, source, file, approval or connector. Validate branch-to-native mappings at the service layer and account interface. Row-level security is defense in depth with non-owner runtime roles; table owners, privileged roles and all connection pooling must be accounted for. Set transaction-local scope and test it does not leak to the next borrower.

Native records do not always expose an adequate branch/team filter. Where branch membership cannot be proved from accepted native attributes or explicit mappings, restrict lookup to an appropriately authorized account reviewer and return only permitted matching context. Never disclose another branch's names/DOB/contact data merely because the shared vendor key can read it.

Case status is workflow coordination, not native client activation. Approved client_status changes are separately reviewed under AUTO-07. Approved service hours retain their authoritative agreement/funding/native source rather than creating an independently editable duplicate agreement.

### Integrity and indexes

Require unique keys for scoped source versions, action intent, consumer/event and schedule slots. Index open cases by scope/state/owner/due time; actions by target/status; jobs by queue/availability; source links by external ID; and audit/receipts by case/action/time. Prove unknown-source and empty-result semantics in tests.

Keep currency as fixed-precision decimal with explicit currency, distance in a canonical decimal unit and duration as explicit integer minutes/seconds. Preserve original units and reviewed conversions. No floating-point wage/billing-rate engine is proposed. Store UTC event/dispatch instants plus the named timezone and calendar period used for business rules; do not infer a fortnight from the current week number.

Use forward-compatible schema and payload versions. Build additive migrations and bounded backfills, then change readers/writers and remove old schema only after a separately accepted cleanup. The current migration runner wraps pending SQL in a transaction; do not insert nontransactional online-index statements without an accepted migration strategy.

Evidence storage is an interface, not a requirement to buy another service. The current private PostgreSQL byte store can remain initially if approved size/volume, access, backup and restore tests pass. A later private-object backend must preserve hashes, immutable version references, permissions, quarantine, retention and consistent recovery. Record the backend choice under Q11/Q16; do not mix stores implicitly or claim every file is moved by a configuration change.

## Proposed application API

The current query-action endpoint can remain a compatibility adapter while typed versioned routes are introduced. These routes are proposed contracts, not implemented endpoints.

| Contract | Required authorization and behavior |
|---|---|
| `POST /api/v1/enquiries` | Public validated intake only; abuse limits, source key, required data minimization; cannot assign roles/native IDs or activate a client. |
| `GET /api/v1/cases` and `/cases/{id}` | Scoped rows and field projection; paginated metadata; no raw secret/native payload. |
| `POST /api/v1/cases/{id}/revisions` | Allowed preparer, expected revision, evidence links and typed fields; invalidates stale proposals/approvals. |
| `POST /api/v1/cases/{id}/proposals` | Typed supported case preparation; source completeness and scope validated. |
| `POST /api/v1/cases/{id}/approvals` | Authorized reviewer, exact proposal hash and accepted auth freshness. Actor and scope come from the server. |
| `POST /api/v1/actions/{id}/dispatch` | Explicit enqueue intent for a currently approved action; stable idempotency key and transactional outbox. Approval alone does not silently change the current two-step behavior. |
| `POST /api/v1/actions/{id}/reconcile` | Appropriate recovery role, observed native result/reference and append-only evidence; no arbitrary resend or privileged field override. |
| `GET /api/v1/files/{id}` | Case/source/field permissions, private bytes or short-lived authorized download; safe disposition and no API caching. |
| `GET /api/v1/native-context` | Allowed resource/query/scope only; minimized fields; never arbitrary URL/path/body forwarding. |
| `GET /api/v1/service/bookings` | Accepted worker/client/representative identity mapping and current relationship; no persona-selector authority. |
| Internal ingest/tick contracts | Separate scoped service identity, authenticated origin/scope and replay protection; cannot supply approval authority. |

Use strict validation with bounded request sizes, safe error classes, request IDs, pagination and version conflict responses. A queued response means queued; a remote 202/dispatch receipt is not verified business completion. Staff/native manual evidence is labelled distinctly from independent API read-back.

If future provider webhooks are accepted, verify their documented signature/identity/time/replay contract before storing an event. No general ShiftCare outgoing webhook is assumed. Mailbox delta and bounded native polling remain sufficient for the planned source model.

## State machine and event handling

Suggested case states: open, blocked, awaiting_review, approved, in_progress, awaiting_required_outcomes, reconciliation_required, complete and rejected. Suggested action states distinguish planned/approved/queued/preflight/dispatched/awaiting_verification/verified/blocked/reconciliation_required. A rejected or cancelled-before-dispatch intent must never run later through queue retry.

1. Commit the immutable source version, owned case change and outbox event together. Same ID/version with changed content is a conflict to investigate, not an overwritten original.
2. Prepare outside DB locks using complete permitted evidence. Save a canonical proposal and the relevant native fields/version when available.
3. Record exact reviewer approval and current permission/authentication context. Changed source/policy/fields or revoked authority invalidates pending dispatch.
4. Explicit dispatch intent commits the action and outbox. The relay may repeat; consumers deduplicate the stable event/action identity.
5. A worker claims/fences the attempt. It rechecks action status, dependency completion, current case/operation release manifest, scope, approval and native conditions before sending.
6. Persist dispatch before the external call. Never hold a database transaction open during vendor I/O. A second worker cannot act merely because the first lease expired.
7. Classify definite rejection separately from uncertainty. Retry safe reads within a bounded budget. An uncertain write, including an ambiguous server failure, goes to reconciliation before another mutation.
8. Verify the actual native record and required fields independently. Use native correlation/idempotency only where documented and accepted; do not hijack a business reference field to invent it.
9. Keep verification/reconciliation available to an authorized recovery role even if the original approver was disabled after dispatch. Offboarding must prevent new effects without hiding a remote effect already in progress.
10. Close a parent only after every mandatory action, accounting/payroll checkpoint and communication outcome has accepted evidence.

Reject cyclic action dependencies and cross-scope child links. Check parent closure against the current required-outcome versions in the same local transaction, so a stale UI or worker cannot close a case while another step changes. A later authoritative correction can reopen review or create a linked correction case; preserve historical receipts and never replay a completed native mutation merely to refresh a view.

Job-library choice must demonstrate either transaction-aware enqueue or the durable outbox relay alternative. Bootstrap/migration permissions are separated from worker runtime. Internal at-least-once delivery is expected; no broker implies globally exactly-once native effects.

### Cancellation sequence

The reviewed case identifies the exact occurrence, native state/locks, actual travel, cause/notice/charge decision and required participant/worker updates. If necessary, action A corrects travel/mileage and verifies it; action B cancels through the accepted native method and verifies it; action C records the required actual communication. Each has its own receipt and failure state.

If A succeeds and B fails, keep the occurrence and case visibly unresolved; a correction may be needed in ShiftCare. If B succeeds and its response is lost, reconcile rather than repeat. If C fails, preserve the native success and keep communication pending. Do not automatically reverse A or B against changed native state.

## Notifications and read freshness

Use the application task feed for internal ownership/deadline events and existing native reminders/communication for routine participant/worker updates. External notification channels require Q17 approval and accepted delivery behavior. Notifications carry minimum case references, and viewing the linked case still requires current permissions.

Store dispatch acceptance, delivery evidence, failure, response and required acknowledgement separately. Do not label a created native action item or Graph send response as delivered. Match real reminder notifications using accepted mailbox context and native occurrence evidence; quoted shift IDs and sender text are not sufficient identity proof.

Reads record scope, period, pagination completion, collection time and relevant provider source version. Unreadable, stale, partial, empty and complete results are distinct. Bound source backfills and OCR; dedicate capacity to urgent work and honor per-account quotas. A workflow cannot silently turn a failed page into a clean report.

## Data privacy and inherited interfaces

The initial service owns only necessary source/evidence/coordination data. Configure accepted retention and holds, track object versions and support scoped access/export/deletion. Backup retention and key retention must align with the approved schedule; active legal holds block deletion.

Preserve authorized Office/Worker/Client Mapbox views, with only the bookings and fields permitted for each identity. A booking map is distinct from live worker location. Raw worker home coordinates and personal contact details are excluded from participant responses, route payloads and logs. No offline cache or browser-local demo selector establishes production identity.

Discussed portal preferences, messaging, documents, pay views and profile updates require explicit acceptance of their live slices and native capability. Preserve supported requests as review cases, keep native care/time/acceptance entry, and disable unaccepted live views rather than exposing fictional data as current. Optional W14 ETA requires separate device/consent/freshness trials; no continuous background location guarantee is made.
