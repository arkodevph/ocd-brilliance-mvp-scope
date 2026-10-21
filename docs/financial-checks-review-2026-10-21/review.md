# Financial checks implementation verification

Verified 21 October 2026 in the local OCD prototype. Replaces the Bookkeeping route at `#/office/finance` and renames its navigation to Financial checks.

## Behavior

- Invoice readiness: completed services without invoices, duplicate service charges, attendance review/time differences, billing agreement/recipient/category/rate defects and draft review.
- Payroll reconciliation: missing/stale approval, approved visits absent from current draft, changed draft sources and outstanding final review.
- Charges: flagged saved routes, unapproved fee proposals and incomplete cancellation evidence/handoffs.
- Follow-up: manually verified external invoice status, recipient, due/next dates, evidence and outcome. Returned, overdue and due follow-up appear across service periods. Paid/Closed resolves the local finding.
- Specific detail comparison, owner/next action/history, exact source navigation and period context. Corrections resolve on recheck. Only time variance can be explained with evidence; changed sources reopen it. No arbitrary dismissal of source defects.
- Old automation evidence remains available; the current finance page uses source checks rather than its generic report form. Native period/history disclosure is preserved through the legacy UI enhancer.

## Verification

Production build passed. An initial 192-test repository run passed, including 11 new financial-check tests. A final shared-workspace run collected 204 tests: 201 passed and 3 failed (room-video API tests expecting 4 room categories while 12 are now returned, including the parent test). Financial-check tests still pass. Unrelated room-video work was preserved. Isolated browser scenario passed: period selection, assignment/explanation, persistence, source-change reopening, exact travel-booking navigation, returned tracking, verified paid resolution, filters and empty period. 320/390/1440px screenshots produced without page overflow and with zero uncaught browser errors. `git diff --check` passed.

Sources of UX decisions and limits are in `design-rationale.md`. Observed implementation tests do not establish reduced staff effort; a bookkeeper trial is still needed.

## Limits

Browser-local workflow only. No live accounting/payroll status, invoices sent, messages delivered, payroll release or production role certification. Current billing agreements, vendor details and payroll periods remain subject to business confirmation.
