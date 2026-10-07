# OCD + ShiftCare — demonstration and verification

**Reviewed:** 7 October 2026.  
**Prototype:** Office → **Integration proof**, `http://127.0.0.1:8001/#/office/verification`.  
**Basis:** [Client requirements](OCD_Client_Needs_and_Automation_Requirements.md), [workflow register and integration design](OCD_ShiftCare_Integration_and_Automation_Design.md), and [prototype validation](OCD_Prototype_Workflow_Plan_and_Validation.md).

## 1. What we can demonstrate now

The authenticated AU MCP connection successfully retrieved real records from the connected **testtph trial account, 817962**, in **Australia/Sydney**. The dashboard analyses a private, timestamped capture of those records. It is a working demonstration of reading native data, generating owned exceptions, preserving source IDs, preventing duplicate reviews and handing the reviewer back to ShiftCare.

**ShiftCare remains the source of truth.** The dashboard runs alongside ShiftCare in a separate browser tab. It does not embed or modify ShiftCare's interface. A locally saved finding is not a verified native change.

| Layer | Current evidence | Demonstration limit |
| --- | --- | --- |
| Assistant → ShiftCare MCP | Authenticated Admin; MCP available; writes enabled; eleven read operations succeeded. | This is the connected trial account, not a verified OCD production account. |
| MCP records → dashboard | Private minimized capture, source timestamps, native URLs and field correlation. | The website does not hold the assistant's OAuth session or automatically refresh the capture. |
| Dashboard automation checks | Server-generated exceptions, ownership by Office/Bookkeeper, stable finding IDs and replay protection. | Review is started manually. Recurring background schedules are not implemented. |
| Dashboard → ShiftCare follow-up | After exact user approval and fresh duplicate/context checks, `create_action_item` created native action **11221** once. | Only this administrative follow-up was created; profile, roster and financial mutations remain untested. |
| Independent native proof | A separate `get_action_item` returned the exact ID, title, description, owner, due date, priority and verification method. | All seven checks matched. Native status is **Open**; creation/read-back does not establish resolution of the service issue. |
| Website → REST API | Authenticated office connector is implemented and tested with fixtures. | Local API key is absent; no direct website REST request was certified. |

The read capture completed at **2026-10-07T06:21:29.613Z**. The UI displays that time in the account time zone and warns when the capture exceeds fifteen minutes. Loading the latest capture fetches our private server evidence; it is not a new ShiftCare call.

## 2. Research: realistic integration options

### MCP — available in the connected trial

ShiftCare documents role-scoped reads and Admin writes controlled under Account → AI Settings. A back-office role remains read-only even when writes are enabled. Each person authenticates their connection; our website would need its own supported authentication flow. [Official MCP guide](https://help.shiftcare.com/en/articles/14649246-introduction-to-the-shiftcare-mcp-server).

The authoritative catalog in this session contains **82 tools**. Tool exposure, enabled write permission and a successful operation are separate facts. Installed connection, basics and action-item skills version 1.1.1 all passed compatibility checks. The [redacted capability receipt](ShiftCare_Demo_Capability_Evidence_2026-10-07.json) records tool names and actual read results.

| Needed capability | Current MCP evidence | Safe demonstration |
| --- | --- | --- |
| Participants and staff | `list_clients`, `list_staff` succeeded. `create_client`, `update_client`, `create_staff` are exposed. | Read records and review source-to-field mapping; create only after exact approval. Client creation requires first name/DOB; staff creation requires name/email. |
| Staff edits | **No `update_staff` tool in the current catalog.** | Edit natively or validate another supported connector. Earlier design references were corrected. Zapier's documented staff-update action is a different integration. |
| Rosters and assignments | `list_shifts` succeeded with staff and participant arrays, clock fields and native URLs. Occurrence/recurrence writes and Job Board posting are exposed. | Detect missing assignments; preserve occurrence, staff and assignment IDs. Cover selection, personal availability and worker acceptance still need native checks. |
| Cancellations | Two separate exposed tools: with charge and without charge. | Review the exact occurrence and financial effect. The with-charge tool marks every client on the shift absent; group cases require native handling. No cancellation was performed. |
| Notes and timesheets | Recent `list_progress_notes`, bounded `list_timesheets`, and `list_shift_events` succeeded. | Prepare attendance/note exceptions. Scheduled time or payable items alone cannot establish actual delivery. Notes older than the MCP creation window or outside permissions need native review. |
| Files and qualifications | Staff file and qualification reads succeeded with empty visible results for one staff member. Existing client-document metadata updates are exposed. | Show scope and gaps. No document-expiry enforcement was proved; blank expiry is not proof of a non-expiring document. Native filing is required for a new file. |
| Administrative follow-up | Initial `list_action_items` succeeded. Approved `create_action_item` and separate `get_action_item` also succeeded. | Native action **11221** was created once and its exact fields independently matched. This proves the specific administrative follow-up operation in this trial. |
| Pricing and finance | Invoice, costing, payment and invoice-run tools are exposed, but not exercised here. | Keep current ShiftCare/Xero/payroll release; a separate financial acceptance pilot is required. |
| Gaps | No current staff-update, team-discovery, availability-pattern, worker-acceptance, chat, general upload, webhook-subscription or continuous GPS tool was established. | Keep the native step explicit. Generic skill descriptions do not add tools to this account. |

### REST API — separate website credentials

The API key guide restricts self-service keys to Admins on Premium/Enterprise plans. Keys are generated under Integrations → API. HTTP Basic uses the numeric account ID as username and API key as password; Australia uses `api.shiftcare.com`. Check the trial's actual entitlement with ShiftCare before making a purchase decision. [Official API key guide](https://help.shiftcare.com/en/articles/13906196-managing-api-keys).

The existing `/api/shiftcare` connector reads clients, staff and scheduled shifts only. The new evidence route can aggregate that projection into a bounded review once credentials exist. It checks at most five pages of each resource, marks any remaining pages incomplete, and never performs a REST mutation. Notes, actual attendance and financial checks are outside that REST projection.

MCP pagination links confirmed the clients/staff/shifts v3 routes, but they do not certify every REST write payload. Validate endpoint schemas, entitlement, pagination, rate limits and account permissions before enabling background jobs.

### Zapier — supported beta, not connected

ShiftCare's 19 August guide documents a beta requiring a Support invitation and API credentials. Its documented trigger is **New Timesheet**. Actions cover client/staff creation and updates plus adding/reversing invoice payments; lookups cover clients, staff, invoices and timesheets. Timesheet lookups use a bounded date window. This may provide a supported route for bookkeeping notifications or reviewed onboarding once access is granted. It does not establish a cancellation-reply or general roster webhook feed. [Official Zapier integration guide](https://help.shiftcare.com/en/articles/15357711-integrating-shiftcare-with-zapier).

### Webhooks and native features

No reviewed public contract established configurable roster/document/client webhook subscriptions, signatures or replay behaviour. For a production design, start with authorized bounded polling, or a specifically documented Zapier trigger. Confirm any broader webhook contract with ShiftCare before implementing it.

Existing reminder, worker acceptance, document filing, care entry and financial workflows should stay in ShiftCare. Native Inbox Signals, referral forms, Family Portal and accounting integrations remain candidates described in the [researched design](OCD_ShiftCare_Integration_and_Automation_Design.md); their availability in OCD's production account still needs verification.

## 3. Actual records and generated findings

Scope: **1–14 October 2026** in the connected account's time zone. Every paginated read returned a complete single page for its requested visible scope. These are permission-scoped results, not a claim about all historical data.

| Read | Returned | What was retained |
| --- | ---: | --- |
| Participants | 2 | IDs, aliases and returned native links. |
| Staff | 1 | ID, role, alias and returned link. |
| Shifts | 3 | IDs, schedule/state, participant/staff assignments, assignment IDs, returned clock fields and native links. |
| Recent permitted notes | 4 | Note ID, shift ID, category and creation time. No note contents. |
| Timesheets | 2 | Shift/staff IDs, date and item count. No rates or payable amounts. |
| Shift events | 4 | Receipt count/scope only. No event text or reconstructed reply meaning. |
| Staff files / qualifications | 0 / 0 | Empty visible result for the one requested staff member. |
| Live action items at initial read | 0 | Initial receipt. The subsequently approved action **11221** is recorded separately in the native-proof history. |

Eleven receipts include account discovery and identity checks. They show actual request start/finish times and visible counts; none was generated by clicking a sample success button.

The approved write was preceded by three fresh reads (`whoami`, the action register and the specific shift). No duplicate action was visible, and the source shift still returned no staff/participant assignment. `create_action_item` returned **11221** at **2026-10-07T06:30:14.441Z**; independent `get_action_item` verification completed at **2026-10-07T06:30:20.537Z**. The original capture time stays unchanged so proof collection cannot make older roster data look freshly fetched. The precise call receipt is in the capability JSON.

| Native occurrence | Observed data | Automated result | Human next step |
| --- | --- | --- | --- |
| 184920336 — 4 Oct, 10:00–18:00 | No staff or participant assigned; pending and published. Four recent notes refer to this occurrence. | Two findings: past occurrence has no assigned staff; participant context needs review. | Office verifies whether it is an intentional test/admin shift and records the native outcome. Do not treat it as an upcoming cover request. |
| 184919731 — 5 Oct, 09:00–17:00 | Assigned staff/participant; assignment 221831056; no clock-in/out returned; one timesheet row; no recent visible note matched. | Two findings: actual attendance needs checking; no recent visible note matched. | Bookkeeper checks native attendance; office checks note scope/history. Do not infer eight delivered hours or assert that no note exists. |
| 184919732 — 6 Oct, 09:00–17:00 | Assigned staff/participant; assignment 221831055; same attendance/note gaps. | Two equivalent owned findings for this separate occurrence. | Review the original records before any billing/pay decision. |

The generated report has **six findings across three shifts**, not six missed services. Stable finding keys combine account, occurrence and check code. A source hash lets repeated input reuse one server-saved review run.

## 4. Coverage of the client's requested automation

This mapping uses the client's transcript requirements and the existing fourteen-workflow register. It distinguishes this real-record demonstration from the wider fictional prototype.

| Workflow / client pain point | Practical trigger and result | What this revision verifies | Remaining manual/integration work |
| --- | --- | --- | --- |
| W01 area/ownership | New enquiry → area/capacity screening and owned follow-up. | Existing server-backed enquiry route remains available. | Client-approved area/capacity rules; no ShiftCare profile before accepted intake. |
| W02 overlooked email | Authorized incoming email → matched record and one review task. | Real native profile IDs and administrative task proposal can support matching. | Mailbox connector, extraction and urgency validation; original-message review. |
| W03 participant onboarding | Reviewed intake/scan → mapped fields, duplicate check, native profile and read-back. | Real participant reads and exposed create/update methods confirmed. | Actual forms/OCR and an approved native creation pilot; separate Xero record check. |
| W04 employee onboarding | Reviewed employee form → native staff setup and payroll checklist. | Real staff read; staff-create tool exposure confirmed. | Native staff edits, invitation/role decisions, qualifications and separate payroll onboarding. |
| W05 agreements | Returned agreement → correct person/version/signature review and filing. | Correct native IDs can anchor the filing task. | Existing signing provider, signature review and native upload; no generic MCP upload. |
| W06 daily confirmation checking | Existing three-day reminder/reply → occurrence matching and exception queue. | Shift-event reads succeeded. | Verify genuine yes/no/reason payloads and threading. Four events are not proof of reminder replies. |
| W07 manual cancellations | Matched cancellation → exact charge/scope approval, native change and read-back. | Cancellation schemas and their different billing effects inspected. | Approved policy and actual cancellation pilot; group/locked exceptions stay with office/bookkeeper. |
| W08 sickness/cover | Service risk → reviewed candidates, native offer/acceptance and confirmed assignment. | Missing assignment detection on an actual past occurrence. | Future cover sample, qualifications/availability/team scope, native worker acceptance and human alternatives. |
| W09 care/time review | Native care/attendance update → explanation or missing-data exception. | Real clocks and note metadata correlated without exposing care content. | Worker continues native care entry; clinical significance and restricted note content need authorized review. |
| W10 Tuesday invoicing | Agreed Tuesday cut-off → consolidated bookkeeper exceptions. | Actual attendance and note-scope exceptions appear with native links. | Scheduler, recipient/funding/travel validation and native invoice approval/export. |
| W11 fortnightly payroll | Confirmed pay-period cut-off → hours/km/travel exception review. | Timesheet presence is distinguished from delivered time. | Exact payroll vendor, periods and pay/travel rules; native pay-run release. |
| W12 false document expiry | Cleanup/expiry check → evidence-based renewal or metadata correction. | Empty staff-file/qualification scope is visible. | A real document sample and expiry rule pilot; client-document update is not staff-file update. |
| W13 retained communication | Verified service outcome → recipient update with delivery evidence. | Proposed task's possible native notification is disclosed. | Native chat history and message delivery remain unverified; a task receipt is not message-delivery proof. |
| W14 booking/arrival maps | Refreshed assignment plus consented journey → permitted booking/ETA view. | Real roster IDs/links can supply context; existing Mapbox views remain a fictional journey demo. | Authenticated worker/client identities and separate consented location service. No ShiftCare continuous GPS feed. |

Onboarding is the client's strongest priority. The next client-facing native pilot should use one approved test intake and verify its exact resulting profile, then separately check Xero. The current administrative follow-up demonstrates the integration proof mechanism without claiming that the full onboarding, cancellation or finance workflow is already deployed.

## 5. Client demonstration runbook

1. Sign into the local office account and open **Integration proof**. Keep the corresponding ShiftCare trial account open in a second tab.
2. Point out the account, time zone, capture time and **Authenticated MCP capture** label. Explain that the data came from ShiftCare while the browser is analysing a saved capture.
3. Select **Run captured-data checks**. Read the three completed stages: Read → Validate → Prepare. Review the six owned findings.
4. Use **Native records** and **Open in ShiftCare** to compare the original occurrences. Staff IDs and assignment IDs are shown separately.
5. Open **Call receipts** to show the successful native reads, date scopes, counts and actual timestamps. Inspect the missing fields instead of interpreting them as successful delivery.
6. Run the same capture again. The run ID and findings are reused, showing duplicate prevention.
7. Review the exact administrative action: owner, title, description, due date, priority and self-attestation. This demonstration has already created action **11221**. The copy button now supplies a **read-only `get_action_item` request**, avoiding a duplicate creation.
8. Show **Native result verified** and the creation/read-back timeline. The native record is Open, assigned to staff 1119619, due **8 October 2026**, with low priority and self-attestation. Native notification delivery was not tested.
9. To verify again, retrieve **11221** through MCP. No native URL was returned for this action, so no deep link was invented. For any different future write, obtain exact approval, inspect current context/duplicates, create once and independently read back the returned ID.
10. Complete or amend the action in ShiftCare. That native completion is a separate result; the proof here concerns creation and field verification.

**Current native proof status: verified creation.** Action **11221** exists in ShiftCare and all seven independently retrieved fields matched. The underlying review remains **Open**. No cancellation, reassignment, new participant/staff profile, financial release or outgoing client message was performed.

## 6. Failure and human intervention

| Condition | Behaviour / expected outcome |
| --- | --- |
| Expired office session or foreign origin | Evidence API rejects access; private capture is not served as a public static file. |
| Missing capture / wrong configured account | Review stops with a visible error. No use of another account's findings. |
| Stale capture / partial pages / missing fields | Freshness or incomplete-source warning; unknown data is not converted to an empty assignment or a complete operational report. |
| Native write rejected or feature unavailable | Record the failure and leave verification pending; office handles the native task. Permission flags alone cannot override a feature gate. |
| Write timeout or unclear result | Mark outcome unknown, inspect native action items before another creation, and do not retry a non-idempotent create blindly. |
| Read-back mismatch or failure | Final proof remains pending. Do not mark native success from the local proposal or the write response alone. |
| Repeated review input | Reuse the same run. Native mutations have a separate supervised reconciliation process. |
| Same source later receives valid native proof | Update the existing run's verification stage without duplicating its findings. |
| Hosting without evidence/job storage | Runs are disabled explicitly. This local file store is not represented as durable Vercel storage. |
| Missing REST credentials / rate limit | REST stays disabled or reports the upstream failure. No switch to invented endpoints or browser-held credentials. |

## 7. Implementation, verification and deployment limits

| Component | Implementation |
| --- | --- |
| [Office dashboard](../workspace/integration-proof.js) and [styles](../workspace/integration-proof.css) | Native source summary, five-stage flow, findings, record links, call receipts, exact proposal, evidence download and honest connection states. |
| [Private evidence API](../api/integration-proof.js) | Office-session/origin protection; GET evidence; POST read-only review. No native-write endpoint. |
| [Evidence/check store](../lib/integration-proof.cjs) | Field whitelist, native URL allowlist, scope-aware checks, private atomic persistence, source hash, replay protection and exact independent-read proof gate. |
| Private local files | `.local/shiftcare-evidence.json` and `.local/integration-runs.json`; excluded from Git, mode `0600`. API responses are not cached or stored in browser localStorage. |
| [Read/capability evidence](ShiftCare_Demo_Capability_Evidence_2026-10-07.json) | Public minimized technical receipt; no personal names, contacts, care contents, rates, addresses or credentials. |
| Login navigation | Sign-in preserves the requested dashboard route. |

Verification completed:

- `npm test`: **45 passing tests**, including ten new evidence/security/checking tests.
- `npm run build`: passed; new assets and API configuration are included.
- `PROTOTYPE_INTEGRATION=1 npm run verify:prototype`: **7 passing browser scenarios**, **9 desktop/mobile captures**, **0 uncaught browser errors**.
- Screenshots were visually inspected for source clarity, readable findings/receipts, independently verified native proof and responsive layout. [Browser review receipt](shiftcare-proof-review-2026-10-07/browser-review.json).

The browser review copies the minimized real capture into an isolated temporary server. It tests actual UI/API behaviour against that capture, without repeating native mutations or claiming a fresh external read. Unit tests use synthetic fixtures.

For a production website, add shared evidence/job storage, a scheduler, real worker/client authorization, account-approved API or independent MCP OAuth, and per-operation native acceptance tests. Keep pricing, invoicing and payroll release in their existing authoritative systems. Validate the proposed savings with the admin and bookkeeper using representative intake, reminder, cover and review samples.

This feature is available locally. The private capture is deliberately excluded from the static build; deploying the new UI alone would not give Vercel this evidence or make unattended ShiftCare automation live.
