# Testing and Validation Strategy

All cases in the [67-case catalog](test-catalog.csv) are designed work, not executed results. The plan-only validator checks documentation structure; it does not test the application or establish security. The earlier 24 October build and 47 isolated automation-test passes remain limited historical evidence.

## Test evidence and environments

Keep four evidence types distinct: deterministic local fixtures; real PostgreSQL/object-store integration tests; authorized vendor account trials; and witnessed OCD business acceptance. Each receipt identifies artifact/version, environment, configuration/permission scope, test data, actual result, reviewer and time. Redact secrets and minimize personal data in evidence.

Development uses fictional data. Staging uses synthetic records and approved test mailboxes/accounts. If a vendor lacks a suitable sandbox, designated records in an owner-approved account require a documented trial scope and verification procedure; no such mutation is performed by this planning task. Real care/HR data in staging requires the privacy/access gates first.

## Layers and ownership

| Layer | What to verify | Gate and evidence |
|---|---|---|
| Unit | Typed field/unit/time rules, matching uncertainty, proposal hashes, state transitions, permission predicates, source keys and schedule windows. | T-QUAL01; deterministic fixtures/fake clocks and negative inputs. |
| Database integration | Real PostgreSQL constraints, revision conflicts, scoped foreign keys/RLS, pooled connection reset, job claim/fencing, transactions/outbox and migrations. | T-DB01/T-JOB tasks; temporary isolated DB. File/Redis mocks are not substitutes. |
| Adapter contract | Published schema plus actual accepted permissions, methods, forms/JSON/multipart, required fields, response canonicalization, source filters and pagination. | T-D02/T-QUAL02; redacted account receipts by operation. |
| End to end | Authenticated source → preparation → approval → queue → native result → read-back → required handoffs → parent closure. | TEST-A01–A35 with actual automated/native scope distinguished. |
| Security | Identity/session/CSRF, object/field/branch/service authorization, XSS/CSP, upload/SSRF, injection/export, secrets, abuse, pipeline and privacy. | T-QUAL04; ASVS applicability and control-specific cases/evidence before sensitive release. |
| Performance | Accepted 1x/2x peak and outage backlog, mixed OCR/read/urgent work, vendor throttles, DB contention, memory and evidence storage. | Q11-approved profile and thresholds; T-QUAL04/05. |
| Failure/recovery | Worker interruption, uncertain native results, partial workflow success, cursor expiry, storage loss, rollback and point-in-time restore. | T-OPS05 and fault cases, including external replay quarantine. |
| OCD UAT | Correct real-world rule, owner, exception and completion evidence for each scoped opportunity. | Designated operations/HR/bookkeeper/supervisor acceptance, not only engineering approval. |
| Deferred/process review | Verify native/manual owner and boundary for later tasks rather than testing an unbuilt feature. | TEST-A17/A23–A27/A29/A30/A34/A35 and T-GOV tasks. |

## Mandatory security scenarios

1. Authenticate with wrong tenant/issuer/audience, altered state/nonce, reused callback and unsupported token algorithms. Exercise accepted PKCE/MFA policy, recovery, offboarding, session rotation/revocation and idle/absolute expiry.
2. Repeat every read/action/file/export with the wrong role, branch, organization, person/representative or service identity. Test direct API requests even when the UI hides a button. Test null-branch triage, field projection and pooled DB context reuse.
3. Attempt same-site/cross-site mutation without the expected CSRF token, using missing/foreign Origin and spoofed forwarded host/protocol headers. Check CORS, secure host cookies, GET safety and HTTPS behavior behind the actual proxy.
4. Render hostile mail, notes, instructions, filenames, links and templates. Verify safe text/HTML handling, no remote tracking by default, CSP/map compatibility and no sensitive browser cache/local persistence.
5. Send unexpected role/pay/native-operation fields, malformed JSON/dates/IDs, SQL/path/header/regex payloads, overflow values and mixed distance/time/currency. Open test exports in the accepted spreadsheet client and verify formula-injection protection.
6. Exercise rejected MIME/signatures/extensions, malicious/malformed/oversized files and scanner/parser outages. OCR cannot access privileged networks/tools or unlimited CPU/memory. Unscanned/unreadable evidence cannot become a verified native filing.
7. Try download userinfo, redirects, alternate/private IPv4/IPv6, metadata addresses, unexpected ports, DNS changes and expired signed links. Enforce destinations, response limits and integrity checks.
8. Scan artifacts/logs/errors/traces for secrets and private payloads. Rotate/revoke credentials and encryption access. Try to alter approvers/audit or bypass approval through ingestion, a worker token, an export or an administrative endpoint.
9. Flood login, public forms, OCR, export and vendor reads; verify cost/request budgets, fair urgent processing and bounded failure states. Untrusted PR/build inputs must not receive production credentials.

10. Call held case/opportunity types through every legacy/new API and worker path while their raw native method is accepted. The release manifest must reject them before a mutation or sensitive feature exposure. In P2 test denial of unaccepted portal/demo routes; complete the positive inherited-map tests in P3 rather than falsely requiring the entire portal before the first office pilot.

The pinned [ASVS register](asvs-applicability.csv) assigns initial task/test families to 253 L1/L2 IDs and four selected L3 IDs. T-A03 must determine applicability and define detailed cases, including justified non-applicability. A family mapping alone is not evidence that every control passed. Q35 blocks relevant release until that review and its evidence are complete.

## Failure matrix

| Injected failure | Required behavior |
|---|---|
| Duplicate source, same ID/version | Stable existing version/case result; no duplicate intent. |
| Changed content using the same source version | Conflict/quarantine with original preserved; no silent overwrite. |
| Old event after newer evidence | Cannot restore old approval or overwrite current truth. |
| Native 401/403/validation/state rejection | Block with owner-visible reason and refresh/review path; do not retry as a transient write. |
| Native 429 or temporary read failure | Respect accepted Retry-After/budget, bounded backoff/jitter and completeness state. |
| Write timeout/5xx with possible remote effect | Persist uncertainty; reconcile actual native state before another mutation. |
| Slow read-back/eventual consistency | Keep awaiting verification with bounded reads; absence alone is not proof that a create failed. |
| Worker crashes before dispatch marker | Retry only while action still authorized and no dispatch is recorded. |
| Worker crashes after dispatch or before receipt commit | Another lease cannot authorize an independent mutation; reconcile first. |
| Source/policy/native/approver permission changes | Stop stale dispatch; regenerate proposal/reapprove where necessary. |
| Cleanup succeeds, cancellation fails | Preserve both outcomes; keep parent open and escalate required correction. |
| Native success, communication/accounting follow-up fails | Keep native receipt; parent awaits mandatory child evidence. |
| Page missing, cap reached, wrong scope or unreadable file | Partial/unknown result, not empty/all-clear or zero pay. |
| Graph cursor invalid/expired | Re-import only within approved backfill scope with source deduplication; do not skip or silently collect the whole tenant. |
| DST/fortnight boundary/restart/multi-day outage | Versioned slot policy produces approved periods once, with bounded explicit catch-up. |
| Evidence upload/metadata commit interrupted | Quarantine/finalization state or orphan cleanup; no forged available file. |
| Database restored before later native writes or access/privacy changes | Isolate normal traffic; invalidate restored sessions; reconcile current grants, consents, deletions/holds and native effects before reads or dispatch resume. |
| Rollback while a call is in flight | Drain or mark uncertainty; do not infer native rollback from application rollback. |
| Worker/vendor unavailable during urgent safety issue | Existing human/native incident/contact procedure proceeds immediately. |

## Workflow acceptance and counting

Each original opportunity has one AUTO task and TEST-A case. For the 25 selected tasks, test the actual bounded output and remaining human/native steps. F means the named check/calculation/routing can operate automatically under approved inputs/rules. It does not mean the entire care/business process is unattended.

The first-core release needs its ten TEST-A cases plus affected common security/failure cases. Core20 adds the next ten, inherited map/privacy acceptance and regression. Target25 adds the five specific gates and aggregate cancellation/communication/correction tests. A source capture, UI demo or task creation is not a delivered end-to-end native process.

For AUTO-28, distinguish source checks/reviewed handoff from full payroll-system comparison. For AUTO-22, distinguish exception preparation from invoice/export approval. For AUTO-08/09, distinguish approved draft, task, sending, delivery and response. For AUTO-15, verify travel treatment before restricted cancellation and all required subsequent outcomes.

## Performance and recovery targets

T-D05 must measure actual users/roles, branches, messages/documents, sizes/pages, visits per financial period, supported vendor quotas and expected backlog. Test the approved peak and twice that profile, with realistic OCR and vendor delay. Collect p50/p95/p99 API latency, queue/urgent age, native error rate, duplicate count, DB lock/connection use, memory and backlog drain. Choose explicit pass thresholds under Q11; a test without a target cannot certify capacity.

Candidate recovery objectives are RPO 15 minutes/RTO 4 hours under Q16, subject to provider/cost approval. Rehearse DB, evidence and key recovery together. Measure lost time/data and end-to-end restoration, including the time to safely reconcile and resume dispatch. An empty DB restore or healthy process alone does not satisfy recovery.

## Release acceptance and evidence retention

Before real data, pass identity/access/privacy/safe-source/environment/support gates for the pilot scope. Before native writes, add accepted operation contracts, current-release security tests, recovery/stop controls and witnessed first outcomes. Before each expansion, rerun affected regression, privacy, performance and fault tests; do not treat an old receipt as proof of changed code/permissions.

Unresolved exploitable critical/high vulnerabilities or unaccepted sensitive-data paths block release. A documented residual-risk exception requires accountable approval, compensating controls, scope and expiry; it is not a blanket waiver. Keep test data, security evidence and incident details access-controlled under the approved retention schedule.

## Blueprint validation performed now

[validate-plan.py](validate-plan.py) checks only the documents/registers: identifiers, all original source coverage, task/test/decision/risk references, dependency DAG, selected20/gated5/later10 membership, local links, ASVS ID inventory and unchanged application hashes. The [final report](final-validation-report.md) records the separate critical review and results. These checks do not run the designed suite, connect production credentials or establish a secure application.
