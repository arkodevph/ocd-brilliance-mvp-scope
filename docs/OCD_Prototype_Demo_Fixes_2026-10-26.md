**OCD prototype: fixes and validation — 26 October 2026**

The reported demo defects have been corrected and the selected prototype journeys pass their checks. The application is ready for a rehearsed, fictional prototype demonstration. This is not acceptance of live ShiftCare/Xero integration, production security, or 20–25 independently operating automations.

The [original readiness review](OCD_Prototype_Demo_Readiness_Review_2026-10-26.md) and its evidence remain the assessment before these changes. Existing working-tree changes were preserved. This follow-up changes the custom application and its tests; it adds no n8n dependency or new live connector.

**Disposition of every review finding**

| Finding | Status | Change and verification |
| --- | --- | --- |
| R01 — Locked follow-up ownership | Fixed | Open follow-up owners/deadlines can change after a saved or uncertain step. The original approved action/result stays intact, and assignment history records the handover. Shared workflows also have a separate assignment command. Model tests cover normal/unknown outcomes; the hub and shared browser journeys exercise saved-result handover. |
| R02 — Reused coverage evidence | Fixed | Rule outcomes bind their evidence to the reviewed inputs. Changing location reopens the dependent decision and clears its old reference; stale/legacy unbound proof cannot close a current check. Returning to the configured sample list removes the exception requirement. Model and browser checks reproduce the previously failing postcode-change sequence. |
| R03 — Cancellation reply treated as confirmation | Fixed | Reviewed response choices have distinct handling. Cancellation opens a linked, gated cancellation case; change opens a linked occurrence-change case; unclear/silent responses open owned clarification. Those children start without an approval or unrelated proposal values. Parent closure cannot bypass their required outcomes. All response branches are covered in model tests, with the complete linked cancellation journey exercised in the browser. |
| R04 — Broken walkthroughs and entry points | Fixed for the selected demo suites | Updated current employee/review/overview expectations; restored the office Demo guide entry points and a participant portrait lost during React heading conversion; corrected account/sign-in/sign-out navigation. The broad walkthrough now finishes. Current inbox message review is tested through its UI. Older engine scenarios are explicitly staged as test fixtures rather than accessed through a removed bulk-mail button. |
| R05 — Separate datasets | Resolved as an explicit prototype boundary | The hub is the primary case-lifecycle demonstration. Its module links, case handoff links, footer and guide explain that linked tools have separate examples. No synchronization between the hub, older browser data and server-backed cases was invented. An integrated real-data journey remains implementation-plan work. |
| R06 — Premature shared completion | Fixed with explicit native staff handoffs | Shared W07/W08 now enter `follow_up` after native action verification. Separate participant and worker communication cases require checked history evidence. Aggregate closure is blocked until both finish; cancellation also requires a final charge/pay check. A checked actual-travel/cleanup reference is required before new cancellation approval. Unsupported cleanup remains a staff action in ShiftCare. Older action-only records are flagged for follow-through review; their receipts and existing communication are preserved, with retrospective travel review where needed. |
| R07 — Storage failure loses captured case | Fixed within the browser session | Unsaved memory takes precedence over older readable storage during navigation. Another tab cannot replace that unsaved case. The warning explains reload limits; restored writes save the current case. Browser fault injection verifies capture, navigation, another-tab notification, recovery and reload. |
| R08 — Unrelated sample defaults | Fixed | Free-form capture clears contextual proposal fields and prior sample context. Only explicit name/person fields use the captured name. Missing values block approval even after example review checks are loaded. The form explains that it does not extract facts or match native records. Model/browser checks verify the empty fields and approval gate. |

**Additional access repair**

The longer walkthrough exposed the missing office access controls. **Account → Office sign-in** now uses the existing server authentication endpoint; Shared workflows also offers a sign-in button. A wrong password remains unauthenticated and produces an inline error. **Sign out of office** ends the server session, clears the office request data/current intake source from the workspace, and leaves fictional examples available. The browser journey verifies rejected credentials, successful sign-in, protected-request access after sign-in, and rejection after sign-out. Demo persona selection still grants no server permissions.

Business-case closure and older-record follow-through review require the existing administrator permission. Tests confirm coordinators cannot invoke those commands. No credentials or sessions are added to browser storage by these controls.

**Validation results**

- [x] `npm test`: **282 tests — 281 passed, zero failed, one skipped**. The skip is the existing PostgreSQL migration test because `initdb`/`pg_ctl` are unavailable. See the [test log](demo-fixes-2026-10-26/tests.log).
- [x] `npm run build`: passed backend/frontend compilation and distribution build. See the [build log](demo-fixes-2026-10-26/build.log).
- [x] All **15 selected browser profiles** passed with **zero uncaught application exceptions** in their receipts.
- [x] Whitespace checks passed. The review baseline identifies which changes belong to this fix rather than earlier working-tree edits.
- [x] Scope remains **35 opportunities: 20 core, five gated, ten later/native**. Passing all modeled scenario paths is not live integration acceptance.

| Browser profile | Recorded checks | Receipt |
| --- | ---: | --- |
| Operations hub, including four formerly failing browser paths | 18 | [Hub receipt](demo-fixes-2026-10-26/operations/browser-check.json) |
| Broad office/worker/client/public walkthrough | 14 | [Broad walkthrough receipt](demo-fixes-2026-10-26/legacy/browser-review.json) |
| Shared workflows, including aggregate cancellation closure | 9 | [Shared receipt](demo-fixes-2026-10-26/native/browser-review.json) |
| React routes, employee leave/notifications, landing/public intake | 4 | [React receipt](demo-fixes-2026-10-26/react/browser-review.json) |
| Intake PDF/OCR, review and native handoff | 8 | [Intake receipt](demo-fixes-2026-10-26/intake/browser-review.json) |
| Inbox tasks | 2 | [Inbox receipt](demo-fixes-2026-10-26/inbox/browser-review.json) |
| Financial checks | 2 | [Finance receipt](demo-fixes-2026-10-26/financial/browser-review.json) |
| Payroll preparation | 2 | [Payroll receipt](demo-fixes-2026-10-26/payroll/browser-review.json) |
| Older cancellation assistant | 2 | [Cancellation receipt](demo-fixes-2026-10-26/cancellation/browser-review.json) |
| Travel checker | 2 | [Travel receipt](demo-fixes-2026-10-26/travel/browser-review.json) |
| Person-led automation pipeline | 2 | [Pipeline receipt](demo-fixes-2026-10-26/pipeline/browser-review.json) |
| Profile images across workspaces | 2 | [Profiles receipt](demo-fixes-2026-10-26/profiles/browser-review.json) |
| Client/employee review screens | 3 | [Reviews receipt](demo-fixes-2026-10-26/reviews/browser-review.json) |
| Overview totals, tooltips, periods and empty state | 2 | [Overview receipt](demo-fixes-2026-10-26/overview/browser-review.json) |
| Presentation guide, navigation, value and saved evidence | 8 | [Presentation receipt](demo-fixes-2026-10-26/presentation/browser-review.json) |

Counts include shared setup checks and must not be added together as a count of automated business workflows. Unlike the earlier temporary compatibility replay, these are runs of the updated repository scripts. The broader legacy runner explicitly stages fictional engine fixtures for its lifecycle cases; the inbox profile independently tests current **Add message → review → assignment** behavior.

Eleven regression tests were added: six hub/model tests and five shared-service tests. They cover post-save assignment without another dispatch, location-bound evidence, stale proof, all reply branches and linked closure, blank capture, required travel evidence, communication/financial closure, rejected-child/source-change behavior, assignment follow-through and legacy action-only completion. The existing role test also checks the new closure/review permissions.

Browser subprocesses used isolated profiles/temporary server data, disabled worker startup and withheld live credentials. The presentation profile reused the existing dated saved evidence capture; it did not refresh the ShiftCare account. The hub walkthrough issued no external service requests or API mutations. Shared/legacy browser checks made local API requests against their isolated servers, with unsupported native actions explicitly recorded as fictional staff handoffs.

The corrected handover, storage-warning/recovery and shared follow-through screenshots were visually inspected. Selected earlier overview/intake/cancellation captures remain available in the original audit. This is a sampled visual check, not full accessibility/device acceptance. The [verification receipt](demo-fixes-2026-10-26/verification.json) records source fingerprints, individual run receipts and inspected images.

**Presentation checklist**

- [x] Updated the [prototype guide](OCD_Comprehensive_Prototype_Guide.md), README and native-workflow notes.
- [x] Restored **Home → Demo guide** and the Daily work navigation entry.
- [x] Kept gates, human decisions, native financial authority and separate demo datasets explicit.
- [x] Updated the service-worker shell cache version without changing either example-storage key.
- [x] Refreshed the existing local preview at [localhost:8035](http://localhost:8035/workspace/#/office/operations/overview) with the corrected backend, preserved its configuration and stored examples, and kept the worker disabled. See the [preview receipt](demo-fixes-2026-10-26/preview.json). Refresh an existing browser tab to load the new assets. For a later local start, use `AUTOMATION_RUN_WORKER=false npm start` and its printed origin.
- [ ] Rehearse on the presentation machine with a fresh writable profile and the intended sample week. **Reset examples** resets only the hub; other example/server records have separate lifecycles.

The remaining rehearsal is machine/session preparation, not an unfinished code fix. No deployment, remote pull/merge, production data reset, native write, or account acceptance trial was performed. Live integration contracts, production identity/branch authorization, durable multi-user operation, native financial release and location/device acceptance remain subject to the implementation plan. Browser storage failure can still lose unsaved work on a full reload; the warning now states that limit and navigation preserves it within the session.
