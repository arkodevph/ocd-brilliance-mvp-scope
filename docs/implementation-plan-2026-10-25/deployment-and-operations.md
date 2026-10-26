# Deployment and Operations Strategy

This is a future execution strategy. Hosting, environments, CI/CD, migrations, monitoring and infrastructure are not provisioned or executed during this planning task. The [roadmap](roadmap.md) and [decisions](discovery-and-decisions.md) define owners and blocking evidence.

## Topology and provider selection

Prefer a persistent API/BFF process and separate worker process from the same modular codebase, managed PostgreSQL, private evidence storage and approved identity/secrets services. The existing PostgreSQL byte store is an initial evidence option if measured capacity/recovery acceptance passes; a private object store is conditional on the workload, not a mandatory new vendor. Start with measured demand and scale API/read/OCR/dispatch concurrency separately within vendor budgets. No Kubernetes/Kafka/microservice programme is required for the identified scope.

The existing static/Vercel path may continue serving appropriate frontend or bounded requests. An endless background worker needs a host that supports persistent processes. Avoid two competing production case stores or API deployments with different session/scope policy. Same-origin frontend/API routing is preferable; any cross-origin topology must pass the explicit CORS/CSRF/session tests.

Q16 selects the host/region, backup and key services after checking residency, private networking, TLS/egress, runtime/DB support, persistent worker behavior, restore/export evidence, observability and cost. The use-railway guidance was consulted for environment/service isolation and deployment verification, not to select Railway or run its CLI.

## Environment contract

| Environment | Data and vendor access | Safeguards |
|---|---|---|
| Development | Synthetic cases, fake connectors, disposable local PostgreSQL/evidence and local test identity. | Demo records are labelled; no live secrets or auto-created production users. |
| Staging | Separate DB/evidence backend/keys/identity/worker; approved test mailbox and sandbox/designated native records. | Native writes disabled by default; actual trial scope accepted; no automatic production snapshot copy. |
| Production | Accepted region/data purpose, specific accounts, authenticated actors and only enabled native methods/fields. | Fail closed on absent required storage/identity; no local-file fallback, development personas or shared staging credentials. |

Keep environment identity explicit in configuration, secrets, artifacts, dashboards and trial receipts. Runtime, worker, migration, deploy and emergency recovery identities have different privileges. The normal runtime cannot change schema or secret access; the queue library's schema bootstrap must fit that rule. Store native credentials in the approved secret facility and scope Graph to designated resources using tenant-supported controls verified in Q01/Q08/Q17.

## Future pipeline

1. On a proposed change, validate types/builds, domain/database/permission tests, relevant E2E tests, source/secret scans, dependency/SBOM and static security checks. Use lockfiles and pinned compatible tooling. Untrusted PR jobs get no production credentials.
2. Build an immutable artifact and record source hash, dependency/runtime versions, schema range and job/command versions. Promote the same digest rather than rebuilding differently for production.
3. In isolated staging, run pending additive migrations once under the migration identity, with a lock/checksum ledger. Rehearse data/backfill and rollback where relevant.
4. Deploy staging API/worker with correct environment identity, run smoke, contract, authorization, security/failure and applicable performance checks. Document actual account trial boundaries.
5. Review unresolved decisions/risks, privacy/source/operation acceptance, support and recovery proof for the release scope. Promote through protected permissions after the accountable reviewer approves the concrete artifact and manifest.
6. Observe the specific deployment ID reach an accepted healthy state; verify readiness, DB/schema compatibility, worker heartbeat, source freshness and an allowed non-mutating smoke path. Upload success, process exit zero or a newer concurrent deployment is not proof of this release.
7. Enable accepted case/opportunity scopes individually after read-only comparison, binding account/operation/fields and required guard/policy versions in the release manifest. Legacy/new/worker routes enforce the same manifest. Accepting a raw cancel or location interface cannot enable a held cancellation/arrival workflow. Witness approved first actions and read-back, then watch reconciliation/delivery/queue metrics before expanding.

The actual CI provider and configuration remain implementation work under T-OPS01/SEC07. The repository currently has no established `.github` pipeline in the inspected snapshot. Do not invent an existing production automation or secret deployment connection.

The current prototype includes uncommitted/untracked application work. Before future CI implementation, review and establish a version-controlled baseline containing the accepted sources and migrations; HEAD alone does not describe the inspected working tree. This planning task preserves that work and does not commit it.

## Migration and cutover runbook

1. Q32 identifies the authoritative retained file/Redis/PostgreSQL store, evidence locations, connector cursors and every old writer/worker. Record current caps and any known already-pruned history.
2. Back up/export the actual retained source and test recovery access. Preserve originals and hashes; do not read credentials into logs or source control.
3. Add new numbered migrations; never edit applied 001–003 or bypass checksum checks. Define how larger indexes/backfills will avoid unacceptable locks. The current runner's all-transaction behavior must be considered before introducing nontransactional online indexes.
4. Dry-run the transformer in isolated staging. Establish explicit organization/branch/account/person mappings; quarantine unresolved mappings. Reconcile counts, source links, history and evidence-byte hashes. Missing retained history is an owned limitation, not invented reconstruction.
5. Import legacy approved/queued/in-flight external work into a hold/reconciliation state. Keep completed receipts with original API/manual provenance. No newly imported approval automatically dispatches.
6. Stop old writers/collectors and drain or classify in-flight native calls. Take the final checkpoint/export and migrate its delta. Switch reads/writes/cursors to the new source of truth once; do not operate uncoordinated dual writers.
7. Run acceptance queries, scope tests, smoke and evidence checks. Resume collection in the approved window with replay protection. Reconcile pending/native outcomes and obtain fresh approval where needed before enabling dispatch.
8. Retain old data read-only for the accepted rollback/retention window. Remove it only after owner acceptance, backup/recovery confirmation and any legal hold checks.

Never treat setting DATABASE_URL as automatic data migration. A migration failure must not make production silently fall back to another local or Redis dataset.

Preparation and synthetic trials can begin in P1. Actual retained-data import/cutover is T-DB02 in P2, after accepted privacy/source scope, identity/access, encrypted storage/audit and baseline recovery controls. Keep it isolated from ordinary users; the first real-data application pilot separately requires T-QUAL04. A controlled migration is not permission to expose the unfinished application.

## Health monitoring and alerting

| Signal | Detection and required response |
|---|---|
| API/DB readiness | Health endpoint reports minimal process/config/schema dependency state; no payloads or tokens. Failed readiness stops traffic safely. |
| Worker heartbeat/queue age | Alert on stopped worker, expired claims or accepted queue-age breaches; hold uncertain writes before restart/replay. |
| Source freshness | Track committed Graph/native read time and failed pages/cursors; show stale/incomplete results to staff. |
| Native operation outcomes | Count definite rejects, retries, read-back mismatches and unresolved dispatches by scoped operation. |
| Required child outcomes | Alert on overdue travel/accounting/communication work even when a native action succeeded. |
| Vendor quotas | Track throttles, Retry-After, request budgets and shared-account fairness; reduce load rather than add competing workers blindly. |
| Evidence/storage/scanning | Detect scanner failures, OCR saturation, missing bytes, quarantine backlog, disk/object errors and hash mismatch. |
| Backup/recovery | Monitor last successful DB/evidence backup and recovery coverage; failed backup is a support incident. |
| Security | Log redacted auth/permission failures, changed grants/keys, risky configuration and audit-integrity signals. |
| Business pilot | Compare actual handling/recovery time, corrections, overdue/unowned cases and accepted outcomes; do not report estimates as measured savings. |

Q11/Q29/Q34 approve numerical alert thresholds, response hours, primary/backup contacts and escalations. Alerts use the existing approved channel and minimum case references. Test that the named person actually receives and can act on an alert. A vendor outage alone should not trigger an uncontrolled app restart loop.

## Stop rollback and uncertain outcomes

The service owner must be able to hold dispatch globally and by provider/account/operation while preserving read-only review and evidence. The command itself is authorized, audited and does not erase queued intent. Restrict high-impact configuration changes; Q33 defines any fresh-auth/second-approval requirement.

For a faulty release, stop new claims, drain bounded in-flight calls and mark unconfirmed calls uncertain. Preserve receipts and versioned jobs. Roll back only to code compatible with the current schema/payloads; hold unknown job versions. Do not restore a database to undo a UI bug or assume a native cancellation/creation disappeared. Integration/native owners reconcile or approve any correction.

An operation can be disabled independently of the app. Existing native procedures remain available to staff. If identity is unavailable, use accepted IdP recovery and native operational fallback; do not add an undocumented application backdoor.

## Backup and disaster recovery

Candidate initial objectives are **RPO 15 minutes and RTO 4 hours**, pending Q16 approval and demonstrated provider/cost fit. Recovery includes safe reconciliation/resumption, not only a running database. No service commitment is inferred from these candidate numbers.

Use managed point-in-time database recovery and a consistent evidence-object/version manifest, with encrypted backups and recoverable access to necessary keys/configuration. Document retention, holds, failure alerts and restricted recovery privileges. A DB dump alone is not proof that original evidence can be recovered.

Restore into an isolated environment with normal user traffic and outbound dispatch disabled. Validate schema, object hashes/versions, encryption and source checkpoint. Invalidate all restored sessions. Reconcile current subject disablement, branch/field grants, representative consents, privacy deletions and legal holds against the current authoritative identity source and separately protected access/privacy audit evidence. If adequate evidence is unavailable, authorized owners must re-confirm the affected scope before normal reads or writes resume. A restored membership or undeleted old record is not current authorization.

Hold pending and apparently completed-to-checkpoint actions until external records and surviving protected audit/receipt evidence have been reconciled for the recovery interval. Include this access/privacy reconciliation in the measured recovery time; a restore is not complete merely because outbound writes remain disabled.

Native writes after the restored checkpoint may still exist while their local receipts are absent. Do not release restored outbox/jobs in bulk. The authorized recovery team must identify these effects and record reconciled receipts, or leave explicit unknown cases. Revalidate fresh approvals and source/native state before future mutation. Exercise this scenario in TEST-RESTORE.

For evidence/key loss or corrupt files, block the affected case and recover from a verified version; do not forge a source or silently declare completeness. Record which historical data cannot be recovered and obtain accountable decisions. Periodically test recovery after key rotation and retention changes.

## Incident and maintenance responsibilities

Nominate an OCD accountable owner, service maintainer/backup, native account administrator, integration engineer and privacy/security contact under Q29/Q35. During an incident they triage impact/scope, hold unsafe actions, retain evidence, rotate affected credentials where necessary and coordinate native reconciliation. Privacy/legal notification duties require the approved incident/legal process; this plan does not determine jurisdictional reporting obligations.

Rehearse urgent safety/missed-visit fallback with the supervisor. Such concerns use the existing incident/contact process without waiting for a job, email parser or unavailable vendor.

After release, approve recurring access/role/key/dependency/vendor-contract reviews, backup/restore drills and runbook handovers. Watch for API permission/schema/plan changes and changing source volumes. Apply changes first in staging, rerun affected contract/security tests, then roll out by accepted operation/account scope. Review support cost and observed value before adding the ten later opportunities or a branch.

## Release gates

| Gate | Minimum required evidence |
|---|---|
| Real data | Accepted purpose/processor/region/retention, identity/access, secure source/evidence, environment isolation, source scope and named support. |
| Native write | Actual accepted operation fields/state behavior, exact approval, replay/uncertainty/read-back proof, current-release security and recovery/stop controls. |
| Core20 | All selected scopes, financial/native handoffs, inherited-map privacy, negative/failure/performance results and business UAT. |
| Target25 | All five gated additions accepted; unavailable additions remain held and the delivered count remains explicit. |
| Another branch | Approved mappings, cross-scope negative tests, shared-account budgets, schedules, load and support/recovery capacity. |

No unresolved exploitable critical/high security issue or unowned safety/privacy/native-recovery dependency is bypassed because a feature is desired quickly. The [final validation report](final-validation-report.md) establishes planning coverage only; actual release gates remain future work.
