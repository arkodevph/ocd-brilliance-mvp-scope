# OCD complete workflow flowcharts

Proposed custom-system process design — 25 October 2026. All 35 opportunities are covered across W01–W14: 20 core, five gated additions and ten later/native dispositions. This is a planning artifact, not proof of live account integration.

[Open the interactive atlas](OCD_Complete_Workflow_Flowchart.html). Nodes show preparation, approval, owned native work, verification, incomplete outcomes and recovery. Dashed edges are conditional/secondary handoffs; they do not assert a vendor webhook.

The shared execution flow applies to each external effect in the business views. Bounded internal checks may run under approved deterministic rules. Native care, acceptance, signing, accounting and payroll retain their own authority.

## OCD proposed execution and recovery

```mermaid
flowchart TB
  subgraph capture["Authorized source and scoped case"]
    trigger["Authorized trigger<br/>Form, Graph, staff log or schedule"]
    capture["Capture and deduplicate<br/>Immutable source and version"]
    scope["Verify case scope<br/>Actor, branch, person and account"]
  end
  subgraph prepare["Evidence and exact proposal"]
    prepare["Run selected process<br/>Use the four business views"]
    evidence{"Evidence complete and fresh?<br/>Unknown is not an all-clear"}
    proposal["Prepare exact proposal<br/>Source, fields, policy and snapshot"]
  end
  subgraph hold["Office clarification and held scope"]
    clarify["Clarify missing evidence<br/>Owner and deadline remain visible"]
    held["Held or native-only scope<br/>No automatic dispatch or closure"]
  end
  subgraph review["Release policy and human approval"]
    release{"Released workflow and method?<br/>Case, account, fields and guards"}
    approve["Approve exact external effect<br/>Current role and auth freshness"]
    method["Select accepted method<br/>Internal, API or checked handoff"]
  end
  subgraph effect["Durable action or checked native handoff"]
    outbox["Commit intent and outbox<br/>Stable action and replay key"]
    preflight["Recheck native state<br/>Permission, locks and current scope"]
    dispatch["Persist fenced dispatch<br/>Before external I/O"]
    native["Call accepted native method<br/>No DB lock held over the network"]
    internal["Record internal check<br/>Approved deterministic rules"]
    manual["Perform owned native step<br/>Record actual checked reference"]
  end
  subgraph outcome["Independent evidence and parent completion"]
    verify{"Outcome independently verified?<br/>API read-back or labelled staff proof"}
    children{"All required outcomes complete?<br/>Travel, finance and communication"}
    done["Close parent with evidence<br/>Preserve source and audit trail"]
  end
  subgraph recovery["Uncertain outcomes and remaining work"]
    stale["Changed state or rejection<br/>Refresh evidence and re-review"]
    reconcile["Reconcile unknown outcome<br/>Read first; never blindly resend"]
    followup["Finish required child work<br/>A task is not delivery evidence"]
  end
  trigger --> capture
  capture --> scope
  scope -->|"Scope verified"| prepare
  scope -->|"Denied / unscoped"| held
  prepare --> evidence
  evidence -->|"Complete"| proposal
  evidence -->|"Missing"| clarify
  clarify -.->|"New version"| prepare
  proposal --> release
  release -->|"Held"| held
  release -->|"External effect"| approve
  release -.->|"Rules-only check"| method
  approve -->|"Approved"| method
  method -->|"Accepted API"| outbox
  method -.->|"Internal"| internal
  method -.->|"Native handoff"| manual
  outbox --> preflight
  preflight -->|"Current"| dispatch
  preflight -->|"Changed"| stale
  stale -.->|"Re-review"| prepare
  dispatch --> native
  native -->|"Observe result"| verify
  native -->|"Definite no-effect rejection"| stale
  manual -.->|"Checked proof"| verify
  internal -.->|"Internal receipt"| children
  verify -->|"Matches"| children
  verify -->|"Unknown / mismatch"| reconcile
  reconcile -.->|"Read-only check"| verify
  reconcile -.->|"Verified no effect; re-review"| stale
  children -->|"All complete"| done
  children -->|"Still pending"| followup
  followup -.->|"Actual evidence"| children
```

**Recovery and security invariants**

- A lost response is not permission to resend a create, cancellation or financial action.
- Cleanup success followed by cancellation failure remains a real partial outcome requiring review.
- After restore: hold normal traffic and dispatch; reconcile current access/privacy changes and newer native effects.
- Every legacy, new and worker path enforces the accepted case/operation/field/guard release manifest.
- Urgent safety response follows the existing human/native procedure without waiting for automation.

## Enquiries, onboarding and documents

```mermaid
flowchart TB
  subgraph intake["W01 / W02 · Enquiry capture and accountable ownership"]
    source["Receive authorized source<br/>Public form, mailbox or staff log"]
    op02["02 Collect enquiries<br/>Deduplicate without losing originals<br/>Core 1 · reviewed process"]
    op03["03 Assign owner and priority<br/>Agreed rules; uncertain items reviewed<br/>Core 1 · reviewed process"]
    op01["01 Check service coverage<br/>Configured area rules; retain decision<br/>Core 1 · bounded check"]
  end
  subgraph review["Evidence and process selection"]
    coverage{"Coverage outcome?<br/>Known result or office decision"}
    op04["04 Find missing information<br/>Configured fields; missing ≠ unknown<br/>Core 1 · bounded check"]
    route{"Evidence ready: which process?<br/>Reuse the verified person identity"}
    docReview["Scheduled document review<br/>Existing native records; no new intake"]
  end
  subgraph people["W03 / W04 · People and service details"]
    op05["05 Prepare participant profile<br/>Whitelist basic fields; preserve prospect<br/>Core 1 · reviewed process"]
    op07["07 Stage / service details<br/>Only if gate released and change needed<br/>GATED · reviewed process"]
    op06["06 Prepare worker onboarding<br/>HR checks and payroll readiness separate<br/>Core 1 · reviewed process"]
    peopleExec["Use shared execution<br/>Exact approval → native read-back"]
  end
  subgraph documents["W05 / W12 · Originals, completeness and renewal"]
    op18["18 Match and prepare filing<br/>Original, person, version and visibility<br/>Core 1 · reviewed process"]
    fileExec["Use shared execution<br/>Client upload or checked staff handoff"]
    op19["19 Check required evidence<br/>Presence / missing / unknown distinct<br/>Core 1 · bounded check"]
    docState{"What remains unresolved?<br/>Dates, genuine renewal or missing proof"}
    op20["20 Review date correction<br/>GATED; verify metadata semantics<br/>GATED · reviewed process"]
    op21["21 Renewal / coordinator chase<br/>Owner, next date and response evidence<br/>Core 2 · reviewed process"]
    dateExec["Use shared execution<br/>Approved metadata change + read-back"]
  end
  subgraph handoff["Verified records and connected workflows"]
    docsDone["Evidence complete and checked<br/>Signature and authenticity reviewed"]
    next["Hand off required next work<br/>Booking / HR / billing / communication"]
  end
  subgraph exceptions["Office clarification and native fallback"]
    clarify["Clarify and retain ownership<br/>No match, incomplete scan or ambiguity"]
    outside["Office disposition<br/>Coverage or service decision recorded"]
    nativeDate["Owned native date correction<br/>Use when gated adapter is unavailable"]
  end
  source --> op02
  op02 --> op03
  op03 -->|"New participant enquiry"| op01
  op01 --> coverage
  op03 -->|"Worker / existing record"| op04
  docReview -->|"Complete authorized metadata"| op19
  coverage -->|"Covered"| op04
  coverage -->|"Outside / declined"| outside
  coverage -->|"Unknown"| clarify
  op04 -->|"Complete"| route
  op04 -->|"Missing / unknown"| clarify
  clarify -.->|"New checked evidence"| op04
  route -->|"Participant"| op05
  route -->|"Worker"| op06
  route -->|"Existing person / document"| op18
  route -->|"Existing evidence check"| op19
  op05 -.->|"Stage change; gate released"| op07
  op05 -->|"Basic profile only"| peopleExec
  op07 -->|"Approved authoritative details"| peopleExec
  op06 -->|"HR review retained"| peopleExec
  peopleExec -.->|"Required document work"| op18
  peopleExec -.->|"No document work"| next
  op18 -->|"Person / version confirmed"| fileExec
  op18 -->|"Ambiguous match"| clarify
  fileExec -->|"Checked native original"| op19
  op19 --> docState
  docState -->|"All required evidence checked"| docsDone
  docState -->|"Date error; gate released"| op20
  docState -.->|"Date error; gate held"| nativeDate
  docState -->|"Genuine due / missing evidence"| op21
  op20 -->|"Exact correction approved"| dateExec
  dateExec -.->|"Verify corrected metadata"| op19
  nativeDate -.->|"Checked native reference"| op19
  op21 -.->|"Returned original"| op18
  docsDone -->|"Required handoffs still tracked"| next
```

**Onboarding and document boundaries**

- W03 participant activation, funding and agreed hours require approved authoritative evidence. Opportunity 7 is optional gated work; it does not block basic core profile preparation.
- W04 basic staff setup does not establish screening clearance, invitation acceptance, sign-in access or payroll readiness.
- W05 signatures remain native/manual. Original filing, valid signatures and a configured completeness check are separate outcomes.
- W12 repairs evidence-backed false dates before scheduling genuine renewal follow-up; native reminder sending is reused where suitable.
- A completed profile or upload does not complete its parent case when HR, billing, renewal or communication children remain.

## Bookings, confirmations, cover and arrival

```mermaid
flowchart TB
  subgraph triggers["W06 / W08 · Native roster and service requests"]
    request["Receive service request<br/>New / change / absence / cancellation"]
    reminder["Native reminder and reply<br/>Graph mailbox; events if accepted"]
    op14["14 Match confirmation reply<br/>Exact sender, participant and occurrence<br/>Core 2 · reviewed process"]
    reply{"What did the reply establish?<br/>Silence never means cancel"}
    route["Classify reviewed request<br/>Keep person and occurrence scope"]
  end
  subgraph prepare["W08 · Prepare a suitable exact arrangement"]
    op16["16 Coordinate replacement cover<br/>Affected visits, offers and acceptance<br/>Core 2 · reviewed process"]
    op17["17 Factual absence history<br/>LATER; restricted evidence only<br/>LATER / NATIVE · reviewed process"]
    op10["10 Prepare booking / availability<br/>Suitability and willingness reviewed<br/>Core 2 · reviewed process"]
    op11["11 Preview exact change scope<br/>Occurrence first; series separately gated<br/>Core 2 · reviewed process"]
    op12["12 Check travel and stale values<br/>Estimate only; invalidate changed inputs<br/>Core 2 · bounded check"]
    op13["13 Prepare shift instructions<br/>Only selected editable bookings<br/>GATED · reviewed process"]
  end
  subgraph booking["Checked booking and native acceptance"]
    bookingExec["Use shared execution<br/>Released scope; exact approval; read-back"]
    accepted{"Native worker acceptance verified?<br/>Saved roster ≠ accepted arrangement"}
    current["Current service arrangement<br/>Verified worker, participant and visit"]
  end
  subgraph cancel["W07 · Complete cancellation is a gated extension"]
    cancelGate{"Complete cancellation released?<br/>Otherwise owned native procedure"}
    op15["15 Prepare full cancellation<br/>Cause, notice, travel and charge treatment<br/>GATED · reviewed process"]
    cancelApproval["Shared execution for each effect<br/>Exact approval, fencing and preflight"]
    cleanup["Verify required travel cleanup<br/>Before cancellation if later edits locked"]
    cancelNative["Dispatch exact cancellation<br/>Persist intent; recheck accepted treatment"]
    cancelVerify["Verify cancellation independently<br/>Check status and required money evidence"]
    nativeCancel["Owned native cancellation<br/>Staff check reason, charges and travel"]
  end
  subgraph arrival["W14 · Optional current-service arrival visibility"]
    arrivalGate{"Native gap + consent accepted?<br/>Optional 35; off until trials pass"}
    op35["35 Current-service ETA / status<br/>Fresh consented input; withdraw if stale<br/>LATER / NATIVE · reviewed process"]
    safeArrival["Expose permitted service status<br/>No home, raw location or phone exposure"]
    arrivalOff["Use existing booking visibility<br/>Optional arrival automation stays held"]
    arrivalDone["Optional visibility outcome<br/>Stale / reassigned → withdraw access"]
  end
  subgraph outcomes["W13 · Required communications and actual service outcomes"]
    comms["Complete required W13 contact<br/>Actual outcome, channel and evidence"]
    done["Close only after required outcomes<br/>Service / finance / communication checked"]
    confirmed["Record matched confirmation<br/>No service mutation required"]
    absEvidence["Retain restricted factual reference<br/>No employment conclusion"]
  end
  subgraph exceptions["Ambiguity, no cover and partial outcomes"]
    review["Office clarification / wait<br/>Unclear reply, willingness or no cover"]
    recovery["Shared recovery; keep case open<br/>Unknown write → reconcile before resend"]
    partial["Cleanup succeeded; cancel failed<br/>Retain partial result; re-review next step"]
  end
  request --> route
  reminder --> op14
  op14 -->|"Matched evidence"| reply
  op14 -->|"Ambiguous / unmatched"| review
  reply -->|"Clear confirmation"| confirmed
  reply -->|"Requested change"| op11
  reply -->|"Requested cancellation"| cancelGate
  reply -->|"No / unclear reply"| review
  route -->|"New booking"| op10
  route -->|"Change"| op11
  route -->|"Worker absence"| op16
  route -->|"Cancel request"| cancelGate
  op16 -->|"Suitable candidate; seek acceptance"| op10
  op16 -->|"No suitable cover"| review
  op16 -.->|"Later history; not a core dependency"| op17
  op17 --> absEvidence
  op10 --> op12
  op11 --> op12
  op12 -->|"No instruction change"| bookingExec
  op12 -.->|"Instructions needed; gate released"| op13
  op13 -->|"Approved version"| bookingExec
  bookingExec -->|"Native result checked"| accepted
  bookingExec -->|"Uncertain / rejected"| recovery
  accepted -->|"Acceptance confirmed"| current
  accepted -->|"Pending / declined"| review
  cancelGate -->|"Gate accepted"| op15
  cancelGate -.->|"Gate held"| nativeCancel
  op15 --> cancelApproval
  cancelApproval -->|"Approved sequence"| cleanup
  cleanup -->|"Cleanup checked / not required"| cancelNative
  cleanup -->|"Uncertain / failed"| recovery
  cancelNative -->|"Observe native outcome"| cancelVerify
  cancelNative -->|"Definite failure after cleanup"| partial
  cancelVerify -->|"Unknown / mismatch"| recovery
  cancelVerify -->|"Cancellation and treatment checked"| comms
  nativeCancel -.->|"Staff-checked actual outcome"| comms
  current -->|"Notify checked booking outcome"| comms
  current -.->|"Independent optional visibility"| arrivalGate
  arrivalGate -.->|"Separate gate accepted"| op35
  arrivalGate -.->|"Optional feature held / unnecessary"| arrivalOff
  op35 -->|"Current authorized assignment"| safeArrival
  safeArrival -.->|"Not visit-completion evidence"| arrivalDone
  confirmed -.->|"Confirmation outcome only"| done
  comms -->|"All required evidence checked"| done
  review -.->|"New agreed arrangement"| route
  partial -->|"Reconcile completed effects"| recovery
```

**Rostering and cancellation rules**

- W06 retains native reminders. Opportunity 14 monitors replies; it does not implement an automatic cancel-on-silence policy.
- W08 initially prepares one-off bookings and accepted occurrence changes. Published recurrence, availability and description APIs still need whitelisted adapters and client-account acceptance.
- Every cleanup and cancellation effect passes shared execution independently. Where native cancellation locks later edits, cleanup is checked first. Unknown outcomes use read-only reconciliation; definite failure after cleanup remains partial.
- No offer, draft booking or matching free time proves worker willingness. Native acceptance and participant agreement remain distinct evidence.
- W14 opportunity 35 is later and optional. Existing approved booking-map support is not permission for continuous worker tracking.

## Invoice checks, payroll preparation and native release

```mermaid
flowchart TB
  subgraph capture["W09 / W10 / W11 · Authorized period and complete source evidence"]
    period["Open authorized period review<br/>Agreed billing or payroll cutoff"]
    complete{"Source scope complete?<br/>All pages, people, units and period"}
    type{"Billing or payroll?<br/>Use authoritative native records"}
  end
  subgraph billing["W10 · Bookkeeper preparation and current native checks"]
    op22["22 Prepare invoice exceptions<br/>Attendance, notes and invoiceable context<br/>Core 2 · reviewed process"]
    op23["23 Check special billing / credits<br/>LATER automation; bookkeeper verifies<br/>LATER / NATIVE · reviewed process"]
    op24["24 Verify payer / recipient<br/>LATER automation; verify authority now<br/>LATER / NATIVE · reviewed process"]
    bookkeeper["Bookkeeper resolves and approves<br/>Native price, tax and treatment rules"]
  end
  subgraph payroll["W11 · Source checks and authorized payroll preparation"]
    op27["27 Check people and pay period<br/>LATER automation; final pay reviewed<br/>LATER / NATIVE · reviewed process"]
    op28["28 Check hours and mileage<br/>Core first: ShiftCare source checks<br/>Core 2 · reviewed process"]
    input{"Accepted payroll input available?<br/>Actual vendor / export and units known"}
    compare["Compare against actual payroll input<br/>Only after separate integration acceptance"]
    handoff["Reviewed source-check handoff<br/>Do not claim two-sided reconciliation"]
    op29["29 Resolve payroll adjustments<br/>LATER automation; native calculation now<br/>LATER / NATIVE · reviewed process"]
  end
  subgraph native["Native accounting and payroll retain release authority"]
    invoiceExport["Native ShiftCare → Xero draft<br/>Bookkeeper uses established integration"]
    invoiceVerify["Check actual invoice / export result<br/>No custom duplicate export or ledger"]
    op30["30 Finalize payroll natively<br/>Authorized release, payment and payslips<br/>LATER / NATIVE · native/manual"]
    payrollVerify["Retain native release evidence<br/>Preparation completion ≠ payroll paid"]
    done["Close supporting case with proof<br/>Required exceptions and contacts resolved"]
  end
  subgraph followup["Invoice returns and payment follow-up"]
    returnSource["Receive invoice rejection evidence<br/>Authorized mailbox or staff log"]
    op25["25 Resolve returned invoice<br/>LATER engine; reuse owner + billing case<br/>LATER / NATIVE · reviewed process"]
    ledgerSource["Verified native ledger review<br/>Current paid / overdue / disputed state"]
    op26["26 Follow up actual overdue invoices<br/>LATER automation; native procedure now<br/>LATER / NATIVE · reviewed process"]
    contact["W13 reviewed contact / handoff<br/>Actual dispatch and response evidence"]
  end
  subgraph exceptions["Incomplete evidence and unresolved discrepancies"]
    hold["Keep owned exception open<br/>Missing timesheet is never zero pay"]
    review["Resolve discrepancy and re-check<br/>No financial release by this automation"]
  end
  period --> complete
  complete -->|"Complete"| type
  complete -->|"Incomplete / unknown"| hold
  hold -.->|"Evidence recovered"| complete
  type -->|"Billing"| op22
  type -->|"Payroll"| op27
  op22 -->|"Applicable native instructions"| op23
  op23 --> op24
  op24 -->|"Authorized recipient confirmed"| bookkeeper
  bookkeeper -->|"Native financial approval"| invoiceExport
  invoiceExport --> invoiceVerify
  invoiceVerify -->|"Actual outcome checked"| done
  invoiceVerify -->|"Unknown / rejected"| review
  op27 --> op28
  op28 --> input
  input -->|"Accepted real input"| compare
  input -.->|"Vendor / input unconfirmed"| handoff
  compare -->|"Discrepancies reviewed"| op29
  handoff -.->|"Payroll staff verify native input"| op29
  op29 -->|"Authorized native values approved"| op30
  op30 -->|"Retain native approval trail"| payrollVerify
  payrollVerify -->|"Checked handoff / actual native outcome"| done
  payrollVerify -->|"Unresolved / uncertain"| review
  returnSource --> op25
  op25 -.->|"Owned correction / reissue review"| bookkeeper
  ledgerSource --> op26
  op26 -.->|"Approved payment query"| contact
  contact -->|"Required follow-through checked"| done
  review -.->|"Correct source / outcome evidence"| complete
```

**Native finance and deferred automation**

- Opportunities 22 and 28 are core preparation workflows. The other seven numbered finance/payroll opportunities in this view remain later automation or native/manual processes.
- Later nodes describe staff work that still happens. They do not activate a custom Xero connector, payroll engine, credit allocation, invoice reissue, collection action or money movement.
- ShiftCare native invoice/timesheet exports remain in use. New direct Xero OAuth, organization/contact/invoice matching and payment reconciliation require separate acceptance if later scope is released.
- The payroll vendor remains unconfirmed. Opportunity 28 first provides ShiftCare source completeness, hours and mileage checks plus a reviewed handoff. Two-sided comparison needs the real accepted export/API.
- Period checks never erase leavers with final pay due. An inactive login is not evidence of zero payroll entitlement.

## Care exceptions, correspondence and accountable completion

```mermaid
flowchart TB
  subgraph sources["W02 / W09 / W13 · Authorized factual evidence"]
    source["Receive source or scheduled check<br/>Notes, attendance, feedback or case event"]
    classify["Choose relevant reviewed process<br/>Access-scoped factual evidence only"]
  end
  subgraph care["W09 · Care and feedback follow-through"]
    op31["31 Find visit / care exceptions<br/>Missing records, times or source events<br/>Core 2 · reviewed process"]
    op32["32 Feedback / complaint follow-through<br/>Restricted owner, callback and action<br/>Core 2 · reviewed process"]
    safety{"Immediate concern identified?<br/>Use human/native safety procedure"}
  end
  subgraph comms["W13 · Reviewed correspondence and channel evidence"]
    op08["08 Prepare correspondence<br/>Approved template, context and attachments<br/>Core 1 · reviewed process"]
    reviewMessage["Review wording and recipients<br/>Authority, sensitivity and exact context"]
    send["Send by accepted channel<br/>Native staff send; Graph only if accepted"]
    historyGate{"Channel history scope accepted?<br/>Opportunity 9 is independently gated"}
    op09["09 Track communication evidence<br/>Dispatch / failure / response are distinct<br/>GATED · reviewed process"]
    nativeProof["Record checked native reference<br/>Unsupported channels stay staff-verified"]
  end
  subgraph ownership["Shared cases · Completion, deadlines and handovers"]
    op33["33 Check handovers / deadlines<br/>Catch up missed runs; retain actual owner<br/>Core 1 · bounded check"]
    children{"All mandatory outcomes checked?<br/>Service, HR, finance and communications"}
    close["Close parent with actual evidence<br/>No task-only or dispatch-only completion"]
  end
  subgraph reports["Later dedicated operational reporting"]
    op34["34 Report factual operational outcomes<br/>LATER dedicated workflow; source limits<br/>LATER / NATIVE · bounded check"]
  end
  subgraph exceptions["Urgent human response and incomplete outcomes"]
    urgent["Immediate authorized human action<br/>Never wait for an automation queue"]
    followup["Owned unresolved follow-up<br/>Missing proof, failed send or no response"]
    work["Perform remaining work<br/>Record actual result and re-check"]
    dispute["Supervisor / manager review<br/>Clinical, employment and complaint judgment"]
  end
  source --> classify
  classify -->|"Visit evidence"| op31
  classify -->|"Feedback / complaint"| op32
  classify -->|"Correspondence requested"| op08
  classify -.->|"Deadline / ownership event"| op33
  op31 --> safety
  op32 --> safety
  safety -->|"Immediate concern"| urgent
  safety -->|"Manager judgment required"| dispute
  safety -->|"Factual follow-up; no urgent wait"| op33
  urgent -.->|"Record follow-through when safe"| op33
  dispute -.->|"Reviewed outcome"| op33
  op08 --> reviewMessage
  reviewMessage -->|"Exact message approved"| send
  reviewMessage -->|"Missing authority / evidence"| followup
  send -->|"Retain actual channel reference"| historyGate
  historyGate -.->|"Accepted history coverage"| op09
  historyGate -.->|"Gate held / unsupported channel"| nativeProof
  op09 -->|"Evidence-backed status"| op33
  nativeProof -.->|"Checked staff proof"| op33
  op33 --> children
  children -->|"All required outcomes verified"| close
  children -->|"Incomplete / uncertain"| followup
  followup -->|"Owner and next date retained"| work
  work -.->|"Actual completion evidence"| op33
  close -.->|"Later approved complete-period report"| op34
```

**Safety, communication and completion boundaries**

- W09 flags factual care-record exceptions. It does not diagnose, score staff, decide misconduct or replace professional care and complaint judgment.
- W13 correspondence preparation does not itself send a message. Native communication remains a supported staff handoff; Graph sending requires separately accepted Mail.Send permission, implementation and release.
- Opportunity 9 does not promise universal cross-channel receipt visibility. A queued task or Graph 202 response is not proof of delivery or acknowledgement.
- Opportunity 33 runs bounded assignment and completion rules. It cannot make staff available, approve work on their behalf or close a case while required outcomes are missing.
- Core pilot instrumentation is retained. Opportunity 34 is a later dedicated report; factual periods and source completeness are labelled without invented savings or forecasts.

## Coverage register

F = bounded automatic function; P = partial automation; N = native/manual handoff. F does not remove the human judgments described in the feasibility register.

| # | Process | Scope | Level | Workflow families |
| --- | --- | --- | --- | --- |
| 01 | Service area screening | Core 1 | F | W01 |
| 02 | Centralized enquiry collection | Core 1 | P | W01, W02 |
| 03 | Enquiry ownership and prioritization | Core 1 | P | W01, W02 |
| 04 | Missing information detection | Core 1 | F | W02, W03, W04 |
| 05 | Participant onboarding and profile updates | Core 1 | P | W03 |
| 06 | Worker onboarding coordination | Core 1 | P | W04 |
| 07 | Client stages and agreed service details | Gated addition | P | W01, W03, W08 |
| 08 | Correspondence preparation | Core 1 | P | W13 |
| 09 | Communication tracking and history | Gated addition | P | W02, W13 |
| 10 | Booking preparation and availability checks | Core 2 | P | W01, W08 |
| 11 | Booking change scope and verification | Core 2 | P | W08 |
| 12 | Travel checking and stale value detection | Core 2 | F | W08, W11 |
| 13 | Shift instruction maintenance | Gated addition | P | W08, W09 |
| 14 | Participant confirmation monitoring | Core 2 | P | W06, W07, W08 |
| 15 | Complete cancellation handling | Gated addition | P | W07, W13 |
| 16 | Absence and replacement cover coordination | Core 2 | P | W08, W13 |
| 17 | Factual absence histories | Later / native | P | W08 |
| 18 | Document matching and filing | Core 1 | P | W05 |
| 19 | Document completeness and attachment checks | Core 1 | F | W02, W05, W12 |
| 20 | Document date and expiry correction | Gated addition | P | W05, W12 |
| 21 | Renewal and coordinator follow up | Core 2 | P | W05, W12, W13 |
| 22 | Invoice preparation checks | Core 2 | P | W09, W10 |
| 23 | Special billing instructions and prepayments | Later / native | P | W10 |
| 24 | Billing recipient verification | Later / native | P | W02, W10 |
| 25 | Returned invoice resolution | Later / native | P | W02, W10, W13 |
| 26 | Payment follow up | Later / native | P | W10, W13 |
| 27 | Pay period and employee checks | Later / native | P | W04, W11 |
| 28 | Timesheet hours and mileage reconciliation | Core 2 | P | W09, W11 |
| 29 | Payroll adjustment tracking | Later / native | P | W11 |
| 30 | Payroll completion handoffs | Later / native | N | W11 |
| 31 | Visit record and care exceptions | Core 2 | P | W09 |
| 32 | Feedback complaint and safety follow through | Core 2 | P | W09, W13 |
| 33 | Task completion handovers and escalation | Core 1 | F | W01, W02, W08, W13 |
| 34 | Operational outcome reporting | Later / native | F | W01, W08, W10 |
| 35 | Arrival visibility if the remaining gap is confirmed | Later / native | P | W14 |

## Sources and validation

The [implementation plan](OCD_Custom_System_Implementation_Plan.md), [architecture and data design](implementation-plan-2026-10-25/architecture-and-data-design.md), [35-item feasibility register](automation-feasibility-2026-10-25/feasibility.json), and [workflow use cases](OCD_Workflow_Use_Cases.md) supply the planning content. The newer plan and feasibility register govern release scope.

[Source hashes and provenance](../.archify/workflow-ocd-complete-20261025-165645/source-manifest.json), [coverage register](../.archify/workflow-ocd-complete-20261025-165645/coverage.json), and [delivery review](OCD_Complete_Workflow_Flowchart_Review.md) accompany the atlas.

Editable Mermaid is supplied here. The offline HTML embeds static SVGs laid out with [Viz.js / Graphviz](https://viz-js.com/api/); no external runtime or automation platform is required to view them.
