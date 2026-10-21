# Visit record: meeting-to-implementation review

## Finding

The office Visit record has not yet been fully connected visually to the new Financial checks and Payroll preparation screens. Its saved attendance is already consumed by those features, but this detail view still presents the earlier fields and generic missing-evidence placeholders. This review changes no visit data or approval rules.

## What exists

`workspace/app.js: visitDetail` renders participant/service, date, assigned worker, scheduled/recorded clock times, free-text tasks, combined goals/extra-time explanation, progress note, major-issue flag, correction history and Office review controls. `review-visit` checks note and both clock fields before marking Reviewed; it does not test task/goal content. Time corrections require a reason, retain old/new values and reset a Reviewed visit to Ready for review. Payroll source comparison detects changed visit snapshots, so an older approval is not current after a time correction.

Worker notes already collect note, tasks and goals. Financial checks inspect actual versus scheduled/billed duration, note presence and review status. Payroll preparation separately handles unpaid breaks, actual kilometres, evidence, approval and adjustments. These do not currently appear as a linked summary on the office Visit record.

## Source-backed needs and design implications

| Meeting evidence | What was actually discussed/reported | Implication for this screen | Current gap |
|---|---|---|---|
| M1 NEW-01,00:48:36–00:49:56 and01:53:57–01:54:20 | Staff copy mandatory timesheet instructions into shifts and check for missing instructions. | Link/display the approved booking instructions and flag missing evidence. | No instruction panel or instruction-version/source field. Exact required template text is not established by this transcript. |
| Earlier Meeting1 M1-17,15:02:48–15:05:38,R165–R175 | Reported missed tasks and leaving before unfinished work; these reports are not verified findings about an individual. | Display completed and incomplete work clearly, with worker explanation and an office follow-up path. | Only free-text Tasks and Goals; no explicit incomplete-work state. A structured checklist is an implementation proposal, not a quoted requirement. |
| M2 NEW-12,00:08:32–00:12:49 | Bookkeeper compares employee hours/mileage for the selected pay period. | Show actual elapsed duration versus schedule and link to the matching payroll source/period. | Clock fields exist; duration/difference, linked payroll approval/currentness and mileage reference are absent here. |
| M2 NEW-13,00:10:36–00:12:34 | Notes remind the bookkeeper of hour adjustments, leave and back pay. | Surface that a related payroll adjustment exists, with reviewed source links where access permits; do not change payroll from this page implicitly. | Payroll adjustments live separately. Visit goals and extra-time explanation are conflated. |
| M2 NEW-14,00:19:38–00:22:10 | Actual service and invoice support category/travel coding need comparison. | Link the booking’s invoice lines and current financial findings. Distinguish actual attendance, billable time and approved pay. | No invoice/financial-check links or billed-duration comparison here. |

For the shown VIS-702 record,13:02→15:01 equals119 recorded minutes versus120 scheduled. The one-minute difference is an observation; it does not establish underpayment, overbilling or a need to change the invoice. The agreed billing treatment needs review. A missing worker note must remain visible; office staff should not invent one.

## Recommended next implementation

1. Compact attendance summary: scheduled duration, recorded duration, signed difference and clear missing/invalid-time states.
2. Service evidence section: progress note, completed/incomplete tasks and goals. Keep extra-time rationale distinct from participant goals; preserve original text during any migration.
3. Linked review section: current financial findings/invoice line, payroll approval currentness and actual-mileage evidence. Use existing feature engines; never infer approved pay from elapsed attendance or route estimates.
4. Approval audit: checked-by/checked-at and explicit outstanding evidence. Confirm required task/goal/instruction policy before changing what blocks Office review.

Keep private notes restricted to staff who need them. The prototype does not establish a production role/permission model, so do not expose payroll amounts or sensitive details to worker/client views merely because the office page gains links.

## Traceability and limits

Meeting findings: `docs/meeting-analysis/new-recordings-2026-10-21-findings.json` NEW-01,NEW-12,NEW-13,NEW-14; `docs/meeting-analysis/OCD_Manual_Work_Problems_Meeting_1_2026-10-14.md` M1-17. Checked raw local transcript passages in `meeting-1-readable.txt`00:48:36–00:49:56 and `meeting-2-readable.txt`00:09:39–00:12:08 under `/home/nami/Documents/Data/ocd-recordings-2026-10-21/`.

The new recordings use automated transcripts and approximate elapsed positions; recording dates are unknown. Earlier Meeting1 uses separate wall-clock-labelled evidence. Do not combine these timestamp systems. This is a code/document analysis, not fresh audio verification or confirmation that all suggested fields are approved requirements.
