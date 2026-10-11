# Operations UI redesign

## Goal and scope

Office coordinators choose work, inspect a record, act and check the outcome. Workers inspect assigned visits, record attendance and save notes. Clients inspect bookings and request changes. Public visitors check their postcode or reserve a demo call. These tasks use the same visual language on desktop and mobile.

The implementation changes presentation and navigation; it preserves existing validation, persistence and manual ShiftCare handoff. User familiarity, time saved and the optimal grouping need staff testing.

## Evidence ledger

| Source / strength | Task and finding | Decision and limits | What would contradict it |
| --- | --- | --- | --- |
| [WCAG consistent navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) / strong standards basis | Repeated navigation should keep its relative order. This is a standard, not a timed staff study. | Stable daily links; labelled secondary disclosures; selected groups open automatically. No claim of measured speed. | Staff cannot find secondary screens or lose their place. |
| [W3C cognitive accessibility](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p03-consistent-design/) / promising guidance | Familiar controls and consistent layouts support recognition across pages; supplemental guidance does not itself establish WCAG conformance. | Shared headings, buttons, help, icons and neutral surfaces across workspaces. | Users repeatedly relearn identical controls between screens. |
| [Scheibehenne, Greifeneder & Todd, 2010](https://scheibehenne.de/ScheibehenneGreifenederTodd2010.pdf) / contested transfer to this product | Meta-analysis: 50 published and unpublished experiments, 5,036 participants; near-zero average choice-overload effect with substantial variation. Consumer choices differ from care operations. | Group secondary links; retain every destination and all five work filters. Avoid claiming a universal limit on menu size. | Grouping adds search time or extra navigation errors. |
| [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) / strong standards basis | Testable accessibility requirements, including 24 CSS pixel targets or applicable exceptions and reflow. | Comfortable controls, visible focus, native keyboard disclosures, wrapping actions and mobile screens. Full conformance requires a broader audit. | Controls are hard to reach, keyboard actions fail or page content overflows. |

## Design route and references

`ui-design-index` → `ui-design-systems`. Primary structural reference: [Carbon UI shell](https://carbondesignsystem.com/components/UI-shell-left-panel/usage/); secondary: [Carbon progress indicator](https://carbondesignsystem.com/components/progress-indicator/usage/). Keep the existing brand and vanilla JavaScript stack; add no UI dependency. Apply a left navigation rail, compact top bar, clear content area, record inspector and visible linear intake progress. Use neutral borders, one green accent and icons with text labels. Gallery concepts are visual analogies, not usability evidence.

Reviewed live gallery pages:

- [Task Management — Sidebar Interaction](https://dribbble.com/shots/20106136-Task-Management-Sidebar-Interaction): inspected dashboard image; icon-only rail is too ambiguous here.
- [Medical Check-In Web Dashboard](https://dribbble.com/shots/22586743-Medical-Check-In-Web-Dashboard): record grouping; clinical chart content is unsuitable for these operational tasks.
- [Task Management Dashboard](https://dribbble.com/shots/27340983-Task-Management-Dashboard): inspected image; useful hierarchy, but purple gradients and board density are unsuitable.
- [Healthcare Admin Dashboard](https://dribbble.com/shots/27094384-Healthcare-Admin-Dashboard-UI-UX-Design-Medical-SaaS-Web-App): centralised navigation; avoid unrelated risk analytics.
- [Medical Dashboard UI](https://dribbble.com/shots/26942288-Medical-Dashboard-UI-Healthcare-Admin-Analytics-Design): restrained visual roles; omit decorative statistics.
- [Modern SaaS Dashboard](https://dribbble.com/shots/27237482-Modern-SaaS-Dashboard-for-Task-Project-Management): task actions and status; no extra project features.
- [Task Management Sidebar](https://dribbble.com/shots/22699063-Task-Management-Sidebar-Design): labelled grouping; retain mobile access to every route.
- [B2B SaaS Task Dashboard](https://dribbble.com/shots/27175130-B2B-SaaS-Task-Dashboard-Design): owner/status/filter hierarchy.
- [Task Management Mobile Dashboard](https://dribbble.com/shots/26735204-Task-Management-App-Mobile-Dashboard-UI): concise state categories; avoid adding a new mobile flow.

Only the Carbon shell and two downloaded gallery images were visually inspected. Other gallery pages supplied descriptions and palettes; they were not used as composition targets. Live gallery fetches and the Exa CLI were partially unavailable. Research lasted at least three minutes before implementation.

## Flow and states

| Stage | Information / action | Hesitation or error | Feedback / recovery |
| --- | --- | --- | --- |
| Choose work | Daily navigation, work counts, filters | Too many equally weighted destinations | Six daily links; secondary groups, mobile More and active-route indication |
| Inspect | Person, service, status, original evidence | Confusing draft with final data | Source beside editable fields, record-specific progress and status |
| Act | Review, handoff, verification | Missing contact, duplicate, unsupported scan or stale edit | Existing nearby validation, duplicate link, retry and source-review checks remain |
| Confirm | Saved record and audit | Assuming manual entry means API sync | Explicit manual-entry label, staff verification receipt and persisted state |

First-use explanations remain in expandable help and visual checklists. Routine paths show headings and actions first. Errors, urgent attendance guidance, consent and consequential confirmations remain visible. Existing loading and empty states retain recovery actions. Native disclosures supply keyboard and screen-reader semantics; motion respects reduced-motion preferences.

## Validation

### 9 October continuation

The current composition follows [Techuz's Data Table for Project Management Tool](https://dribbble.com/shots/23991257-Data-Table-For-Project-Management-Tool-Team-Collaboration), selected in the preceding reference review. It supersedes the earlier Carbon composition above: a light 216px navigation rail, compact top bar, full-width list, restrained borders and pagination beneath the list. OCD's existing logo and labelled SVG icons replace reference branding; no gallery artwork is copied into the app.

Record pages show one section at a time and preserve unsaved fields when switching sections. Schedule and work queues use the same section controls. Tables show eight records per page (four team members for the roster), with previous/next buttons, selectable page size and a result range; longer card lists show five items. Table height is bounded with sticky column headings, so choosing a larger page does not create an unbounded page. Integration evidence mounts pagination after its asynchronous load and each tab render.

The continuation checks use fictional records and temporary isolated servers. They cover page boundaries, empty results, filtering, independent integration tab pages, unsaved notes, keyboard navigation, mobile reflow and the original intake handoff. Staff usability and configured live integrations still need separate validation.

Final checks: 60 automated tests passed; production build and whitespace checks passed. The design sweep covered 35 routes at desktop/mobile widths (78 screenshots, four scenario groups); the workflow suite passed 11 scenarios and the intake suite passed five, including digital PDF and OCR execution. All three browser suites reported zero uncaught errors. Screenshots are in `/tmp/ocd-ui-final`, `/tmp/ocd-ui-workflows` and `/tmp/ocd-ui-intake`. Representative schedule, record, work queue, home, intake, pagination and integration evidence views were visually inspected.

Run `npm test`, the existing intake and workflow browser checks, and the design sweep:

```sh
CHROME_PATH=/opt/brave-bin/brave PROTOTYPE_DESIGN=1 PROTOTYPE_REVIEW_DIR=/tmp/ocd-redesign-screens node scripts/prototype-browser-check.mjs
```

The sweep covers all 29 top-level routes plus six record screens at 1440px and 390px, secondary navigation, help/account keyboard activation, mobile More, work filters, 320px, doubled text and reduced motion. Screenshots and results stay in `/tmp`; inspect representative desktop/mobile images after passing. Live configured ShiftCare reads and native writes are outside this UI check.

For a staff usability check, compare time and errors while finding a cover task, reviewing one intake and locating a completed record. If grouping slows any task, revise it. Do not claim time savings from implementation alone.

Observed checks on 8 October 2026:

- Automated tests: 54 passed, 0 failed.
- Existing workflow browser checks: 11 scenarios, 8 screenshots, 0 uncaught errors.
- Intake browser checks: 3 scenarios, 6 screenshots, 0 uncaught errors.
- Design browser sweep: 35 screens at desktop/mobile widths, 2 scenario groups, 73 screenshots, 0 uncaught errors. Keyboard activation, 320px, doubled text, reduced motion and all office destinations passed.
- Production build and diff whitespace check passed.
- Representative home, queue, intake, automation, worker, client, public and record screenshots were visually inspected. The mobile booking overflow and clipped bottom navigation were corrected. The isolated integration screen exercised its no-capture state; a live configured capture was not available for this UI sweep.

### Visible choices and automatic intake

The latest user direction supersedes the disclosure and dropdown choices above. Native select controls retain their values and validation behind visible option buttons; larger option sets include inline search. Source evidence and secondary navigation are shown directly. Account actions use a labelled dialog. Status labels remain plain text with a dot, separate from action footers.

Intake extracts and validates text after a short typing pause and after document extraction. Checks include required fields, contact format, postcode coverage and duplicate requests. Request identity and source changes prevent stale results from replacing the current preview. Automatic checks preserve input focus; failures offer retry. Saving, source review and ShiftCare handoff remain separate actions, following the user's choice to automate extraction and validation.

Validation used fictional isolated data: 60 automated tests, 33 browser routes with no visible selects or collapsible disclosures, source visibility, option selection, account navigation, automatic intake, invalid coverage, stale response suppression, clearing input and retry recovery. The roster fits 1720×984, 1440×900, 1366×768 and 1200×800 without page or table scrolling. The existing five-scenario intake suite also passed, including digital PDF, OCR and handoff persistence.

### Automation case page: Intercom Inbox reference

Primary visual reference: [Intercom's Inbox layouts](https://www.intercom.com/help/en/articles/7911926-customize-the-inbox-to-suit-you-and-how-you-work-best), including its August 2026 screenshots. The implementation preserves the queue → working thread → details composition, compact case header, restrained separators and independent reading panes. OCD's existing navigation and green accent remain. Original source, action/outcome and activity occupy the working thread; owner, linked record, proposed fields and progress occupy the context pane. Source and context stay visible without disclosures. The case list uses search and status tabs; selecting a case brings its row into view. Mobile uses separate list and detail views with a labelled return link.

Other inspected product references were [Front's current inbox](https://help.front.com/en/articles/3889728), [Front sidebar](https://help.front.com/en/articles/2232), [Front inbox sections](https://help.front.com/en/articles/2257), [Zendesk Agent Workspace](https://support.zendesk.com/hc/en-us/articles/4408821259930-About-the-Zendesk-Agent-Workspace), [Help Scout conversation support](https://docs.helpscout.com/category/23-working-with-conversations), [Intercom Inbox overview](https://www.intercom.com/help/en/articles/6258745-the-inbox-explained), [Intercom ticket view](https://www.intercom.com/help/en/articles/6603905-how-to-find-and-view-tickets-in-the-inbox) and [Intercom Inbox app guidance](https://developers.intercom.com/docs/canvas-kit/canvas-kit-inbox-best-practices). The [Reddit comparison of Intercom, Front and traditional helpdesks](https://www.reddit.com/r/SaaS/comments/1mjudqf/has_anyone_replaced_zendesk_or_freshdesk_with/) was read through OpenCLI as discovery context. Intercom supplies the primary composition; no gallery assets or product branding are copied.

The dedicated browser check exercises review → recorded outcome, history persistence, inline search/no-results, all-cases visibility, dropdown-free source display, three desktop viewport sizes and mobile list/detail navigation. The existing 11 workflow scenarios passed with zero browser errors; all 60 automated tests passed.

```sh
CHROME_PATH=/home/nami/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome PROTOTYPE_AUTOMATION_DESIGN=1 PROTOTYPE_REVIEW_DIR=/tmp/ocd-case-reference-review node scripts/prototype-browser-check.mjs
```
