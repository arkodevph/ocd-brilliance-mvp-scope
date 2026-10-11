# Reference-led operations redesign — 9 October 2026

## Behavioral goal and flow

Office coordinators need to find a request, understand its source and owner, choose the next action and resume after an interruption. The product is a desktop operations workspace with worker/client mobile views. Frequency, staff proficiency and completion time are not yet measured.

| Stage | Goal / information | Action | Hesitation or error | Feedback / recovery / success |
| --- | --- | --- | --- | --- |
| Locate | Know the work area and current location | Choose Daily work, Clients & intake, Scheduling, Team & finance, Connections | Every tool formerly appeared at equal weight in a long rail | Selected area and contextual links; workspace search; direct route remains available |
| Find | See open tasks or relevant records | Select a named view and search | Work filters and generated section tabs formerly competed | One work table and one view row; clear search or choose All |
| Understand | Source, person, status, owner, related record | Open a record or case | Hidden context, inflated panels, multiple competing actions | Stable header, source beside review, details beside activity |
| Act | Understand what will change | Use the labelled next action | Confusing automation vs native handoff | Existing exact approvals and validation remain; errors next to form |
| Verify | Know whether the action succeeded | Read outcome and history | Transient toast alone may be missed | Existing persisted status and audit history; unknown outcomes retain reconciliation |

Routine work enters through the queue. First-use intake has instructions and a sample. Error paths retain source text, inline errors, retry and duplicate links. Automatic extraction/validation is separate from approval and ShiftCare entry.

## Evidence ledger

| Evidence | Finding / strength | Scope and limits | Decision | What would falsify the expected benefit |
| --- | --- | --- | --- | --- |
| [W3C consistent visual design](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p03-consistent-design/) | Consistent control appearance and location support learning / strong guidance basis | Supplemental cognitive accessibility guidance, not proof of faster OCD work or WCAG conformance | Same shell, typography, primary buttons, lists and record headers across workspaces | Staff relearn identical actions between pages |
| [W3C clear steps](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/) | Location and progress help resumption after distraction / promising task expectation | Guidance for cognitive accessibility; outcome must be tested with staff | Area + page breadcrumb, stable task progress, original source retained | Staff cannot locate their prior task after interruption |
| [Scheibehenne et al. 2010](https://scheibehenne.de/ScheibehenneGreifenederTodd2010.pdf) | 50 experiments, 5,036 participants, virtually zero mean choice-overload effect with variation / contested transfer | Consumer choice studies; no universal menu-size rule | Clarify domain grouping and view labels rather than merely deleting destinations | Staff need more navigation or cannot distinguish groups |
| [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Reflow is testable / strong standard basis | Two-dimensional data tables have exceptions; mobile queue still becomes readable rows | Mobile task rows, wrapping actions, scrollable data regions rather than page overflow | Essential actions become inaccessible at 320px or text zoom |

## Research and composition lock

Research began before implementation and included more than three minutes of live exploration. Reviewed current official articles and their UI screenshots; no gallery branding or image assets are copied into the application.

Primary reference: **HubSpot CRM index/record workspace**. The index supplies title → saved view row → search/filter toolbar → record table → pagination. The record supplies return path → identity/header → task/activity body + details/associations. The charcoal process navigation, neutral canvas, white rectangular panels, restrained teal links and compact hierarchy supply the system grammar. OCD's own logo/green remains.

`user-expi` → `ui-design-index` → `ui-design-systems`. Selected patterns: process-group navigation; searchable record index; record/case context adjacent to the task. Secondary Pipedrive contextual view supports list-to-record continuity only; Intercom supports inbox context only. They do not control the palette or macro composition.

Reviewed references:

1. [HubSpot navigation](https://knowledge.hubspot.com/help-and-resources/a-guide-to-hubspots-navigation) — function groups and shared workspace bar; adapt hover menus to visible group links because user requested no dropdowns.
2. [HubSpot index views](https://knowledge.hubspot.com/records/view-and-filter-records) — one view strip, search, table, pagination; source image visually inspected.
3. [HubSpot record layout](https://knowledge.hubspot.com/records/work-with-records) — record identity, task/activity and associations; About screenshot inspected.
4. [HubSpot updated record](https://knowledge.hubspot.com/records/understand-the-default-record-layout) — persistent identity and return path; header screenshot inspected.
5. [HubSpot help desk setup](https://knowledge.hubspot.com/help-desk/overview-of-the-help-desk-workspace) — retained as flow evidence; screenshot is onboarding rather than case workspace, so rejected as composition reference.
6. [HubSpot help desk context](https://knowledge.hubspot.com/help-desk/customize-the-right-sidebar-of-help-desk) — associated details; screenshot is customization, so secondary interaction evidence only.
7. [Pipedrive contextual lead view](https://support.pipedrive.com/en/article/leads-contextual-view) — adjacent details and activities; list/detail screenshots inspected.
8. [Pipedrive list view](https://support.pipedrive.com/en/article/list-view) — compact list and explicit create action; screenshot inspected.
9. [Intercom inbox](https://www.intercom.com/help/en/articles/7911926-customize-the-inbox-to-suit-you-and-how-you-work-best) — queue, conversation, context; text reviewed; delivery format did not expose useful full raster image via direct download.
10. [HubSpot help desk responses](https://knowledge.hubspot.com/help-desk/create-respond-to-tickets-in-help-desk) — choose case, related records, history, reply context.
11. [HubSpot help desk views](https://knowledge.hubspot.com/help-desk/organize-teams-and-views-in-help-desk) — named views and split/table layouts.
12. [HubSpot create records](https://knowledge.hubspot.com/records/create-records-on-the-updated-index-page) — creation is separate from list browsing.

## Fidelity map and implementation decisions

| Reference grammar | OCD implementation |
| --- | --- |
| Charcoal function rail + contextual tools | Five visible office areas, with current area tools underneath; no hover menu or disclosure |
| Persistent workspace bar | Area / current page, Find a page or record, alerts, account |
| Index hierarchy | 26px title, 14px view labels/body, 12px metadata; one work table with counts, search and next actions |
| Rectangular neutral surfaces | 5px panel radius, hairline borders, white content, pale blue-gray canvas; no status-tinted cards |
| Record identity and nearby context | Stable record header/back path, existing source/review and detail regions preserved and restyled |
| Consistent states | Visible focus; inline errors/empty search; existing loading/retry; reduced motion |
| Explicit actions | Green action button for creation/completion; text links for navigation; status remains plain dot + text |

All existing data routes remain. Worker/client/public reuse neutral panels, typography and action treatment. The separate cream calendar shell no longer changes the global rail or sidebar width. Calendar event times remain 12-hour and identifiable by labels. Native financial/roster writes are not introduced.

## Validation criteria

- All office areas and destinations reachable through current area tools or global workspace search.
- Work views return the correct rows; search includes records beyond the current page and retains focus.
- Automatic intake preview, source persistence, stale-response guards, PDF/OCR fixture paths and handoff checks continue working.
- No visible native selects or disclosure dropdowns; selection form values still serialize correctly.
- Desktop schedule fits its viewport; mobile views have no page-level horizontal overflow.
- Keyboard focus, Escape/return from dialog, account/workspace switching and error recovery work.
- Unit tests, production build, browser workflow, intake and route sweep pass.
- Compare screenshot silhouettes against the HubSpot reference before declaring completion.

Usability acceptance remains a staff trial: find a cover request, review an intake, return to the queue after interruption. Record completion time, wrong turns and missed status changes. Implementation checks cannot prove time savings.

## Completed checks

- `npm test`: 60 tests passed. `npm run build` and `git diff --check` passed.
- Route/design suite: 35 desktop/mobile routes, keyboard navigation, workspace search, account switching, pagination, 320px reflow, larger text and reduced motion; 78 captures, zero browser errors.
- Workflow suite: 11 scenarios passed; automation case design/approval checks passed.
- Intake suite: five scenarios passed, including automatic preview, draft persistence, exact approval, handoff verification, duplicate prevention and PDF/OCR fixtures.
- Targeted checks: all five work views matched their counts; search empty/clear recovery passed; record context remained visible when changing sections; intake opens as an index with a separate New intake page; sample schedule surface fits at 1366×768 without scrolling.
- Visually reviewed the updated home, schedule, intake, work queue and record compositions. Seven new fictional-record screenshots replaced the presentation assets in the repository and Obsidian vault; click paths were updated.

Checks used isolated local servers and fictional records. These checks establish implementation behavior, not staff time savings or successful live ShiftCare writes. Longer record forms and audit histories continue to scroll when necessary.

## Workflow 1 and 2 UI follow-up

Enquiries now use compact neutral profile cards, following the user's attached card composition: source/status, name/service/location, named owner with initials, due date/next action and Review enquiry. A card is an enquiry profile, not an automatically created ShiftCare client. Four views replace the long status filter strip; search and eight-record pagination remain.

The Email review screen explains receive → identify → link/assign → review. Each sample source shows its responsible team, linked record, processing state and direct task link. Routing keeps the inbox visible so the outcome can be inspected. Original evidence and existing approval controls remain in the task screen. Gmail processing is still unconnected; no new email backend or automatic sends were introduced.

Live Dribbble research reviewed nine useful-size images plus additional page candidates. [Closr unified inbox](https://dribbble.com/shots/27322893-CRM-Unified-Inbox-UI-Email-Management-for-Sales-Teams-Closr) supplies inbox ownership/list grammar; [Clorio task detail](https://dribbble.com/shots/25824125-Clorio-Task-Management-SaaS-Design) supports explicit named assignees. Other visually reviewed candidates: AJ Abbasi Customer support inbox; Murilo F. Souza Omnichannel Inbox & Conversations; Filllo QuickSuite Kanban Details; Ofspace Task Details; OnPoint Taskboard; Illiyin Crisply; miraiux Omnichannel Inbox. Dropdown controls, large illustrations and decorative staging from those concepts were excluded.

Validation: 60 tests passed; production build passed. Design sweep passed with 78 desktop/mobile captures and zero browser errors. Targeted checks cover named owners/actions, empty and follow-up enquiry views, sample routing result, task/source continuity, desktop/mobile overflow. These checks validate the UI; actual staff usability remains to be evaluated.

## Staff schedule timeline

Primary composition is the user's supplied Staff schedule image (Sellwood): staff identity column, hourly grid, proportional horizontal visits, compact date controls and Day/Week switch. Day opens first. The weekly roster remains reachable. The neutral application shell stays consistent; timeline visits use pale sage surfaces with status written in text. Attendance and editing live in the existing booking detail rather than duplicating buttons in every bar.

The hour range expands to include the day's visits. Overlapping visits occupy separate lanes. The day query includes weekend bookings as well as weekdays. Staff with no visits are labelled “No visits scheduled”, without implying availability. Mobile uses full readable visit rows and wrapping controls. The staff-directory View in schedule action now fills the staff search instead of writing an unused worker ID.

Current official Dribbble shot pages reviewed as supporting candidates: [CoreDesk](https://dribbble.com/shots/26798666-CoreDesk-Employee-Schedule-Management-HR-Dashboard), [Staff Management](https://dribbble.com/shots/27340753-Staff-Management-Dashboard), [Healthcare staff view](https://dribbble.com/shots/26362736-Healthcare-Dashboard-Calendar-Staff-View-UI-UX), [In2event](https://dribbble.com/shots/27697289-In2event-Staff-Scheduling-Dashboard), [UIX employee scheduling](https://dribbble.com/shots/26504117-Employee-Scheduling-Dashboard-HR-Management-UI), [Employee scheduling](https://dribbble.com/shots/26349734-Employee-Scheduling-Dashboard-Design), [Comprehensive scheduling](https://dribbble.com/shots/25078902-Comprehensive-scheduling-dashboard), [Shift management](https://dribbble.com/shots/26313935-Shift-Management-Dashboard-UI-UX), [Staff dashboard](https://dribbble.com/shots/26390872-Modern-Dashboard-UI-Staff-Dashboard). The supplied image, not an average of these concepts, controls the composition.

Validation: 60 tests and production build passed; 11 workflow scenarios passed with zero browser errors. Targeted browser checks verified day/week results, staff/status filtering, booking links, separate overlap lanes, 1366×768 fit and mobile reflow. Desktop/laptop/mobile captures were visually inspected against the supplied image. The presentation's week-view screenshot and guide path were refreshed.
