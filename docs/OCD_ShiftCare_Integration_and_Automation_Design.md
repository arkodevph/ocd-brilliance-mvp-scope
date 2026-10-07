# OCD — ShiftCare integration and automation design

**Review date:** 6 October 2026  
**Status:** Researched proposal; account-specific and client acceptance gates remain open.  
**Inputs:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv), [27-item requirements review](OCD_Client_Needs_and_Automation_Requirements.md), official ShiftCare documentation, the authenticated AU MCP tool catalog, bounded read-only MCP checks, and the current working-tree code.

## 1. What this review corrects

The earlier flowchart covered the proposed business journey, but did not establish whether each integration was supported. Passing diagram checks proved rendering quality, not ShiftCare capability or completeness of the client's operational process. This revision adds those distinctions and replaces that diagram as the implementation reference.

**ShiftCare remains the source of truth for participants, workers, rosters, delivered care, documents, funding configuration and service billing records.** The OCD app owns enquiries, proposed changes, approvals, automation jobs and its own communication/ETA records. Xero and the confirmed payroll system retain their accounting and payroll responsibilities. A local request or successful queue operation never proves that ShiftCare changed.

The strongest client priority is emailed/scanned participant and employee onboarding into the right records, with staff checking the result. The client also wants less daily confirmation checking, reliable cover, simpler bookkeeping review and clearer arrival information. They explicitly questioned duplicating ShiftCare. [Transcript: lines 540, 644, 831–846, 855–873 and 1168](../dialpad_transcript_20261005_0923.csv#L836).

**Completeness limit:** This covers every recorded automation requirement and the system journey discussed in the meeting. The client said the everyday admin and bookkeeper must explain the detailed process. Their screens, actual forms, billing rules and production account have not been validated here; this is not a claim that every internal procedure has been discovered. [Transcript: lines 481, 681 and 1174](../dialpad_transcript_20261005_0923.csv#L1174).

## 2. Research findings that change the design

| Verified product capability | Consequence for OCD | Official source |
| --- | --- | --- |
| Rostering joins clients, staff and service occurrences; recurring series and individual assignments are distinct. | Preserve ShiftCare IDs and separate publication, worker confirmation, attendance approval and cancellation. | [Official ShiftCare domain skill](https://github.com/shiftcare/ai-skills/blob/main/skills/shiftcare-basics/SKILL.md) |
| Inbox Signals reads forwarded attachments, proposes a person/category/expiry and files after staff review. It can offer basic new-client creation; unknown staff need manual review. | Assess this first for emailed documents. Full assessment-to-profile mapping and Xero onboarding still need a separate validated solution. Enablement and entitlement in OCD's account are unconfirmed. | [Inbox Signals](https://help.shiftcare.com/en/articles/16844206-automating-document-filing-with-inbox-signals) |
| A public referral form can be embedded on a website. Submission enters a review workspace; staff acceptance creates a client. Public attachments are not supported. | Put OCD's area check before the native form. Keep an email/document path for scans; do not create a second client from the same referral. | [Referral intake forms](https://help.shiftcare.com/en/articles/16051536-managing-client-referral-intake-forms) |
| Shift reminders already run automatically. Client SMS replies go to admin email and the shift event history. | Keep the existing three-day reminder initially. Automate reply triage, matching and exceptions around it; do not assume replies automatically cancel a visit. | [Reminders](https://help.shiftcare.com/en/articles/3022587-setting-up-reminders) |
| Workers can accept/decline when Confirmation Required is enabled. Notify is a different function. | Keep acceptance in the ShiftCare worker app. A notification or assignment alone cannot establish worker agreement. | [Worker confirmation](https://help.shiftcare.com/en/articles/3022312-what-happens-when-i-tick-confirmation-required-while-adding-the-shift-program), [Edit shift](https://help.shiftcare.com/en/articles/3777209-scheduler-roster-edit-shift) |
| Smart Match suggests workers for 1:1 shifts; Job Board can restrict qualifications and require approval. Shift Decline can return work to vacancy/Job Board, depending on settings. | Reuse native matching and cover workflows. Check account configuration; calendar gaps and app-generated rankings cannot guarantee availability. | [Smart Match](https://help.shiftcare.com/en/articles/13114664-carer-client-qualification-matching-smart-match), [Shift Decline](https://help.shiftcare.com/en/articles/10556889-shift-decline) |
| Client documents have type, visibility and expiry controls. | Fix incorrectly configured records in ShiftCare before generating more expiry alerts. | [Client documents](https://help.shiftcare.com/en/articles/3022286-managing-client-documents) |
| Native chat supports staff messaging, search and push announcements; Family Portal supports participant communication and permission-controlled service requests. | Pilot existing channels before adding another inbox. The current MCP has no chat-send/history tool. | [Instant Messaging](https://help.shiftcare.com/en/articles/10556757-instant-messaging), [Family Portal](https://help.shiftcare.com/en/articles/11711159-navigating-the-family-portal-your-guide-to-staying-connected) |
| Family Portal is documented for Premium. Provider-rostered changes are requests; cancellation is pending approval. Only published shifts are visible. Legacy ShiftCare Connect is no longer supported. | Use Family Portal as the native option, with approval controls; do not design a new rollout around legacy Connect. Custom OCD portal access still needs its own real identity controls. | [Portal permissions](https://help.shiftcare.com/en/articles/11178135-managing-family-portal-access-and-permissions), [Portal workflow](https://help.shiftcare.com/en/articles/11711159-navigating-the-family-portal-your-guide-to-staying-connected), [Connect retirement](https://help.shiftcare.com/en/articles/3022568-how-do-clients-members-access-shiftcare-connect) |
| Native Xero integration imports staff/clients from Xero and exports invoices/timesheets as drafts to Xero. CSV accounting exports also exist. | Preserve the client's working Excel/Xero path until the bookkeeper approves any change. Creating a ShiftCare client does not prove a new Xero contact is created. | [Xero integration](https://help.shiftcare.com/en/articles/9704468-getting-started-with-xero-integration), [Invoice exports](https://help.shiftcare.com/en/articles/5040591-export-invoices-for-reconciliation-with-your-accounting-platform) |
| Clock-in/out uses GPS for attendance checks. This does not establish a continuous travelling-worker feed. | Mapbox ETA needs a separately consented location source or a worker-entered estimate. Do not label simulated journey data as live ShiftCare tracking. | [Clock-in location check](https://help.shiftcare.com/en/articles/10557764-clockin-location-check) |
| Care Signals can flag notes/forms for human review. | Assess native alerts for major visit notes before commissioning duplicate AI scanning. Product availability does not prove the client's account has it enabled. | [Care Signals](https://help.shiftcare.com/en/articles/14120774-care-signals-ai-smart-note-review) |

### Integration options and their limits

| Method | What is established | Design decision |
| --- | --- | --- |
| REST API | Admin-managed API keys are documented for Premium/Enterprise. AU host is `api.shiftcare.com`; Basic Auth uses numeric account ID as username and API key as password. | Preferred production server connector **after entitlement, credentials and each resource contract are verified**. Keep credentials on the server. [API key documentation](https://help.shiftcare.com/en/articles/13906196-managing-api-keys) |
| MCP over authenticated HTTP | AU endpoint is `https://mcp.au.shiftcare.com/mcp`. Access follows the connected person's role; writes require Admin and enabled write actions. Trial accounts can have MCP access. | Available now for bounded research and supervised admin assistance. A Codex login does not authenticate the web app. An independent website MCP/OAuth integration and unattended session behaviour have not been validated. [MCP introduction](https://help.shiftcare.com/en/articles/14649246-introduction-to-the-shiftcare-mcp-server), [Access and trial explanation](https://shiftcare.com/blog/connecting-ai-assistant-your-care-data) |
| Public outgoing ShiftCare webhooks | Research did **not** establish customer-configurable roster/client/document webhook subscriptions, delivery payloads, signatures or replay guarantees. | Use bounded polling for the proposed backend. A public webhook adapter remains optional until ShiftCare provides the contract. Do not draw a working ShiftCare event webhook. |
| Existing vendor integrations | ShiftCare documents Xero and other payroll/accounting connectors. Its release notes mention Xero/MYOB payment webhooks and reconciliation. | Those vendor-specific flows do not prove there is a public webhook feed for our app. Keep the existing accounting integration. [Marketplace](https://help.shiftcare.com/en/articles/13913900-shiftcare-integrations-marketplace), [Product releases](https://shiftcare.com/releases) |
| Zapier beta — validated in 7 October research | Support invitation and API credentials required. Documented New Timesheet trigger, client/staff create/update, invoice payment actions and record lookups. | Candidate supported onboarding/bookkeeping route after entitlement and invitation. Not connected or trial-tested; not a generic roster/cancellation webhook. [Official Zapier guide](https://help.shiftcare.com/en/articles/15357711-integrating-shiftcare-with-zapier) |
| Native email forwarding and forms | Inbox Signals and public referral forms provide supported entry paths within the product. | They can reduce manual work without our app uploading documents through an undocumented endpoint. Staff review remains. |
| CSV/export and human handoff | Documented exports and ShiftCare UI workflows remain available. | Explicit fallback where a needed operation is not exposed, not entitled or not yet proven. Record the outcome and verified record ID. |
| ShiftCare HR API | Separate HR product documentation uses its own credentials and OAuth, issued by ShiftCare. | Do not reuse HR endpoint specifications, token grants or published rate limits as rostering API facts. HR integration is not part of this first phase. [HR API specification](https://hr-help.shiftcare.com/Developers/hr_api_spec) |

The public material reviewed establishes API authentication and product capabilities, but does not supply a complete, account-approved rostering REST contract for all proposed writes. MCP tool schemas prove the actions exposed by that connector; they do not prove an interchangeable REST request body or full product coverage. API rate limits, change filters, webhook availability and write endpoints need confirmation before enabling unattended processing.

## 3. What was actually checked

The [6 October capability evidence](ShiftCare_Capability_Validation_2026-10-06.json) records the original tool descriptions and redacted read results. The table below describes that historical sample. **7 October update:** [new capability receipt](ShiftCare_Demo_Capability_Evidence_2026-10-07.json) records 82 exposed tools and eleven successful read operations over 1–14 October. [The demonstration runbook](OCD_ShiftCare_Live_Demo_and_Verification.md) describes the new office evidence dashboard and actual remaining gaps.

| Check | Result | What it does not prove |
| --- | --- | --- |
| Official skill compatibility | `shiftcare-basics` 1.1.1 reported up to date. | Account feature availability. |
| MCP identity | AU trial/test account `testtph`, account 817962; Admin; `Australia/Sydney`; MCP available; writes enabled; paid-account flag false. | Access to OCD's actual production account. Trial MCP availability is independent of REST API entitlement. |
| Live reads | One client, one staff record and one shift in a bounded 5–6 October window returned successfully. | A full inventory or validation of client workflows. Samples were deliberately small; no personal record contents are published in this design. |
| GET route evidence | MCP pagination links expose `/api/v3/clients`, `/api/v3/staff`, `/api/v3/shifts`. | Successful direct REST authentication from the OCD server. |
| API key configuration | Local `SHIFTCARE_API_KEY` is blank/missing. | The website cannot be described as connected merely because Codex MCP works. |
| Write operations | Schemas inspected; no write calls executed. | That any creation/cancellation has succeeded, or every tool-specific feature is enabled. |

### Current MCP capability matrix

**Read-tested** means a sample call succeeded. **Exposed** means a current authoritative tool schema exists, with no mutation tested. **Native** means documented UI functionality. **Unverified** means it is not a permitted implementation assumption.

| Needed operation | Evidence/status | Boundary for automation |
| --- | --- | --- |
| Read clients, staff, shifts | Read-tested: `list_clients`, `list_staff`, `list_shifts`. | Paginate completely for an operational report; missing/permission-scoped rows are not proof of absence. |
| Create/update a client | Exposed: `create_client`, `update_client`. | `create_client` requires first name and DOB. Missing DOB needs clarification; never copy the native referral UI's placeholder behaviour into our own client creation. Only documented fields may be sent. |
| Create/edit staff | Exposed: `create_staff`. **Correction on 7 October:** no `update_staff` in the current MCP catalog. | Create needs name/email. Default to a worker role and reviewed invitation settings; do not create an Admin from an untrusted form. Native UI handles edits unless a separate connector is validated. Payroll and qualification evidence are separate records. |
| Create/update shifts and series | Exposed: occurrence and recurrence tools. | Assignment arrays replace the whole list. One occurrence differs from a series edit; recurrence-pattern rebuild can replace occurrence IDs. Pricing/fund/pay-group/per-shift travel-billing selection and extra client charges are not exposed by `update_shift`. |
| Confirmation Required / accept / decline | Native; no current MCP setter or worker acceptance tool. | `notify:true` is not acceptance. Set/check the confirmation requirement in ShiftCare and require the worker's native response. |
| Read leave, qualifications, documents | Exposed read tools. | Current catalog has no availability-schedule reader or Smart Match suggestion call. A leave/shift check cannot prove personal availability or complete matching. |
| Advertise cover | Exposed: `create_job_board_posting`. | Existing shift required. Team IDs cannot be invented; no team-discovery tool is currently exposed. Explicit strict matching is needed where enabled; default matching can be disabled. Require office review and native worker acceptance. |
| Cancel with charge | Exposed: `cancel_shift_with_charge(id, absent_reason)`. | Marks **every client on the shift** absent and keeps it billable. Accepts one of `NSDH`, `NSDF`, `NSDT`, `NSDO`, not arbitrary reason text. Tool requires exact human confirmation. |
| Cancel without charge | Exposed: `cancel_shift_without_charge(id, cancel_reason)`. | Provider cancellation semantics; no bill. Tool requires exact human confirmation. Do not silently route a client's no-charge request here without confirming appropriate ShiftCare treatment. |
| Upload a new signed document/certificate | Native UI/Inbox Signals; no current MCP upload. | Use native reviewed filing or manual upload. Do not mistake `update_client_document` for file upload. |
| Correct existing client document metadata | Exposed: `update_client_document`. | Type, staff visibility, expiry only. For a genuinely non-expiring file use `no_expiration:true`; clearing the date alone can still count as expired. Human must verify the evidence first. |
| Read shift events, timesheets, progress notes | Exposed read tools. | Progress-note MCP search is limited to notes created within 90 days. History outside that window requires native reports/another verified method. Tool absence or empty results must be shown as unknown. |
| Invoiceable items and invoice creation | Exposed tools; release notes document V3 invoice capabilities. | Not needed for phase one. Do not duplicate the working invoice flow; exact pricing, asynchronous job and idempotency contracts would need a separate finance pilot. |
| Read/send all chats, replace reminders, live GPS, webhook subscriptions, approve timesheets or export to Xero from our app | Not exposed in current catalog / not validated for this integration. | Keep native workflows or an explicit manual task. Never represent them as working app integrations. |

## 4. How the client currently works

The table describes client statements, not the demonstration team's promises. Transcript wording is sometimes unclear; the combined speaker label does not distinguish Adriana from Felician.

| Stage | Current ShiftCare/use of other tools | Repeated manual task and pain point | Transcript evidence |
| --- | --- | --- | --- |
| Enquiry and area | Website/email/support coordinator asks whether the area can be served, before intake. | Staff check area/capacity; several people read email without a clear owner, so a reply can be missed. | [351–368](../dialpad_transcript_20261005_0923.csv#L351) |
| Participant/staff onboarding | Emailed forms and scanned assessments are entered into ShiftCare and Xero. | Re-keying data, errors and deciding the correct record/file location. | [855–873](../dialpad_transcript_20261005_0923.csv#L855), [1168](../dialpad_transcript_20261005_0923.csv#L1168) |
| Agreements | Existing service-agreement templates and a “sign request” process; received forms belong under the ShiftCare client. | Follow up signatures and correctly file returned copies. Exact signing provider is not established. | [814–821](../dialpad_transcript_20261005_0923.csv#L814) |
| Roster | ShiftCare has staff, clients/prospects and recurring bookings. Workers already accept assignments there. | Personal availability, preferred hours and recurring commitments complicate rescheduling. | [411–415](../dialpad_transcript_20261005_0923.csv#L411), [429](../dialpad_transcript_20261005_0923.csv#L429), [611–626](../dialpad_transcript_20261005_0923.csv#L611) |
| Reminders/cancellations | ShiftCare sends service messages around three days beforehand; yes/no/reason reaches the office. | Every morning staff inspect replies and enter cancellations/reasons. | [536–540](../dialpad_transcript_20261005_0923.csv#L536), [644](../dialpad_transcript_20261005_0923.csv#L644) |
| Sickness/cover | A worker calls with short notice; office must find cover or discuss an alternative. | Lost services, last-minute pressure and participant retention. A free calendar is not reliable consent to work. | [426](../dialpad_transcript_20261005_0923.csv#L426), [626](../dialpad_transcript_20261005_0923.csv#L626), [972–977](../dialpad_transcript_20261005_0923.csv#L972) |
| Visit records | Actual time, tasks, progress/outcomes and extra-time explanations are entered in ShiftCare. | Office needs major issues surfaced; confidential notes must stay restricted. | [476–478](../dialpad_transcript_20261005_0923.csv#L476), [693–702](../dialpad_transcript_20261005_0923.csv#L693) |
| Tuesday invoicing | Bookkeeper opens individual shifts and checks actual versus scheduled time/notes; invoices go to plan manager or self-managed participant. | Repetitive individual checks, funding/recipient errors and rejected invoices. | [82–89](../dialpad_transcript_20261005_0923.csv#L82), [472–486](../dialpad_transcript_20261005_0923.csv#L472) |
| Accounting/payroll | ShiftCare → Excel/export → Xero already works. Fortnightly payroll checks hours, kilometres and travel. “Easy pay” is mentioned; exact vendor unconfirmed. | Cross-checks and pay enquiries. Rare export rounding was explicitly lower priority. | [676–679](../dialpad_transcript_20261005_0923.csv#L676), [719–726](../dialpad_transcript_20261005_0923.csv#L719), [1013](../dialpad_transcript_20261005_0923.csv#L1013) |
| Documents | ShiftCare already flags expiry/missing records. | Some files that never expire were wrongly configured and need cleanup. | [105](../dialpad_transcript_20261005_0923.csv#L105), [446](../dialpad_transcript_20261005_0923.csv#L446) |
| Communication/arrival | Multiple message channels; participants call the office about lateness. | Wants one place, retained admin history and ETA; personal phones/home addresses and exact tracking need limits. | [395–397](../dialpad_transcript_20261005_0923.csv#L395), [560–581](../dialpad_transcript_20261005_0923.csv#L560), [596–607](../dialpad_transcript_20261005_0923.csv#L596) |

## 5. System ownership

| Information/action | Authoritative home | OCD layer's role |
| --- | --- | --- |
| Participant/staff identity, roster, worker assignment and native acceptance | ShiftCare | Resolve verified IDs; propose changes; display a refreshed, permission-filtered projection. |
| Care notes, actual attendance, goals/tasks, document evidence and expiry settings | ShiftCare | Surface exceptions and link to the underlying record. Keep entry in the worker app; restrict confidential notes. |
| Funding, price books, invoice service lines and approved service records | ShiftCare | Prepare an exception report; do not calculate replacement legal rates or invent charges. |
| Accounting invoices, contacts, ledger and payments | Existing accounting setup/Xero | Preserve established export/linking; reconcile using stable invoice/contact identifiers where available. |
| Payroll calculations and pay-run release | Confirmed payroll platform/bookkeeper | Show verified hours/travel exceptions and an explicitly provisional worker overview. |
| Enquiries before a ShiftCare profile exists | OCD queue or native Referrals Workspace, according to entry path | Assign an owner, area/capacity check, avoid duplicate intake, track follow-up and the resulting ShiftCare ID. |
| Proposed changes, approvals, retries, integration audit | OCD server store | Store input provenance, exact approved operation, actor, remote IDs and read-back results. |
| Native chat/SMS history | ShiftCare | Link to native history. Our app is not a verified mirror of all ShiftCare communications. |
| Messages sent by OCD, if a separate channel is approved | OCD | Persist only its own history/delivery evidence; define admin access and retention. |
| Journey session/consent/ETA, if built | OCD | Short-lived operational data linked to a current ShiftCare assignment. Never substitute it for ShiftCare attendance. |

## 6. Realistic communication design

### Available trial route: native workflows + supervised MCP

1. Keep worker acceptance, care entry, bookkeeping approval and native notifications in ShiftCare.
2. Pilot native Inbox Signals, referral forms and Family Portal only if the relevant features are available in the intended account.
3. The OCD queue prepares a proposed client/staff change with evidence. An authenticated **Admin** reviews it through ShiftCare UI or their connected AI assistant. This is a supervised handoff; there is no existing automated website-to-Codex bridge.
4. For an MCP write, follow the tool's specific confirmation requirements, call once and read back. Record the verified ID/outcome in the OCD task. Write permission alone is not approval to mutate a live record.

### Proposed production route: backend REST adapter, gated per operation

`Browser → OCD server authorization → durable request/job → human approval → verified ShiftCare operation → read-back → audit → user outcome`

For reads, the adapter calls verified endpoints with server-held credentials and complete pagination. For writes, **each operation is disabled until its REST method, path, permitted fields, state rules and account enablement are proven in an authorised test**. A missing contract routes the task to native UI/supervised MCP; the adapter must not synthesize request bodies from the browser or MCP descriptions.

Proposed scheduler: a configurable bounded poll for relevant shifts/events/documents, with overlapping time windows and periodic reconciliation. A five-minute interval can be a pilot target, subject to measured volume and confirmed limits; it is not real-time delivery or a ShiftCare SLA. Do not assume an undocumented `updated_since` filter. Read current assignment and record state immediately before a mutation.

Schedule the three-day response checks, Tuesday invoice review, fortnightly pay cut-offs and document dates in the confirmed operating/account time zone, with explicit offsets for timestamp queries. The trial account's `Australia/Sydney` setting does not establish OCD's production time zone. Agree cut-off times and pay-period boundaries with the office/bookkeeper before enabling jobs.

Use `(ShiftCare account, record type, record ID)` as the external key. Recurring series need `program_id` plus occurrence IDs; an assignment ID is not the staff ID. Preserve all people on group shifts. Never infer full coverage or complete approval from one staff assignment or a single shift-level boolean.

For Microsoft 365, a separately authorised mailbox adapter could ingest messages through Graph, with subscription renewal/reconciliation. This is an **email-source event**, not a ShiftCare webhook. Native forwarding rules are a simpler first option for eligible documents; no forwarding rule or mailbox access was configured during this review. [Microsoft Graph notification documentation](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview).

## 7. Automation register: triggers, actions, outcomes and fallback

All app jobs below are proposed unless section 10 explicitly identifies implemented code. Owners are proposed responsibilities to confirm with the client.

| ID / client need | Trigger and data | What OCD handles / expected outcome | ShiftCare method and actions that remain human | Failure or intervention |
| --- | --- | --- | --- | --- |
| W01 — Area and enquiry ownership (A02/A03) | Website enquiry or staff-logged coordinator/email/phone request; suburb/postcode/service. | Check approved service area; assign an owner and follow-up. Eligible enquiry proceeds to intake; nearby/uncertain cases enter review. | No ShiftCare write required before intake. Optionally open native referral form after the area gate. | Unconfigured area or unknown capacity: office review, no promise of availability. Do not automatically reject negotiated adjacent areas. |
| W02 — Email triage (A03) | Authorised mailbox message; message ID, attachments and invoice/enquiry references. | Classify, identify likely record/invoice, draft next action, flag urgent invoice complaints, create one owned task. | Verified record/invoice reads or native search; complaint/action-item creation only after approval and a proven connector. | Ambiguous person/invoice, unreadable attachment or uncertain urgency: office reviews original message. Never invent a match or send an AI reply automatically. |
| W03 — Participant onboarding (A01) | Accepted enquiry, emailed intake/scanned assessment or native referral submission. | Produce reviewed field mapping with source references; check duplicate candidates; save external ID after verified creation/match. | Prefer native referral acceptance/basic Inbox Signals client creation where suitable. For broader fields, supervised `create_client`/`update_client`; REST equivalent remains gated. | Missing DOB/consent, conflicting match, unsupported field: request clarification. Do not create twice from native acceptance plus an OCD job. |
| W04 — Employee onboarding (A01/P02) | Reviewed employee form/email; name/email and employment evidence. | Prepare worker profile and missing-item checklist; coordinate separate payroll/Xero onboarding. | Native staff setup or supervised `create_staff`; staff edits remain native because no `update_staff` tool is exposed. Evidence upload through native filing. Unknown staff in Inbox Signals need manual review. | Duplicated email, invalid role, uncertain invitation/payroll record: HR/admin handles. Xero contact/payroll creation is not presumed. |
| W05 — Agreements and returned files (A10) | Existing signing process returns an agreement or a required file arrives. | Track due/returned state, correct participant, review and filing task. | Keep existing approved template/signing provider. Native Inbox Signals/UI files the evidence; no MCP upload. | Wrong person/version/type or unreadable signature: hold; office checks. No agreement becomes “signed/filed” merely from a demo status change. |
| W06 — Three-day confirmation responses (A04/A11) | Existing ShiftCare reminder fires; reply arrives at admin email/shift event, or a future authorised OCD portal response. | Correlate message to one occurrence; classify yes/no/reason; deduplicate; route changes and unanswered/uncertain replies. Expected result: less daily checking. | Keep native reminder initially. Validate event payloads/reply threading in the real account; `list_shift_events` is exposed, but SMS-reply field completeness has not been tested. A yes response is not worker acceptance. | Several nearby visits, missing reason, no response or failed delivery: assigned office follow-up. Silence is never a cancellation. |
| W07 — Cancellation (A04) | Unambiguous cancellation request for one occurrence. | Prepare exact client/worker/date/reason and billing consequence for office approval; write once through a proven operation; verify before announcing success. | Native UI or supervised MCP. With-charge MCP cancels for **all clients**; group or ambiguous cases use UI. Client no-charge treatment and notice policy require office confirmation. Free-text reason is retained in OCD and recorded natively through a verified method if the selected call only accepts a code. | Approved/invoiced/changed shift, missing reason/code, group attendance or unknown fee: stop for office/bookkeeper. Timeout after dispatch: reconcile, do not resend blindly. |
| W08 — Reschedule and cover (A05/A06) | Participant request, staff decline/sickness, unfilled shift or cover deadline. | Surface affected services; prepare candidates/alternate times; track acceptance and owner/escalation. | Reuse native Smart Match/Job Board; supervised shift update/posting only where available. Configure Confirmation Required in UI; worker accepts in ShiftCare. REST writes and automated candidate ranking remain gated. | Missing availability/qualifications/team data, clash, refusal or no cover: office contacts participant and arranges an alternative. Preserve the recurring pattern unless an explicitly reviewed series change is intended. |
| W09 — Visit and significant notes (A08) | Worker submits/updates actual attendance, progress notes or tasks in ShiftCare. | Read relevant records, flag extra-time explanations/missing data and major issues; assign office/bookkeeper review. | Worker continues native care entry. Assess Care Signals for clinical flags; app summaries never replace original notes or urgent incident procedures. | Confidential/older/inaccessible note, missing clock time or AI uncertainty: mark incomplete and link to native record; office handles. |
| W10 — Tuesday invoicing review (A09) | Tuesday review cut-off and updated completed visits. | Aggregate exceptions: scheduled/actual duration, missing notes, travel/recipient/funding anomalies and unresolved cancellations. Expected output is a bookkeeper checklist, not an approved invoice. | Read verified timesheets/notes/funds/invoices; pricing and approvals stay native. Preserve existing Excel/Xero export; confirm actual recipient settings. | Unknown rates, stale/incomplete records, rejected invoice or rare rounding mismatch: bookkeeper investigates; no automatic financial correction or duplicate export. |
| W11 — Fortnightly payroll review (A09/P02) | Agreed pay-period cut-off or pay query. | Prepare verified hours/km/travel exceptions and provisional worker totals. | Approval/pay run remain with bookkeeper and confirmed payroll platform. Xero timesheet export needs native staff/pay-item linking; contractors are excluded from that export. | Unknown vendor, award/travel rule, allowance or employment type: human verification; never release pay based on a demo calculation. [Xero setup](https://help.shiftcare.com/en/articles/9704468-getting-started-with-xero-integration) |
| W12 — Document cleanup/renewals (A07) | Initial cleanup review, scheduled expiry check or new evidence. | Prioritise genuinely expired/missing documents; assign renewal task and track follow-through. | Correct native category/expiry/visibility with evidence; supervised metadata update where supported. Existing reminders can continue. | A blank date does not prove “never expires.” Keep uncertain files in review; suppress duplicate app alerts only after verified correction. |
| W13 — Consolidated communication (A11/P01/P02) | Service change, participant message or staff announcement. | Prefer native chat/Family Portal; if OCD messaging is approved, store its messages, actor, delivery status and admin history. | No exposed MCP chat-send/history endpoint. Do not claim all native conversations are in the OCD app or that a progress note is a delivered message. | Offline user, rejected push or no permission: visible delivery failure and office contact. Disable duplicate reminder channels only after replacement delivery is validated and approved. |
| W14 — Mapbox booking/ETA views (A12/L01) | Refreshed ShiftCare booking/assignment; worker explicitly starts a consented journey or enters an ETA. | Office sees permitted bookings; worker sees own route/next visit; participant sees own booking and arrival estimate. Mapbox computes routes from supplied coordinates; it does not locate the worker. | ShiftCare supplies the service/assignment context via verified reads. The location session is separate OCD data; no ShiftCare continuous GPS feed is established. | Missing/stale location, changed worker, cancellation or failed routing: withdraw ETA, show last-update/unavailable status and notify office for a late-risk case. Never infer a live trip from a scheduled start or interpolate a demo journey. |

### Cancellation and assignment conditions that must be visible

- The client requested automatic cancellation, but a request is not permission to choose a charge. Start with automated triage/preparation and human approval. An unattended cancellation branch needs an approved policy **and** an independently validated machine interface; the current MCP tool explicitly requires confirmation.
- ShiftCare's two cancellation workflows have different billing/pay effects. The help article's notice-period examples are not a trustworthy OCD cancellation policy; the office/bookkeeper must approve the actual rules. [Cancellation workflow](https://help.shiftcare.com/en/articles/3874528-cancel-shift-workflow-and-rebook-a-cancelled-shift).
- Never use the with-charge whole-shift tool for one participant cancelling a group service. Cancellation, attendance absence and deleting a shift are different operations.
- For changes, read all current assignments, check overlaps across whole local days including the preceding day, preserve unaffected assignments, and stop when data is incomplete. Pending can mean several things; it is not necessarily unstaffed. Attendance review is not identical to attendance acceptance.

## 8. What data flows between systems

| Direction | Minimum data | Purpose / constraints |
| --- | --- | --- |
| Website/referrer → OCD | Contact, service area, requested service, consent/source. | Pre-intake screening and task ownership. Not yet an authoritative participant profile. |
| Website → native ShiftCare referral form, if selected | Mapped referral answers. | Native review and profile creation on acceptance. Track the native outcome before closing the OCD enquiry. |
| Authorised email → OCD queue | Message/thread ID, received time, sender, references and necessary attachments. | Triage/provenance. Limit extracted fields; protect original evidence. |
| Authorised email → ShiftCare Inbox Signals, if enabled | Relevant documents forwarded to the account-specific inbound address. | Reviewed native filing. No general invoice-complaint automation or complete Xero mapping is assumed from this feature. |
| ShiftCare → OCD read projection | Account/participant/staff/shift/assignment IDs, series ID, published/pending/cancelled state, schedule/actual times, permitted service addresses and record links. | Bookings and exception detection; refresh before action; show retrieval time. Participant responses and worker confirmation are separate data. |
| ShiftCare → restricted office review | Necessary notes/events, document metadata, leave/qualifications, funding/invoice/time records, where accessible. | Per-role review. Full raw records must not be sent to participant/worker browsers. Source gaps remain visible. |
| OCD → ShiftCare, approved and supported only | Documented participant/staff fields, single-occurrence change, reviewed cancellation code/reason or existing document metadata. | Mutations go through native UI/supervised MCP initially; only a validated server adapter can enable future REST jobs. Read back remote state. |
| ShiftCare → Xero / current payroll flow | Existing invoices, timesheets and agreed linked records/export files. | Keep native financial process. OCD may compare stable IDs/statuses but does not send a second invoice/pay run. |
| Worker → OCD journey service, if built | Authenticated worker, current shift ID, consent/start/stop, timestamp/accuracy/coordinate or manual estimate. | Only an active, authorised service journey. Do not publish home origin or another participant's destination. |
| OCD route service ↔ Mapbox | Necessary origin/destination coordinates → route geometry/duration. | Use traffic-aware routing only where supported. Coordinates go to an external service, so this choice needs client approval. Return participant-safe ETA, not raw tracking history. [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/) |
| OCD → users | Verified operation outcome, own booking projection, approved message or ETA. | Separate “request received”, “pending review”, “ShiftCare confirmed” and “delivery failed”. |

**Privacy/authentication requirement:** Worker and participant views need real server-side identity linked to permitted ShiftCare records. Browser role selectors in the prototype are not that authorization. Never give a participant the Admin MCP credential or return other people's addresses/notes. Restrict ETA to the assigned participant and active journey; stop on cancellation, reassignment, arrival or consent withdrawal. Background location reliability must be piloted on actual phones; a web page cannot promise continuous background tracking.

## 9. Failure handling and human ownership

Proposed durable job states: `received → needs_review → approved → executing → verifying → completed`. Alternatives are `retry_scheduled`, `reconciliation_required`, `manual_action_required`, `rejected`. Resolve a manual task with its outcome and evidence; an office retry returns through current-state checks and approval as needed.

| Failure | Required system behaviour | Human owner / expected resolution |
| --- | --- | --- |
| REST entitlement/key or MCP session missing | Stop connector jobs; preserve request; show connection unavailable. Do not silently use another person's account. | Admin restores access or handles natively. |
| Permission/feature unavailable (403/feature error) | Route to a manual task; no endless retry or claim of success. | Admin verifies plan, role, feature and supported method. |
| Rate limit/transient read failure | Bounded backoff with jitter; honour documented response guidance; monitor oldest task and last successful refresh. | Operations receives escalation if its agreed service deadline is at risk. |
| Write timeout/unknown response | Mark outcome uncertain; search/read remote state before any repeat. Block blind creation/payment/cancellation retries. | Admin reconciles whether the action happened; resumes only after resolution. |
| Duplicate email or repeated poll | Deduplicate on stable source ID + intended operation + target; atomically claim job. | Review near-duplicates rather than discarding different requests with similar text. |
| Concurrent ShiftCare edit | Re-read and compare approved fields/assignment set; invalidate stale approval when meaning changes. | Office approves refreshed proposal or cancels it. Do not assume upstream optimistic locking exists. |
| Ambiguous identity/shift/reason or extraction error | Hold original evidence and confidence; ask for missing information; no guessed IDs/DOB/billing codes. | Intake/office reviewer resolves the record. |
| Group service, recurrence or financial lock | Stop broad mutation; preserve other participants/occurrences; link to ShiftCare. | Rostering/bookkeeper handles the correct native action. |
| Missing pages/old or inaccessible notes | Mark report partial; never label “no issues” or “all covered.” | Reviewer uses native reports or resolves permission/data gaps. |
| No worker accepted / no cover | Keep service unconfirmed; deadline-based escalation and alternate-time contact. | Office coordinates continuity; participant gets an explicit outcome. |
| Notification or ETA failure | Keep message failure/status visible; stop stale ETA display; use agreed fallback contact. | Office checks the affected visit. Emergency care concerns follow the organisation's existing urgent process. |
| Accounting export mismatch | Keep the current financial records; hold affected case; no automatic invoice recreation. | Bookkeeper checks amounts, references, recipient and existing exports. |

App-level deduplication and reconciliation are proposed safeguards, not claims that every ShiftCare endpoint supports idempotency keys. Logs should capture who approved, source references, selected account/record IDs, allowed changed fields, dispatch/read-back times and sanitized error codes. Care-document contents and credentials do not belong in generic integration logs.

## 10. Current prototype versus proposed implementation

| Current working-tree evidence | Actual status |
| --- | --- |
| [Office-only handler](../api/shiftcare.js#L9), [REST client](../lib/shiftcare.cjs#L91), [screen adapter](../workspace/shiftcare.js#L1) | GET-only office connection for status/check/clients/staff/shifts. Blank API key means no successful live website REST connection is established. |
| [Intake storage and routes](../api/workflow.js#L11) | Server-backed enquiry records, owner/next action and a manually recorded ShiftCare handoff ID. Local file store or configured Upstash; not an integration job runner. |
| [Office login](../lib/staff-auth.cjs#L12) | Configured office session only. No production participant/worker identity-to-ShiftCare authorization. |
| [Workspace state](../workspace/app.js#L63) | Other operational actions are primarily seeded/local demo state. Accepting cover, cancelling or drafting an email in this UI does not change ShiftCare/send a message. |
| [Mapbox implementation](../workspace/maps.js#L1) | Booking maps and simulated journey/arrival data. No verified live worker location integration. |
| Proposed changes in this document | Durable automation jobs, mailbox ingestion, field extraction, approved writes, reconciliation, complete exception reporting, role-scoped live portals and real ETA remain to be implemented and tested. |

These are working-tree observations; they are not a claim about the currently deployed Vercel build. This task updates design documents/diagrams, not the live system or ShiftCare records.

## 11. Delivery order and acceptance gates

| Phase | Concrete work | Gate before calling it complete |
| --- | --- | --- |
| 0 — Production discovery | Walk through current admin's intake/reminder/cover tasks and bookkeeper's Tuesday/fortnightly process; confirm account, feature availability and vendor. | Real forms, matching rules, approved areas, cancellation policy, recipients/rates/travel rules and roles recorded with reviewer sign-off. |
| 1 — Native intake pilot | Assess Inbox Signals and area-gated native referrals; keep reviewed filing and existing signing/accounting paths. Use the existing OCD queue for ownership/exceptions. | Correct client/staff match, category/expiry, required fields and duplicate handling verified against sample paperwork. A second Xero onboarding step is explicitly tracked where required. |
| 2 — Supported integration pilot | Obtain eligible REST access and official operation contracts, or continue supervised MCP. Implement paginated reads, durable jobs, audit and reconciliation. | Direct server read verified; approved create/update read back; unknown outcome, duplicate message, stale edit and feature-denied cases demonstrated in an authorised test account. |
| 3 — Reminder and operational exceptions | Match existing responses, prepare cancellations and cover, clean false expiry data, consolidate bookkeeping review. | Daily-check workload falls without missed replies; charging/group/series exceptions reach humans; workers genuinely accept; no duplicate invoice/export. |
| 4 — Selected portals/ETA | Reuse native Family Portal where suitable; add approved custom views/Mapbox only for a demonstrated gap. | Real identity filtering, private-note protections, delivery fallback, consent/start/stop and stale ETA behaviour tested on intended devices. |

No dates, prices, availability guarantees or automatic billing policy were agreed in the transcript. Do not derive rates/notice periods from its unclear numbers. Native feature fit and account entitlement must be checked before paying for a duplicate build.

## 12. Scope coverage and diagrams

| Existing requirement IDs | Where this design covers them |
| --- | --- |
| A01–A03 | W01–W04; current journey; intake diagram. |
| A04–A06 | W06–W08; service-response diagram; explicit cancellation/acceptance gates. |
| A07–A10 | W05/W09–W12; native documents, care entry, finance/export and manual ownership. |
| A11–A12, P01–P03, L01 | W13/W14; system architecture, data/access boundaries and native portal decision. |
| T01–T06 | Newsletter/incentives/general AI/discovery/matching/live-sync are proposals, not agreed core automation. Matching and sync are restricted by the capability matrix; no blanket “AI can do everything” branch. |
| B01–B05 | HR/ABN staffing/marketing/future migration are business context or later scope. Owner workload, continuity and participant retention guide prioritisation; they do not establish new first-phase software modules. |

The diagrams are proposed target designs with **verified native/supervised paths** and **explicitly gated future backend paths**. They complement the current-state table and detailed register; no single chart claims that every product feature is exposed through an API.

- [System architecture and integration boundaries](../.archify/architecture-ocd-shiftcare-20261006-185221/ocd-shiftcare.html)
- [Participant and worker intake / document workflow](../.archify/architecture-ocd-shiftcare-intake-20261006-185221/ocd-shiftcare-intake.html)
- [Confirmation, cancellation and cover workflow](../.archify/architecture-ocd-shiftcare-service-20261006-185221/ocd-shiftcare-service.html)
- [Visit review, Tuesday invoices and fortnightly payroll workflow](../.archify/architecture-ocd-shiftcare-finance-20261006-185221/ocd-shiftcare-finance.html)

Validation receipts and editable specifications are stored next to each diagram. All four diagrams passed 9/9 showcase checks and the artifact/browser gates. Light and dark captures were inspected; the detailed process charts use vertical scrolling at smaller viewports. Results, hashes, inspected captures and semantic coverage are recorded in the [diagram review record](OCD_ShiftCare_Diagram_Review.json). The process charts use Archify's fixed-position architecture renderer; their original step and relationship specifications are preserved. These rendering checks do not prove untested production capabilities.

### Coverage of the requested ten questions

| Requested mapping | Evidence in this document |
| --- | --- |
| 1. Current ShiftCare use | Section 4, transcript-linked current journey. |
| 2. Manual/repetitive steps | Section 4, repeated-task column; W01–W14. |
| 3. Client pain points | Section 4, pain points and specific transcript references. |
| 4. App responsibility | Sections 5 and 7. |
| 5. Communication with ShiftCare | Sections 2, 3 and 6; gated architecture connector. |
| 6. Data flows | Section 8. |
| 7. Actions staying in ShiftCare | Sections 5 and 7, native actions and human review. |
| 8. Automated actions | Section 7, proposed app/native automation and capability boundaries. |
| 9. Triggers/outcomes | Section 7, per-workflow trigger and expected result. |
| 10. Failure/human intervention | Section 9 and every W01–W14 fallback. |
