# Final Implementation Plan Validation Report

**25 October 2026. Review scope: the implementation blueprint and its evidence, not application implementation, account acceptance or security certification.**

**Final structural status:** PASS for planning structure and coverage.

The saved draft received a separate critical review after the main plan, architecture, testing, deployment and registers were written. 10 findings were addressed in the blueprint. The review was a separate pass by the same planning assistant; it is not an independent penetration test or external security assessment. The [draft hashes](review-pass-1-snapshot.json), [first structural results](review-pass-1-results.json), [review findings](critical-review-findings.csv) and [current structural results](validation-results.json) retain that distinction.

## Verified documentary coverage

| Evidence or control set | Verified planning result | What remains unverified |
|---|---|---|
| 27 original register entries | Every A/P/L/T/B entry has an explicit task/disposition, owner and validation path. | Current business practice and final policy approval require owner walkthrough. |
| 96 recorded pain points | Every recorded item is mapped to a selected opportunity, native/manual/process remedy or explicit later treatment. | Inclusion is not an adjudication of reported service/personnel concerns. |
| 35 opportunities | Original numbers/titles preserved; 20 core, five gated additions and ten later/native dispositions. | No workflow is claimed implemented by the planning artifacts. |
| 35 transcript work groups | Every C20 TR entry is mapped, including ambiguous report/certificate/contract fragments. | Missing meaning remains Q19–Q22 rather than a fabricated feature. |
| 57 secondary findings | All 34 R14 M1 and 23 R21 NEW findings are linked through the recorded inventory. | These remain source analyses rather than independent current observation. |
| 35 technical/control requirements | Functional, security, reliability, deployment and plan-review requirements have implementation and validation paths. | Controls and tests are future work. |
| 257 pinned ASVS IDs | 253 L1/L2 and four selected L3 controls have initial task/test families and pending applicability status. | Control-specific applicability/evidence is still T-A03/Q35 work; no ASVS pass is claimed. |
| 83 tasks and 67 designed test cases/families | References, owners, outputs and acceptance are recorded. | Tests are not executed by blueprint validation. |

Source totals count evidence/control rows, not distinct new business features. The [285-row matrix](requirements-traceability.csv) preserves source status and manual/conditional scope.

## Separate critical review and revisions

| Finding | Draft gap | Revision in the blueprint |
|---|---|---|
| REV-01 Critical | Read-only real-data pilot lacked a direct current-release security prerequisite. | Add T-QUAL04 to T-REL01 and retain privacy/support gates. |
| REV-02 High | Restore needed explicit protection against resurrected permissions, consents or deleted data. | Isolate normal traffic, invalidate sessions and reconcile current grants/privacy changes before reads or writes. |
| REV-03 High | Later portal hardening could leave unaccepted demo/live routes exposed in the first pilot. | Require a route manifest and P2 denial subset; retain full inherited-map acceptance in P3. |
| REV-04 Medium | Structural pass found conditional TEST-XERO without a task owner/path. | Link to later accounting dispositions; future connector tests remain conditional. |
| REV-05 Medium | Deferred AUTO entries shared the generic Planned status with implementation work. | Label ten entries disposition review only; future implementation needs separate scope approval. |
| REV-06 High | Aggregate closure lacked explicit dependency-cycle and stale-closure tests. | Reject invalid graphs and atomically check current child outcomes; preserve receipts on correction. |
| REV-07 Medium | Hash-only application checks could miss a newly added source/config file. | Compare current checked application path inventory and baseline hashes. |
| REV-08 Critical | Raw operation enablement could bypass a gated workflow through legacy/new/worker paths. | Bind release manifest to case/opportunity/account/operation/fields and required guard versions; test held cancellation/ETA denial. |
| REV-09 Medium | Documentation regeneration depended on a session-temporary ASVS CSV. | Store an offline control metadata index verified against the pinned official source hash. |
| REV-10 Medium | Evidence wording leaned toward a mandatory separate object store before workload/provider decisions. | Retain the existing private PostgreSQL byte backend when bounded capacity/recovery tests pass; select an object store only when justified. |

These are planning revisions. Each finding points to future implementation tasks and validation cases in the review CSV. The corresponding controls remain unimplemented and risks remain open until evidence is produced.

The initial structural pass also correctly reported the final-report artifact was not yet present. It is now included. The orphan TEST-XERO was linked to the later accounting disposition tasks and remains conditional; an unbuilt ledger connector is not required for core20 acceptance.

## Second pass semantic review

After revision, the following end-to-end assumptions were challenged again:

- **Capture and scope:** an unassigned enquiry remains owned in restricted central triage; branch-null cannot authorize a native action or broad private lookup.
- **Onboarding:** source extraction and candidate matching do not establish consent/identity; native profile creation does not prove service, HR, access or accounting/payroll readiness.
- **Reminder reply:** mailbox/shift evidence must establish the exact occurrence; quoted references, silence or unverified sender text cannot cause cancellation.
- **Cancellation:** accepted cleanup precedes restricted cancellation; lost response, failed later action and incomplete communication keep the parent open without unsafe rollback/resend.
- **Financial preparation:** current source completeness, explicit periods/units and native pricing/export are retained; missing data is not zero pay and a direct payroll/ledger interface is not assumed.
- **Inherited views:** L01 role-specific maps remain traced, while unaccepted portal/demo paths are disabled before real data; full map/privacy acceptance remains required for core20 expansion.
- **Dispatch authorization:** all legacy/new/worker paths check the accepted case/opportunity plus account/operation/fields and guard/policy versions, not a raw-operation flag alone.
- **Recovery:** both native effects and current access/consent/privacy changes must be reconciled after restore before ordinary users or dispatch resume.
- **Operations:** provider/account failures, staffing shortages, unsafe files and uncertain deliveries have owned fallback; no emergency care outcome waits for automation.

No further unowned critical planning gap was identified in this pass. This does not establish that all actual requirements are known or that a future implementation will satisfy the controls. Unanswered business/security questions below remain binding gates.

## Unresolved decisions and release blockers

All 36 questions remain open for the actual owners; 14 are marked critical. The full [decision register](discovery-and-decisions.md) records resolution tasks and evidence. Actual names must be assigned to the owner roles before execution.

| Critical decision | Accountable role | Blocked point |
|---|---|---|
| Q01 ShiftCare access | OCD account admin + integration lead | Before connector activation |
| Q04 Cancellation policy | OCD owner + bookkeeper | Before AUTO-15 native execution |
| Q08 Identity provider and MFA | OCD IT owner + security lead | Before real-data staff/portal exposure |
| Q10 Branches and account mappings | OCD owner + integration lead | Before scoped migration; before branch access |
| Q13 Mileage travel and adjustments | Bookkeeper/payroll owner | Before financial/travel rule activation |
| Q14 Sensitive permissions and role owners | OCD privacy/operations owner | Before real data or native writes |
| Q15 Privacy retention and processor approval | OCD privacy owner + qualified adviser | Before real data, backups or third-party processing |
| Q16 Hosting recovery and key ownership | OCD owner + platform lead | Before production persistence or cutover |
| Q25 Worker readiness and native access semantics | OCD HR + account admin | Before staff creation/readiness claims |
| Q28 Native concurrency and correlation | Integration lead + OCD native owner | Before external dispatch acceptance |
| Q29 Maintenance and incident ownership | OCD owner | Before any live service |
| Q32 Legacy migration completeness | OCD data owner + data engineer | Before storage cutover |
| Q34 Service fallback and urgent coverage | OCD supervisor + service owner | Before live operational reliance |
| Q35 Security acceptance and exceptions | OCD accountable owner + security reviewer | Before real-data and native-write releases |

Other open questions include forms/native feature fit, coverage, billing/payroll calendars, ambiguous source fields, document requirements, recipients/channels, booking scope, inherited portal slices, performance/load and budget. They block the affected features even where another scope can progress.

## Current implementation gaps retained in the plan

| Observed foundation or gap | Future task and validation |
|---|---|
| Hono/React and shared workflow runtime exist; older architecture labels can be stale. | T-A01, T-UI01; TEST-REVIEW. |
| Office authentication uses environment account passwords and a signed-cookie prototype. | T-SEC01/03; TEST-ID/WEB. |
| Current roles/account scope are insufficient for final care/HR/finance/branch/field permissions. | T-SEC02, T-PORTAL01; TEST-AUTHZ/MAPS. |
| Whole-account JSON storage, retained-history caps and legacy store selection need deliberate migration. | T-DB01/02; TEST-MIGRATE/RESTORE. |
| Worker prepares cases; staff API currently executes approved actions. | T-JOB01/02/03; TEST-QUEUE/REPLAY/REMOTE. |
| Native job verification can complete before a separate communication job is finished. | T-JOB03, AUTO-33; TEST-AGG/HANDOFF. |
| Current cancellation adapter has no travel/mileage cleanup. | AUTO-15; TEST-A15/AGG/CONTRACT. |
| New booking/instruction/recurrence/event/invoiceable adapters are not established merely by public API support. | T-A04/INT01/INT03 and relevant AUTO tasks; TEST-CONTRACT/COMPLETE. |
| No direct Xero or production payroll connector is implemented; automatic outgoing communication is absent. | Keep scoped preparation/native handoffs; later AUTO-23/24/26/27/29 and gated AUTO-09; conditional tests. |
| Branch mapping, source completeness/freshness, missed schedules and actual device/portal acceptance remain necessary. | T-OPS06, T-JOB04, T-PORTAL01; TEST-AUTHZ/SCHEDULE/LOAD/MAPS. |

Public vendor contracts establish candidates, not account permissions or successful live operations. Known manual/native boundaries are retained rather than hidden by optimistic workflow names.

## Validation method and limits

The [validator](validate-plan.py) checks identifier uniqueness, source coverage, task/test/decision/risk references, dependency cycles, selection counts, inherited-map retention, selected security/recovery gates, CSV consistency, pinned ASVS IDs, local links and unchanged application hashes/path inventory. It cannot prove the quality of an approval, a legal/privacy interpretation, an external interface or a running security control.

The [source register](source-register.json) records local evidence hashes and official references. The [application baseline](source-baseline.json) covers 210 application/test/config files, including pre-existing uncommitted work. No application code, configuration, migrations, CI pipeline, dependency installation, native account action or deployment was performed by this planning task. Only documentation/register builders and documentation checks were run.

The designed unit/integration/E2E/security/performance/recovery suites are not executed. The previous 24 October backend build and 47 isolated-test passes remain historical mock/local evidence only. This review is not a claim that the prototype is production-ready, secure, compliant or approved for real data.

## Final disposition

The blueprint is complete for owner/technical review and source-backed discovery. All identified critical planning gaps are addressed in the revised documents or explicitly retained as owned unresolved gates. Architecture/provider/rule details dependent on those answers remain provisional. Future implementation and release require the roadmap acceptance evidence; no unresolved gate is waived by this report.
