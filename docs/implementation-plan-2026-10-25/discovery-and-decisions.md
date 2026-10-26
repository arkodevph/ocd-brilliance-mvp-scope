# Discovery and Open Decisions

The [main plan](../OCD_Custom_System_Implementation_Plan.md) does not substitute guesses for these decisions. Owner roles nominate the actual decision makers; every answer needs the listed evidence and blocks only the affected design/activation until resolved.

**Inventory:** 36 open questions, including 14 critical gates. No answer or approval is inferred from elapsed time.

## Q01 ShiftCare access

**Priority:** Critical. **Owner:** OCD account admin + integration lead. **Status:** Open; owner confirmation required.

Which account/region/entitlement and exact operations/fields may the application use?

**Required evidence:** Public docs plus authorized account receipts; no guessed permissions.

**Resolution task:** T-D02. **Blocks:** Before connector activation.

## Q02 Intake and native feature trial

**Priority:** High. **Owner:** OCD admin + integration lead. **Status:** Open; owner confirmation required.

Which forms/fields and native Inbox Signals/Referrals gaps remain after representative trials?

**Required evidence:** Approved samples, field mapping and accuracy/error acceptance.

**Resolution task:** T-D02. **Blocks:** Before custom extraction/onboarding activation.

## Q03 Coverage and capacity

**Priority:** High. **Owner:** OCD operations owner. **Status:** Open; owner confirmation required.

Which areas, negotiable exceptions, capacity checks and activation rules are approved?

**Required evidence:** Versioned area/stage/capacity rules.

**Resolution task:** T-D03. **Blocks:** Before coverage and stage automation.

## Q04 Cancellation policy

**Priority:** Critical. **Owner:** OCD owner + bookkeeper. **Status:** Open; owner confirmation required.

What cause/notice/charge rules and untravelled provider-travel cleanup are required?

**Required evidence:** Approved examples including financially locked and partial-failure cases.

**Resolution task:** T-D03. **Blocks:** Before AUTO-15 native execution.

## Q05 Payroll product and calendar

**Priority:** High. **Owner:** Payroll owner. **Status:** Open; owner confirmation required.

Which payroll vendor, periods, payment date/method and carried field actually apply?

**Required evidence:** Confirmed vendor/calendar and source field examples; no zeroing a wage rate.

**Resolution task:** T-D03. **Blocks:** Before payroll-period automation; pay release stays native.

## Q06 Billing mappings and recipient authority

**Priority:** High. **Owner:** Bookkeeper. **Status:** Open; owner confirmation required.

Who approves service categories, tax, special instructions and payer changes?

**Required evidence:** Accountant-approved mappings and recipient change evidence.

**Resolution task:** T-D03. **Blocks:** Before billing-rule activation.

## Q07 Billing cadence and escalation

**Priority:** High. **Owner:** Bookkeeper + operations owner. **Status:** Open; owner confirmation required.

Does Tuesday remain current, what period/cutoff applies, and which invoices need senior review?

**Required evidence:** Approved review calendar and escalation rules.

**Resolution task:** T-D03. **Blocks:** Before scheduled invoice review.

## Q08 Identity provider and MFA

**Priority:** Critical. **Owner:** OCD IT owner + security lead. **Status:** Open; owner confirmation required.

Can the current tenant enforce staff MFA/OIDC and which external identity path serves enabled portals?

**Required evidence:** Provider/tenant policy, recovery, disablement and session acceptance.

**Resolution task:** T-D04. **Blocks:** Before real-data staff/portal exposure.

## Q09 Durable job library and host topology

**Priority:** High. **Owner:** Technical lead. **Status:** Open; owner confirmation required.

Which supported job component/runtime and persistent host fit the approved workload?

**Required evidence:** Compatibility and worker outage/fencing trial; cost review.

**Resolution task:** T-A01. **Blocks:** Before queue/hosting commitment.

## Q10 Branches and account mappings

**Priority:** Critical. **Owner:** OCD owner + integration lead. **Status:** Open; owner confirmation required.

How do operational branches map to ShiftCare accounts, Xero organizations, mailboxes and authorized staff?

**Required evidence:** Explicit scope matrix and cross-account identity rules.

**Resolution task:** T-D04. **Blocks:** Before scoped migration; before branch access.

## Q11 Volumes and performance targets

**Priority:** High. **Owner:** Operations owner + technical lead. **Status:** Open; owner confirmation required.

What are actual peaks, attachment/visit volumes, backlog and acceptable response/drain times?

**Required evidence:** Measured profile and approved load/SLO targets.

**Resolution task:** T-D05. **Blocks:** Before capacity and performance acceptance.

## Q12 Vendor limits and source completeness

**Priority:** High. **Owner:** Integration lead. **Status:** Open; owner confirmation required.

Which account quotas, feature flags, filters, cursors and pagination caps apply?

**Required evidence:** Accepted bounded reads and throttle/backfill rules.

**Resolution task:** T-D02. **Blocks:** Before scheduled account-wide reads.

## Q13 Mileage travel and adjustments

**Priority:** Critical. **Owner:** Bookkeeper/payroll owner. **Status:** Open; owner confirmation required.

Which units/rates, first-job treatment, effective dates and communications are approved?

**Required evidence:** Verified examples from real screens and written policy.

**Resolution task:** T-D03. **Blocks:** Before financial/travel rule activation.

## Q14 Sensitive permissions and role owners

**Priority:** Critical. **Owner:** OCD privacy/operations owner. **Status:** Open; owner confirmation required.

Who can read care/HR/finance fields, approve native effects and access each branch or person?

**Required evidence:** Named capability/relationship matrix and negative examples.

**Resolution task:** T-D04. **Blocks:** Before real data or native writes.

## Q15 Privacy retention and processor approval

**Priority:** Critical. **Owner:** OCD privacy owner + qualified adviser. **Status:** Open; owner confirmation required.

Which jurisdictional obligations, legal basis, residency, retention/holds and external data processors apply?

**Required evidence:** Approved data inventory/purpose/retention/processor schedule.

**Resolution task:** T-D04. **Blocks:** Before real data, backups or third-party processing.

## Q16 Hosting recovery and key ownership

**Priority:** Critical. **Owner:** OCD owner + platform lead. **Status:** Open; owner confirmation required.

Which provider/region, RPO/RTO, backup retention and key-recovery access are approved?

**Required evidence:** Provider evidence, recovery target signoff and restore test.

**Resolution task:** T-D05. **Blocks:** Before production persistence or cutover.

## Q17 Communication coverage and sending

**Priority:** High. **Owner:** OCD operations owner. **Status:** Open; owner confirmation required.

Which native channels/folders/recipients and delivery/response evidence are required?

**Required evidence:** Approved channel policy; Graph Mail.Send stays disabled unless separately accepted.

**Resolution task:** T-D04. **Blocks:** Before outbound/history expansion.

## Q18 Documents and signing

**Priority:** High. **Owner:** OCD document/HR owner. **Status:** Open; owner confirmation required.

Which types, signature/version checks, expiry meanings, visibility and existing signing provider apply?

**Required evidence:** Approved document matrix and native resource examples.

**Resolution task:** T-D03. **Blocks:** Before filing/renewal/correction activation.

## Q19 Missing intake date

**Priority:** High. **Owner:** OCD admin. **Status:** Open; owner confirmation required.

Which date does the transcript mean and what is the verification process?

**Required evidence:** Original form/sender evidence.

**Resolution task:** T-D03. **Blocks:** Before changing that required field.

## Q20 Certificate fragment

**Priority:** High. **Owner:** OCD HR/admin owner. **Status:** Open; owner confirmation required.

Which certificate request, destination and completion evidence were intended?

**Required evidence:** Original request and approved document task; otherwise keep unconfigured.

**Resolution task:** T-D03. **Blocks:** Before adding certificate-specific rules.

## Q21 Report fragment

**Priority:** Medium. **Owner:** OCD owner. **Status:** Open; owner confirmation required.

Which report, inputs, period, audience and deadline were intended?

**Required evidence:** Confirmed report definition or explicit deferral.

**Resolution task:** T-D03. **Blocks:** Before dedicated report implementation.

## Q22 Contract fragment

**Priority:** High. **Owner:** OCD HR owner. **Status:** Open; owner confirmation required.

What employee-contract work was actually requested?

**Required evidence:** Confirmed request and existing native/signing process; no new contract engine inferred.

**Resolution task:** T-D03. **Blocks:** Before any new contract workflow.

## Q23 Care and feedback exception rules

**Priority:** High. **Owner:** OCD supervisor. **Status:** Open; owner confirmation required.

Which factual flags, audiences, feedback timing and urgent escalation route are approved?

**Required evidence:** Reviewed cases and restricted escalation policy.

**Resolution task:** T-D03. **Blocks:** Before care/feedback alerts.

## Q24 Booking and recurrence scope

**Priority:** High. **Owner:** OCD rostering owner. **Status:** Open; owner confirmation required.

Which one-off/group/series operations, dates, offers and notification settings are accepted?

**Required evidence:** Exact scope previews and per-operation native trials.

**Resolution task:** T-D03. **Blocks:** Before corresponding roster writes.

## Q25 Worker readiness and native access semantics

**Priority:** Critical. **Owner:** OCD HR + account admin. **Status:** Open; owner confirmation required.

Which role, invitation, access and screening steps actually make a worker ready?

**Required evidence:** Native account behaviour verified; no_access metadata is not treated as access revocation.

**Resolution task:** T-D03. **Blocks:** Before staff creation/readiness claims.

## Q26 Accounting integration boundary

**Priority:** High. **Owner:** Bookkeeper + account admin. **Status:** Open; owner confirmation required.

Which Xero organization, native export/contact links and later OAuth read scopes are authorized?

**Required evidence:** Stable ID references and accepted native handoff; later read connector separately approved.

**Resolution task:** T-D02. **Blocks:** Before accounting-link claims or later ledger automation.

## Q27 Inherited portals and maps

**Priority:** High. **Owner:** OCD product/privacy owner. **Status:** Open; owner confirmation required.

Which existing Office/Worker/Client views become live, and which discussed portal slices remain native or disabled?

**Required evidence:** Retain approved L01 maps; separately approve identities, representatives, field views and optional arrival.

**Resolution task:** T-D06. **Blocks:** Before portal exposure; inherited-feature acceptance.

## Q28 Native concurrency and correlation

**Priority:** Critical. **Owner:** Integration lead + OCD native owner. **Status:** Open; owner confirmation required.

Does the account support versions/ETags/idempotency/correlation for each write, and how are concurrent native edits handled?

**Required evidence:** Accepted preflight/read-back and uncertain-outcome policy; race limitation recorded.

**Resolution task:** T-D02. **Blocks:** Before external dispatch acceptance.

## Q29 Maintenance and incident ownership

**Priority:** Critical. **Owner:** OCD owner. **Status:** Open; owner confirmation required.

Who is the named maintainer, backup, incident contact and vendor escalation owner?

**Required evidence:** Accepted support roster, access and exercised escalation.

**Resolution task:** T-D05. **Blocks:** Before any live service.

## Q30 Budget and outcome baseline

**Priority:** High. **Owner:** OCD owner. **Status:** Open; owner confirmation required.

What infrastructure/support/change budget and measured business baseline are approved?

**Required evidence:** Budget and comparable handling/error measures.

**Resolution task:** T-D05. **Blocks:** Before hosting commitment and ROI claims.

## Q31 Freshness timezone and outage policy

**Priority:** High. **Owner:** Operations/bookkeeper + integration lead. **Status:** Open; owner confirmation required.

Which source freshness windows, period anchors and missed-run rules apply by workflow/branch?

**Required evidence:** Approved time/freshness/catch-up policies and test cases.

**Resolution task:** T-D03. **Blocks:** Before schedules or fresh-state claims.

## Q32 Legacy migration completeness

**Priority:** Critical. **Owner:** OCD data owner + data engineer. **Status:** Open; owner confirmation required.

Which file/Redis/PostgreSQL store is authoritative, what retained history exists, and which pending jobs need reconciliation?

**Required evidence:** Inventory, retained counts/hashes, pending-action decisions and cutover/rollback review.

**Resolution task:** T-DB02. **Blocks:** Before storage cutover.

## Q33 Sensitive operation approval policy

**Priority:** High. **Owner:** OCD owner + security reviewer. **Status:** Open; owner confirmation required.

Which operations need fresh authentication or a second approver; what bulk/financial limits apply?

**Required evidence:** Capabilities and thresholds approved; undefined high-impact operations remain disabled.

**Resolution task:** T-D03. **Blocks:** Before sensitive or bulk writes.

## Q34 Service fallback and urgent coverage

**Priority:** Critical. **Owner:** OCD supervisor + service owner. **Status:** Open; owner confirmation required.

How do staff handle urgent safety, missed visits and owner absence during an automation outage?

**Required evidence:** Witnessed fallback procedure and actual escalation coverage.

**Resolution task:** T-D05. **Blocks:** Before live operational reliance.

## Q35 Security acceptance and exceptions

**Priority:** Critical. **Owner:** OCD accountable owner + security reviewer. **Status:** Open; owner confirmation required.

Who approves ASVS applicability, test evidence and time-bounded residual risks?

**Required evidence:** Named reviewer, no unaccepted exploitable critical/high risks, evidence and expiry for exceptions.

**Resolution task:** T-A03. **Blocks:** Before real-data and native-write releases.

## Q36 Administrative process ownership

**Priority:** Medium. **Owner:** OCD operations owner. **Status:** Open; owner confirmation required.

Who owns phone/groups/licences/training/offboarding/supplier work and what evidence shows it is done?

**Required evidence:** Named existing-tool checklists and observed outcomes.

**Resolution task:** T-GOV02. **Blocks:** Before claiming process remedies complete.
