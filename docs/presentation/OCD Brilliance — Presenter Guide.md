---
title: OCD Brilliance — Presenter Guide
date: 2026-10-09
tags: [ocd-brilliance, presentation, runbook]
---

# Presenter guide

**Audience:** OCD office coordinators and decision makers. **Length:** 10 minutes, then questions. **Purpose:** show how a request becomes visible work, how intake is checked automatically, and how staff review the next action.

Keep [[OCD Brilliance — Presentation]] on the main screen. Use this note as your speaking guide. [[OCD Brilliance — Screenshot Map]] contains every screen and its destination.

## Prepare before the meeting

1. Open the HTML deck in a browser and test the arrow keys. It needs no app login or internet connection.
2. Open [the local app](http://127.0.0.1:8001/#/office/overview) in a separate browser tab. If needed, run `npm start` in `/home/nami/ocd-brilliance-mvp-scope`; use the configured office account.
3. Check that the sample week is 5–9 October 2026. Schedule and calendar display Perth time; keep the demo on that week rather than clicking Today.
4. Use **Load sample intake** for the demonstration. Review existing demo data before saving another draft; repeated saves can create duplicates or alter counts.
5. Test **Home**, **Team schedule**, **Calendar** and **Automation**. Keep the deck ready if a live screen requires configuration or displays different records.
6. Rehearse the intake section once. Leave the sample ready if you want to demonstrate the automatic result without waiting.

## Opening — slide 1 · 0:00–0:45

**Say:** “This workspace brings enquiries, intake checks and daily scheduling into a clear office workflow. I’ll show how staff see what needs attention, how a request is checked automatically, and where the next action lives.”

**Set context:** “These are fictional demonstration records. The schedule uses the sample week in Perth time.”

## Daily priorities — slide 2 · 0:45–1:30

**Open:** [Home](http://127.0.0.1:8001/#/office/overview).

**Point to:** scheduled visits on the left; decisions needing attention on the right; direct daily-work navigation.

**Say:** “The first screen answers two questions: what is happening today, and what needs an office decision? Staff can open the relevant task directly.”

**Transition:** “Let’s follow a task needing cover.”

## A clear next action — slide 3 · 1:30–2:15

**Open:** [Work queue](http://127.0.0.1:8001/#/office/work) → **Changes and cover**. If that section is hidden by a filter, choose **All work** first.

**Point to:** task title, visit information, status text and the action.

**Say:** “The task explains the request before asking the staff member to act. A status describes the state; the action tells us what to do next.”

**Do:** open a cover item if useful. Avoid completing or offering a shift during this short demonstration.

## Automatic intake checks — slide 4 · 2:15–4:15

**Open:** [Intake](http://127.0.0.1:8001/#/office/intake) → **Paste the request** → **Load sample intake**.

**Do:** wait for the extracted details and checks result. No Extract button is needed: checking runs automatically when the source changes.

**Point to:** original request on the left; extracted values and source evidence on the right; service postcode and missing details.

**Say:** “The system extracts the request and checks required details, the service area and possible duplicates. We can compare each extracted field with its source instead of retyping the whole request.”

**Optional 20-second demonstration:** change the sample postcode to `9999`, wait for the service-area result, then restore it to `6027`. Explain that the approved postcode list controls the result. Skip this if the live configuration differs; use the screenshot.

**Clarify:** “Extraction and validation happen automatically. Saving a draft does not approve it or create a ShiftCare profile. Optional AI and document import depend on the configured policy; they are not needed for this text example.”

## Saved request and handoff — slide 5 · 4:15–5:15

**Open:** **Saved intakes**. For a live demo, save the sample once using the draft-saving action beneath the result, then return to Saved intakes. Use the captured slide if the live list is empty.

**Point to:** person, service, stage, owner and **Review details**.

**Say:** “The saved request now has a visible owner, stage and next step. Staff can review it without losing its original source.”

**Clarify:** “The ShiftCare handoff remains a separate staff step: create or match the client in ShiftCare and record its native ID here. The automatic checks do not perform that write.”

## Staff schedule — slide 6 · 5:15–6:30

**Open:** [Team schedule](http://127.0.0.1:8001/#/office/schedule) → **Roster** → **Demo week**, if necessary.

**Point to:** staff rows, day columns, visit status and IN/OUT entries.

**Say:** “This view answers who is working with whom across the week. Visit times use a 12-hour clock. Scheduled hours and recorded attendance are distinct: a dash means there is no recorded entry.”

**Do:** choose **Needs cover**, then **All visits**. Open a visit to show its booking if time allows, then return to the roster.

## Calendar by time — slide 7 · 6:30–7:30

**Open:** [Calendar](http://127.0.0.1:8001/#/office/calendar) → **Week**. Navigate to 5–11 October 2026 if needed.

**Point to:** time axis, day columns, visit/discovery-call colours and the legend.

**Say:** “The calendar shows the same work by time. The team schedule helps us see assignments; the calendar helps us see when events happen.”

**Do:** search for **Olivia**, show the matching event, then clear the search. Open an event for booking details if useful. Do not use New booking for the main demo.

## Case review — slide 8 · 7:30–9:00

**Open:** [Automation](http://127.0.0.1:8001/#/office/automation) → **Cases**. Select an existing cover or booking-change case. If there are no cases, **Process received mail** generates sample cases in the demonstration workspace.

**Point to:** queue on the left; original source and next action in the centre; owner, linked record, proposal and progress on the right.

**Say:** “A case keeps the source, proposed change and next action together. Staff can see who owns it and which record it affects. Later steps include the result and activity history.”

**Clarify:** “The native steps in these sample cases are simulated. This screen does not establish automatic ShiftCare writes, real messaging or payroll release.”

**Do:** select a second case to show the layout stays consistent. Do not click approval simply to move the progress indicator.

## Close — slide 9 · 9:00–10:00

**Say:** “We now have a clearer path from incoming request to checked intake and visible daily work. The next step is to test this path with OCD staff, confirm the intake rules and verify the live integrations one workflow at a time.”

**Ask the audience:**

- “Can you find the next action without someone explaining the screen?”
- “Which intake fields and service-area rules must be checked every time?”
- “Which real request should we use for the first supervised trial?”

Record decisions separately: confirmed rules, owner, next test and due date.

## If someone asks about production readiness

| Question | Accurate answer |
| --- | --- |
| Does intake run automatically? | Text extraction and validation run when the source changes. Staff review and the ShiftCare handoff remain separate. |
| Does it create clients in ShiftCare? | The demonstrated intake flow uses a staff handoff and records the native client ID. |
| Is the schedule live? | These screenshots use seeded presentation records; a live roster integration needs its own verification. |
| Does automation send emails or change billing? | Sample automation uses fictional cases and simulated native steps; it does not establish live sends or financial changes. |
| Are these real clients? | No. Screenshots were captured in an isolated fictional workspace. |
| Has it proved time savings? | No staff time study has been completed. The next trial should measure completion time and errors. |

## Fallback

If the app is unavailable, continue through the screenshot deck. Explain what each screen lets staff do and follow the same speaking script. If live counts differ, avoid quoting totals; describe the workflow. Don’t reset or delete records during the meeting.
