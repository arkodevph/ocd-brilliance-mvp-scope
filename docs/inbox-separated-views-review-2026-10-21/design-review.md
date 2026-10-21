# Inbox: one stage per view

## Behavioral goal and flow

Office staff should be able to distinguish pending email review, active assignments and completed work without scanning a composition form and two unrelated lists together. Primary flow: Messages → review source → assign owner/deadline → Assigned → checked outcome → Completed. Adding an email is a separate screen entered from a single primary action. No live mailbox or notification behavior is added.

| Stage | Choice/context | Expected hesitation and recovery | Observed/required signal |
|---|---|---|---|
| Messages | Review pending source or Add message | Confusing a completed task with a new message | Only pending messages rendered; other views show counts |
| Add message | Sender, subject, original email | Leaving a draft or invalid input | Separate form, Cancel/back link, existing inline validation |
| Assigned | Owner, deadline, next action | Losing chosen view after reload | URL-addressable view, consistent navigation order and active label |
| Completed | Checked outcome/history | Completed work filling the active queue | Completed-only list with task detail access preserved |
| Hover/focus | Review button | Full grey row suggests the whole content block is selected/clickable | Static content row; existing action-button hover and focus remain |

## Evidence ledger

| Source / confidence | Finding and boundary | Design implication / falsification |
|---|---|---|
| [Cowan2001](https://pubmed.ncbi.nlm.nih.gov/11515286/): strong constrained-memory synthesis; application analogy-only | Capacity depends on task/chunking. This does not prescribe exactly three views or prove a speed improvement. | Externalize stages and counts; do not require remembering which combined section contains a request. Trial falsifier: users still confuse assigned/completed states. |
| [Scheibehenne et al.2010](https://doi.org/10.1086/651235): strong corrective meta-analysis, contextual UI transfer | Choice overload is not a universal monotonic effect. | Preserve all queues and actions, grouping by stage instead of deleting useful choices. Trial falsifier: extra navigation makes routine processing slower or hides urgent work. |
| [W3C consistent navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html): normative | Repeated navigation retains relative order. This is not full usability certification. | Messages/Assigned/Completed links remain in order and mark current page; URL survives reload. |
| [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): normative | Narrow content must reflow while retaining functionality. | Compact segmented links and stacked list actions tested at390/320px; retain all labels and counts. |

## Visual route and decisions

`user-expi → ui-design-index → ui-design-systems`: existing native segmented navigation, one neutral list surface, focused composition screen. Shared macOS tokens and text hierarchy retained. No new animation beyond the short existing selected-control transition; reduced-motion path retained. Rows are content containers, so full-row hover fill is removed; interactive buttons retain shared feedback and keyboard focus.

## Scope and verification

Changed frontend/features/inbox-tasks/page.mjs and styles.css, workspace/sw.js(cachev91), tests/inbox-tasks.test.mjs and scripts/prototype-browser-check.mjs. No task-engine or saved-data change. Exact gate results are in verification.json; screenshots and browser-review.json cover each view and the hover state. Staff usability timing, subjective acceptance and assistive-technology user testing remain unknown.
