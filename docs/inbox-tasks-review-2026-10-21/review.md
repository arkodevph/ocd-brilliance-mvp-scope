# Inbox-to-task automation

Open **Daily work → Inbox tasks**. Paste sender, subject and original message; review the keyword-suggested request type/team; choose a due date and confirm the next action. Creating the task preserves its source and links it to Automation. An owner can update its team, deadline and next action; stale assignment forms are rejected. Assigned email tasks appear in the Work queue; overdue/due-today states use the current Perth date.

Booking requests, cancellations and document emails have explicit suggestions; unmatched messages go to Other / clarify. Staff can override the suggestion. No mailbox/AI connection is required for this reviewed path. AI email review remains available in Automation, now with a required deadline.

Duplicate pasted content reuses its source/task across reload. Distinct identical messages cannot be distinguished in this paste-only prototype; a production mailbox must supply message IDs. Bulk inbox triage cannot bypass the review step. Completing a generic email follow-up records its checked contact outcome; it does not cancel a booking, file a document or establish native verification. Use the existing booking/cancellation/document workflows for those operations.

The feature does not connect Gmail, monitor email, send notifications, or schedule background reminders. Team assignments are labels within browser storage, not enforced production identities. A live mailbox/job runner and approved deadline policies remain unimplemented.

Verification results: see browser-review.json and verification.json. Feature code lives in frontend/features/inbox-tasks/{engine.mjs,page.mjs,styles.css}; existing workspace integration is in app.js, automation.js and automation-engine.js. Tests are tests/inbox-tasks.test.mjs.

## macOS/iOS interaction correction

After user feedback, the normal follow-up flow stays in Inbox tasks and Work queue. A task's title, next action, owner, deadline, original source and completion evidence share one detail screen. Relevant section links lead to Team schedule or document records. No task-detail link sends staff to Automation. The existing engine is reused internally for history and checked completion.

The task screen uses the shared native font, neutral surfaces, subtle borders and grouped field labels. Editing ownership/deadline is a native disclosure, preserving focus and keyboard control. Desktop evidence/action columns become a single reading order on phones. Validation errors remain beside their form; completed tasks retain their outcome and history.

`user-expi → ui-design-index → ui-design-systems`: behavioral goal is identifying the next action, responsible team and due date before acting. Flow: paste → inspect source/suggestion → confirm owner/deadline → assigned follow-up → relevant record → checked outcome. Empty inbox, unknown message/task, stale assignment and incomplete confirmation retain explicit recovery paths.

Evidence ledger: [Cowan2001](https://pubmed.ncbi.nlm.nih.gov/11515286/) is strong constrained-memory evidence but only an analogy for keeping source/task state visible; no fixed field-count claim. [Choice-overload meta-analysis](https://doi.org/10.1086/651235) is a strong corrective to simply removing useful choices; bookkeeping applicability remains contextual. [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) provides a normative narrow-layout baseline, not complete usability certification. A bookkeeper/office trial should test finding owner/deadline, selecting the correct record and recovering from a changed assignment. Task-speed improvement and full assistive-technology acceptance remain unmeasured.

Final checks: production build passed; two targeted test files passed; browser2scenarios/8captures/0errors, including assignment, edit/reload, work queue visibility, duplicate prevention and in-place completion. Desktop/mobile task detail images inspected. Full suite199passed/3failed: both MP4/WebM landing-video subtests and their parent fail because the unrelated landing page renders5room cards versus expected4. Feature files pass formatting and git diff whitespace checks.
