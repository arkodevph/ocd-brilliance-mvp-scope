# Phased Implementation Roadmap

This is the task backlog for the [main plan](../OCD_Custom_System_Implementation_Plan.md). All implementation is future work. Owner roles must be assigned to actual people before execution. Dependencies and decision gates prevail over the suggested phase order.

**Inventory:** 83 tasks. The 35 AUTO entries retain the original opportunity numbers; the ten later entries are disposition reviews, not authorization to implement them.

Each task links to the [designed test catalog](test-catalog.csv) and [open decision register](discovery-and-decisions.md). A referenced test is a future validation method, not a pass.

## P0 Requirements and discovery

### T-D01 Revalidate source inventory and observed work

**Owner:** OCD operations owner + analyst. **Status:** Planned.

**Dependencies:** None; source review starts here..

**Deliverable:** Source-backed walkthroughs of 27 requirements, 96 pain points, 35 opportunities, transcript work groups and current native routines.

**Acceptance:** Operations and bookkeeper classify each as current, changed, obsolete, process remedy or conditional; preserve source status and gaps.

**Validation:** TEST-DISC.

**Open decisions:** No additional task-specific question; common release gates still apply..

### T-D02 Validate account interfaces and native feature fit

**Owner:** Integration lead. **Status:** Planned.

**Dependencies:** T-D01.

**Deliverable:** Per-operation account/region/entitlement matrix, native feature trial, approved test-record catalogue and exact request/response contracts.

**Acceptance:** Every proposed operation has a supported interface or owned manual fallback; API documentation and successful account trials remain distinct.

**Validation:** TEST-CONTRACT.

**Open decisions:** Q01, Q02, Q12, Q18, Q24, Q28.

### T-D03 Resolve workflow rules and ambiguous transcript fragments

**Owner:** OCD operations owner + bookkeeper + HR. **Status:** Planned.

**Dependencies:** T-D01.

**Deliverable:** Versioned fields, periods, units, cancellation/travel treatment, mappings and documented unknown fragments.

**Acceptance:** No garbled figure, undefined date, certificate, contract or report fragment becomes an enabled rule without owner evidence.

**Validation:** TEST-DISC.

**Open decisions:** Q03, Q04, Q05, Q06, Q07, Q13, Q18, Q19, Q20, Q21, Q22, Q23, Q24, Q25, Q31, Q33.

### T-D04 Agree access and privacy boundaries

**Owner:** OCD privacy owner + security lead. **Status:** Planned.

**Dependencies:** T-D01.

**Deliverable:** Data classification, role/branch/relationship/field matrix, retention and external service review.

**Acceptance:** Confidential care/HR/finance, worker contact/home location and representative access have explicit allow/deny cases; jurisdiction obligations receive qualified review.

**Validation:** TEST-DISC, TEST-AUTHZ, TEST-PRIV.

**Open decisions:** Q08, Q10, Q14, Q15, Q17, Q27, Q35.

### T-D05 Measure workload and agree operating targets

**Owner:** OCD owner + operations lead. **Status:** Planned.

**Dependencies:** T-D01.

**Deliverable:** Measured volumes, staff handling baseline, peak profile, cost envelope, response coverage and proposed recovery targets.

**Acceptance:** Owners approve workload, performance/availability targets, RPO/RTO, support responsibility and budget before capacity/price commitments.

**Validation:** TEST-DISC, TEST-LOAD.

**Open decisions:** Q09, Q11, Q12, Q16, Q29, Q30, Q34.

### T-D06 Confirm inherited views and scope dispositions

**Owner:** OCD product owner. **Status:** Planned.

**Dependencies:** T-D01, T-D04.

**Deliverable:** Core20/gated5/later10 scope, all portal proposals and retained approved Mapbox views; process-only items remain assigned.

**Acceptance:** L01 maps/privacy are retained; discussed P01/P02 features are not assumed approved; optional ETA and new products remain explicitly gated.

**Validation:** TEST-DISC, TEST-MAPS.

**Open decisions:** Q27, Q36.

### T-GOV01 Record deferred and native scope decisions

**Owner:** OCD product owner. **Status:** Planned.

**Dependencies:** T-D01, T-D03.

**Deliverable:** Named native/manual/later dispositions for all 10 deferred opportunities and unapproved T/B proposals.

**Acceptance:** No source requirement disappears and no later item silently becomes a promised automatic workflow.

**Validation:** TEST-DISC, TEST-REVIEW.

**Open decisions:** Q26, Q27, Q36.

## P1 Architecture and secure foundation

### T-A01 Approve architecture decisions and integration ownership

**Owner:** Technical lead. **Status:** Planned.

**Dependencies:** T-D02, T-D03, T-D04, T-D05, T-D06.

**Deliverable:** Modular application, authority boundaries, process topology and architecture decision records with open alternatives.

**Acceptance:** Architecture is conditional where decisions remain open; custom domain owns execution and no external workflow platform is required.

**Validation:** TEST-REVIEW.

**Open decisions:** Q08, Q09, Q10, Q15, Q16, Q27.

### T-A02 Design database and versioned command contracts

**Owner:** Backend lead. **Status:** Planned.

**Dependencies:** T-A01.

**Deliverable:** Scoped schema, indexes, composite constraints, state transitions, API schemas and compatibility policy.

**Acceptance:** Cases, source versions, immutable approvals, actions, attempts, receipts and mandatory dependencies are distinct; command field whitelists reject arbitrary native writes.

**Validation:** TEST-INPUT, TEST-AGG, TEST-REPLAY.

**Open decisions:** No additional task-specific question; common release gates still apply..

### T-A03 Complete threat model and ASVS applicability

**Owner:** Security reviewer. **Status:** Planned.

**Dependencies:** T-A01.

**Deliverable:** Trust-boundary review, attack/abuse cases and disposition of the pinned ASVS L1/L2 controls plus selected L3 checks.

**Acceptance:** Each control has applicability/rationale, implementation owner and evidence criteria; unresolved critical threat paths block sensitive data activation.

**Validation:** TEST-REVIEW.

**Open decisions:** Q35.

### T-A04 Specify source and vendor adapter contracts

**Owner:** Integration lead. **Status:** Planned.

**Dependencies:** T-A01, T-D02.

**Deliverable:** Typed field sets, pagination types, canonical timestamps, source completeness, correlation and error/retry classification.

**Acceptance:** No assumed general webhook, SMS API, payroll endpoint or native compare-and-swap; unsupported steps have named checked handoffs.

**Validation:** TEST-CONTRACT, TEST-COMPLETE.

**Open decisions:** Q01, Q12, Q17, Q26, Q28, Q31.

### T-SEC01 Implement production identity and revocable sessions

**Owner:** Security engineer. **Status:** Planned.

**Dependencies:** T-A03, T-D04.

**Deliverable:** Approved staff OIDC/MFA integration and server sessions, recovery/offboarding and service identities; remove production env-password authentication.

**Acceptance:** Issuer/audience/state/nonce/PKCE, session rotation, revocation, idle/absolute limits and fresh authentication rules pass; portal identity is separately approved.

**Validation:** TEST-ID, TEST-AUTHZ.

**Open decisions:** Q08, Q14, Q27, Q33.

### T-SEC02 Enforce object field and branch authorization

**Owner:** Backend security engineer. **Status:** Planned.

**Dependencies:** T-SEC01, T-A02.

**Deliverable:** Deny-by-default capabilities, scoped memberships, relationship policies and database row policies.

**Acceptance:** Every query, mutation, export, file and job resolves scope server-side; pooled DB connections cannot inherit another request scope; service jobs cannot bypass case approval.

**Validation:** TEST-AUTHZ, TEST-MAPS.

**Open decisions:** Q10, Q14, Q27.

### T-SEC03 Harden API browser and command boundaries

**Owner:** Backend + frontend engineers. **Status:** Planned.

**Dependencies:** T-SEC02, T-A03.

**Deliverable:** Schema validation, CSRF tokens, trusted origin/proxy handling, CORS, secure cookies, CSP and field whitelists.

**Acceptance:** Cross-site mutation, spoofed proxy headers, unknown fields/roles, unsafe rendering, parameter injection and sensitive response caching fail securely.

**Validation:** TEST-WEB, TEST-INPUT, TEST-XSS.

**Open decisions:** No additional task-specific question; common release gates still apply..

### T-SEC04 Protect uploads OCR and remote downloads

**Owner:** Security + integration engineers. **Status:** Planned.

**Dependencies:** T-SEC02, T-A02.

**Deliverable:** Private quarantined evidence, allowlisted formats, malware scanning, isolated bounded OCR and destination-restricted download validation.

**Acceptance:** Malicious/oversized files, HTML/SVG execution, archive bombs, expired links, SSRF/private addresses and unsafe redirects cannot reach native writes or privileged networks.

**Validation:** TEST-FILE, TEST-SSRF, TEST-PRIV.

**Open decisions:** Q15, Q18.

### T-SEC05 Implement audit privacy and retention controls

**Owner:** Security + data engineers. **Status:** Planned.

**Dependencies:** T-SEC02, T-A02.

**Deliverable:** Server-derived actors, protected audit events, redacted telemetry, retention/hold/delete/export workflows and tamper-evidence policy.

**Acceptance:** PII/tokens do not leak to logs; app roles cannot edit approvals/audit; retention respects holds and encrypted backup expiry; DB-admin tampering remains documented residual risk.

**Validation:** TEST-AUDIT, TEST-SECRETS, TEST-PRIV.

**Open decisions:** Q14, Q15, Q35.

### T-SEC06 Isolate credentials keys and encrypted transport

**Owner:** Platform + security engineers. **Status:** Planned.

**Dependencies:** T-A03.

**Deliverable:** Environment-separated secret storage, runtime/DB roles, TLS verification, encryption keys and rotation/revocation procedures.

**Acceptance:** No connector secret reaches bundles/logs; runtime cannot migrate/administer the DB; invalid TLS and absent production storage fail closed.

**Validation:** TEST-SECRETS, TEST-DEPLOY.

**Open decisions:** Q01, Q08, Q15, Q16.

### T-SEC07 Add supply chain and pipeline protections

**Owner:** Platform security engineer. **Status:** Planned.

**Dependencies:** T-OPS01, T-A03.

**Deliverable:** Locked dependencies, pinned tooling/actions, SBOM, secret/SAST/dependency/container scanning and restricted deployment identity.

**Acceptance:** Untrusted PRs receive no production secrets; exploitable unresolved critical/high issues block release; exceptions require owned evidence and expiry.

**Validation:** TEST-SUPPLY, TEST-DEPLOY.

**Open decisions:** Q35.

### T-SEC08 Apply abuse rate and spend limits

**Owner:** Backend + platform engineers. **Status:** Planned.

**Dependencies:** T-SEC03, T-A04.

**Deliverable:** Per-actor/IP/connector limits, source admission caps, OCR concurrency and vendor request budgets.

**Acceptance:** Public intake/auth/API abuse is bounded without revealing account existence or starving urgent work; 429 and budget exhaustion remain observable.

**Validation:** TEST-ABUSE, TEST-LOAD, TEST-REMOTE.

**Open decisions:** Q11, Q12, Q30.

### T-DB01 Build normalized scoped storage

**Owner:** Data + backend engineers. **Status:** Planned.

**Dependencies:** T-A02, T-SEC02, T-SEC06.

**Deliverable:** New numbered migrations for scoped records and job integration; no edits to applied 001-003 migrations.

**Acceptance:** Composite foreign keys, unique replay/action keys, least-privilege access and optimistic revisions are enforced in real PostgreSQL tests.

**Validation:** TEST-MIGRATE, TEST-AUTHZ, TEST-REPLAY.

**Open decisions:** No additional task-specific question; common release gates still apply..

### T-JOB01 Integrate a mature durable job component

**Owner:** Backend lead. **Status:** Planned.

**Dependencies:** T-DB01, T-SEC06.

**Deliverable:** Selected job library, separate worker process, leases, worker fencing and shutdown/drain support.

**Acceptance:** Job claims survive restart and contention; expired leases cannot create a second native dispatch; queue tables do not replace case history.

**Validation:** TEST-QUEUE, TEST-REMOTE.

**Open decisions:** Q09, Q11.

### T-JOB02 Implement versioned approvals and transactional outbox

**Owner:** Backend lead. **Status:** Planned.

**Dependencies:** T-JOB01, T-SEC05, T-A02.

**Deliverable:** Typed commands, source/policy/native snapshots, approval records and atomic business event/outbox creation.

**Acceptance:** Changed evidence invalidates approval; every external path checks the accepted case/opportunity, operation, account, fields and guard/policy version manifest. A legacy route or worker cannot bypass a held workflow by invoking an accepted raw operation.

**Validation:** TEST-STALE, TEST-REPLAY, TEST-AUDIT, TEST-CONTRACT.

**Open decisions:** Q33.

### T-JOB03 Implement aggregate completion and uncertain outcome recovery

**Owner:** Backend + integration engineers. **Status:** Planned.

**Dependencies:** T-JOB02, T-A04.

**Deliverable:** Parent case dependencies, per-action attempts/receipts and operator reconciliation tools.

**Acceptance:** Dispatch is persisted before I/O; timeout is not blindly retried; native success does not close unfinished financial/travel/communication actions.

**Validation:** TEST-AGG, TEST-QUEUE, TEST-REMOTE, TEST-HANDOFF.

**Open decisions:** Q28, Q31.

### T-JOB04 Implement reliable schedules and deadlines

**Owner:** Backend engineer. **Status:** Planned.

**Dependencies:** T-JOB02.

**Deliverable:** Scoped schedule versions, explicit timezone/period anchors, missed-slot policy, deduplicated overdue events and outbox alerts.

**Acceptance:** DST, repeated ticks and extended outages do not skip or duplicate approved periods; urgent safety work retains human fallback.

**Validation:** TEST-SCHEDULE, TEST-EMERGENCY.

**Open decisions:** Q05, Q07, Q31, Q34.

### T-INT01 Harden the ShiftCare connector

**Owner:** Integration engineer. **Status:** Planned.

**Dependencies:** T-A04, T-JOB01, T-SEC06.

**Deliverable:** Account-scoped clients, response schema checks, bounded paging/cursors, freshness receipts, throttling and normalized error classes.

**Acceptance:** Partial reads cannot become complete reports; retries honor vendor budgets; cross-account IDs/credentials and unsafe remote paths are rejected.

**Validation:** TEST-CONTRACT, TEST-COMPLETE, TEST-REMOTE.

**Open decisions:** Q01, Q12, Q28.

### T-INT02 Harden Graph ingestion and attachment provenance

**Owner:** Integration engineer. **Status:** Planned.

**Dependencies:** T-JOB02, T-SEC04, T-SEC06.

**Deliverable:** Approved mailbox/folders, immutable IDs, atomic delta advancement and recoverable source import.

**Acceptance:** Expired cursors, duplicate/out-of-order notifications and interrupted attachment imports recover without lost or repeated business actions.

**Validation:** TEST-REPLAY, TEST-COMPLETE, TEST-REMOTE.

**Open decisions:** Q02, Q17, Q31.

### T-INT03 Accept existing reviewed native adapters

**Owner:** Integration engineer + OCD reviewers. **Status:** Planned.

**Dependencies:** T-INT01, T-JOB03, T-SEC03.

**Deliverable:** Per-operation whitelist and account trial receipts for basic people, supported documents and guarded occurrence changes.

**Acceptance:** Real field formats, permissions, state locks, role/invitation behaviour and read-back pass. Raw operation acceptance does not enable a held case type; the release manifest also binds its approved workflow guards and scope.

**Validation:** TEST-CONTRACT, TEST-STALE, TEST-HANDOFF.

**Open decisions:** Q01, Q02, Q18, Q24, Q25, Q28.

### T-UI01 Extend the shared office workspace

**Owner:** Frontend + backend engineers. **Status:** Planned.

**Dependencies:** T-SEC02, T-JOB02.

**Deliverable:** Authenticated queues, original evidence, exact proposed fields, missing steps, due work and reconciliation controls.

**Acceptance:** Production exposes only accepted routes; unaccepted portal/demo persona controls are disabled before the first real-data pilot. Demo records never become live inputs; server scope and business completion remain authoritative.

**Validation:** TEST-AUTHZ, TEST-XSS, TEST-HANDOFF, TEST-MAPS.

**Open decisions:** Q27.

### T-OPS01 Design reproducible CI and release artifacts

**Owner:** Platform engineer. **Status:** Planned.

**Dependencies:** T-A01.

**Deliverable:** Reviewed version-controlled baseline including accepted currently untracked prototype sources, then future pipeline for reproducible build/test/scan, artifact digest, compatibility manifest and protected promotion.

**Acceptance:** Build once/promote the same artifact; source/version/deploy identity is recorded; no staging shortcut supplies production credentials.

**Validation:** TEST-DEPLOY, TEST-SUPPLY.

**Open decisions:** No additional task-specific question; common release gates still apply..

### T-OPS02 Prepare isolated hosting and environment contracts

**Owner:** Platform engineer. **Status:** Planned.

**Dependencies:** T-D05, T-SEC06, T-OPS01.

**Deliverable:** Approved hosting/region, dev/staging/production isolation, persistent API/worker, private DB/evidence and deployment identity.

**Acceptance:** Host supports durable workers and accepted restore/export; plan costs and data processing are approved; no endless worker is placed in an ephemeral function.

**Validation:** TEST-DEPLOY, TEST-PRIV.

**Open decisions:** Q09, Q15, Q16, Q30.

### T-OPS03 Instrument monitoring alerts and support runbooks

**Owner:** Platform + operations lead. **Status:** Planned.

**Dependencies:** T-JOB03, T-INT01, T-SEC05.

**Deliverable:** Redacted metrics/traces, source freshness/queue/reconciliation alerts and a tested escalation route.

**Acceptance:** Stopped worker, stale inbox, queue delay, unknown writes and failed backup alert the named role without exposing care data.

**Validation:** TEST-OBS, TEST-EMERGENCY.

**Open decisions:** Q11, Q29, Q34.

### T-OPS04 Configure and verify baseline backup recovery

**Owner:** Platform + data engineers. **Status:** Planned.

**Dependencies:** T-DB01, T-OPS02, T-JOB02.

**Deliverable:** Encrypted DB point-in-time recovery plus consistent versioned evidence/key backup and controlled restore access.

**Acceptance:** A synthetic/pre-cutover restore recovers records/files and preserves the native-write quarantine procedure within approved RPO/RTO; actual legacy export is backed up before cutover.

**Validation:** TEST-RESTORE, TEST-SECRETS.

**Open decisions:** Q15, Q16, Q32.

### T-QUAL01 Build isolated domain and security test harnesses

**Owner:** QA + security engineers. **Status:** Planned.

**Dependencies:** T-A03, T-OPS01.

**Deliverable:** Deterministic fixtures/fake clock/connector fault injection, real PostgreSQL integration and authorized account-trial procedures.

**Acceptance:** Tests distinguish mocks, provider contracts, real account evidence and human UAT; no fictional receipt is presented as a live success.

**Validation:** TEST-CONTRACT, TEST-REVIEW.

**Open decisions:** No additional task-specific question; common release gates still apply..

## P2 First core ten and controlled pilot

### T-DB02 Migrate retained legacy records deliberately

**Owner:** Data engineer + OCD data owner. **Status:** Planned.

**Dependencies:** T-DB01, T-SEC01, T-SEC02, T-SEC04, T-SEC05, T-OPS04, T-QUAL01.

**Deliverable:** Inventory/export, versioned transformer, evidence hashes, dry-run diff and controlled writer/cursor cutover.

**Acceptance:** After approved privacy/source scope and accepted identity/storage controls, isolated import reconciles retained counts/hashes; pending external work is held. No implicit store migration or normal-user exposure before the separate pilot security gate.

**Validation:** TEST-MIGRATE, TEST-RESTORE, TEST-PRIV, TEST-AUTHZ.

**Open decisions:** Q15, Q32, Q35.

### T-OPS05 Rehearse migration rollback and recovery

**Owner:** Platform + data engineers. **Status:** Planned.

**Dependencies:** T-DB02, T-JOB03, T-OPS03.

**Deliverable:** Staging rehearsal with migration rollback, worker drain, restored outbox quarantine and native-side reconciliation.

**Acceptance:** Restore holds normal traffic and native dispatch until current identities/grants, privacy deletions/holds and post-checkpoint native effects are reconciled; old/new reader compatibility and evidence hashes are verified before pilot.

**Validation:** TEST-RESTORE, TEST-ROLLBACK, TEST-MIGRATE, TEST-AUTHZ, TEST-PRIV.

**Open decisions:** Q08, Q14, Q15, Q16, Q28, Q32.

### T-QUAL02 Run operation-specific account acceptance

**Owner:** Integration lead + authorized OCD reviewer. **Status:** Planned.

**Dependencies:** T-INT03, T-QUAL01.

**Deliverable:** Accepted sandbox/designated records, permission/field tests and redacted evidence by operation.

**Acceptance:** Every enabled write has a successful authorized trial and independent read-back; only accepted methods/fields enter the release manifest.

**Validation:** TEST-CONTRACT, TEST-STALE, TEST-HANDOFF.

**Open decisions:** Q01, Q02, Q18, Q24, Q25, Q28.

### T-GOV02 Assign process remedies training and handover ownership

**Owner:** OCD operations owner. **Status:** Planned.

**Dependencies:** T-D01, T-D04.

**Deliverable:** Owned existing-tool checklists for procedures, phone/audio/access, groups, offboarding, recruitment and supplier work.

**Acceptance:** Actual administrators/trainers verify outcomes and readiness; the application does not invent staffing capacity or add ATS/LMS/marketing modules.

**Validation:** TEST-HANDOFF, TEST-DISC.

**Open decisions:** Q29, Q36.

### AUTO-01 Service area screening

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-SEC08.

**Deliverable:** Apply the approved coverage list before full intake and automatically route uncertain areas. Existing foundation: Public intake screening and W01 already exist. Remaining: Approve the list and routing rules; retain uncertainty rather than rejecting negotiable areas.

**Acceptance:** Covered, uncertain and unconfigured postcodes produce the correct recorded outcome.

**Validation:** TEST-A01.

**Open decisions:** Q03.

### AUTO-02 Centralized enquiry collection

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT02.

**Deliverable:** Collect website and authorized mailbox sources, preserve originals and deduplicate enquiries. Existing foundation: Shared intake, Graph polling, immutable message IDs and attachment import exist. Remaining: Test actual mailbox notifications, expired cursors, folder scope, attachments and source replay.

**Acceptance:** Repeated or changed sources create the correct case/version without duplicate enquiries.

**Validation:** TEST-A02.

**Open decisions:** Q02, Q17.

### AUTO-03 Enquiry ownership and prioritization

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-JOB04.

**Deliverable:** Assign configured owners and deadlines, detect overdue requests and suggest urgency and routing. Existing foundation: W02 classification, real-owner validation and deadline marking exist. Remaining: Add approved assignment/escalation rules and notification outcomes; current classification is a suggestion.

**Acceptance:** Each request has one accountable next action; missed deadlines remain visible and owned.

**Validation:** TEST-A03.

**Open decisions:** Q14, Q31.

### AUTO-04 Missing information detection

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-SEC04.

**Deliverable:** Run deterministic required-field, attachment and format checks and prepare missing-information tasks. Existing foundation: Intake rules, original evidence, PDF/OCR and missing-field checks exist. Remaining: Approve required fields and test representative forms. F applies to checking, not obtaining truthful answers.

**Acceptance:** Incomplete, unsupported and ambiguous sources are flagged without invented values.

**Validation:** TEST-A04.

**Open decisions:** Q02, Q19.

### AUTO-05 Participant onboarding and profile updates

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT03, AUTO-04.

**Deliverable:** Extract evidenced draft fields, show duplicate candidates and execute approved basic participant changes with read-back. Existing foundation: W03 extraction, person mapping, gated create/update and read-back exist. Remaining: Validate native intake feature fit, actual forms, mapped fields and account writes; preserve prospects until activation is approved.

**Acceptance:** The source and exact approved fields link to one verified native identity; replay creates no duplicate.

**Validation:** TEST-A05.

**Open decisions:** Q02, Q18, Q26.

### AUTO-06 Worker onboarding coordination

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT03, AUTO-04.

**Deliverable:** Prepare worker fields, execute reviewed basic staff changes and track screening/access/payroll handoffs. Existing foundation: W04 staff adapters and a separate payroll checkpoint exist. Remaining: Test role/invitation behaviour and readiness checks. A recorded onboarding status does not itself establish sign-in permissions.

**Acceptance:** Approved basic staff data is verified and incomplete HR/payroll steps prevent readiness claims.

**Validation:** TEST-A06.

**Open decisions:** Q02, Q25, Q26.

### AUTO-08 Correspondence preparation

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-SEC03.

**Deliverable:** Prepare approved templates, validate recipients/context/attachments and record the communication handoff. Existing foundation: W13 provides owned native handoffs, not automatic outgoing delivery. Remaining: Implement reusable templates and checks. Do not depend on an unverified ShiftCare SMS/chat send API.

**Acceptance:** A complete reviewed message reaches an owned handoff; no task is labelled as a delivered message.

**Validation:** TEST-A08.

**Open decisions:** Q17.

### AUTO-18 Document matching and filing

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT03, T-SEC04.

**Deliverable:** Match reviewed originals and upload supported client documents with metadata and independent verification. Existing foundation: Document upload, metadata checks and native-byte hashing exist for client PDF/text files. Remaining: Validate actual document types, field/date formats and download hosts. Do not claim the adapter supports every staff file or image.

**Acceptance:** The correct original is verified under the correct native person, category and access setting.

**Validation:** TEST-A18.

**Open decisions:** Q18.

### AUTO-19 Document completeness and attachment checks

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-04, T-INT01.

**Deliverable:** Compare configured required documents/attachments with complete available metadata and create specific exceptions. Existing foundation: Evidence files, document reads and attachment checks exist. Remaining: Add requirement matrices and complete-scope results. F covers presence/metadata checks, not proof that a valid agreement exists or is absent everywhere.

**Acceptance:** Missing, present and unreadable/unknown evidence remain distinct and generate the right follow-up.

**Validation:** TEST-A19.

**Open decisions:** Q18, Q20.

### AUTO-33 Task completion handovers and escalation

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-JOB03, T-JOB04.

**Deliverable:** Run configured assignment, deadline, handover and required-step completion checks automatically. Existing foundation: Owners, deadlines, dispatch records and individual follow-up jobs exist. Remaining: Add parent-case dependencies, external notification outcomes and catch-up. Current native jobs can complete before their separate communication follow-up.

**Acceptance:** A parent case cannot close while any mandatory child outcome remains incomplete or uncertain.

**Validation:** TEST-A33.

**Open decisions:** Q14, Q29, Q31.

### T-QUAL03 Accept the first 10 end to end

**Owner:** QA lead + OCD reviewers. **Status:** Planned.

**Dependencies:** AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-08, AUTO-18, AUTO-19, AUTO-33, T-DB02, T-OPS03.

**Deliverable:** Functional/source/replay/authorization UAT receipts for first core batch.

**Acceptance:** All first-core scopes pass their acceptance conditions; every unautomated/native step is labelled and owned.

**Validation:** TEST-REPLAY, TEST-AUTHZ, TEST-HANDOFF.

**Open decisions:** No additional task-specific question; common release gates still apply..

### T-QUAL04 Complete release security and fault acceptance

**Owner:** Security reviewer + QA lead. **Status:** Planned.

**Dependencies:** T-QUAL03, T-OPS05, T-SEC07, T-SEC08.

**Deliverable:** Current-release ASVS evidence, abuse/fault/security testing and approved capacity results.

**Acceptance:** No unresolved exploitable critical/high issue; ASVS applicability/evidence and residual risks reviewed; rerun affected tests for later feature waves.

**Validation:** TEST-LOAD, TEST-WEB, TEST-XSS, TEST-ABUSE, TEST-SSRF, TEST-REVIEW.

**Open decisions:** Q11, Q35.

### T-REL01 Run a restricted read-only pilot

**Owner:** OCD operations owner + release lead. **Status:** Planned.

**Dependencies:** T-QUAL03, T-QUAL04, T-OPS05, T-SEC07.

**Deliverable:** Approved source subset, shadow findings, manual comparison and operational feedback.

**Acceptance:** Current-release security, privacy/access, accepted route scope, source completeness and support gates pass before real data; no native write is enabled by a shadow result.

**Validation:** TEST-COMPLETE, TEST-AUTHZ, TEST-OBS, TEST-MAPS.

**Open decisions:** Q01, Q14, Q15, Q27, Q29, Q34, Q35.

### T-REL02 Activate accepted supervised core writes

**Owner:** OCD owner + release lead. **Status:** Planned.

**Dependencies:** T-REL01, T-QUAL04, T-QUAL02.

**Deliverable:** Versioned operation enablement manifest and witnessed first actions.

**Acceptance:** Only accepted fields/operations are enabled; approvals, read-back, support and stop/reconciliation controls work; no bulk backfill auto-dispatch.

**Validation:** TEST-CONTRACT, TEST-AGG, TEST-ROLLBACK.

**Open decisions:** Q01, Q29, Q33, Q35.

## P3 Second core ten and inherited views

### T-PORTAL01 Retain approved maps and scope inherited portal access

**Owner:** Frontend + identity engineers. **Status:** Planned.

**Dependencies:** T-UI01, T-INT01, T-SEC03.

**Deliverable:** Office/worker/client map projections and accepted own-service read/request paths; explicit disposition of discussed portal functions.

**Acceptance:** User-approved L01 remains traced; permitted views show scoped bookings without worker home coordinates/contact leakage; unaccepted portal slices stay disabled in production.

**Validation:** TEST-MAPS, TEST-AUTHZ.

**Open decisions:** Q08, Q14, Q15, Q27.

### AUTO-10 Booking preparation and availability checks

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT03.

**Deliverable:** Prepare one-off booking drafts and check dates, times, roster overlap, leave and available patterns. Existing foundation: W08 checks existing occurrences; the current adapter has no new-booking create operation. Remaining: Add a whitelisted one-off create adapter and explicit native IDs/defaults if API creation is included. Availability patterns need date expansion; free time is not willingness.

**Acceptance:** A reviewed one-off arrangement has a verified native result or an explicit native creation handoff.

**Validation:** TEST-A10.

**Open decisions:** Q24, Q28.

### AUTO-11 Booking change scope and verification

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-10, T-JOB03.

**Deliverable:** Preview change scope and verify a supported saved occurrence against approved fields. Existing foundation: Current snapshot, overlap and single-client/single-worker change/read-back controls exist. Remaining: Keep initial writes to accepted occurrence scope. Series operations are published but not implemented in the existing adapter.

**Acceptance:** Only the approved scope changes; native mismatch, stale data and locks leave an owned exception.

**Validation:** TEST-A11.

**Open decisions:** Q24, Q28.

### AUTO-12 Travel checking and stale value detection

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-10.

**Deliverable:** Calculate route estimates from verified inputs and automatically flag stale or infeasible travel. Existing foundation: Browser travel checking and route utilities exist. Remaining: Move dependency fingerprints/checks to shared server records. F covers estimates and stale-value checks, not mileage entitlement.

**Acceptance:** Changes to worker, address or preceding visit invalidate the estimate; no estimate becomes actual mileage.

**Validation:** TEST-A12.

**Open decisions:** Q13, Q15.

### AUTO-14 Participant confirmation monitoring

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT02, T-INT01.

**Deliverable:** Ingest native reminder replies, match exact occurrences and route confirmation/change/cancellation exceptions. Existing foundation: W02 reply candidates and W06 reviewed routing exist. Remaining: Test actual notification formats, mailbox routing, quoted replies and occurrence matching; add event reads if needed.

**Acceptance:** A clear reply routes once; ambiguous replies and silence never trigger automatic cancellation.

**Validation:** TEST-A14.

**Open decisions:** Q17, Q31.

### AUTO-16 Absence and replacement cover coordination

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-10, AUTO-11, T-JOB03.

**Deliverable:** List disrupted services, prepare candidates, track offers/acceptance and each participant outcome. Existing foundation: W08 guards one-worker assignment; native matching/offers remain handoffs. Remaining: Add shared cover-case dependencies and affected-service tracking. Keep offer and acceptance native until their adapters are accepted.

**Acceptance:** Each affected service has a verified arrangement or owned no-cover outcome, with required communication.

**Validation:** TEST-A16.

**Open decisions:** Q24, Q34.

### AUTO-21 Renewal and coordinator follow up

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-19, T-JOB04.

**Deliverable:** Detect genuine due/missing evidence, schedule owned renewal/coordinator tasks and retain responses. Existing foundation: W12 scoped staff collection and review schedules exist. Remaining: Reuse native reminder sending, repair metadata first, avoid duplicate alerts and implement missed-run recovery and escalation.

**Acceptance:** A due item creates one owned follow-up, remains open until checked and survives a missed schedule.

**Validation:** TEST-A21.

**Open decisions:** Q18, Q31.

### AUTO-22 Invoice preparation checks

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT01, T-JOB04.

**Deliverable:** Prepare period billing exceptions from actual attendance, notes and native invoiceable/invoice data. Existing foundation: W10 collects visit/invoice evidence; there is no invoiceable-items cursor adapter yet. Remaining: Add cursor-aware pre-invoice reads and agreed rules/cutoffs. Use native pricing rather than calculating care billing rates in the application.

**Acceptance:** Complete period evidence produces traceable exceptions; no duplicate invoice/export or false all-clear occurs.

**Validation:** TEST-A22.

**Open decisions:** Q06, Q07.

### AUTO-28 Timesheet hours and mileage reconciliation

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT01, T-JOB04.

**Deliverable:** Check ShiftCare period completeness, actual hours and mileage units, then compare approved payroll input where available. Existing foundation: W11 and browser payroll review exist; a live payroll-system connector is not implemented. Remaining: First deliver source checks and reviewed handoff. Add two-sided comparison only against the real export/API; do not claim automated payroll reconciliation without it.

**Acceptance:** Missing timesheets never become zero pay; approved quantities and units trace to their source and period.

**Validation:** TEST-A28.

**Open decisions:** Q05, Q13.

### AUTO-31 Visit record and care exceptions

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-INT01, T-JOB04.

**Deliverable:** Detect factual missing/invalid attendance or notes, duration differences and source-defined significant events. Existing foundation: W09 visit collection and factual exception preparation exist. Remaining: Validate complete periods, staff-specific evidence and restricted access; task-specific completion comparisons need accepted source fields.

**Acceptance:** A factual exception cites its original record and owner without making a clinical or misconduct conclusion.

**Validation:** TEST-A31.

**Open decisions:** Q23.

### AUTO-32 Feedback complaint and safety follow through

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, T-SEC02, T-JOB04.

**Deliverable:** Schedule agreed feedback, retain authorized responses and track complaint/safety callbacks and corrective follow-up. Existing foundation: W09/W13 cases and handoffs provide a foundation; a feedback-specific shared case is additional work. Remaining: Add restricted case fields, owners, follow-up schedule and explicit urgent escalation; avoid automatic clinical triage.

**Acceptance:** Every response/action has an accountable outcome; restricted information stays within permitted access.

**Validation:** TEST-A32.

**Open decisions:** Q23, Q34.

### T-QUAL05 Accept all 20 core workflows

**Owner:** QA lead + OCD reviewers. **Status:** Planned.

**Dependencies:** AUTO-10, AUTO-11, AUTO-12, AUTO-14, AUTO-16, AUTO-21, AUTO-22, AUTO-28, AUTO-31, AUTO-32, T-QUAL04, T-PORTAL01.

**Deliverable:** Core20 functional, security, performance and native-handoff evidence including inherited views.

**Acceptance:** Exactly 20 scoped opportunities meet acceptance; payroll-side comparison is not claimed without its real source; no duplicated native reminders/exports.

**Validation:** TEST-COMPLETE, TEST-LOAD, TEST-MAPS, TEST-EMERGENCY.

**Open decisions:** No additional task-specific question; common release gates still apply..

### T-REL03 Expand to accepted core20 operation

**Owner:** OCD owner + release lead. **Status:** Planned.

**Dependencies:** T-QUAL05, T-REL02.

**Deliverable:** Core20 release manifest, operating baselines and support handover.

**Acceptance:** Actual automation/manual boundaries are accepted; source freshness, overdue cases, errors and staff effort are reviewed against baseline.

**Validation:** TEST-OBS, TEST-HANDOFF.

**Open decisions:** Q29, Q30, Q34.

## P4 Five gated additions

### AUTO-07 Client stages and agreed service details

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-05, AUTO-11.

**Deliverable:** Track reviewed stage transitions and source-linked service hours/effective changes. Existing foundation: New client mapping defaults to prospect; intake references exist. Remaining: Extend the mapping whitelist for explicit stage transitions; define which native record owns agreed hours rather than creating a second editable agreement.

**Acceptance:** Only an approved transition changes the native stage; hours retain their authoritative source.

**Validation:** TEST-A07.

**Open decisions:** Q03, Q24.

### AUTO-09 Communication tracking and history

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-08, T-INT02, T-JOB03.

**Deliverable:** Link supported communication references and distinguish dispatch, failure, response and checked native history. Existing foundation: W13 requires an actual communication reference; current Graph access is read-only Inbox ingestion. Remaining: Agree channel coverage and add permitted Sent Items/failure evidence. A Graph 202 response is not delivery proof; universal cross-channel read receipts are not promised.

**Acceptance:** Each status is backed by its own evidence, with unknown outcomes and failed delivery kept open.

**Validation:** TEST-A09.

**Open decisions:** Q17.

### AUTO-13 Shift instruction maintenance

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-11.

**Deliverable:** Find missing instructions and apply an approved version to explicitly selected native bookings. Existing foundation: Prototype instruction examples exist; the production shift adapter only writes assignment/times. Remaining: Add a description-only adapter, version/hash checks and read-back. Validate series behaviour and locked/cancelled records before bulk changes.

**Acceptance:** Selected editable bookings match the approved instructions without changing unrelated fields.

**Validation:** TEST-A13.

**Open decisions:** Q24, Q28.

### AUTO-15 Complete cancellation handling

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-14, T-INT03, T-JOB03, AUTO-08.

**Deliverable:** Execute reviewed cancellation steps with separate verified travel, charge and communication outcomes. Existing foundation: W07 persists dispatch and verifies cancellation, but performs no travel/mileage cleanup. Remaining: Add verified cleanup before cancellation where required. Cancelled shifts restrict later edits. Model cleanup-success/cancel-failure and block closure until required handoffs finish.

**Acceptance:** No untravelled charge remains incorrectly applied; partial or unknown outcomes stay open without duplicate dispatch.

**Validation:** TEST-A15.

**Open decisions:** Q04, Q13, Q28, Q33.

### AUTO-20 Document date and expiry correction

**Owner:** Workflow engineer + designated OCD reviewer. **Status:** Planned.

**Dependencies:** T-UI01, T-JOB02, T-QUAL01, AUTO-19, T-INT03.

**Deliverable:** Prepare reviewed date/expiry corrections and verify accepted native metadata updates. Existing foundation: Client metadata and staff qualification expiry adapters exist. Remaining: Validate date/null/no-expiration response semantics. General staff-file expiry correction is not implemented in the current adapter.

**Acceptance:** Only evidence-backed corrections suppress false alerts; genuine expiries remain visible.

**Validation:** TEST-A20.

**Open decisions:** Q18, Q20.

### T-QUAL06 Accept the five gated additions

**Owner:** QA + security + OCD reviewers. **Status:** Planned.

**Dependencies:** AUTO-07, AUTO-09, AUTO-13, AUTO-15, AUTO-20, T-QUAL05.

**Deliverable:** Per-addition account/data/policy receipts and current regression/security results.

**Acceptance:** Each gate has evidence; cancellation tests include cleanup-success/cancel-failure, uncertain outcomes and failed communication; unavailable additions remain held.

**Validation:** TEST-AGG, TEST-STALE, TEST-CONTRACT, TEST-HANDOFF.

**Open decisions:** Q04, Q17, Q18, Q24, Q28, Q33.

### T-REL04 Reach the accepted target25 scope

**Owner:** OCD owner + release lead. **Status:** Planned.

**Dependencies:** T-QUAL06, T-REL03.

**Deliverable:** Target25 scope manifest and actual completion evidence.

**Acceptance:** Claim 25 only after all five gates pass; specific additions may be promoted earlier through the same tested release controls.

**Validation:** TEST-REVIEW, TEST-OBS.

**Open decisions:** No additional task-specific question; common release gates still apply..

## P5 Branches and sustained operation

### T-OPS06 Accept branch expansion

**Owner:** OCD owner + platform/security leads. **Status:** Planned.

**Dependencies:** T-REL03, T-SEC02, T-DB02.

**Deliverable:** Approved branch/account/organization mappings and branch-specific deployment/configuration receipts.

**Acceptance:** Cross-branch negative tests, pooled scope isolation, per-account budgets and schedule/backlog checks pass before another branch is enabled.

**Validation:** TEST-AUTHZ, TEST-SCHEDULE, TEST-LOAD, TEST-MAPS.

**Open decisions:** Q10, Q11, Q12.

### T-OPS07 Operate maintain and review the service

**Owner:** Named service owner. **Status:** Planned.

**Dependencies:** T-REL02, T-OPS03, T-OPS05.

**Deliverable:** Runbook ownership, patch/dependency/vendor review calendar, access/secret review and recovery drills.

**Acceptance:** Support cover and escalation are real; key rotation, restores, incident learning and costs are reviewed on approved recurring cadence.

**Validation:** TEST-OBS, TEST-RESTORE, TEST-SECRETS.

**Open decisions:** Q29, Q30, Q35.

## P6 Later and native scope dispositions

### AUTO-17 Factual absence histories

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Defer dedicated HR history until core absence coordination is accepted; define restricted access and corrections.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Management resolves disputed facts and all employment interpretation.

**Validation:** TEST-A17.

**Open decisions:** Q14.

### AUTO-23 Special billing instructions and prepayments

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Defer live balance integration until authorized Xero access and ID reconciliation are implemented. Do not create another ledger.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Bookkeeper applies balances and approves accounting treatment.

**Validation:** TEST-A23, TEST-XERO.

**Open decisions:** Q26.

### AUTO-24 Billing recipient verification

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Defer dedicated cross-system recipient automation; keep checks in existing onboarding/billing review until account mappings are verified.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Staff verify authority and effective payer changes before updating billing.

**Validation:** TEST-A24, TEST-XERO.

**Open decisions:** Q06, Q26.

### AUTO-25 Returned invoice resolution

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Defer a dedicated correction/reissue automation; reuse #3/#22 cases and native accounting actions first.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Bookkeeper determines credit, correction or reissue and checks the result.

**Validation:** TEST-A25.

**Open decisions:** Q06, Q26.

### AUTO-26 Payment follow up

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Defer custom collection status until ledger IDs, tokens and reconciliation are accepted; do not treat a ShiftCare balance as verified Xero payment.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Bookkeeper approves disputes, escalation and any collection action.

**Validation:** TEST-A26, TEST-XERO.

**Open decisions:** Q26.

### AUTO-27 Pay period and employee checks

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Defer payroll-side automation until the actual vendor/field mappings are known. Inactive ShiftCare access does not establish zero pay.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Payroll confirms final-pay eligibility and the meaning of prior values.

**Validation:** TEST-A27.

**Open decisions:** Q05.

### AUTO-29 Payroll adjustment tracking

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Keep calculations and native entry manual initially; support evidence through #28 rather than building an award/payroll engine.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Payroll calculates and approves leave, back pay and travel treatment in the established payroll process.

**Validation:** TEST-A29.

**Open decisions:** Q05, Q13.

### AUTO-30 Payroll completion handoffs

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Retain finalization and money movement in the established platform; a duplicate release workflow adds little benefit and substantial risk.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Authorized payroll staff finalize the run, release payment and deliver payslips in the payroll platform.

**Validation:** TEST-A30.

**Open decisions:** Q05.

### AUTO-34 Operational outcome reporting

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Keep baseline pilot measures in core instrumentation; defer a dedicated reporting workflow until daily work is stable. No forecast model is proposed.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Management interprets staffing, cost and demand implications.

**Validation:** TEST-A34.

**Open decisions:** Q11, Q21, Q30.

### AUTO-35 Arrival visibility if the remaining gap is confirmed

**Owner:** OCD product/process owner. **Status:** Disposition review only; implementation deferred.

**Dependencies:** T-GOV01.

**Deliverable:** Disposition and owned native/manual process; implementation requires a separately approved change. Defer optional arrival work pending native-feature fit and device/privacy trials; continuous background tracking is not established.

**Acceptance:** Review the deferral/native boundary and actual owner; no automated completion claim. Approve access/consent and validate actual devices and withdrawal behaviour.

**Validation:** TEST-A35.

**Open decisions:** Q15, Q27.
