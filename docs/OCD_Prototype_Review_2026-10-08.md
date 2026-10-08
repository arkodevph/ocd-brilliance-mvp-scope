# OCD prototype review

Date: 8 October 2026

## Assessment

The prototype supports a coherent client demonstration of the proposed automation journeys. It shows intake mapping, ownership, approval, native handoff, independent verification, accounting follow-up, cancellations, replacement acceptance, document cleanup, bookkeeping exceptions and consented arrival estimates.

It is **not ready for unattended production automation**. The main Automation workspace uses fictional records. The Integration proof workspace uses an actual, dated ShiftCare capture and proof of one supervised administrative task. Those are separate sources with different purposes.

The review found and corrected nine defects, plus clarified historical evidence labels. The final checks passed: **52 tests, 23 browser scenarios, a production build and visual inspection of 27 screenshots**.

## Review basis

- [Client requirements and transcript findings](OCD_Client_Needs_and_Automation_Requirements.md) and the [27-item requirements register](OCD_Automation_Requirements_Register.csv).
- [Researched ShiftCare integration design](OCD_ShiftCare_Integration_and_Automation_Design.md), including its architecture, intake, service and finance diagrams.
- [Prototype workflow plan](OCD_Prototype_Workflow_Plan_and_Validation.md) and [native integration evidence/runbook](OCD_ShiftCare_Live_Demo_and_Verification.md).
- The actual workflow engine, Office/Worker/Participant screens, server intake, authentication, evidence store, REST projection and maps.
- Fresh browser exercises on 8 October. The native evidence used in those exercises was captured on **7 October**, not refreshed during this review. No new native write was performed.

The diagrams describe the intended integration architecture. The prototype demonstrates its decision paths and human checkpoints; the diagrams' mailbox, extraction, job runner, delivery and write connectors are not made live by the screens.

## Defects reproduced and corrected

The existing 45 tests passed before the review. Seven new regression tests and an extension of an existing account test then reproduced eight failures. Broader browser navigation reproduced the ninth defect.

| Priority | Finding before correction | Correction and verification |
| --- | --- | --- |
| High | The status endpoint could return a captured account different from the configured website account. Only a run rejected that mismatch. | Status and runs now reject the mismatch; returned history is filtered to the configured account. Regression test passes. |
| High | A saved run could retain successful native verification after its read-back fields stopped matching the approved task. Downloaded evidence could disagree with the current capture. | Matching runs derive proof stages from the current validated evidence on reload and replay. Both promotion and invalidation are reflected. Regression test passes. |
| High | Arrays were silently limited to 200 records while their receipts could still declare complete results. Missing-note findings could be generated from a truncated set. | Receipts now compare retained records with returned counts/totals. Truncation or inconsistency marks the source partial, adds a gap and suppresses missing-note conclusions. Retained counts appear in the UI. Regression test passes. |
| High | A fixture or capture without verified authentication could produce a successful "authenticated MCP" review. | MCP runs require the authenticated MCP source; fixtures and unverified captures are rejected. Source labels and run controls reflect this distinction. Regression test passes. |
| Medium | The sanitizer replaced the approved task priority and verification method with hardcoded values. An accurately read-back high-priority task could fail comparison. | Preserve the supplied values and compare the native read-back with those exact values. A high-priority fixture regression passes; no additional native task was created. |
| Medium | Capture time and account time zone were absent from the source fingerprint, allowing a review to reuse findings whose temporal context changed. | Include capture time, time zone and source metadata in the fingerprint. Repeated identical input still reuses one review. Regression tests pass. |
| Medium | A REST review was visible only until reload; the dashboard then returned to the MCP file and lost the REST evidence context. | Store minimized REST evidence separately and persist the selected source in private local files. Reload preserves that review without fetching again or overwriting MCP evidence. Switching back to MCP remains available. Fixture regression passes; live REST credentials remain unconfigured. |
| Medium | The participant home card displayed "Scheduled 09:00" when an active journey's ETA was stale, although the map withdrew that estimate. | Both initial rendering and timer updates now display "ETA unavailable". Regression and browser checks pass for the home card and map. |
| Medium | Participant booking status and action controls caused horizontal page overflow at 390 px. | Group and wrap the actions within the mobile booking panel. The browser check and visual inspection confirm the corrected layout. |

The evidence screen also now says that native task status is the status **at the recorded read**, with current completion not polled. Its capability text distinguishes the dated exposed tool catalog from the single write actually verified. Browser review filenames and receipts now use the actual UTC review date.

## Coverage of the client's needs

"Demonstrated" below means an exercised prototype path. It does not mean the corresponding production automation is connected.

| Client need / reference | Prototype demonstration | Actual operation still needed |
| --- | --- | --- |
| Participant and employee paperwork; A01, W03–W04 | Reviewed source fields, missing DOB, duplicate matching, separate participant/employee cases, approval, read-back and Xero/payroll check. | Authorized mailbox and scan extraction; actual forms/field mapping; supported ShiftCare profile operations; separate accounting connector. This remains the strongest client priority. |
| Area and capacity screening; A02, W01 | Public postcode gate, owned office intake, uncertain-area case and explicit capacity check. Browser submission reaches the server queue. | Client-approved coverage/capacity configuration and human review of adjacent areas. A covered postcode does not reserve a worker. |
| Overlooked email and invoice complaints; A03, W02 | Sample message routing, urgency, assigned owner, source IDs, replay prevention and follow-up cases. | Real mailbox ingestion, attachments, invoice matching and deadline monitoring. No invoice adjustment is automated. |
| Existing three-day reminder responses and cancellations; A04, W06–W07 | Matched/unmatched replies, reason/policy review, one-occurrence cancellation, read-back, failed delivery and retry. | A validated response source, scheduling, actual policy and the exact native cancellation operation. Group/locked occurrences remain human decisions. |
| Availability, worker acceptance and continuity; A05–A06, W08 | Reviewed candidate, offer, worker accept/decline, assignment verification and participant communication. Calendar gaps do not substitute for acceptance. | Native availability/leave/qualification checks and Job Board/Smart Match or office handling. No suitable-worker capacity must escalate to a person. |
| Expiring and non-expiring documents; A07, W12 | Evidence review, explicit never-expires correction and verified outcome. | Native metadata cleanup and document-type rules. The captured trial read returned no files/qualifications in its limited staff scope, so real cleanup is not proved. |
| Actual time, tasks, goals and significant issues; A08, W09 | Worker sample care entry, incomplete/extra-time checks and restricted office review examples. | Complete native attendance and care evidence, approved alert rules and server-enforced access. Scheduled hours and timesheet rows do not establish delivered time. |
| Tuesday invoicing and fortnightly payroll; A09, W10–W11 | Period-based exception checklist, incomplete-source warning and owned bookkeeper review. | Scheduling, actual payer/funding/travel/rate evidence and native invoice/payroll approval. Existing ShiftCare/Excel/Xero exports remain the financial process. |
| Agreements and returned files; A10, W05 | Correct person/version/signature review, native filing handoff and read-back. | Existing signing provider, approved templates and supported native filing. A general upload API has not been verified. |
| Consolidated communication and privacy; A11, W13 | Sample history, delivery states, retry and scoped persona views; the native evidence projection omits care contents, contacts and rates. | Native communication integration or an agreed delivery channel, real recipient identities and retained delivery evidence. The persona selector does not establish production permissions. |
| Arrival and delay visibility; A12, W14 | Real Mapbox 3D rendering; fictional worker-only consent/start/stop; stale withdrawal; participant service map without worker origin, route or exact location. | A consented device location feed, real booking identity linking, background/offline handling and validated arrival accuracy. ShiftCare continuous GPS is not established by the reviewed evidence. |
| Office, Worker and Participant views; P01–P03; later Mapbox request L01 | Workspace navigation, representative/persona selection, own-booking display, documents and office queues. | Separate authenticated identities and server authorization. Avoid requiring workers to enter the same care data again outside their existing ShiftCare app. |

The remaining team proposals and broader business items in the 27-item register are not silently treated as completed requirements. Newsletters, incentives, broad AI checks, autonomous matching and a general live mirror require their own scope decisions. HR, subcontractor, marketing and owner-workload improvements are broader than the demonstrated automation.

## What the ShiftCare evidence establishes

The private capture comes from the authenticated trial account **testtph / 817962**, in **Australia/Sydney**. The fictional operations scenario uses **Australia/Perth**. Their people, bookings and time zones are kept separate.

The 7 October capture contains two visible participants, one staff record, three shifts, four recent note metadata records and two timesheet rows. The local rules produce six owned findings: missing assignment/participant context on one past occurrence, and attendance/recent-note review on two others. These are review findings, not proof of missed service or incorrect billing.

One specifically approved standalone action, **11221**, was created on 7 October and independently retrieved with matching ID, title, description, assignee, due date, priority and verification method. This establishes that one supervised native follow-up worked in the trial account. It does not establish automatic onboarding, cancellation, messaging, invoicing or payroll.

The website currently loads the saved MCP capture. It does not hold the assistant's OAuth session or continuously poll ShiftCare. Website REST reads use separate server credentials, and the local API key is not configured. No generic webhook, automated worker-acceptance write, general file upload, native chat connector or continuous GPS feed is certified by this review. The dated [capability evidence](ShiftCare_Demo_Capability_Evidence_2026-10-07.json) records the earlier vendor research and exposed-tool inventory.

Local REST evidence and source selection now survive reload in private files, alongside the private MCP capture. Hosted evidence runs still require shared storage; the prototype intentionally rejects such runs on Vercel. This review does not establish a working hosted automation service.

## Verification performed on 8 October

| Check | Final result | Evidence / limit |
| --- | --- | --- |
| `npm test` | 52 passed, 0 failed | Local and synthetic fixtures; no native write. Includes seven new regression tests and the extended mismatch check. |
| `npm run build` | Passed | Latest application, scripts and styles included in the static build. |
| `git diff --check` | Passed | Checked the current changes. |
| `npm run verify:prototype` | 13 scenarios; 15 captures; 0 uncaught exceptions | [Browser and visual receipt](prototype-review-2026-10-08/browser-review.json). Includes 22 workspace sections, public intake → office queue, approval/recovery, finance and arrival privacy/freshness. External Mapbox requests blocked for fallback testing. |
| `PROTOTYPE_INTEGRATION=1 npm run verify:prototype` | 7 scenarios; 9 captures; 0 uncaught exceptions | [Evidence dashboard receipt](shiftcare-proof-review-2026-10-08/browser-review.json). Uses the 7 October native capture in an isolated server; does not refresh ShiftCare or perform a native write. |
| `PROTOTYPE_MAPBOX_LIVE=1 npm run verify:prototype` | 3 scenarios; 3 captures; 0 uncaught exceptions | [Live Mapbox rendering receipt](prototype-mapbox-review-2026-10-08/browser-review.json). Office, Worker and Participant render successfully; coordinates and journeys remain fictional. |
| Visual inspection | 27 final screenshots inspected; capture hashes checked | Recorded desktop/mobile viewports, including the corrected [booking actions](prototype-review-2026-10-08/participant-bookings-mobile.png) and [stale home ETA](prototype-review-2026-10-08/stale-arrival-home-mobile.png). Not a complete device/accessibility certification. |
| Current local server | HTTP 200, seeded office login and evidence checks passed | Running at `http://127.0.0.1:8001/`. Its captured-data check returns six findings and the historical verified task. |

Review changes are local. This review has not committed, pushed or deployed them.

## Next implementation priorities

1. **Pilot the paperwork workflow first.** Obtain the real intake/onboarding forms and field rules; validate record matching and supported native profile operations. Measure avoided re-keying and retain explicit staff review and separate accounting verification.
2. **Move automation state to the server.** Build authorized ingestion, original-evidence storage, shared job persistence, deduplication, scheduling, reconciliation and owned escalation. Browser cases and local files cannot run unattended across the office.
3. **Validate each native operation separately.** Establish production account access and the chosen supported REST/MCP/integration route. Verify exact fields and read-back in an authorized test scope before enabling any automatic change. Keep unsupported steps in ShiftCare with a named owner and outcome reference.
4. **Complete identities and delivery.** Add real worker/participant/representative authorization and agreed communication delivery evidence before using real care or location data. Keep final finance decisions and workforce-capacity exceptions with the appropriate staff.

The prototype's strongest demonstration is the client's administration journey: receive evidence → check and assign → review → perform the supported native step → read back → finish the separate accounting/contact handoff. ShiftCare remains the source of truth throughout.
