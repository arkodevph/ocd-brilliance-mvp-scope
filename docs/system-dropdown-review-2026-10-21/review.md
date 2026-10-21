# Shared form control audit — 21 October 2026

Removed the select-to-button conversion from `workspace/ui-layout.js` rather than opting out individual forms. Deleted its obsolete button-row, profile-picker and booking-picker CSS from `workspace/styles.css` and `workspace/crm.css`. `frontend/dropdowns.css` preserves native selects and `frontend/macos-premium.css` supplies consistent compact desktop controls and mobile touch targets. Text-field minimum heights no longer enlarge `.checkbox` inputs. Cache version: v70.

Covered every navigation screen across office, worker, client and public views, six record detail screens and all nine initial automation cases: **51 routes**, each at 1440×1000 and 390×900. Every page had zero generated option-button groups and no horizontal document overflow. Screenshots and eight contact sheets are saved alongside `browser-review.json` in this folder.

Checked five dialogs at both viewport widths: new enquiry, inbox message, agreement generation, account settings and client booking changes. The last uses a future-dated fictional booking fixture to expose its action. Evidence: `../system-dropdown-dialogs-2026-10-21/browser-review.json`.

Verified the user-reported payroll review selector, existing employee-record picker and enquiry status filter. Payroll report submission and selected values persisted correctly. Native keyboard interaction and validation are retained by keeping real select elements. Source scan found no remaining legacy choice-row generator or associated CSS in frontend/workspace source.

Build passed. Full test suite passed **158/158** with one test process at a time; the first concurrent run had the existing timing-sensitive ShiftCare abort-test failure. No test source was changed to suppress it. Browser sweeps recorded zero uncaught errors. Final cancellation regression, delivery/retry, reload, mobile layout and checkbox screenshots passed in `../system-controls-final-2026-10-21/` after the last CSS adjustment.

Scope: shared form controls and their layouts, selection and submission behavior. This does not certify live integration writes, production financial rules or every feature's business logic. No commit, push or deployment. Existing unrelated work was preserved.
