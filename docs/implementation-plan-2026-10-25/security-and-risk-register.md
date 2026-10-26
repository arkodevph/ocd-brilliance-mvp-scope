# Security and Operational Risk Register

These are design and workflow risk scenarios, including gaps observed in the prototype. They are not a penetration-test report or evidence of an observed attack. Severity is an initial planning estimate. Mitigations are planned; actual residual ratings and acceptance require implementation/test evidence and an accountable reviewer.

**Inventory:** 36 risks. Initial severity: Critical 14, High 21, Medium 1.

Unresolved exploitable critical/high vulnerabilities and unaccepted critical privacy/safety/recovery paths block release. Any permissible residual-risk exception must specify compensating controls, scope, reviewer and expiry. An initially critical scenario is not silently closed by being listed here.

## RISK-01 Account/session compromise

**Initial severity:** Critical. **Owner:** Security lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Environment password staff auth or non-revocable cookies expose sensitive operations.

**Planned mitigation:** Use accepted OIDC/MFA, revocable server sessions, throttling and recovery/offboarding.

**Residual risk:** IdP compromise and session theft remain possible; exercise revocation and fresh authentication.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC01, T-SEC03. **Validation:** TEST-ID, TEST-WEB.

**Open gates:** Q08, Q35.

## RISK-02 Cross-person or branch disclosure

**Initial severity:** Critical. **Owner:** Security + privacy owners. **Status:** Open; mitigation planned, not implemented.

**Risk:** ID guessing or incomplete field/branch checks expose care, HR, payroll or evidence.

**Planned mitigation:** Deny-by-default relationship/field permissions, scoped FKs/RLS and server-side projections.

**Residual risk:** Misconfigured memberships or privileged DB roles can bypass intent; review and negative-test all paths.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC02, T-PORTAL01. **Validation:** TEST-AUTHZ, TEST-MAPS.

**Open gates:** Q10, Q14.

## RISK-03 Broad native service credentials

**Initial severity:** Critical. **Owner:** Integration + security leads. **Status:** Open; mitigation planned, not implemented.

**Risk:** A native key may act with account-owner scope and native attribution cannot identify the actual approver.

**Planned mitigation:** Use narrow native credentials where supported, application operation allowlists, scoped workers and own actor/approval audit.

**Residual risk:** Vendor credential scope/attribution limitations remain; native-owner activity needs reconciliation.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC06, T-INT01, T-SEC05. **Validation:** TEST-CONTRACT, TEST-AUDIT, TEST-SECRETS.

**Open gates:** Q01, Q28.

## RISK-04 CSRF and trusted-header confusion

**Initial severity:** High. **Owner:** Security engineer. **Status:** Open; mitigation planned, not implemented.

**Risk:** Origin checks or forwarded headers alone can authorize an unsafe browser mutation.

**Planned mitigation:** CSRF token, explicit origin rules, trusted proxy configuration and secure host cookies.

**Residual risk:** Browser compromise still defeats same-session protection; use MFA/re-auth and field authorization.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC03. **Validation:** TEST-WEB.

**Open gates:** Q08.

## RISK-05 Stored XSS and unsafe mail rendering

**Initial severity:** High. **Owner:** Frontend security engineer. **Status:** Open; mitigation planned, not implemented.

**Risk:** Mail, notes, templates or filenames execute active content or load tracking resources.

**Planned mitigation:** Context encoding, safe text/sanitization, CSP and blocked unapproved remote content.

**Residual risk:** Sanitizer/browser defects remain; patch and regression-test rendering.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC03. **Validation:** TEST-XSS.

**Open gates:** Q35.

## RISK-06 SSRF through native download links

**Initial severity:** High. **Owner:** Integration security engineer. **Status:** Open; mitigation planned, not implemented.

**Risk:** A signed URL or redirect points at metadata/private networks or an unapproved host.

**Planned mitigation:** Validate exact destination, protocol, port, DNS/IP ranges and expiry; block redirects and limit bytes/egress.

**Residual risk:** DNS/storage-provider changes can invalidate allowlists; fail closed and review changes.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC04, T-INT01. **Validation:** TEST-SSRF.

**Open gates:** Q18.

## RISK-07 Malicious evidence or OCR exhaustion

**Initial severity:** High. **Owner:** Security + platform leads. **Status:** Open; mitigation planned, not implemented.

**Risk:** Files exploit parsers or exhaust memory/CPU and block urgent work.

**Planned mitigation:** Quarantine/scan, allowlisted MIME signatures, isolated bounded parser jobs and separate concurrency.

**Residual risk:** Scanner/parser bypasses remain; manual unsupported-file handling and rapid patching.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC04, T-SEC08. **Validation:** TEST-FILE, TEST-ABUSE.

**Open gates:** Q15, Q18.

## RISK-08 Secret or private payload leakage

**Initial severity:** Critical. **Owner:** Platform security lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Tokens/keys or care data appear in builds, telemetry, errors or backup access.

**Planned mitigation:** Server secret store, encryption/TLS, redaction, environment isolation and rotation drills.

**Residual risk:** Privileged operator/provider access remains; minimize data and audit privileged access.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC06, T-SEC05. **Validation:** TEST-SECRETS, TEST-PRIV.

**Open gates:** Q15, Q16.

## RISK-09 Duplicate and out-of-order work

**Initial severity:** High. **Owner:** Backend lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Replay or concurrent collection creates duplicate cases, people or actions.

**Planned mitigation:** Stable source/version keys, unique dispatch identities, transactional outbox and worker fencing.

**Residual risk:** External systems without idempotency still need reconciliation and ambiguous-match review.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-JOB01, T-JOB02. **Validation:** TEST-REPLAY, TEST-QUEUE.

**Open gates:** Q28.

## RISK-10 Unknown remote write outcome

**Initial severity:** Critical. **Owner:** Integration lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** A remote write succeeds while response/local receipt is lost and retry repeats it.

**Planned mitigation:** Persist dispatch, mark uncertainty, reconcile before resend, preserve external evidence.

**Residual risk:** Eventual consistency may prevent automatic proof; an owned manual exception remains.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-JOB03, T-INT01. **Validation:** TEST-REMOTE, TEST-QUEUE.

**Open gates:** Q28.

## RISK-11 Stale approval and concurrent native edit

**Initial severity:** High. **Owner:** Integration + OCD native owners. **Status:** Open; mitigation planned, not implemented.

**Risk:** A native user or another integration changes the record after review/preflight.

**Planned mitigation:** Bind source/policy/fields, per-target lock, fresh preflight and native version condition where supported.

**Residual risk:** Without vendor compare-and-swap the race cannot be eliminated; detect/reconcile mismatches.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-JOB02, T-INT03. **Validation:** TEST-STALE.

**Open gates:** Q28.

## RISK-12 Partial cancellation and travel charges

**Initial severity:** Critical. **Owner:** OCD operations owner + bookkeeper. **Status:** Open; mitigation planned, not implemented.

**Risk:** Travel cleanup is absent or happens after the native cancellation locks edits.

**Planned mitigation:** Approve and verify required cleanup first, then cancel/read back; track every action and communication dependency.

**Residual risk:** A failed later step leaves real partial changes; bookkeeper/office recovery is required.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** AUTO-15, T-JOB03. **Validation:** TEST-A15, TEST-AGG.

**Open gates:** Q04, Q13.

## RISK-13 Recurring/group blast radius

**Initial severity:** High. **Owner:** Rostering owner. **Status:** Open; mitigation planned, not implemented.

**Risk:** A single write changes more occurrences/people or financial scope than approved.

**Planned mitigation:** Explicit occurrence list/window preview, accepted adapters and initial bounds; gate groups/series.

**Residual risk:** Native series expansion/state differences need per-account evidence; unsupported cases stay native.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** AUTO-10, AUTO-11, AUTO-13. **Validation:** TEST-A10, TEST-A11, TEST-A13, TEST-STALE.

**Open gates:** Q24.

## RISK-14 Incorrect finance or payroll interpretation

**Initial severity:** Critical. **Owner:** Bookkeeper/payroll owner. **Status:** Open; mitigation planned, not implemented.

**Risk:** Missing source data becomes zero pay; estimates/units/credits are treated as actuals.

**Planned mitigation:** Separate units and source states, native pricing/ledger/export, approved mappings and human financial treatment.

**Residual risk:** The application cannot validate unprovided payroll rules or all ledger outcomes.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** AUTO-22, AUTO-28, T-D03. **Validation:** TEST-A22, TEST-A28, TEST-COMPLETE.

**Open gates:** Q05, Q06, Q13, Q26.

## RISK-15 False notification success or wrong recipient

**Initial severity:** High. **Owner:** Operations owner. **Status:** Open; mitigation planned, not implemented.

**Risk:** Created task/sent response is mistaken for receipt or an update goes to the wrong person.

**Planned mitigation:** Verify recipient and track dispatch/failure/response/acknowledgement separately; native checked handoffs.

**Residual risk:** Some channels do not provide delivery/read proof; retain unknown states and human follow-up.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** AUTO-08, AUTO-09, T-JOB03. **Validation:** TEST-A08, TEST-A09, TEST-HANDOFF.

**Open gates:** Q17.

## RISK-16 Incomplete collection reported as all-clear

**Initial severity:** High. **Owner:** Integration lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Pagination caps, wrong filters or an unavailable source hide missing evidence.

**Planned mitigation:** Complete-scope receipts, explicit empty/partial/stale states and cursor-aware adapters.

**Residual risk:** Vendor filtering/schema changes require contract monitoring and sampled native comparison.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-INT01, AUTO-19, AUTO-22. **Validation:** TEST-COMPLETE, TEST-CONTRACT.

**Open gates:** Q12.

## RISK-17 Timezone cutoff or missed review

**Initial severity:** High. **Owner:** Bookkeeper + backend lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** DST/restarts/fortnight anchors create skipped or duplicated financial periods.

**Planned mitigation:** IANA zones, explicit UTC instants/calendar periods, schedule versions and bounded slot catch-up.

**Residual risk:** Wrong owner-approved calendar still produces wrong periods; business review remains required.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-JOB04. **Validation:** TEST-SCHEDULE.

**Open gates:** Q05, Q07, Q31.

## RISK-18 Wrong identity consent or signature

**Initial severity:** High. **Owner:** OCD onboarding owner. **Status:** Open; mitigation planned, not implemented.

**Risk:** Duplicate candidate matching or extraction updates the wrong person or accepts invalid paperwork.

**Planned mitigation:** Evidence-based review, explicit native IDs and conservative matching/signature checks.

**Residual risk:** Forgery or source errors may need human investigation; do not automate authenticity claims.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** AUTO-05, AUTO-06, AUTO-18. **Validation:** TEST-A05, TEST-A06, TEST-A18.

**Open gates:** Q02, Q18.

## RISK-19 Worker status mistaken for access or readiness

**Initial severity:** High. **Owner:** HR + account admin. **Status:** Open; mitigation planned, not implemented.

**Risk:** Native onboarding_status is treated as permission revocation or employment approval.

**Planned mitigation:** Verify role/invitation/access semantics and separate readiness/HR/payroll checks.

**Residual risk:** Native status and sign-in behaviour can diverge; account admin verifies actual access.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** AUTO-06, T-INT03. **Validation:** TEST-A06, TEST-CONTRACT.

**Open gates:** Q25.

## RISK-20 Over-retention or unapproved processing

**Initial severity:** Critical. **Owner:** OCD privacy owner. **Status:** Open; mitigation planned, not implemented.

**Risk:** Care/HR data is copied broadly or sent to maps/AI/support without approved purpose.

**Planned mitigation:** Minimize evidence, approve processors/regions/retention/holds and default optional AI/ETA off.

**Residual risk:** Legal/contract interpretation and provider access remain owner/adviser responsibilities.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-D04, T-SEC05. **Validation:** TEST-PRIV.

**Open gates:** Q15, Q27.

## RISK-21 Untrusted content controls extraction or tools

**Initial severity:** High. **Owner:** Security + integration leads. **Status:** Open; mitigation planned, not implemented.

**Risk:** Email/document prompts or forged fields become authority for tool execution.

**Planned mitigation:** Treat content as data; bounded extraction, schema/evidence validation and no privileged tools or secrets in extraction workers.

**Residual risk:** Extraction may be incorrect; human approval and deterministic command checks remain required.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC04, T-SEC03, AUTO-04. **Validation:** TEST-FILE, TEST-INPUT, TEST-PRIV.

**Open gates:** Q02, Q15.

## RISK-22 Supply chain or CI compromise

**Initial severity:** High. **Owner:** Platform security lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Untrusted dependency/build/PR gains deploy or runtime secrets.

**Planned mitigation:** Pinned inputs, lockfile/SBOM/scans, protected promotion and separate least-privilege deploy identity.

**Residual risk:** Zero-days and platform compromise remain; patch response and artifact provenance are essential.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC07, T-OPS01. **Validation:** TEST-SUPPLY.

**Open gates:** Q35.

## RISK-23 Legacy loss or unsafe migration replay

**Initial severity:** High. **Owner:** Data owner + engineer. **Status:** Open; mitigation planned, not implemented.

**Risk:** Retained JSON/Redis/file history is lost or old approved/in-flight work auto-runs after cutover.

**Planned mitigation:** Inventory retained data, backup, hashes/counts, stop old writers and import pending work into reconciliation hold.

**Residual risk:** Previously pruned history cannot be reconstructed automatically; owner accepts known gaps.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-DB02, T-OPS05. **Validation:** TEST-MIGRATE, TEST-RESTORE.

**Open gates:** Q32.

## RISK-24 Restore repeats remote effects

**Initial severity:** Critical. **Owner:** Platform + integration leads. **Status:** Open; mitigation planned, not implemented.

**Risk:** Restoring DB/outbox to an earlier checkpoint loses evidence of a later native write.

**Planned mitigation:** Restore into write quarantine, recover external/audit evidence and reconcile native targets before re-enabling dispatch.

**Residual risk:** External state is not rolled back with the database; some actions require manual investigation.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-OPS04, T-OPS05, T-JOB03. **Validation:** TEST-RESTORE.

**Open gates:** Q16, Q28.

## RISK-25 Evidence and DB drift

**Initial severity:** High. **Owner:** Data/platform leads. **Status:** Open; mitigation planned, not implemented.

**Risk:** A file exists without metadata or a restored record points at absent/changed bytes.

**Planned mitigation:** Quarantine/finalization states, checksums, object versions, orphan handling and consistent restore manifests.

**Residual risk:** Storage outage/version retention gaps can delay evidence; keep cases blocked.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC04, T-OPS04, T-DB02. **Validation:** TEST-FILE, TEST-RESTORE.

**Open gates:** Q15, Q16.

## RISK-26 Outage throttling and starvation

**Initial severity:** High. **Owner:** Service + integration owners. **Status:** Open; mitigation planned, not implemented.

**Risk:** Vendor downtime or OCR backlog delays urgent work and exhausts request/spend budgets.

**Planned mitigation:** Bounded queues, retry budgets/jitter/Retry-After, per-account limits and separate urgent/OCR work classes.

**Residual risk:** Vendor outages cannot be eliminated; native/manual fallback and support coverage remain necessary.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC08, T-JOB01, T-OPS03. **Validation:** TEST-REMOTE, TEST-LOAD, TEST-EMERGENCY.

**Open gates:** Q11, Q12, Q34.

## RISK-27 Missing or misleading audit/alerts

**Initial severity:** High. **Owner:** Security + service owners. **Status:** Open; mitigation planned, not implemented.

**Risk:** Native success or operational failure is invisible, or logs reveal confidential data.

**Planned mitigation:** Protected audit, source/queue/reconciliation metrics and exercised redacted alert routing.

**Residual risk:** App audit is not tamper-proof against all admins; separate audit access/retention and review.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC05, T-OPS03. **Validation:** TEST-AUDIT, TEST-OBS.

**Open gates:** Q29, Q35.

## RISK-28 Portal or location disclosure

**Initial severity:** Critical. **Owner:** Privacy owner + frontend lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Demo identities, stale assignment, representative access or route data expose another person/worker home.

**Planned mitigation:** Verified relationship mapping, field projections, no raw worker-home sharing, no API cache and explicit optional ETA consent/freshness.

**Residual risk:** Device/location accuracy and representative authority require actual acceptance.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-PORTAL01, T-SEC02. **Validation:** TEST-MAPS, TEST-AUTHZ.

**Open gates:** Q15, Q27.

## RISK-29 New owner dependency and unstaffed support

**Initial severity:** High. **Owner:** OCD owner. **Status:** Open; mitigation planned, not implemented.

**Risk:** Only one developer/admin understands jobs, exceptions or incident response.

**Planned mitigation:** Named maintainer/backup, runbooks, training, handovers, access review and funded support.

**Residual risk:** Staff availability and budget can still constrain response.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-D05, T-OPS07, T-GOV02. **Validation:** TEST-OBS, TEST-HANDOFF.

**Open gates:** Q29, Q30.

## RISK-30 Urgent care issue waits for automation

**Initial severity:** Critical. **Owner:** OCD supervisor. **Status:** Open; mitigation planned, not implemented.

**Risk:** Staff rely on a scheduled alert while a safety concern or missed service needs immediate action.

**Planned mitigation:** Keep and rehearse the existing urgent incident/contact process and actual duty cover.

**Residual risk:** Human response/capacity remains essential; the system is not an emergency service.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** AUTO-31, AUTO-32, T-OPS03. **Validation:** TEST-EMERGENCY.

**Open gates:** Q23, Q34.

## RISK-31 Unmeasured scale or cost commitment

**Initial severity:** Medium. **Owner:** OCD owner + technical lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Volumes and support are guessed, leading to overloaded or unaffordable operation.

**Planned mitigation:** Measure profile/baseline, test load/backlog and approve budget/thresholds before commitments.

**Residual risk:** Future branches and vendor pricing may change the operating envelope.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-D05, T-SEC08, T-OPS06. **Validation:** TEST-LOAD, TEST-DISC.

**Open gates:** Q11, Q30.

## RISK-32 Rollback mistaken for native undo

**Initial severity:** Critical. **Owner:** Release + integration leads. **Status:** Open; mitigation planned, not implemented.

**Risk:** An old DB/code version is restored after native effects, or unsafe compensating writes are attempted.

**Planned mitigation:** Drain/hold uncertain work, use compatible schema and reconcile native effects with explicit review.

**Residual risk:** Some native effects cannot be reversed safely; manual correction can be required.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-OPS05, T-JOB03. **Validation:** TEST-ROLLBACK, TEST-AGG.

**Open gates:** Q28, Q32.

## RISK-33 Environment and proxy misconfiguration

**Initial severity:** High. **Owner:** Platform lead. **Status:** Open; mitigation planned, not implemented.

**Risk:** Staging uses production credentials or insecure TLS/cookies/private DB ports are exposed.

**Planned mitigation:** Separate accounts/storage/keys, trusted ingress, egress restrictions and production fail-closed config validation.

**Residual risk:** Hosting/provider mistakes remain; continuously verify environment identity and access.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-OPS02, T-SEC03, T-SEC06. **Validation:** TEST-DEPLOY, TEST-WEB, TEST-SECRETS.

**Open gates:** Q16.

## RISK-34 Wrong account or organization routing

**Initial severity:** Critical. **Owner:** Integration + data owners. **Status:** Open; mitigation planned, not implemented.

**Risk:** A valid person ID exists in another account and the wrong connector is selected.

**Planned mitigation:** Composite scoped identity links, explicit branch/account mappings and immutable service context.

**Residual risk:** Incorrect approved mapping can still route wrong; business/account acceptance is mandatory.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC02, T-INT01, T-OPS06. **Validation:** TEST-AUTHZ, TEST-CONTRACT.

**Open gates:** Q10, Q26.

## RISK-35 Spreadsheet formula injection

**Initial severity:** High. **Owner:** Backend security engineer. **Status:** Open; mitigation planned, not implemented.

**Risk:** Exported free-text starts spreadsheet commands when staff open a CSV.

**Planned mitigation:** Escape dangerous cells in approved export encoding and test target spreadsheet handling.

**Residual risk:** Spreadsheet behaviour varies; tested export format and training remain necessary.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-SEC03. **Validation:** TEST-INPUT.

**Open gates:** Q35.

## RISK-36 Unverified regulatory or contract fit

**Initial severity:** Critical. **Owner:** OCD accountable/privacy owners. **Status:** Open; mitigation planned, not implemented.

**Risk:** A plan is treated as proof of privacy/compliance or permission to use vendor data.

**Planned mitigation:** Qualified owner/adviser review of actual obligations, purposes, agreements, retention and processors before activation.

**Residual risk:** The blueprint is not a compliance certification or legal determination.

**Residual rating:** Unverified until control evidence and accountable-owner review.

**Tasks:** T-D04, T-A03. **Validation:** TEST-PRIV, TEST-REVIEW.

**Open gates:** Q15, Q35.
