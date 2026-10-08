# OCD Brilliance — Client presentation and pilot report

**Prepared:** 8 October 2026

**Basis:** 5 October client meeting, reviewed requirements, researched ShiftCare design and the working prototype

**Status:** Presentation guide and proposed pilot; business benefits have not yet been measured

## 1. The message to open with

> Your team keeps using ShiftCare as its main system. Our automation prepares repetitive work, shows what needs a decision and checks the outcome before closing the task. The aim is to spend less time copying information, checking replies and chasing follow-up, so your staff have more time for participants. We will measure the benefit in a small supervised pilot before expanding.

Begin with the client's strongest repeated request: information from emailed participant and employee forms and scans should reach the correct records, with staff checking it. Then show how the same approach helps reminders, cancellations, cover, documents and bookkeeping.

The advantage comes from reducing the work between existing tools: sorting, finding the right record, preparing information, keeping track of approvals and following up on exceptions. ShiftCare continues to hold the participant, worker, roster, care, document and service billing records. Xero and the confirmed payroll platform retain their financial responsibilities.

## 2. Open the client walkthrough

Run the project and sign in with the existing local office account. Keep credentials out of client slides and reports.

**Local walkthrough:** [Client presentation](http://127.0.0.1:8001/#/office/presentation)

**Navigation:** Office → Client walkthrough, or the link at the top of Home

The prototype has five presentation sections:

| Section | What to explain | What the client should take away |
| --- | --- | --- |
| Business overview | Current process, proposed handling and the role of each system | The team retains ShiftCare and spends less effort coordinating repetitive work. |
| Use cases | Seven core areas, their triggers, expected results, staff responsibilities and measures | Each feature addresses an actual operating need. |
| Guided demo | One realistic piece of work, linked to the working sample screen | The proposal can be walked through and challenged in practice. |
| Measure value | Editable capacity assumptions and a baseline/pilot scorecard | Benefits will be measured; they are not invented savings. |
| Pilot & proof | Dated native evidence, current limitations and rollout decisions | The client can distinguish a demonstrated design from a proven live integration. |

Use **Presentation view** to hide the office navigation while explaining the business story. **Escape** or **Exit presentation** restores the normal layout. Opening a working example restores the operational workspace. The setting does not grant additional permissions.

**Download report .md** exports the business scope, expected benefits, proof summary, assumptions, scorecard and recommended pilot. **Print view** prints the currently visible section. Values in the presentation stay in page memory until reload: download the report to retain them. The report excludes operational record payloads and credentials.

## 3. A 15-minute presentation

| Time | Screen / action | Suggested speaker notes |
| --- | --- | --- |
| 0–2 minutes | Business overview | “Today your team copies information, checks replies and follows up across several places. We want to prepare that work and make the next action clear.” |
| 2–4 minutes | Use cases | Explain paperwork first, then replies/cancellations, cover, document alerts, care review, bookkeeping and owned communications. Show who still makes decisions. |
| 4–9 minutes | Guided demo → An emailed intake → Prepare sample cases → Open working example | Compare the source and proposed fields, block a missing field, approve a corrected proposal, show an interrupted native step, reconcile and finish the separate accounting handoff. |
| 9–11 minutes | A cancellation reply or A sick worker needs cover | Show one secondary scenario suited to the client's priority. Protect recurring bookings; obtain worker acceptance rather than assuming availability. |
| 11–13 minutes | Pilot & proof → Inspect the saved evidence | Explain what the real trial evidence proves and its capture date. Distinguish it from the fictional operational cases. |
| 13–15 minutes | Measure value | Agree baseline measurements, the pilot reviewer and success thresholds. Download the report with either blank inputs or clearly labelled assumptions. |

Avoid touring every operational screen in the first meeting. Use the seven examples to answer practical questions after the main onboarding story.

## 4. Scope: seven core areas and fourteen planned workflows

There are **seven core automation areas**, containing **thirteen operational workflows (W01–W13)**. **Booking and arrival support is W14**, bringing the full planned workflow inventory to fourteen. These counts describe planned scope; they do not imply fourteen working production integrations.

| Client pain / current work | Automation area and planned handling | Staff / native responsibility | Expected business value | Measurement |
| --- | --- | --- | --- | --- |
| Re-key forms and scans; chase returned agreements | **Paperwork** — W03/W04/W05: prepare fields, match records, flag missing information, assign review and track filing/accounting handoff | Check identity, consent, capacity, exact fields and agreement version; retain HR screening and accounting ownership | Less typing and searching; fewer incomplete or duplicate records | Total staff minutes per intake; corrections / 100 records |
| Daily yes/no checking; manual cancellation entry | **Replies and cancellations** — W06/W07: match an exact visit, prepare a reason and policy-reviewed change, check the result | Retain existing ShiftCare reminders; clarify ambiguous replies and approve charge/occurrence scope | Less repeated checking; lower wrong-visit and billing risk | Checking minutes/day; unresolved replies; corrections |
| Short-notice sickness or service change | **Replacement cover** — W08: an owned case, suitable-worker review, offer tracking and escalation | Workers accept/decline in ShiftCare; staff check personal availability, suitability and participant contact | Faster coordination and clearer service-risk visibility | Cover handling time; accepted before deadline / 100 cases |
| Missing documents and false expiry flags | **Document checks** — W12: prepare evidence-based follow-up and non-expiring-document corrections | Inspect original evidence and verify supported native filing/metadata changes | Fewer unnecessary reminders; clearer review priorities | False flags; unresolved cases; review minutes |
| Finding actual attendance, notes and explanations | **Care review** — W09: highlight missing or inconsistent evidence for a supervisor | Workers enter care in ShiftCare; supervisors interpret risk, explanations and corrections | Less searching and more focused attention | Review minutes; unresolved exceptions; acknowledgement time |
| Tuesday invoice / fortnightly payroll comparisons | **Bookkeeping preparation** — W10/W11: period-specific exception packs for hours, payer/funding and travel/km questions | Bookkeeper retains judgement, native export, payroll calculation and release | Less gathering and fewer last-minute queries | Minutes/cycle; pre-release and post-release corrections |
| Overlooked enquiries, invoice complaints and unclear ownership | **Enquiries and communications** — W01/W02/W13: area check, urgency, record matching, owner, next action and delivery status | Confirm capacity and unclear matches; approve sensitive responses; route financial complaints to the bookkeeper | Fewer forgotten requests and duplicated effort | Overdue follow-ups / 100 requests; response time; failed messages |

### The supporting subsystem

| Supporting feature | Practical role | Benefit and boundary |
| --- | --- | --- |
| Office queue and review history | Show the source, proposed change, responsible person and next action | Less searching and clearer accountability; prepared work is not represented as a completed native action. |
| Worker workspace | Explain offers, availability, documents and native care responsibilities | Supports coordination; does not replace actual ShiftCare acceptance or care entry. |
| Participant workspace | Show bookings, requests, documents and permitted arrival information | A clearer experience with fewer avoidable status calls; sample personas are not production identity controls. |
| Office / Worker / Client Mapbox views — W14 | Visualise bookings and demonstrate consented arrival status | The map renders with Mapbox. Journeys and arrival data are simulated. A participant does not receive the worker's exact route or home location. |
| Exception and evidence views | Explain failed steps and show dated, independently checked native evidence | Errors remain visible and owned. The sample queue and real trial evidence remain separate. |

## 5. Demonstrate the workflow, including a failure

The **Guided demo** is a narrative stepper. Next/Previous explain the story; they do not run an automation or certify an integration. **Open working example** links to the existing interactive operational screen.

**Prepare sample cases** processes fictional source IDs once, preserving existing case history. Repeating it skips the same sources; it does not create duplicate profiles or touch ShiftCare. Real server-backed enquiries remain on their separate reviewed handoff path.

### Primary example: Ava's emailed intake

1. Choose **An emailed intake → Prepare sample cases → Open working example**.
2. Show Ava's original fictional source alongside the prepared fields. Explain that the prototype starts with pre-filled fields; actual mailbox ingestion and scan extraction still need implementation.
3. Clear the date of birth. Attempt approval and show that incomplete information blocks progress. Restore **14 March 1981**, then review identity, consent, duplicate matching and area/capacity.
4. Approve the exact proposal. Open **Try an interruption** and choose **Lost response after the action** for the simulated native step.
5. Show the owned reconciliation state. A lost response does not prove the native step failed; another creation must wait until the outcome is checked.
6. Read back the simulated native result. Show that the local record changes only after verification.
7. Finish the separate sample Xero check with a clearly fictional reference and reviewer note. Explain that a ShiftCare profile alone does not prove accounting setup is complete.
8. Show the case history. Explain the expected reduction in re-entry and chasing, then identify the measure: total staff handling minutes, including review and recovery.

The current sample case may already be completed after an earlier demo. Use its history to explain the outcome, or use **More office sections → Restore sample data** to restart the fictional scenario. The reset retains server-backed enquiries. The presentation does not silently reset cases.

### Secondary examples

| Example | What to show | Business point |
| --- | --- | --- |
| Cancellation | Match Olivia's BKG-505 reply; review reason, charge and single-occurrence scope; simulate the change and verify it | Reduced daily handling should also reduce wrong-visit or billing mistakes. Unclear replies need a person. |
| Failed communication | After a verified outcome, demonstrate failed participant delivery and retry | A message retry must not repeat the cancellation or native update. Delivery failure remains visible. |
| Replacement cover | Use BKG-502; review Elena Cruz, post/verify the sample offer; switch to Worker → Elena and accept; return to Office for contact review and checked assignment | Acceptance and personal availability matter. No-cover cases require staff and participant contact. |
| Documents | Use **Check documents**, review the induction acknowledgement that has no expiry, inspect evidence and verify the sample correction | Remove false alerts only when the evidence justifies it. Native document tracking remains useful. |
| Care and finance | In Bookkeeping prepare a care, Tuesday invoice or fortnightly payroll review; inspect missing evidence and record the reviewed handoff | Focus staff effort on exceptions and retain the current bookkeeper's approval/release process. |
| Arrival | Worker → Elena → Visit map → BKG-501: consent and start the fictional journey. Then Client → Olivia → Arrival status. Return to Worker and test stale updates/stop sharing | Clear arrival information with consent and limited participant visibility. Real phone updates are a separate integration. |

An unknown attendance field or no recent note match is a **review signal**, not proof of a missed service. The system cannot invent worker capacity, clinical judgement, travel figures or financial approval.

## 6. What remains in ShiftCare and how the layer connects

Explain the integration without technical detail:

> We read the authorised records, prepare a checked proposal and use a supported ShiftCare method for approved changes. Then we read the result back. If an action is unsupported or the result is unclear, the case stays with the responsible staff member.

| Direction | Data / purpose | Present prototype | Pilot requirement |
| --- | --- | --- | --- |
| Forms/messages → automation | Source, required fields, matching information and review ownership | Fictional sources and prepared fields; public intake stores consented requests on the server | Authorised mailbox/form/scanning connectors and field extraction |
| ShiftCare → automation | People/record references, bookings, attendance, note metadata and relevant evidence | Saved authenticated MCP trial capture; separate office REST read screen when credentials are configured | Confirm entitled access, scope, field contracts and refresh method in the intended account |
| Automation → ShiftCare | Exact approved changes or administrative follow-up | Operational updates are simulated. One real administrative action was separately approved and read back using MCP | Validate each chosen native action, permissions, result check and safe recovery before automating it |
| ShiftCare → checked result | Stable native reference and independently retrieved outcome | Real read-back for the one trial task; sample read-back for operational cases | Persist evidence and reconcile uncertain outcomes before retry |
| Checked result → accounting/contact handoff | Reviewed reference, communication outcome and next action | Sample handoffs and delivery examples; actual financial export/release remains in current systems | Confirm the accounting/payroll process and supported communication method; verify delivery |

**MCP** is the connected assistant's authorised access, demonstrated in the trial. It is not a credential already installed in the website. The **API** is a separate possible server connection that requires suitable account access and credentials. Supported native integrations can be preferred where they cover a task. Do not promise general webhooks, unrestricted file upload, automated worker acceptance, native chat sending or a continuous ShiftCare GPS feed: these have not been validated for this account.

Keep worker care entry, offer acceptance, participant/staff master records, roster authority and service billing in ShiftCare. Keep HR judgement, sensitive care decisions, cancellation policy exceptions, financial approval and no-cover participant contact with their existing owners. Before automating each task, validate the actual account's available method and exact fields.

The supporting web app should become a secure record of proposals, approvals, exceptions and checked results. Production identities, permissions, scheduled processing, persistent job storage, monitoring and delivery need implementation and testing before real rollout.

## 7. Present proof honestly

The **Pilot & proof** section reads the saved office-protected evidence summary. It does not poll ShiftCare, make a native change or run a new analysis. **Inspect the saved evidence** opens Integration proof, where **Run captured-data checks** executes local rules over the dated capture. Return to the presentation and **Refresh saved summary** to see that run's count.

As of the verified 7 October trial evidence:

- Authenticated reads returned two participants, one staff member and three shifts in the requested scope, with eleven passed read receipts.
- The captured-data review produced six review signals across three shifts. They were not confirmed missed visits or financial errors.
- One approved administrative follow-up, **action 11221**, was created in the trial account and independently read back on **7 October 2026**. Its status was **Open at that read**; current completion is not polled.
- This proves authenticated access, rule-based review of captured data and one supervised native action. It does not prove operational onboarding, cancellation, messages, payroll release or background automation are live.

The page derives its status from the loaded evidence; it does not hardcode these counts as green results. On a fresh clone or hosted build without the private capture, it shows **No account evidence is loaded**. Show the sample journey as a design demonstration until authorised native evidence is available.

Reference the [native demonstration and verification runbook](OCD_ShiftCare_Live_Demo_and_Verification.md) and [8 October prototype review](OCD_Prototype_Review_2026-10-08.md) for detailed receipts and current limitations. Do not perform another native write simply to refresh the presentation; each such action needs its own applicable approval and independent verification.

## 8. Measure value without claiming unproven savings

### Before starting the pilot

Record a baseline for representative cases and keep a simple measurement log: date, case type, number of cases, staff handling minutes, review/recovery minutes, corrections, follow-up outcome and the evidence reference. Avoid care content and personal identifiers in the client report.

Compare equivalent work, not an easy pilot case against a difficult manual case. Include incomplete forms, ambiguous replies, failed steps and human intervention. Time spent resolving exceptions is part of the assisted process.

### Capacity calculation

```text
Monthly staff hours potentially released
  = monthly case count × (manual minutes − assisted minutes) ÷ 60

Gross staff-time cost equivalent
  = those hours × agreed hourly staff cost
```

**Illustrative example only:** 40 cases/month, 20 manual minutes and 8 assisted minutes imply **8 staff hours/month** of capacity. At AUD 35/hour, the gross staff-time cost equivalent is **AUD 280/month**. These are not client measurements, cash savings or a return-on-investment claim. Implementation, licensing, training, support and operating costs are excluded. The calculator shows additional effort if the assisted process takes longer; it does not force a positive benefit.

Leave missing inputs blank. Zero is a recorded value and must be entered explicitly. **Try illustrative example** labels the inputs as illustrative. Editing them labels them as presenter assumptions; the downloaded report preserves that distinction.

### Pilot scorecard

| Measure | Favourable direction | Evidence to retain |
| --- | --- | --- |
| Onboarding minutes / intake | Lower | Equivalent form types; all staff review and exception time |
| Reply-checking minutes / day | Lower | Similar reply volumes and matching/correction effort |
| Overdue follow-ups / 100 requests | Lower | Agreed overdue definition, request count and completed actions |
| Record corrections / 100 records | Lower | Agreed correction definition and underlying records processed |
| Bookkeeper review minutes / cycle | Lower | Equivalent invoice/payroll periods and query/correction counts |
| Cover accepted before deadline / 100 cases | Higher | Agreed deadline and actual worker acceptance |

The scorecard is presenter-entered and not independently verified. It shows a raw change, not causation. Record both measurement periods, sample sizes and sources; missing periods make a comparison provisional. Agree success thresholds with the client instead of presenting invented targets.

### A weekly client update

Use this structure in the exported report or meeting notes:

1. **Scope and period:** what was piloted, measurement dates and case volumes.
2. **Checked results:** what reached the intended ShiftCare record and how it was verified.
3. **Staff effort:** total handling time, including review and exceptions, compared with equivalent baseline cases.
4. **Quality and follow-through:** corrections, overdue work, delivery failures and cover outcomes.
5. **Remaining manual work:** human approvals, unsupported actions and unresolved cases with owners.
6. **Costs and decisions:** known project/operating costs, whether the benefit justifies expansion, and the next decisions.

Do not use the native trial read count or the number of sample cases as a business savings metric.

## 9. A practical pilot proposal

| Stage | Work | Evidence / exit decision |
| --- | --- | --- |
| Agree the process | Select an intake form, required fields, reviewer, intended account, consent rules and baseline | Client-approved rules, responsibilities and success measures |
| Validate access and actions | Confirm supported reads/writes, exact fields and independent checks in the intended account | Demonstrated limited operations and an explicit manual handoff for unsupported ones |
| Supervised onboarding pilot | Process a limited representative set with staff approval and an exception owner | Dated native outcomes; matched records; separate accounting check; measured total effort |
| Review the business case | Compare effort, accuracy and follow-through; include project and operating costs | Client decision to adjust, stop or expand based on evidence |
| Extend where useful | Reply/cancellation, then cover, documents and bookkeeping after policies and connectors are confirmed | Separate acceptance checks for each new workflow; arrival validated independently |

No pilot volume, duration, savings target, pricing or delivery deadline is assumed in this guide. Agree those with the client after confirming access and the first use case.

## 10. Supporting references

- [Client needs and transcript evidence](OCD_Client_Needs_and_Automation_Requirements.md)
- [27-entry requirement register](OCD_Automation_Requirements_Register.csv)
- [ShiftCare integration and workflow design](OCD_ShiftCare_Integration_and_Automation_Design.md)
- [Interactive workflow plan, coverage and demonstration instructions](OCD_Prototype_Workflow_Plan_and_Validation.md)
- [Native proof and verification runbook](OCD_ShiftCare_Live_Demo_and_Verification.md)
- [Prototype review and remaining integrations](OCD_Prototype_Review_2026-10-08.md)

This presentation packages the reviewed workflow for a client conversation. It does not change the existing requirements into an approved contract or represent sample behaviour as production automation.

## 11. Prototype validation — 8 October 2026

| Check | Result | Practical scope |
| --- | --- | --- |
| `npm test` | 59 passed | Includes seven new tests for workflow coverage, capacity arithmetic, missing/zero values, comparison direction, authenticated proof and report privacy. |
| `npm run build` | Passed | The presentation assets are included in the deployable bundle and updated offline shell. |
| Presentation browser review | 7 scenarios passed; 11 screenshots | Guide navigation and preparation, working case links, presentation mode, value inputs, saved proof, missing-evidence handling, Markdown export and mobile cards. |
| Existing workflow regression | 13 scenarios passed; 15 screenshots | Intake, native sample interruption/recovery, employee/agreement checks, cancellation/delivery, cover acceptance, care/documents, bookkeeping, arrival/privacy, workspace navigation and public intake. |
| Browser runtime and visual review | No uncaught exceptions; 26 screenshots inspected | Desktop and 390px mobile layouts; no horizontal page overflow. The scorecard uses readable mobile cards. |
| `git diff --check` | Passed | No patch whitespace errors. |

The final test run also corrected a concurrency-test assumption: simultaneous evidence reads can finish in either order. The check now verifies that exactly one request creates the saved review and the other reuses it, preserving the actual duplicate-prevention requirement.

Evidence receipts: [Client presentation review](client-presentation-review-2026-10-08/browser-review.json) and [Existing workflow regression](client-presentation-regression-2026-10-08/browser-review.json). These checks used an isolated local server and the existing dated private trial capture. They made no new native write and do not measure client savings or certify live production connectors.
