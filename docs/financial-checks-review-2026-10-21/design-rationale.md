# Financial checks — behavioral design rationale

## Goal and context

Office staff and the bookkeeper need to locate and resolve discrepancies before invoice and payroll preparation. The meetings describe opening individual shifts to compare attendance/notes, correcting billing recipients/categories/travel and remembering payroll adjustments. The old generic checklist created extra cases without a clear connection to financial source records.

Target: routine period review on desktop, usable on a phone. Financial consequences require evidence and current records. The real payroll vendor, accounting sync, staff permissions and production service-period cutoffs remain unknown. No measured staff search-time baseline exists.

## Flow map

| Stage | Information/action | Likely hesitation/error | Feedback/recovery | Success signal |
|---|---|---|---|---|
| First use | Sample service period and explicit browser-record scope | Assuming empty means all production accounts are checked | Visible dates, editable scope and zero-service empty explanation | Staff can explain what was checked |
| Routine review | Read readiness and filter the queue by area/state | Opening every source or forgetting which discrepancy matters | Subject, concrete finding, owner and Review check together | Find the next unresolved item |
| Investigate | Compare recorded evidence with the required check | Treating actual attendance as automatically billable | Separate recorded/required panels; billing treatment remains a decision | Explain the discrepancy and next action |
| Correct | Open the source record or create the missing draft | Losing record identity or entering the wrong payroll period | Exact invoice/visit/booking links; payroll period preserved; route booking selected | Correct record is updated |
| Explain a time difference | Owner, rationale, evidence and explicit confirmation | Dismissing an unresolved defect | Only time variance permits an explanation; other findings remain source-driven | Evidence-bound explanation saved |
| Recheck / recover | Recompute current findings | Assuming an old explanation is still valid | Changed sources reopen checks; source correction resolves them; history retained | Updated counts and visible state |
| Payment follow-up | Verified external reference, recipient, due/review dates and outcome | Mistaking a local draft for an issued invoice | Manual tracking explicitly separate from invoice draft; stale form guard | Returned/overdue task or evidence-backed resolution |

## Evidence ledger

| Evidence / direct source | Task/population and finding | Confidence and boundary | Design implication | Falsification / validation |
|---|---|---|---|---|
| Working-memory limits: [Cowan 2001](https://doi.org/10.1017/S0140525X01003922) | Review of constrained memory tasks; capacity depends on chunking and prior knowledge | Strong evidence for bounded capacity; application to bookkeeping UI is an analogy, not an exact item-count rule | Externalize subject, recorded/required values, owner and next action on the check | Compare staff omissions/backtracking with existing page; do not force a four-item layout |
| [W3C WCAG 2.2 status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Standard guidance for communicating action results without moving focus | Strong normative accessibility basis; does not establish faster financial work | Visible result text plus existing live toast; semantic labels, native selects, inline errors | Keyboard and DOM semantics checks; screen-reader user trial still needed |
| [Skitka/NASA 1998, Automation: Decision Aid or Decision Maker?](https://ntrs.nasa.gov/citations/19980048379) | Simulated monitoring/decision task with and without imperfect automated aid; overall accuracy improved while automation-error events produced worse performance | Promising design caution; aviation-related task differs from bookkeeping; no product outcome guarantee | No automatic financial release, no universal “ready to pay” claim, show exact scope and evidence; no arbitrary close button for source defects | Ask users to identify an intentionally missing record and challenge a finding; observe overreliance |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessibility requirements for semantics, keyboard, reflow, target acquisition and perception | Strong normative baseline; a browser check is not full conformance certification | Native date/select controls, text status labels, relative typography, responsive rows, restrained decoration and visible focus from shared controls | Automated overflow checks, keyboard path and zoom/reflow checks; assisted testing remains unknown |

## UI route and selected patterns

`user-expi` → `ui-design-index` → `ui-design-systems`.

1. Existing macOS token system and neutral bordered surfaces; no competing component library.
2. Compact readiness summary, native area/state filters and scannable rows with owner/action adjacent.
3. Detail page with side-by-side recorded/required evidence and persistent action form. On mobile, panels stack. Period editing and history use native disclosure, preserving necessary information without dominating the routine queue.

Type follows existing relative sizes: body .875–1rem, subdued metadata .75–.8125rem, page heading inherited. Color does not carry status alone. No new motion or loading dependency: computation is synchronous over local records. Empty periods, empty filters, missing checks, validation errors and stale forms have explicit recovery copy.

## Acceptance criteria

Missing/duplicate invoice service, recipient/category/rate defects, missing attendance, time variance, payroll approval/draft drift, travel/cancellation/fee checks and manually recorded returned/overdue follow-up must produce actionable findings. Corrected sources resolve findings; changed explained sources reopen; repeated checks reuse cases. Ownership, evidence and outcomes survive reload. No invoice dispatch, external message, accounting mutation or payroll release occurs.

Validate build, focused engine tests, full repository tests and isolated browser flows at desktop/mobile widths. Measure time to identify and resolve one billing discrepancy with the bookkeeper before claiming workload reduction.
