# Travel review layout rationale and verification

Surface: office staff reviewing saved travel estimates in the OCD browser prototype. Primary task: find a flagged booking, compare saved/current context, record checked values. Desktop and phone. Staff frequency and measured review time remain unknown.

Flow: scan booking summaries and status → select one visit → compare saved/current context → read reasons → enter evidence → save → retained current booking/status. First-use legacy records explain missing captured context. Errors stay beside the form; stale-save rejection remains. Switching visits preserves unsaved fields in the DOM. Save rebuilds the view but retains selected booking.

Evidence ledger:

| Principle/source | Evidence and limits | Confidence | Decision and falsifier |
| --- | --- | --- | --- |
| Semantic grouping: https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html | Accessibility guidance requires expressed relationships available programmatically; not an experiment or guarantee of speed | Strong standard; product benefit unmeasured | Named booking navigation, headings, comparison definition lists and labelled fields. Falsified as a useful layout if staff regularly confuse booking context or fail to locate fields. |
| Choice overload correction: https://www.scheibehenne.de/ScheibehenneGreifenederTodd2010.pdf | 63 conditions, 50 experiments, N=5036; mean effect near zero with heterogeneity. Choice tasks differ from office travel review. | Strong synthesis, analogy-only for this product | Keep every booking choice; disclose one detailed form instead of cutting options. Test wrong-booking selections and completion time against the previous design. |
| Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | WCAG expects ordinary content to reflow at equivalent 320 CSS px; this is a conformance target, not cognitive psychology | Strong standard | Two panes on wide desktop, stacked booking summaries/detail on narrow screens; check overflow and access to every action. |

ui-design-index route: ui-design-systems. Patterns: list/detail workspace; neutral bordered surfaces with readable status; grouped comparison and nearby review action. System typography, relative text sizing, restrained existing macOS tokens. No motion or dependency added. Empty state retained; validation and business rules unchanged. No new asynchronous loading path.

Changed: frontend/features/travel-checker/view.mjs and styles.css; workspace/app.js selection, deep links and retained selection; workspace/sw.js v74; tests/travel-checker-view.test.mjs; scripts/prototype-browser-check.mjs layout scenario.

Verification: build passed; full serial test suite 168/168 passed. Browser test used three bookings and verified one visible form, switching, preserved unfinished note, focus transfer, selected-booking retention after save, deep links and layouts at 1736/1440/390/320 widths with no horizontal overflow or uncaught errors. Two direct view tests verify selection/draft behavior and empty/deep-link states. Focus outline visible in inspected desktop screenshot. These are scoped accessibility checks, not a full WCAG audit. Recommend a short staff test comparing review time, wrong-booking saves and backtracking; no measured usability improvement claimed.

No commit, push or deployment. Profile setup was requested next; project state saved before switching work.
