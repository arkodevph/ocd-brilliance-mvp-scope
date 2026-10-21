# Payroll preparation verification — 2026-10-21

Dedicated route: `#/office/payroll`, under Team & finance.

Approved inputs come from completed, reviewed visits. The office checks actual clock time, unpaid breaks and actual mileage with source references. A period draft collects those approvals by worker; signed hours, kilometre and AUD adjustments retain separate units and evidence. Missing, duplicate, unreviewed or changed sources remain exceptions. Final review and CSV export require current, complete sources. Refreshing an existing period preserves history rather than duplicating the draft. Reviewed adjustments are locked until refresh.

## Verification

- Production frontend build passed.
- All 181 repository tests passed, including 11 payroll tests.
- Isolated browser scenario passed: source approval, single-day draft, AUD adjustment, review, CSV export, reload persistence, stale-source detection, blocked export and refresh without a duplicate draft.
- Desktop (1440 px) and mobile (390 px) screenshots inspected; no horizontal page overflow or uncaught browser errors.
- `git diff --check` passed.

See `browser-review.json` for screenshots and scenario results.

## Boundaries

Browser-local prototype records only. The CSV is a review worksheet, not a vendor-specific payroll import. No wage rates, tax, super, payroll release or live ShiftCare/payroll writes are implemented. The live payroll platform and production integration remain unconfirmed.
