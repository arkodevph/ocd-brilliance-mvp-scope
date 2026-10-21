# Travel checker implementation

Navigation: Team & finance → Routes & fees → Routes → Travel checker. Flags also appear in Work queue → Checks → Review travel.

Feature ownership: `frontend/features/travel-checker/engine.mjs`, `view.mjs`, `styles.css`. `workspace/app.js` connects estimates, queue entries and checked review submission. Cache v73.

The checker compares the latest saved route estimate with a detached snapshot of the assigned worker/dispatch, participant address/location, booking date/time/status/service and preceding visit. It flags changed context, legacy estimates without a snapshot, invalid kilometres/minutes and travel exceeding the schedule gap. Checked review requires source, evidence, confirmation and an explicit scheduling outcome acknowledgement when needed. Stale submissions are rejected. Reviews append an estimate and preserve history; later edits reopen flags. Actual claims, payroll and invoices are unchanged. No live route calculation or ShiftCare write is performed.

Verification: build passed; full serial test suite passed 166/166, including eight travel behavior tests. Focused browser flow passed worker/address flags, queue navigation, selected booking, review persistence, old estimates retained, fee records unchanged, tab navigation and desktop/mobile overflow checks. Screenshots visually inspected. No browser errors.

Completed preceding modular-controls verification too: full system sweep 53 checks / 110 captures; dialog sweep 6 checks / 11 captures; intake workflow 8 checks / 10 captures; public shared-select menus and native fallback 6 checks / 13 captures. Public select pages: contact, resources, portal, postcode-gated intake. Native fallback was exercised by loading field CSS without menu enhancement in Chromium; a second browser engine remains untested. Runner now discovers installed Chromium (CHROME_PATH still overrides it); its default-browser failure was resolved and a no-override run passed.

All changes remain local; no commit, push or deployment. Existing unrelated work preserved.
