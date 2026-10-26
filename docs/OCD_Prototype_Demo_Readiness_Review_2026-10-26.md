**OCD prototype: demo-readiness review**

Follow-up: the user authorized fixes after this assessment. See the [fix and validation report](OCD_Prototype_Demo_Fixes_2026-10-26.md) for the current status. This document and its evidence preserve the findings before those changes.

Reviewed 26 October 2026, Asia/Manila. This review assesses the existing working tree, including the previously added Operations hub. Application code was not changed. Build outputs and the review evidence were generated locally.

**Decision: suitable for a controlled fictional walkthrough, after the priority corrections below; not yet ready for an unrestricted demonstration of a complete, integrated automation system.** The prototype is substantially more than static screens, but several editable paths produce incorrect outcomes. The hub, older browser workspaces, and authenticated shared workflows also have materially different data and completion behavior.

There is no demonstrated need to introduce n8n to resolve these findings. The existing custom application is the relevant implementation foundation.

**What was reviewed**

The business baseline was the [35-opportunity feasibility register](automation-feasibility-2026-10-25/feasibility.json), [96-pain-point register](pain-points-2026-10-23/pain-points.json), [implementation plan](OCD_Custom_System_Implementation_Plan.md), its [task roadmap](implementation-plan-2026-10-25/roadmap.md), the [complete workflow diagrams](OCD_Complete_Workflow_Flowcharts.md), existing W01–W14 handlers/use cases, and the [prototype guide](OCD_Comprehensive_Prototype_Guide.md). The source transcripts and earlier research remain the evidence behind those registers; this review does not claim a fresh client confirmation of every historical practice.

Validation included a fresh build and full existing automated test run; isolated browser checks for the hub, intake, inbox tasks, financial checks, payroll preparation, cancellation, travel, and person-led automation pipeline; attempted broader React, profile, reviews, overview and presentation walkthroughs; source inspection; and independent model/browser reproductions of exceptions that the existing tests miss.

Live credentials were withheld and automatic worker startup was disabled in review subprocesses. Browser tests used isolated profiles and temporary server data. The presentation profile additionally reused the existing dated, saved evidence capture; it did not refresh that capture from ShiftCare. No live ShiftCare, Xero, mailbox, payroll, or mapping operation was validated. Existing running preview data was not used as a test fixture.

**What is already working**

- [x] The application builds successfully. The automated suite reports **271 tests: 270 passed, zero failed, one skipped**. The skipped PostgreSQL migration test requires local `initdb` and `pg_ctl`; PostgreSQL migration execution is therefore not verified by this run.
- [x] The Operations hub exposes all **35 opportunities**, maintaining **20 core, five gated, and ten later/native** dispositions. Library coverage does not establish that 35 production automations exist.
- [x] Hub overview counters, queue navigation/search/filtering, sample branch filtering, operational areas, case links, and ordinary browser persistence work in the scripted scenarios.
- [x] Exact proposal approval, pre-dispatch stale-approval invalidation, duplicate-action prevention, demo save/read-back, uncertain-result reconciliation, and preservation of an earlier successful cancellation step work in the tested paths.
- [x] Missing-information checks keep the sample blocked until the required value and review evidence are supplied. Incomplete document-metadata scope is not treated as complete.
- [x] Hub cancellation requires its three follow-through outcomes before closure in the tested scenario. The **separate older cancellation assistant** also passed travel/charge review, result verification, participant/worker notifications, failed-delivery recovery, persistence, and completion checks.
- [x] Separate intake supports digital-PDF text extraction, image-only-PDF OCR using local assets, retained originals, human review, missing-contact gates, searchable configured staff ownership, manual ShiftCare handoff, verification, and duplicate recovery. Those fictional intake checks passed.
- [x] Inbox tasks support reviewed message-to-task assignment, owner/deadline editing, persistence, work-queue visibility, duplicate prevention, and checked completion in the tested local workflow.
- [x] Financial checks derive findings from local source records, retain explanation/ownership, reopen changed findings, and handle tracked returned/paid outcomes. Payroll preparation checks actual hours/mileage, dated adjustments, reviewed draft export, changed-source blocking, and refresh without duplicate drafts.
- [x] The travel checker flags worker/address changes, retains reviewed estimates, links source records, persists state, and avoids silently changing fees in its tested scenario. Live distance/ETA accuracy was not tested.
- [x] The person-led automation pipeline passed identity/unknown-identity, ownership, search, expansion, approval, closure, and responsive-layout checks.
- [x] Shared server workflows expose all 14 handlers, retain cases and private original evidence, reject stale revisions, require staff sign-in, and distinguish a staff-manual native handoff from API verification. The isolated shared-workflow browser suite passed.
- [x] A temporary compatibility replay confirmed employee notification updates and leave submission/reload/withdrawal. A separate replay confirmed client/employee profile reviews after correcting an obsolete test locator. The repository's original scripts remain unchanged and still fail as described below.
- [x] Selected desktop and mobile screenshots were visually inspected. Hub overview/case, intake review, financial queue, and cancellation review were readable in those captures. The executed layout assertions found no horizontal page overflow in their captured states. This is a sampled review, not a complete accessibility or device certification.

**Priority findings**

P1 means correct before presenting the affected business journey as complete. P2 means a preparation/resilience improvement that can be bounded in a scripted demonstration. Known prototype boundaries are identified separately from defects.

| ID | Priority and type | Finding | Consequence |
| --- | --- | --- | --- |
| R01 | P1 — reproduced defect | Follow-up owner/deadline become immutable after the primary saved step. | Open work cannot be handed to another responsible person without creating another case. |
| R02 | P1 — reproduced defect | A new coverage exception can reuse checked evidence for the previous postcode. | A case can close without a current location decision. |
| R03 | P1 — reproduced workflow gap | A reviewed cancellation reply can finish as a confirmation. | Cancellation handling is neither created nor linked by the hub's confirmation path. |
| R04 | P1 — verification/documentation gap | Several broad walkthroughs use retired selectors or entry points. | A green unit suite does not establish a clean demonstration across the full UI. |
| R05 | P1 if claiming one integrated journey — documented boundary | Hub, older workspaces and shared workflows use separate case/data stores. | A hub-created profile/booking does not propagate into the older participant/roster/portal screens. |
| R06 | P1 if showing shared workflows as complete business cases — known implementation gap | Shared W07/W08 completion precedes its W13 communication child; shared W07 lacks travel cleanup. | The word “completed” has different meanings across surfaces. |
| R07 | P2 — reproduced resilience defect | When storage writes fail but old stored data remains readable, navigation drops the new in-memory case. | Capture can land on “This case is unavailable” without a page reload. |
| R08 | P2 — documented limitation | New free-form requests retain unrelated sample proposal defaults. | An unscripted request can display dates/times/context that were not extracted from its source. |

**R01 — Keep follow-up accountability editable**

Open `OPS-1008`: the primary step is already verified, while two mandatory outcomes remain pending. Both **Case owner** and **Case deadline** are disabled. The model also rejects a valid reassignment with “A saved or uncertain result already exists…”. This was independently reproduced in the model and browser.

The source/effect lock is useful for preventing changes to an action already dispatched, but the same lock also covers responsibility for unfinished work. This conflicts with opportunities 3/33 and the ownership/handover pain points. See [model.ts](../frontend/features/operations/model.ts#L327) and [Accountability controls](../frontend/features/operations/operations.tsx#L1313).

- [ ] Separate follow-up assignment metadata from the immutable dispatched proposal. Retain the completed effect and its proof; audit a change of responsibility.
- [ ] Acceptance: reassign an open follow-up and revise its deadline after save, verification, or an interruption; reload; confirm the new assignment persists and no native/demo effect is repeated.

**R02 — Invalidate dependent outcome evidence when coverage changes**

Starting with process 1, change the postcode to `9999`, run the check, record the office coverage decision, and close. Change the postcode to `8888` and rerun. The old `coverage-review` outcome remains `done`; **Close checked case** is enabled and succeeds without another decision. The model reproduction used a reference explicitly limited to `9999`; the visible browser path reproduced the same closure defect.

The rule adds a coverage-review outcome only when none exists and does not associate that outcome's proof with the inputs it reviewed. See [coverage rule](../frontend/features/operations/model.ts#L410), [input changes](../frontend/features/operations/model.ts#L334), and [closure checks](../frontend/features/operations/model.ts#L578). This affects opportunity 1 / PP-003.

- [ ] Bind required outcome evidence to the relevant input/source version, and reopen the affected outcome when those inputs change.
- [ ] Acceptance: a decision for `9999` cannot satisfy a decision for `8888`; returning to a covered location follows an explicit policy; unrelated verified steps remain intact.

**R03 — Route confirmation exceptions instead of marking them confirmed**

Capture a **process 14** request from fictional Olivia Hart explicitly cancelling the exact 27 October 09:00–11:00 occurrence. Review the sender and occurrence, set **Reviewed response** to cancellation, and use the normal approval/save/verification actions. The case still records **“Record the matched sample confirmation”** and closes. There is no new cancellation case or linked required cancellation outcome; the separate seeded cancellation case is unchanged.

The confirmation scenario has one static confirmation effect and no required child outcomes. See [scenario 14](../frontend/features/operations/scenarios.ts#L331). Opportunity 14 explicitly requires routing confirmation/change/cancellation exceptions. The separate backend W06 handler already has reviewed branching; this finding concerns the hub's behavior and the lack of a shared journey, rather than the absence of all confirmation logic in the repository.

- [ ] Restrict supported response states and route a reviewed change/cancellation to a linked, owned downstream case or explicit handoff. Keep any service mutation subject to its existing approval gate.
- [ ] Acceptance: confirmed, cancellation, change, ambiguous, and no-response examples take distinct paths; a clear reply routes once; ambiguity or silence never automatically cancels a visit.

**R04 — Repair the walkthrough and verification paths**

The fresh default browser walkthrough stops at `[data-auto-action="ingest"]`, which is absent from the current automation toolbar. The [README instructions](../README.md#L62) still tell the presenter to use **Process received mail**. The original React walkthrough stops at the retired `.employee-total strong` counter. Other profiles stop at older `.client-worker-list`, participant-heading image, overview-donut, or `.cp-launch` expectations.

The original presentation walkthrough passed its business scope, guided examples, navigation, value/pilot, saved-evidence, and export checks, then failed its final office-launch assertion. The temporary React replay also reached a missing presentation-launch locator after confirming the employee flows. Treat the missing launcher as a navigation/discoverability issue to inspect, and the other stopped profiles as incomplete verification; the failures do not prove those underlying pages crash.

- [ ] Choose the current demo entry points, update the guide/README and locator expectations, and rerun the affected journeys.
- [ ] Restore or deliberately replace the presentation entry link if that older presentation screen is included in the demo; otherwise give the presenter a direct link and remove obsolete instructions.
- [ ] Acceptance: the selected demo can be completed from its documented start with no unavailable control, uncaught application error, or unexplained jump between datasets. The broad checks must finish rather than merely skipping failed assertions.

**R05 — Make the dataset boundary explicit**

The [prototype guide](OCD_Comprehensive_Prototype_Guide.md) explicitly documents separate examples. Hub actions use `ocd-comprehensive-prototype-v1`; the older workspace uses `ocd-brilliance-operations-v1`; authenticated shared cases are server-backed. Hub native-looking effects save to a browser-local fictional target-record map. Linking to an existing workspace navigates there; it does not synchronize its records.

This is an intentional prototype boundary, but it prevents presenting one uninterrupted intake → client → booking → worker/client portal → finance journey. It also matters to PP-096: the client wants to avoid duplicate work around ShiftCare.

- [ ] Select one primary guided storyline and label the other workspaces as separate examples.
- [ ] If cross-screen propagation is part of the promised demo, connect one consistent fictional journey through a shared demo data contract and test it. That is a separate implementation task, not something verified by this review.
- [ ] Acceptance: each created/changed record appears wherever the presenter claims it should; every intentional boundary is stated before crossing it. Do not use “35 integrated automations implemented” as a presentation claim.

**R06 — Distinguish action completion from business-case closure**

An isolated backend reproduction with **no external operation adapters** manually verified W07. The parent status became `completed` while a linked W13 communication job remained `queued`. See [service verification](../backend/automation/service.ts#L263). The roadmap already acknowledges both the [parent/child completion gap](implementation-plan-2026-10-25/roadmap.md#L665) and [missing shared W07 travel cleanup](implementation-plan-2026-10-25/roadmap.md#L963).

The hub and the older cancellation assistant demonstrate stronger aggregate follow-through behavior. Their passing checks must not be presented as proof that the authenticated shared backend has identical behavior. This affects opportunities 15/16/33.

- [ ] For a demo of shared cases, distinguish “native action verified” from “business case complete”; retain an aggregate open state while mandatory communication/financial/travel outcomes remain unresolved. Otherwise exclude that completion claim from the guided demo.
- [ ] Acceptance: a queued, failed or uncertain mandatory child prevents aggregate closure; cleanup success followed by cancellation failure stays recoverable; retries do not repeat verified effects. Live cleanup remains gated until its native contract is accepted.

**R07 — Preserve in-memory capture when persistence fails**

In an isolated browser, only writes to the hub's storage key were made to throw `QuotaExceededError`; existing reads continued to work. Submitting a new request navigated to its case URL, but the case became unavailable immediately. `persist` retains new memory, while `loadStore` prefers the older readable stored value after navigation. See [loadStore](../frontend/features/operations/operations.tsx#L75) and [persist](../frontend/features/operations/operations.tsx#L1483).

- [ ] Prefer the current in-memory version after a failed write, or block navigation/capture with an explicit recovery action. Preserve the entered source and warning.
- [ ] Acceptance: write-failure/read-success does not discard a newly created case on navigation; a full reload explains any unsaved state. Use a fresh writable browser profile for the demo meanwhile.

**R08 — Keep sample defaults from looking like extracted facts**

Capturing a different participant's request to move a 2 November visit to 14:00 retains the sample 27 October/09:00→10:00–12:00 proposal fields. This is documented in the guide and is not a failed promise that the hub performs extraction. However, it is a substantial limit on free-form live demonstration.

- [ ] Use curated examples until arbitrary capture either clears unverified contextual fields or marks each retained template value conspicuously for review. The separate intake extractor can be shown on its own validated path.
- [ ] Acceptance: no date, recipient, occurrence, or instruction is presented as source-derived without evidence; mismatched fields block approval where appropriate.

**Coverage against OCD's needs**

The [35-row workflow matrix](demo-readiness-2026-10-26/workflow-coverage.csv) records every opportunity's selected scope, current scenario/steps/outcomes, human boundary, integration requirement, remaining gate, source acceptance criterion, and review evidence. Its `native` mode names describe the intended scenario; all hub execution remains fictional.

The [96-row pain-point matrix](demo-readiness-2026-10-26/pain-point-coverage.csv) maps **81 pain points directly to the 35 opportunities**. The other **15** retain process/governance dispositions: policy/procedure knowledge and competence checks; telephone/audio/meeting setup; group membership; offboarding; recruiting sufficient backup capacity; marketing/supplier administration; and avoiding duplicated workflows. Their absence as dedicated automation modules is consistent with the approved scope.

| Area | Alignment already visible | Remaining limit relevant to the demo |
| --- | --- | --- |
| Enquiries and onboarding — 1–7 | Early coverage, retained sources, missing fields, reviewed identity/profile proposals, responsible owner, agreement/payroll readiness. | R01/R02/R05; approved coverage/routing rules and accepted native field contracts remain necessary. |
| Correspondence — 8–9 | Preparation, references, and required response/outcome evidence. | R01; no hub mailbox sending, delivery receipt, or real thread synchronization. Process 9 stays gated. |
| Rostering and continuity — 10–17 | Occurrence review, travel checks, instructions, acceptance/cover, cancellation and follow-through. | R03/R05/R06; live availability, native offers/acceptance and account-specific writes are not certified. Processes 13/15 stay gated; 17 is later/native. |
| Documents — 18–21 | Original retention in separate intake/shared workflow; matching proposal, metadata completeness, correction/renewal handoffs. | A fictional filing receipt is not a ShiftCare attachment. Date correction stays gated; renewal schedules, catch-up and external evidence require acceptance. |
| Finance/payroll — 22–30 | Local source checks, findings, actual-hours/mileage review, draft export, stale-source protection and checked handoffs. | No demonstrated live Xero/payroll connector or financial release. Later/native work remains later even where local supporting screens exist. |
| Care/feedback — 31–32 | Factual exceptions, callback/corrective follow-through and assigned supervision. | No demonstrated live care-event ingestion or native complaint synchronization; clinical/safety judgment remains with staff. Fictional review ratings are a separate UI example. |
| Ownership/reporting/arrival — 33–35 | Mandatory outcome counts, local history/export, native/human handoff examples. | R01/R06; the hub is not a deadline/escalation scheduler. Benefit reporting and arrival remain later/conditional; sample branch filtering is not access control. |

The implementation aligns with the direction of the custom supporting system: prepare repeated work, preserve evidence, keep approvals explicit, and retain ShiftCare/Xero/native authority. It does **not** yet establish acceptance of 20–25 independently operating automations. All 35 generic model completion paths passing demonstrates the sample state machine, not the actual business/integration acceptance criteria in the feasibility register.

**Validation results and their limits**

Each receipt links to the fresh run, including failed runs. Repeated “Native booking selection” checks are shared setup and should not be counted as separate business workflows.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Full automated suite | 270 pass, 1 skip, 0 fail | [Test log](demo-readiness-2026-10-26/tests.log); includes 19 hub tests and the all-35 modeled-path loop. PostgreSQL migration execution skipped. |
| Build | Pass | [Build log](demo-readiness-2026-10-26/build.log). |
| Operations hub | 14 checks pass | [Receipt](demo-readiness-2026-10-26/operations/browser-check.json); no external-service request, API mutation, or uncaught application exception during that walkthrough. |
| Shared workflows | 8 checks pass | [Receipt](demo-readiness-2026-10-26/native/browser-review.json); configured fictional staff, temporary server data, manual native handoff. |
| Intake | 8 checks pass | [Receipt](demo-readiness-2026-10-26/intake/browser-review.json); includes local OCR, evidence retention, owner selection, review and persistence. |
| Inbox tasks | 2 checks pass | [Receipt](demo-readiness-2026-10-26/inbox/browser-review.json); includes the common dropdown check and one detailed business journey. |
| Financial checks | 2 checks pass | [Receipt](demo-readiness-2026-10-26/financial/browser-review.json); local source/evidence tracking. |
| Payroll preparation | 2 checks pass | [Receipt](demo-readiness-2026-10-26/payroll/browser-review.json); fictional preparation/export, no pay release. |
| Cancellation assistant | 2 checks pass | [Receipt](demo-readiness-2026-10-26/cancellation/browser-review.json); older local workflow, distinct from shared W07. |
| Travel checker | 2 checks pass | [Receipt](demo-readiness-2026-10-26/travel/browser-review.json); no live route acceptance. |
| Person-led pipeline | 2 checks pass | [Receipt](demo-readiness-2026-10-26/pipeline/browser-review.json). |
| Booking-only profile | Smoke check pass | [Receipt](demo-readiness-2026-10-26/booking/browser-review.json); only the booking dropdown and absence of page exceptions, not full booking/availability acceptance. |
| Default legacy walkthrough | Stopped / incomplete | [Receipt](demo-readiness-2026-10-26/legacy/browser-review.json); absent ingest control at script line 3698. |
| Original React / reviews / profiles / overview profiles | Stopped / incomplete | [React](demo-readiness-2026-10-26/react/browser-review.json), [reviews](demo-readiness-2026-10-26/reviews/browser-review.json), [profiles](demo-readiness-2026-10-26/profiles/browser-review.json), [overview](demo-readiness-2026-10-26/overview/browser-review.json); retired layout expectations prevent full verification. |
| Original presentation profile | Seven checks passed, final check failed | [Receipt](demo-readiness-2026-10-26/presentation/browser-review.json); final office-launch expectation failed. Saved dated evidence is not a fresh native trial. |
| Temporary compatibility replays | Reviews pass; React partially verified | [Reviews replay](demo-readiness-2026-10-26/reviews_replay/browser-review.json); [React replay](demo-readiness-2026-10-26/react_replay/browser-review.json) confirmed employee flows then stopped at launch-link expectation. Only locator/root substitutions were made in a temporary runner; these are not passes of the original repository scripts. |
| Independent exception probes | Four browser defects reproduced | [Browser probes](demo-readiness-2026-10-26/independent/audit-probes.json), [model probes](demo-readiness-2026-10-26/model-probes.json), [additional probes](demo-readiness-2026-10-26/additional-model-probes.json). Includes consistent cancellation-source capture and shared W07/W13 reproduction without external adapters. |

The tests include useful access, source integrity, stale-revision, uncertain-outcome, and duplicate-prevention checks. This review is not a penetration test or proof of production security, performance, recoverability, clinical suitability, or live integration support. The hub's fixed reviewer and branch picker are presentation controls; authenticated shared workflows are a separate boundary. Use fictional information for this demo, as the existing guide requires.

The complete public landing-to-enquiry journey, full booking/availability and worker-acceptance UI journey, and all client/worker self-service interactions were **not fully revalidated in the browser** after the broad walkthroughs stopped. Several routes rendered, employee leave/notifications and reviews received supplemental checks, and related automated tests passed; those observations do not replace the remaining end-to-end assertions. Rehearse these additional areas separately if they are included in the presentation.

**Demo preparation checklist, in execution order**

1. [ ] Correct R02 and R03 before presenting coverage decisions or reply-to-cancellation routing as complete workflows.
2. [ ] Correct R01 before demonstrating reassignment, owner absence, overdue handover, or recovery with another responsible staff member.
3. [ ] Resolve R04 for the chosen journey: current controls, navigation, documentation, and a browser walkthrough that reaches its end. The selected presentation launch route must be reachable and rehearsed.
4. [ ] Decide the R05/R06 presentation boundary. Demonstrate the hub's checked fictional case lifecycle; use older tools as explicitly separate examples. If shared backend completion or cross-screen propagation is promised, implement and test that exact path before the demo.
5. [ ] Address R07/R08, or rehearse in a fresh writable profile with curated sources and visibly reviewed sample proposal values. Verify capture, navigation, export and reload on the actual presentation machine.
6. [ ] Prepare separate reset/preflight instructions for the hub and older browser workspace. Hub **Reset examples** does not reset the other store; it also does not clear shared server cases. Never clear real operational data as a demo reset.
7. [ ] Prepare the sample date/week explicitly. Hub cases use late-October examples, while several older roster/finance examples use early October. Show the intended sample period rather than describing those counts as today's live operations.
8. [ ] Rehearse the guide's principal examples: participant onboarding (`OPS-1005`), missing information (`OPS-1004`), gated cancellation (`OPS-1015`), and native payroll handoff (`OPS-1030`). Check each required outcome and one interruption/recovery path.
9. [ ] Re-run the meaningful affected tests after corrections, then do one uninterrupted rehearsal at the actual display size. Confirm no duplicate effect, stale outcome, lost case, inaccessible action, or unexplained data mismatch.

Native write trials, real mailbox collection/delivery, live Xero/payroll synchronization, multi-user branch authorization, durable cross-system case aggregation, production operations/recovery, and device location acceptance remain the implementation plan's release work. They are not prerequisites for an honestly labelled frontend prototype presentation. Do not add deferred ATS, LMS, marketing, payroll-engine, or generic workflow-builder features to prepare this demo.

**Review record**

The [verification receipt](demo-readiness-2026-10-26/verification.json) records the unchanged-source comparison, test receipts, coverage counts, inspected captures, and review limitations. The [source baseline](demo-readiness-2026-10-26/source-baseline.json) identifies the reviewed working-tree contents; the Git commit alone does not describe all existing uncommitted work.

The findings above are assessment and acceptance criteria only. **No application fix, test-script edit, remote pull/merge, deployment, or live integration change was performed during this review.**
