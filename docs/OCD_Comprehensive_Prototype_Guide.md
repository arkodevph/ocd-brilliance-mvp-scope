# OCD comprehensive frontend prototype

Updated 26 October 2026. First-time visitors should open **Start here**, or navigate directly to `/workspace/#/office/start`. Choosing **Start office demo** at `/portal` opens this same starting page. The full dashboard remains at `/workspace/#/office/operations/overview`; the older presentation remains under **Explore tools → Office tools → Demo guide**.

This extends the existing React frontend with a proposed operations layer based on the [35-item feasibility register](automation-feasibility-2026-10-25/feasibility.json), [custom-system blueprint](OCD_Custom_System_Implementation_Plan.md) and [complete workflow diagrams](OCD_Complete_Workflow_Flowcharts.md). It preserves the selected **20 core**, **five gated** and **ten later/native** dispositions across W01–W14.

## First visit: one request, six small steps

Choose **Start guided demo** to create a separate fictional onboarding practice case for Ava. It does not reset or edit existing examples. Only the information needed for the current step is shown:

1. **Read the request.** Understand Ava's fictional request for help at home.
2. **Check the details.** Compare the three prepared sample values with the original; edit them if needed.
3. **Review the evidence.** Check each of the three reviewer items. Continue stays unavailable until the required checks are complete.
4. **Approve and save.** Approve the exact proposal, then run the demo save as a separate action.
5. **Check the result.** Verify the saved fictional record against the approved values.
6. **Finish the follow-up.** Record agreement/document and billing-readiness evidence, one check at a time. Use the clearly labelled example references for practice, confirm each check, then close the case. The next check appears after the previous outcome is recorded.

**Start here → Continue guided demo** resumes the same practice case after navigation or reload when browser storage is available. **Back** revisits earlier steps; **Open full case** exposes the usual controls without discarding progress. **Start a new practice case** preserves the previous case. Ordinary case validation, stale approval protection and required-outcome closure rules still apply. An unsaved-storage warning retains its existing reload limitation.

The hub now has three primary links: **Start here**, **Work queue** and **Explore workflows**. **More views** contains the dashboard, individual areas and activity. The workflow library initially shows Intake & people rather than all 35 cards; its **Area** selector includes every area and **All areas**. Scope filters retain all 20/5/10 dispositions. Office tools are grouped in expandable sidebar sections, with the active group open. On phones, Start and Demo are directly available in the bottom navigation; More retains the other tools.

## What can be explored

| Workspace | Prototype behavior | Processes |
| --- | --- | --- |
| Overview | Derived sample-case counters, filtered queue links, priority cases, operational-area navigation, platform responsibilities and recent activity | Cross-workflow |
| Work queue | Search, status/scope/branch filtering, owned deadlines, CSV export, case navigation and additional rows | Cross-workflow |
| Intake & people | Coverage, enquiry ownership, missing information, reviewed participant/worker proposals and readiness handoffs | 1–7 |
| Documents | Correct-person filing, completeness checks, gated date correction and genuine renewal follow-through | 18–21 |
| Rostering | One-off arrangements, exact occurrence changes, travel context, gated instructions, confirmations, cancellation and replacement cover | 10–17, 35 |
| Finance & payroll | Source completeness, invoice preparation, period review, reviewed native handoffs and retained payroll authority | 22–30 |
| Care & feedback | Factual exceptions, supervisor ownership and restricted operational follow-through | 31–32 |
| Communications | Reviewed message preparation, native sending handoffs, gated evidence tracking and required outcomes | 8–9 |
| Workflow library | All 35 original problems, scope labels, human responsibilities, release gates and interactive examples | 1–35 |
| Activity | Case-linked browser-local history for source changes, approval, execution, reconciliation and follow-through | 33–34 and shared behavior |

The hub starts with one fictional case per process. Completed bounded checks, an approved occurrence change, an unverified filing result and open correspondence follow-up illustrate different states. **Reset examples** replaces only this hub's examples; it does not clear older prototype records.

## Working interactions

- Capture a fictional request with its original source, person and sample branch. Identical requests deduplicate within their branch. Basic name fields follow the captured person; other proposal fields start blank and require source-backed review. This form does not extract dates or match native records. The separate intake review provides the PDF/OCR example.
- Review and edit the proposed fields alongside their source context. Record the responsible owner and deadline, then check the required evidence.
- Approve an exact proposal. Changing its fields, evidence, owner, deadline or source version invalidates the old approval before execution.
- Reassign unfinished follow-up or change its deadline after a saved/uncertain step. The original approved action, result and evidence stay unchanged; the handover is recorded in history. Editing already-dispatched proposal fields remains blocked.
- Run each pending demo step separately and check its saved fictional result. A lost response requires reconciliation before another send; a mismatched saved result cannot be verified.
- Keep verified earlier steps after a later cancellation step fails. Fresh review authorizes only the remaining step; verified cleanup is not repeated.
- Record the reference, outcome note and explicit staff confirmation for each required follow-up. Failed or uncertain child outcomes block parent closure.
- Classify a reminder reply as **Confirmed**, **Change requested**, **Cancellation requested**, **Unclear reply**, or **No response**. Exceptions create one linked change/cancellation/clarification case. That case requires its own review and checked outcomes; its parent cannot close while it is unfinished. Silence and ambiguous replies never cancel a service.
- Use later/native cases as staff-checked handoffs, with a different proof label from demo read-back. Payroll handoff does not establish that pay was released.
- Persist hub records and case history in this browser. If storage writes fail, navigation keeps the current in-memory case and another tab cannot overwrite it. Keep the tab open until storage is restored; a full reload can still lose unsaved work. A different tab can otherwise refresh saved state. This is not a multi-user concurrency or durable-audit implementation.

The bounded checks are deliberately limited. The coverage check uses an explicitly fictional list (`6024, 6025, 6026, 6027, 6065`); another valid postcode creates an owned office decision rather than automatic rejection. Changing the reviewed location invalidates that decision's evidence; returning to the configured list removes the exception requirement. Missing answers and incomplete metadata do not produce an all-clear. Travel checking fingerprints sample inputs and links to the existing travel checker; it does not call a route API or invent kilometres. The ownership check counts current open sample cases and unfinished required outcomes without closing those cases.

## Suggested client walkthrough

1. Open **Overview**. Select **Needs attention** to see the matching filtered queue, then return to the library and show the 20/5/10 scope filters.
2. Open process **5 — Participant onboarding** (`#/office/operations/case/OPS-1005`). Review the original, fields and evidence; approve, run the demo step, verify its result, then record agreement and billing-readiness outcomes before closing.
3. Open process **4 — Missing information**. Run the configured check with the missing contact value. Add a fictional answer, review the example evidence and run it again. The missing information must remain visible until supplied.
4. Open process **15 — Complete cancellation**. Enable its clearly labelled **demo preview**, load reviewed example evidence, approve, run cleanup and verify it. Open **Try an interruption → Reject the next step**. Earlier cleanup remains verified; return the remaining step for review.
5. After reapproval, select **Lose response after save**. Reload if desired: the unknown state persists. Reconcile, verify, and complete the financial, participant and worker outcomes. Parent closure remains blocked until all required evidence is recorded.
6. Open process **30 — Payroll completion**. Show the staff-checked handoff and native-release responsibility. There is no custom payment or payroll API action.
7. Show process **8 — Correspondence** (`OPS-1008`) with its primary step already checked. Change the owner/deadline and save. Its required follow-ups stay open, and the earlier action is not repeated.
8. Optionally capture a process **14** request with a fictional cancellation source. Enter the checked sender, exact occurrence and **Cancellation requested** response. Approve, save and verify. Open the linked process 15 case; it remains gated, needs independently reviewed treatment, and must complete its required outcomes before the reply can close.
9. Open existing participant, staff, schedule, financial-check, payroll, worker or client tools as **separate examples**. They use different sample records. A hub profile or booking does not populate those tools.

## Before presenting

Use a fresh writable browser profile with fictional information. **Reset examples** resets only the hub. The older browser workspace and authenticated shared server cases have separate data/reset procedures; do not clear operational records for a demo. Rehearse the intended sample dates: hub cases use late October, while several older roster/finance examples use early October. Select **Sample week** in the older overview/schedule where available.

The hub is the primary walkthrough for the 35 opportunities and checked case lifecycle. **Automation → Add message** or **Inbox tasks → Add message** demonstrates the current reviewed message-to-task path; the removed “Process received mail” button is not part of it. The broad legacy browser script explicitly stages fictional engine fixtures for its older lifecycle checks and separately tests the current inbox UI; fixture import is not an application bulk-mail control.

Authenticated **Shared workflows** use actual server storage, separately from these examples. A verified cancellation/assignment action enters **follow-through open** and creates participant and worker communication cases. Cancellation requires a checked native travel/cleanup reference before approval and a final native charge/pay check before closure. Staff perform unsupported cleanup and delivery in ShiftCare; no automatic cleanup or message delivery is implied. Older action-only records are flagged for follow-through review, preserving their native receipts and existing communication. Their travel review is explicitly retrospective.

Use **Account → Office sign-in** with a configured office account, or the sign-in button on Shared workflows. Demo persona selection grants no access to shared records. **Account → Sign out of office**, or the sign-out button in Shared workflows, ends that server session and removes its request data from the current workspace; fictional examples remain available.

## Prototype and integration boundaries

All hub actions are fictional frontend simulations. The separate browser-local target-record map demonstrates save/read-back and recovery behavior; it is not ShiftCare. Gated previews do not enable production release policy, credentials or account methods. Later/native cases do not implement deferred automation. No n8n dependency was added.

The existing workspaces remain available as linked tools. Their older sample datasets and this hub's planning examples are separate. A simulated hub booking or profile does not automatically change the older team-schedule or participant dataset, and no cross-system synchronization is claimed.

The two branch names are sample layouts for the future-branch requirement, not a claim about OCD's actual branch structure. The branch picker filters demonstration records; it is not authorization. Owners and the fixed demo reviewer are presentation identities. Server authentication, RBAC, durable jobs, protected evidence, production audit storage, real mailbox/native/API integrations and live account acceptance remain implementation-plan work. Do not put real care or payroll data in these fictional examples.

The component performs no network request. Existing application bootstrap and linked legacy screens retain their own behavior. The isolated browser check disables the worker and live credentials; it verifies that its walkthrough makes no external-service requests or API mutations. These checks do not certify production security or live workflow acceptance.

## Code and verification

- `frontend/features/operations/catalogue.ts`: source-aligned register and scope labels.
- `frontend/features/operations/scenarios.ts`: fictional sources, fields, checks, steps, required outcomes and existing-workspace links.
- `frontend/features/operations/model.ts`: typed demo state, exact-snapshot checks, safe transitions, reconciliation, mandatory outcomes, persistence validation and CSV escaping.
- `frontend/features/operations/operations.tsx` and `styles.css`: responsive React workspaces, case review, capture dialogs and workflow details.
- `tests/operations-prototype.test.cjs`: all 35 scenario completion paths, missing/unknown data, held gates, stale approvals, duplicate actions, partial cancellation, native handoffs, dependency checks and CSV handling.
- `tests/react-frontend.test.cjs`: existing renderer checks plus regression coverage for legacy enhancement and React-owned workflow controls.
- `scripts/operations-prototype-browser-check.mjs`: isolated browser walkthrough, screenshots, reload persistence, mobile geometry and legacy-screen checks.

Run:

```sh
npm test
npm run build
npm run verify:operations
```

For ordinary local frontend exploration without starting the background worker, use `AUTOMATION_RUN_WORKER=false npm start`, then open `/workspace/#/office/operations/overview` on the printed local origin. This does not change any configured integration's release scope.

The [current hub browser receipt](demo-fixes-2026-10-26/operations/browser-check.json) and [fix and validation report](OCD_Prototype_Demo_Fixes_2026-10-26.md) record the latest scenarios, captures, results and limitations. The [original delivery review](prototype-operations-2026-10-25/review.md) and [readiness assessment](OCD_Prototype_Demo_Readiness_Review_2026-10-26.md) preserve the earlier baseline.
