# OCD Brilliance: workflow use cases and automation guide

- **Prepared:** 8 October 2026
- **Scope:** All 14 planned workflows, W01–W14, and the subsystems that support them.
- **Audience:** Client owners, office administrators, rostering staff, HR, the bookkeeper, and the implementation team.
- **Basis:** The 5 October client meeting, the 27-item requirements register, the revised architecture and process diagrams, the prototype implementation, and recorded ShiftCare capability evidence.

## How to read this document

This document explains the proposed operating process and its practical use cases in one place. Each workflow describes the client's problem, who acts, what automation prepares, what happens in ShiftCare, how success is checked, and what happens when the process cannot finish.

**ShiftCare remains the main system and source of truth** for participant and worker records, rosters, assignments, attendance, care records, documents, funding configuration, and service billing. The OCD web app coordinates enquiries, proposed changes, approvals, exceptions, and checked results. Xero and the confirmed payroll platform retain their accounting and payroll responsibilities.

The numbered steps describe the intended implementation. The **Prototype demonstration and remaining work** subsection identifies what actually exists today. A demonstrated screen or sample outcome does not establish a working production connection. Responsibilities and deadlines below are proposed operating arrangements to confirm with the client.

### Current delivery status

| Status | Meaning for this document |
| --- | --- |
| Working prototype | Public intake can reach the server-backed office queue. Operational workflow cases demonstrate decisions, approvals, verification, and recovery using fictional data stored in the browser. |
| Verified native evidence | Authenticated MCP reads and one specifically approved administrative follow-up were demonstrated in a trial account on 7 October. The follow-up was independently retrieved and its approved fields matched. |
| Supported product capability | ShiftCare documents a native feature, or the dated MCP catalog exposes an operation. Availability in the client's intended account and a successful implementation still require validation. |
| Proposed production automation | Mail ingestion, scan extraction, shared job processing, schedules, operational writes, delivery integrations, and live journey data still require implementation and acceptance checks. |

The trial evidence is separate from the fictional operational cases and from the client's production account. The saved native action's status was **Open at the recorded read**; the dashboard does not continuously check its completion. No operational onboarding, cancellation, reassignment, invoice release, or payroll release has been proved live by that action.

### Interactive maps covering all fourteen workflows

| Map | What it explains |
| --- | --- |
| [All 14 workflow connections](../.archify/architecture-ocd-all-14-workflows-20261008-223845/ocd-all-14-workflows.html) | All W01–W14, their triggers and review gates, and 29 directional handoffs. Each workflow card explains preparation, native/human actions, data outputs, failures, benefits, and implementation status. |
| [ShiftCare integration and data ownership](../.archify/architecture-ocd-shiftcare-integration-20261008-223845/ocd-shiftcare-integration.html) | How authorised inputs, the web app, human approval, proposed shared jobs, supported connectors, native records, accounting, communication, and separate journey data fit together. |

Start with the connection map. Read a node's first input and review/action text, follow its labelled arrows, then scroll to its W-numbered card for the exact steps and exceptions. Use zoom when tracing a long handoff. Crossed lines are separate relationships, not additional trigger points. Dashed handoffs are conditional or secondary routes; they do not establish a public ShiftCare webhook.

Then read the integration map to distinguish **supported native UI/supervised MCP actions**, the **current GET-only website connector**, and **proposed production jobs and REST writes that still need validation**. The ShiftCare boundary remains the authoritative native system; accounting/payroll and consented journeys have separate ownership.

For a complete use case, use the matching W01–W14 section below. [How the workflows connect](#how-the-workflows-connect) explains the practical journeys, and [Completion, exceptions, and verification](#completion-exceptions-and-verification) explains safe retries, reconciliation, human resolution, and completion evidence. The older intake, service, and finance diagrams remain supplementary views linked under Sources.

The new maps were checked against the committed design, prototype plan, implementation, and recorded native evidence at revision `db759d5febbec90ae01f0cef0f7471722410f959`. [Diagram coverage and delivery evidence](OCD_All_Workflows_Diagram_Review_2026-10-08.json) records the specifications, artifact hashes, automated/browser checks, and visual-review scope. Passing diagram checks validates the artifacts; it does not certify fourteen live integrations or the client's production account.

### Contents

- [Interactive maps covering all fourteen workflows](#interactive-maps-covering-all-fourteen-workflows)
- [Workflow overview](#workflow-overview)
- [Integration and record ownership](#integration-and-record-ownership)
- [W01: Service area screening and enquiry ownership](#w01-service-area-screening-and-enquiry-ownership)
- [W02: Email triage and urgent invoice enquiries](#w02-email-triage-and-urgent-invoice-enquiries)
- [W03: Participant onboarding and profile updates](#w03-participant-onboarding-and-profile-updates)
- [W04: Employee onboarding and payroll handoff](#w04-employee-onboarding-and-payroll-handoff)
- [W05: Service agreements and returned document filing](#w05-service-agreements-and-returned-document-filing)
- [W06: Three-day reminders and participant responses](#w06-three-day-reminders-and-participant-responses)
- [W07: Cancellation review and verified execution](#w07-cancellation-review-and-verified-execution)
- [W08: New bookings, rescheduling, and replacement cover](#w08-new-bookings-rescheduling-and-replacement-cover)
- [W09: Visit records and significant care exceptions](#w09-visit-records-and-significant-care-exceptions)
- [W10: Tuesday invoice preparation and exception review](#w10-tuesday-invoice-preparation-and-exception-review)
- [W11: Fortnightly payroll preparation and exception review](#w11-fortnightly-payroll-preparation-and-exception-review)
- [W12: Document cleanup, expiry, and renewal follow-up](#w12-document-cleanup-expiry-and-renewal-follow-up)
- [W13: Communication history and delivery follow-through](#w13-communication-history-and-delivery-follow-through)
- [W14: Booking maps and worker arrival estimates](#w14-booking-maps-and-worker-arrival-estimates)
- [Shared supporting subsystems](#shared-supporting-subsystems)
- [How the workflows connect](#how-the-workflows-connect)
- [Completion, exceptions, and verification](#completion-exceptions-and-verification)
- [Measuring value and planning the pilot](#measuring-value-and-planning-the-pilot)
- [Coverage of additional requirements and proposals](#coverage-of-additional-requirements-and-proposals)
- [Sources and validation basis](#sources-and-validation-basis)

## Workflow overview

There are **14 workflow areas**. Some contain several related use cases, and several depend on the same support services. This count does not mean 14 unattended integrations are already running.

| ID | Workflow | Main repetitive work addressed | Expected business outcome |
| --- | --- | --- | --- |
| W01 | Area and enquiry ownership | Checking coverage and deciding who will reply | Appropriate enquiries progress; every exception has an owner. |
| W02 | Email triage | Sorting messages, locating records, and spotting urgent queries | One tracked task per source, with the right reviewer and next action. |
| W03 | Participant onboarding | Re-entering forms and scans into the correct records | Reviewed ShiftCare profile and a separate accounting check where required. |
| W04 | Employee onboarding | Re-entering worker information and chasing setup | Reviewed staff record, screening checklist, and payroll handoff. |
| W05 | Agreements and filing | Chasing signatures and finding the correct filing location | Correct returned version verified under the correct native record. |
| W06 | Reminder responses | Daily checking of yes/no, unclear, and missing replies | Responses matched to exact visits; outstanding replies visibly owned. |
| W07 | Cancellation | Re-entering reasons and choosing the correct visit and treatment | Approved cancellation independently verified before success is communicated. |
| W08 | Booking changes and cover | Finding suitable workers, seeking acceptance, and chasing replacements | Checked booking or replacement, or an explicit office-managed alternative. |
| W09 | Care exceptions | Looking for missing records, extra time, and significant issues | Relevant exceptions reach the responsible person with source evidence. |
| W10 | Tuesday invoice review | Opening individual visits and checking billing context | Bookkeeper receives a complete, traceable review list. |
| W11 | Fortnightly payroll review | Cross-checking hours, travel, kilometres, and pay queries | Pay-period exceptions resolved before the existing payroll release. |
| W12 | Document cleanup and renewal | Following false expiry alerts and missing evidence | Accurate native document status and tracked genuine renewal needs. |
| W13 | Communication and delivery | Searching channels and assuming messages were received | Verified outcomes communicated through approved channels with visible failures. |
| W14 | Booking maps and arrival | Answering arrival calls and explaining delays | Appropriate booking visibility and a fresh, consented arrival estimate. |

## Integration and record ownership

### What belongs in each system

| System | Information and actions it owns | How the automation uses it |
| --- | --- | --- |
| ShiftCare | People, authoritative roster, worker acceptance, care entry, native documents, funding and service billing | Read authorised records; prepare a proposal; perform a supported approved action; retrieve and compare the result. |
| OCD automation layer | Pre-intake enquiries, source references, review ownership, proposals, approvals, job status, exception history | Coordinate work and make incomplete or uncertain steps visible. Production jobs require shared server storage. |
| Xero / existing accounting process | Accounting contacts, invoices, ledger, payments, and existing export handling | Track the bookkeeper's checked handoff and approved references. Avoid creating another export for the same work. |
| Confirmed payroll platform | Payroll configuration, pay calculation, and release | Receive the existing approved payroll input after exceptions are resolved. The exact vendor still needs confirmation. |
| OCD journey service, if implemented | Journey consent, start/stop, short-lived updates, and calculated ETA | Link the estimate to a current ShiftCare assignment and expose only permitted information. |
| Mapbox | Map rendering and routing calculations from supplied coordinates | Render permitted service locations and return route duration. A map service does not supply worker location. |

### Realistic ways to communicate with ShiftCare

| Method | Supported basis and practical limit | Intended use |
| --- | --- | --- |
| Native ShiftCare features | Inbox Signals supports reviewed document filing; referral forms support reviewed intake; reminders, confirmation, matching, and portal features have their own settings and permissions. | Use the existing feature where it meets the need, with account availability checked. |
| Assistant MCP | Access follows the signed-in person's permissions. Admin writes require the account's write setting; individual tool confirmation rules also apply. The assistant login does not authenticate our website. [Official MCP guide](https://help.shiftcare.com/en/articles/14649246-introduction-to-the-shiftcare-mcp-server). | Bounded reads and supervised, exactly approved native actions during the pilot. |
| Backend REST API | ShiftCare documents API keys for Admins on Premium/Enterprise and Basic Auth using account ID and API key. Keep credentials on the server. [Official API key guide](https://help.shiftcare.com/en/articles/13906196-managing-api-keys). | A possible production connector after entitlement and each required endpoint, field, and verification method are validated. |
| Zapier beta | Requires support invitation and API credentials. Documented capabilities include a New Timesheet trigger, client/staff create/update actions, and lookups. This does not establish a general roster webhook. [Official Zapier guide](https://help.shiftcare.com/en/articles/15357711-integrating-shiftcare-with-zapier). | Consider for a limited supported step if it fits the approved workflow; it is not connected in this prototype. |
| Native UI / reviewed export | A staff member performs the unsupported step in ShiftCare or the existing financial system and records the checked result. | Explicit fallback when a connector, permission, or exact operation is unavailable. |

Customer-configurable outgoing ShiftCare webhooks, unrestricted document upload, automated worker acceptance, native chat sending/history, and a continuous ShiftCare location feed have **not been verified for this integration**. The proposed backend uses bounded, paginated polling and reconciliation where appropriate; polling intervals, change filters, limits, and service deadlines must be validated. An email notification or mailbox event is not a ShiftCare webhook.

An exposed MCP operation does not prove an equivalent REST request body. Each production write needs its own confirmed interface and an independent result check. The current website has a separate office-only, read-only REST screen, but a successful live website REST connection has not been established by the recorded trial evidence.

## W01: Service area screening and enquiry ownership

### Purpose, current process, and pain point

Help people establish whether OCD serves their area before they complete a long intake, and give every enquiry a clear staff owner. Enquiries can arrive through the website, email, phone, support coordinators, or other providers.

The client described spending time answering availability questions and sometimes receiving full paperwork for an area they cannot serve. Multiple administrators can read an email without knowing who will answer it. Coverage also changes when workers join, leave, or do not want additional hours. [Client evidence: CSV lines 351, 358, 368, and 415](../dialpad_transcript_20261005_0923.csv#L351).

### Trigger, inputs, and responsibilities

- **Trigger:** A public area check or a staff-logged enquiry.
- **Inputs:** Suburb/postcode or service address, requested service, preferred hours, contact details, source, and appropriate consent.
- **Owner:** Intake/office team; a named staff member owns exceptions and follow-up.
- **Supporting subsystems:** Public intake, coverage configuration, shared enquiry queue, identity/matching, and audit history.

### Step-by-step workflow

1. The person supplies their area before the full intake, or the office records the area from a phone/email/coordinator enquiry.
2. The system compares it with the client's approved coverage configuration. It presents a coverage result or explains that office review is needed.
3. A covered location may proceed to intake. The result describes geographic coverage; a staff member still confirms actual capacity, service type, and preferred hours.
4. An adjacent or uncertain area goes to a review task. The office decides whether a negotiated exception is possible. An outside-area result explains the current limit without inventing an alternative provider or promising future capacity.
5. The queue records the source, contact, request, owner, and next action. Repeated submissions are checked before creating duplicate work.
6. The owner contacts the enquirer, confirms requirements, and either progresses the request to W03 or records the agreed outcome and follow-up.
7. When intake eventually creates or matches a ShiftCare client, the checked native ID is linked to the enquiry. The initial enquiry does not itself create a rostered service.

### Automation, data exchange, and human boundary

Automation performs the configured area check, captures the request, and prepares ownership/follow-up. The office decides capacity and exceptions. No ShiftCare write is required for the initial area check. If the native referral form is selected, choose that entry path and track its acceptance before another profile-creation job is allowed.

**Data exchanged:** Website/referrer → OCD: area, service, contact, source and consent. OCD → intake/native referral: reviewed request. ShiftCare → OCD after onboarding: the verified client reference. Full care records are not needed for area screening.

### Exceptions and recovery

Unknown postcodes, missing configuration, conflicting coverage, or uncertain capacity remain office tasks. A storage failure must show that the enquiry was not saved. A repeat enquiry can be linked to an existing case after review. No geography result substitutes for a worker's availability or acceptance.

### Client benefit, expected outcome, and completion check

People avoid unnecessary paperwork, staff spend less time answering repeated area questions, and enquiries are less likely to be overlooked. Success is an enquiry with a reviewed area result, accountable owner, next action, and recorded disposition. Measure time to first response, overdue enquiries, and how often full intake is completed for an unsuitable area.

### Prototype demonstration and remaining work

Use public area/intake and **Office → Enquiries**, then **Automation → Check enquiry ownership** for fictional review cases. Public requests reach server storage; sample automation cases remain separate. The client's coverage list, capacity policy, deadline monitoring, and native referral linkage still need validation and configuration.

## W02: Email triage and urgent invoice enquiries

### Purpose, current process, and pain point

Turn an incoming message into one traceable task for the person who can resolve it. This includes enquiries, participant/employee forms, returned agreements, reminder replies, feedback, and invoice complaints.

The client described duplicated email reading and missed answers. They specifically wanted invoice complaints recognised, the relevant invoice identified, and urgent work flagged. They wanted staff to check prepared information rather than search and type everything themselves. [Client evidence: CSV lines 365–368 and 871–873](../dialpad_transcript_20261005_0923.csv#L365).

### Trigger, inputs, and responsibilities

- **Trigger:** A new message from an authorised mailbox or a staff-captured message.
- **Inputs:** Stable message/thread ID, sender, received time, body, relevant attachment references, and any person, visit, or invoice identifiers.
- **Owner:** Office/intake for enquiries; bookkeeper for financial queries; urgent concerns follow the agreed escalation process.
- **Supporting subsystems:** Mail ingestion, protected original evidence, extraction/classification, matching, work queue, and deadlines.

### Step-by-step workflow

1. The authorised mailbox adapter receives the message and retains the original source/reference for review.
2. The system checks the source ID and intended operation so the same message does not create another task on the next scan.
3. It proposes a category and responsible team. Paperwork routes to W03/W04/W05; replies route to W06/W07; other enquiries remain office follow-up.
4. It uses explicit identifiers or reviewable candidate matches to locate a person, shift, or invoice through permitted reads or native search.
5. A suspected invoice complaint is flagged for the bookkeeper with the original complaint and proposed invoice reference. Urgency is a review signal, not a financial decision.
6. The owner compares the proposed category, match, and next action with the source. Ambiguous matches remain unresolved until clarified.
7. The appropriate downstream workflow runs, or the owner responds through the agreed channel and records the outcome.
8. The task closes only when the relevant follow-up is checked. Merely sorting the email does not mean the client's enquiry was answered.

### Automation, data exchange, and human boundary

Automation reduces sorting, repeated reading, matching preparation, and assignment. Staff resolve ambiguity and approve replies or downstream actions. Invoice adjustments, refunds, payments, and complaint conclusions remain with the bookkeeper/office under their existing authority.

**Data exchanged:** Mailbox → OCD: message provenance and necessary contents. ShiftCare/accounting → reviewer: permitted record/invoice references. OCD → the next workflow: the reviewed source and target. A standalone native follow-up can be created through supervised MCP only with its required approval; it is separate from changing an invoice.

Inbox Signals is a possible native path for eligible documents; it does not by itself establish complete general-mail or invoice-complaint triage. [ShiftCare Inbox Signals](https://help.shiftcare.com/en/articles/16844206-automating-document-filing-with-inbox-signals).

### Exceptions and recovery

Unreadable scans, several possible invoices, missing references, uncertain urgency, or expired mailbox access create owned review tasks. A mailbox interruption requires reconciliation for missed messages. Replayed messages reuse their original case; genuinely different messages with similar wording must remain distinguishable.

### Client benefit, expected outcome, and completion check

The office spends less time finding the right record and deciding who should respond. Urgent queries become visible earlier, with less duplicated effort. Success is one tracked source, an approved match or explicit matching exception, and a checked response/resolution. Measure triage minutes, unanswered/overdue messages, duplicate cases, and invoice-query response time.

### Prototype demonstration and remaining work

**Automation → Process received mail** routes fictional sources and skips repeated IDs. An urgent sample invoice complaint reaches bookkeeper follow-up. Actual mailbox authorisation, OCR/extraction, invoice correlation, confidence handling, outgoing responses, and scheduled processing remain to implement.

## W03: Participant onboarding and profile updates

### Purpose, current process, and pain point

Convert reviewed participant paperwork into the right ShiftCare record with less manual re-entry, while separately checking accounting setup. This is the client's strongest repeated automation priority.

The office receives emailed intake forms and scanned assessments and enters information into ShiftCare and Xero. The client wants the data prepared in the correct place so staff can verify it. Missing information, inconsistent names, and duplicate records can create downstream roster and billing errors. [Client evidence: CSV lines 855–857, 873, 1168, and 1174](../dialpad_transcript_20261005_0923.csv#L855).

### Trigger, inputs, and responsibilities

- **Trigger:** An accepted enquiry, emailed intake/assessment, native referral, or permitted participant profile-change request.
- **Inputs:** Original form/version, identity/contact fields, verified DOB where required, service address, consent/authority, service preferences, and existing record candidates. Funding or sensitive assessment fields need their own approved mapping.
- **Owner:** Intake administrator; bookkeeper handles the separate accounting check.
- **Supporting subsystems:** W01/W02, field extraction, record matching, approvals, ShiftCare adapter/native handoff, read-back, and accounting checklist.

### Step-by-step workflow

1. Link the paperwork to the enquiry or authorised participant request and retain its source reference.
2. Prepare mapped fields alongside the original evidence. Separate profile fields, documents, assessment content, and accounting information; only validated destination fields may be sent.
3. The reviewer checks identity, consent/representative authority, DOB, contact details, service area, and capacity. Missing or uncertain values require clarification rather than invented placeholders.
4. Search for existing native records using approved matching rules. A shared email or similar name is a candidate, not definitive identity proof. Select an existing record or approve creation.
5. Choose one supported entry path. A native referral can create the client after staff acceptance; suitable Inbox Signals processing can offer a basic client profile; broader mapped entry uses reviewed native UI or an exactly approved supported operation. [Native referral workflow](https://help.shiftcare.com/en/articles/16051536-managing-client-referral-intake-forms).
6. Perform the approved action once. If native referral acceptance already created a client, retrieve that ID instead of creating another client from the OCD job.
7. Retrieve the intended native record and compare the approved fields and identity. Store the account/client ID and verification evidence; a dispatched request alone is insufficient.
8. Complete the separate Xero/accounting check appropriate to the actual billing process, with a checked reference or documented reason that setup is not yet required.
9. Close the onboarding case and pass agreement/service setup to W05/W08. A profile existing in ShiftCare does not itself confirm a visit.

**Profile-update use case:** An existing participant submits an allowed contact/preference change. Verify the requester, native target and proposed fields; approve the supported update; read back; communicate the checked result through W13. Changes to funding, care plans, or representatives require the applicable separate review.

### Automation, data exchange, and human boundary

Automation prepares fields, required-item checks, candidate matches, and handoff tracking. Staff verify original evidence and the exact change. The dated MCP catalog exposes `create_client`/`update_client`; client creation requires first name and DOB. Its supported fields must be checked individually. The prototype uses additional review requirements; these are not a claim that every connector requires identical fields.

**Data exchanged:** Source → OCD: extracted draft and provenance. OCD → ShiftCare: approved supported profile fields and target ID. ShiftCare → OCD: retrieved identity/fields and verification reference. Accounting → OCD: separate checked handoff reference.

A new ShiftCare profile does not establish immediate Xero setup. ShiftCare documents creating missing Xero clients during invoice sync, so the bookkeeper must choose the appropriate existing linkage/setup path and avoid a second contact. [Xero integration](https://help.shiftcare.com/en/articles/9704468-getting-started-with-xero-integration).

### Exceptions and recovery

Missing DOB/authority, uncertain identity, conflicting record matches, unsupported fields, or failed verification stay with intake. If a create response is lost, reconcile native records before resending. Accounting failure keeps that handoff open; it must not trigger another ShiftCare profile creation. General file upload is a separate native filing step.

### Client benefit, expected outcome, and completion check

Staff replace repeated typing with evidence review, reducing transcription and duplicate-record risk. Success is a correctly matched/created native profile with verified mapped fields, linked evidence, and the required accounting outcome. Measure total onboarding minutes including review/recovery, corrections, missing-item follow-ups, and duplicates.

### Prototype demonstration and remaining work

Open Ava's scanned intake in **Automation**; demonstrate missing DOB, reviewed mapping, approval, sample native step, lost-response reconciliation, read-back, and separate accounting reference. Profile-update requests enter review cases. The intake example is fictional and checks selected sample fields, not every real assessment field. Real forms, extraction, complete matching, supported profile actions, and accounting setup require a supervised pilot.

## W04: Employee onboarding and payroll handoff

### Purpose, current process, and pain point

Prepare worker onboarding information once, then coordinate the appropriate ShiftCare and payroll steps. Keep profile creation, HR screening, and readiness for assignment as separate decisions.

The client receives employee onboarding by email and needs information entered into ShiftCare and the financial system. Recruitment, missing checks, and staff changes increase the office's workload. A worker profile must not be mistaken for evidence that the person is qualified or ready to work. [Client evidence: CSV lines 93–105, 908–917, and 1168](../dialpad_transcript_20261005_0923.csv#L1168).

### Trigger, inputs, and responsibilities

- **Trigger:** Reviewed employee paperwork or an office-approved onboarding request.
- **Inputs:** Verified name/email, original forms, intended worker role, consent/authority, service skills, qualification/document references, and employment/payroll information needed by the relevant reviewer.
- **Owner:** HR/admin; bookkeeper or payroll administrator owns financial setup.
- **Supporting subsystems:** Email/extraction, identity matching, restricted evidence, HR checklist, native handoff, W12 documents, and payroll verification.

### Step-by-step workflow

1. Receive the form through W02 or an approved HR intake and create an owned employee case.
2. Prepare a worker-profile draft and identify missing HR, document, or payroll items. Keep sensitive payroll evidence restricted to authorised staff.
3. HR verifies the original information, intended role, and invitation behaviour. Untrusted forms cannot request elevated permissions or activate a worker automatically.
4. Search for an existing staff record and any existing payroll link. Resolve duplicate email/name candidates before creation.
5. Use the approved native setup or supported `create_staff` operation for a genuinely new worker. An existing staff record requiring edits goes to the native UI unless another connector is separately validated.
6. Retrieve the staff record and confirm identity and the fields/settings relevant to the approved operation. Preserve the native staff ID.
7. HR checks qualification evidence and outstanding documents through W12 and records the separate screening decision. The worker remains unavailable for unapproved duties until the required checks are complete.
8. Payroll staff verify the worker's financial record, employment/contractor treatment, pay items, and linkage using the established payroll process. Record the checked reference.
9. Close the profile/setup case only after its required handoffs are documented. Rostering readiness is checked again in W08 before any service offer.

### Automation, data exchange, and human boundary

Automation prepares the draft, missing-item list, match candidates, and handoffs. HR retains hiring, screening, eligibility, role, and invitation decisions. Payroll retains employment treatment and pay setup.

**Data exchanged:** Employee source → OCD: draft fields and protected evidence references. OCD ↔ ShiftCare: approved staff setup and read-back. Payroll → OCD: setup/linkage confirmation, not unrestricted payroll details for all office users.

The 7 October MCP catalog exposes staff creation but no `update_staff`. Inbox Signals flags unknown staff for manual review rather than automatically creating them. [Inbox Signals staff handling](https://help.shiftcare.com/en/articles/16844206-automating-document-filing-with-inbox-signals). If the client's chosen payroll process uses native Xero staff import/linking, assess that path before creating a second person. [Xero staff setup](https://help.shiftcare.com/en/articles/9704468-getting-started-with-xero-integration).

### Exceptions and recovery

Duplicate identity, invalid role, uncertain invitations, missing screening, inaccessible evidence, or an unconfirmed payroll platform leaves the relevant handoff open. A failed payroll check does not repeat native staff creation. A lost creation response requires reconciliation against the native staff record.

### Client benefit, expected outcome, and completion check

Less repeated typing and fewer disconnected setup tasks make onboarding easier to manage. Success is a verified native staff record, an explicit HR readiness decision or outstanding checklist, and the required checked payroll setup. Measure admin minutes per employee, duplicate records, overdue onboarding items, and time from received paperwork to approved readiness.

### Prototype demonstration and remaining work

Use Noah's employee case in **Automation**. The sample profile is verified separately from payroll and remains pending screening. Real employee forms, staff setup/edit contracts, invitation settings, secure evidence handling, qualification approval, and the payroll vendor still require validation.

## W05: Service agreements and returned document filing

### Purpose, current process, and pain point

Track agreements and required files from request to verified filing under the correct person. Keep the client's existing approved templates and signing process.

The client described an existing sign-request process and said returned forms belong under the participant in ShiftCare. Chasing returns and checking the person, version, and filing location takes time. A document being emailed back does not establish that the correct signed version is stored and available to authorised users. [Client evidence: CSV lines 814–821](../dialpad_transcript_20261005_0923.csv#L814).

### Trigger, inputs, and responsibilities

- **Trigger:** Agreement preparation/follow-up becomes due, or a returned agreement/required attachment arrives.
- **Inputs:** Participant ID, approved template/version, signing request reference, return date, original file, signature evidence, required category, and visibility settings.
- **Owner:** Intake/office administrator; the authorised agreement reviewer handles content or signature concerns.
- **Supporting subsystems:** W02 inbox, evidence storage, agreement tracking, native filing, verification, and W13 communication.

### Step-by-step workflow

1. Prepare the agreement using the client's existing approved process. Link the signing request and expected document to the participant and track outstanding returns.
2. Receive the returned copy through the approved channel. Preserve the original file and its source; do not assume a signing-provider webhook exists.
3. Match the return to the correct participant and agreement request. Check whether another version or duplicate copy has already been filed.
4. The reviewer checks the expected version, parties, signature evidence, completeness, and any document-specific acceptance requirements.
5. Approve the person, category, filing location, and permitted visibility. Incorrect or uncertain evidence remains pending review.
6. File through supported native Inbox Signals review or the ShiftCare UI. Inbox Signals proposes person/category/expiry, but staff acceptance is required before filing. [Reviewed native filing](https://help.shiftcare.com/en/articles/16844206-automating-document-filing-with-inbox-signals).
7. Retrieve or inspect the native document record and confirm the correct person, file/version, category, and visibility. Record the filing reference and reviewer.
8. Mark the agreement/file complete only after its return and native filing are verified. Share a permitted copy or access path through the chosen portal/channel if that feature is approved and validated.

### Automation, data exchange, and human boundary

Automation tracks outstanding requests, prepares person/version matches, and surfaces filing exceptions. Staff validate the agreement and file the original through a supported method. Automated legal drafting, a replacement signature platform, and general file upload are not established capabilities of this prototype.

**Data exchanged:** Existing signing/email process → OCD: return reference and necessary evidence. Native filing → ShiftCare: approved original file and metadata. ShiftCare → OCD: checked document reference/status. Users receive only an approved copy/access path. `update_client_document` edits supported metadata; it must not be used as though it uploads a new file.

### Exceptions and recovery

Wrong participant/version, incomplete signature, corrupt file, missing authority, or inaccessible native filing leaves the task with the office. Repeated copies reuse the review where appropriate. An uncertain filing outcome is checked in ShiftCare before another upload. An overdue return creates follow-up under the agreed deadline.

### Client benefit, expected outcome, and completion check

Fewer missing returns and less filing/searching reduce admin effort and uncertainty about agreed service documentation. Success means the intended returned copy is accepted and verified under the correct native record, with appropriate visibility. Measure signature turnaround, outstanding agreements, filing minutes, and wrong-person/version corrections.

### Prototype demonstration and remaining work

Open Farah's returned agreement in **Automation**. Review the person/version/signature, simulate native filing, then read back before the sample **Signed** state appears. The sample filing reference does not prove a real upload or signature validation. Confirm the actual provider, templates, file categories, sharing permissions, return source, and verification method.

## W06: Three-day reminders and participant responses

### Purpose, current process, and pain point

Reduce daily manual checking of service reminder replies while keeping unanswered and unclear responses visible. Preserve the current reminder channel initially.

The client described ShiftCare reminding participants approximately three days before a service, with yes/no and reasons returning to the office. Staff inspect responses and decide what to do. The client wants less manual checking and prefers communication in the same platform. [Client evidence: CSV lines 536–540, 596, and 644](../dialpad_transcript_20261005_0923.csv#L536).

### Trigger, inputs, and responsibilities

- **Trigger:** The existing reminder schedule, a reply, an approved portal response, or an agreed response deadline.
- **Inputs:** Native occurrence ID, participant, date/time, reminder/event/thread reference, response text, receipt time, and any reason.
- **Owner:** Office team; one person owns unmatched and unanswered responses.
- **Supporting subsystems:** Native reminders, response ingestion, occurrence matching, deduplication, scheduling, and W07/W08 exception routing.

### Step-by-step workflow

1. Confirm the client's reminder timing, recipients, published-shift rules, operating time zone, and current settings in ShiftCare.
2. ShiftCare sends its existing reminder. The OCD layer checks response status rather than sending another reminder for the same event.
3. Receive replies through an authorised, validated source. ShiftCare documents SMS replies going to admin email and shift event history; the actual threading/fields must be tested. [Native reminder and response behaviour](https://help.shiftcare.com/en/articles/3022587-setting-up-reminders).
4. Match the response to one participant and one service occurrence using explicit references and sufficient context. Replayed replies reuse the existing processing record.
5. Classify the response as confirmation, cancellation, change request, or unclear. Preserve the original wording and proposed match for review.
6. A clear yes records the participant's response. It does not change the worker's acceptance or establish that the visit was delivered.
7. A cancellation routes to W07 with its reason; a requested change routes to W08. A missing reason or ambiguous “not this week” stays in office review.
8. At the agreed deadline, an unanswered reminder creates follow-up. The owner contacts the participant where needed and records the checked outcome. Silence never becomes cancellation automatically.
9. Refresh the native occurrence before further action so an old reply cannot change a rescheduled or already-cancelled service.

### Automation, data exchange, and human boundary

Automation prepares matching/classification, deduplication, outstanding-reply lists, and routing. Staff resolve uncertain replies and the downstream policy decisions. Native reminder delivery remains in ShiftCare; configuring a schedule is distinct from processing its replies.

**Data exchanged:** ShiftCare → OCD: authorised service and relevant reminder/event references. Response source → OCD: reply and provenance. OCD → office/W07/W08: reviewed response and exact occurrence. Any native status change requires a separately validated action; recording a local yes is not a native worker confirmation.

### Exceptions and recovery

Several nearby visits, missing identity/reason, delayed messages, failed delivery, unread pages, or no reply requires owned follow-up. Interrupted ingestion must reconcile the missing interval. A partial response dataset must not appear as “all participants confirmed.”

### Client benefit, expected outcome, and completion check

The office can focus on unresolved responses instead of rereading every reply. Clear routing reduces wrong-visit changes and unnecessary calls. Success is a traceable response linked to the correct occurrence or an explicit follow-up task for missing/unclear information. Measure daily checking minutes, unmatched replies, overdue follow-ups, and response corrections.

### Prototype demonstration and remaining work

Use **Automation → Run three-day check**, Olivia's yes reply, and the ambiguous sample reply. No second reminder is sent. These use a fixed fictional scenario, not an active schedule. Real response ingestion, event field coverage, matching rules, configured deadlines, and unattended processing remain to implement.

## W07: Cancellation review and verified execution

### Purpose, current process, and pain point

Prepare and execute the correct cancellation for the exact requested service, with the reason and approved financial treatment retained. Make the change easy to verify and communicate.

The office currently reads cancellation replies and enters the change in ShiftCare. The client explicitly wants this automated. Incorrect matching, an unintended series change, or choosing the wrong charge treatment can create service disruption and billing/pay queries. [Client evidence: CSV lines 536–540 and 644](../dialpad_transcript_20261005_0923.csv#L540).

### Trigger, inputs, and responsibilities

- **Trigger:** A matched cancellation reply/request from W06, the approved participant channel, or the office.
- **Inputs:** Account, participant, shift occurrence/series reference, current staff assignments, service time, request time, original reason, approval/invoice state, and reviewed charge/code treatment.
- **Owner:** Office/rostering; bookkeeper resolves financial exceptions.
- **Supporting subsystems:** Matching, policy review, exact approval, current-state checks, native execution, reconciliation, read-back, and W13 delivery.

### Step-by-step workflow

1. Match the request to the participant and exact occurrence. Clarify whether the person means one visit or a wider change; the ordinary workflow handles one occurrence.
2. Retrieve the current native service, all participants/staff, relevant financial state, and any previous cancellation. Stop if the data is incomplete or the request is already handled.
3. Prepare the original reason, proposed scope, and proposed billing/pay consequence for office review. Use the client's approved policy, not guessed notice periods or amounts.
4. The reviewer approves the exact occurrence and native treatment. Group services, approved/invoiced records, uncertain fees, or wider recurring changes go to a specific office/bookkeeper action.
5. Select the supported method. The dated MCP with-charge tool accepts a reviewed absence code and affects **every client on that shift**. Its without-charge tool has provider-cancellation semantics. Neither can be silently substituted for every participant request.
6. Perform the specifically approved native action once through the UI or supervised MCP. A future backend write stays disabled until its exact contract and approval requirements are validated.
7. Retrieve the native result and verify the relevant cancellation/absence state, reason/code, scope, and financial treatment using the supported fields or native inspection. Preserve unaffected participants and occurrences.
8. Update the permitted OCD display only after verification. Hand the checked participant/worker communication to W13. If native notifications already cover it, avoid sending a duplicate update.
9. Retain the source, approval, native reference, checked result, and delivery/fallback outcome. Any later rebooking is a reviewed W08 action against the existing native record.

### Automation, data exchange, and human boundary

Automation prepares identity/scope checks, the proposal, duplicate protection, verification, and follow-up. The office approves policy and financial effects; uncertain cases remain human decisions. ShiftCare documents separate charged and uncharged treatments and restrictions on approved/invoiced shifts. Its native group state depends on whether other participants still attend. [Native cancellation workflow](https://help.shiftcare.com/en/articles/3874528-cancel-shift-workflow-and-rebook-a-cancelled-shift).

**Data exchanged:** Request source → OCD: reason/time/target context. ShiftCare → OCD: current occurrence and relevant state. Approved native action → ShiftCare: exact target and supported reason/treatment. ShiftCare → OCD: independently checked outcome. W13 receives the verified result and approved recipient information.

For the dated MCP tools, required confirmation still applies to each native write. The client's goal of automatic cancellation therefore starts with automated preparation and supervised execution. Unattended execution requires both approved business rules and a separately validated machine interface that supports that operating mode.

### Exceptions and recovery

- **Group visit:** Do not apply the whole-shift with-charge tool to one participant's request; use reviewed native handling.
- **Financial lock or unknown charge:** Office/bookkeeper resolves it before any mutation.
- **Concurrent edit:** Refresh and reapprove the changed proposal.
- **Lost response after dispatch:** Mark the result uncertain and reconcile; do not send the cancellation again blindly.
- **Message failure:** Retry communication or use agreed contact; do not repeat the cancellation.

### Client benefit, expected outcome, and completion check

Less repeated entry and clearer evidence reduce wrong-visit and billing mistakes. Success is the correct native cancellation/absence effect with the approved scope and treatment verified, followed by a checked communication outcome or owned delivery exception. Measure handling minutes, cancellation corrections, unresolved charge queries, and notifications needing follow-up.

### Prototype demonstration and remaining work

Use Olivia's BKG-505 cancellation. Review the single occurrence, reason and policy treatment; simulate the native step; read back; then demonstrate failed delivery and retry. The sample roster changes after verification. Production policy, exact cancellation semantics, native fields, group/locked handling, and the supported write route remain acceptance gates.

## W08: New bookings, rescheduling, and replacement cover

### Purpose, current process, and pain point

Coordinate booking requests and changes without disrupting recurring commitments, and arrange suitable replacement cover when a worker cannot attend. Keep worker acceptance and participant agreement visible.

The client explained that an empty calendar slot may be a worker's personal time rather than availability. Sickness, resignation, and missed visits create last-minute pressure and risk losing participants. A participant request or system suggestion must therefore remain a proposal until the right checks and native outcome are confirmed. [Client evidence: CSV lines 415, 611–626, 662–663, and 973](../dialpad_transcript_20261005_0923.csv#L611).

### Trigger, inputs, and responsibilities

- **Trigger:** A new service request, reschedule request, staff decline/sickness, vacancy, or agreed cover deadline.
- **Inputs:** Participant/service needs, occurrence and series IDs, preferred times/worker, current assignments, eligibility/qualification evidence, leave/availability, conflicts, travel feasibility, and offer/acceptance references.
- **Owner:** Rostering team; the worker provides their own acceptance; the office owns no-cover contact.
- **Supporting subsystems:** Secure requests, current roster reads, native matching/Job Board, offer tracking, approval, verification, and W13 communication.

### Step-by-step workflow

1. Create an owned case for the specific new service or affected occurrence. Retain the original roster context and the participant's requested change or worker's reported absence.
2. Establish service requirements and any prerequisite agreement/consent checks. Protect the existing recurring arrangement while the proposal is reviewed.
3. Check suitable candidates and times using native Smart Match/Job Board where configured, alongside current leave, qualifications, availability, workload, and participant preferences. Native Smart Match is documented for 1:1 shifts. [Matching and Job Board controls](https://help.shiftcare.com/en/articles/13114664-carer-client-qualification-matching-smart-match).
4. Confirm personal availability and relevant travel/conflict constraints. Complete date ranges, including overnight/cross-day work, are needed; a same-day calendar gap alone is insufficient.
5. Review the exact offer and target. Job Board postings require an existing native shift and valid configuration. Check team IDs, qualification restrictions, and approval behaviour rather than assuming safe defaults.
6. Make the supported native offer or booking proposal and verify its existence/context. Configure or inspect **Confirmation Required** through the native UI where needed.
7. The worker accepts or declines through ShiftCare. A `notify` setting, assigned worker ID, or participant yes does not replace acceptance. [Native worker confirmation](https://help.shiftcare.com/en/articles/3022312-what-happens-when-i-tick-confirmation-required-while-adding-the-shift-program).
8. After acceptance, the office reviews participant contact/agreement and rereads the roster. Recheck suitability, conflicts, and any change since the offer.
9. Complete the supported native assignment/change. Preserve unaffected staff/participants; some assignment updates replace a complete list. A recurrence change needs separately approved scope and reconciliation if occurrence IDs change.
10. Retrieve and verify the intended worker, time, service, acceptance evidence, and preserved scope. Then refresh the OCD display and communicate the checked outcome through W13.

### Three practical use cases

- **New booking:** A participant requests service. Office checks capacity, agreement requirements, participant agreement and worker acceptance, then verifies the native booking. The prototype requires separate agreement/participant/worker checks; the real prerequisites must be agreed with the client.
- **Reschedule:** A participant asks for another time. Office protects the existing occurrence, checks worker and participant agreement, performs the reviewed native change, and verifies the new time and unaffected recurring visits. The current prototype routes this to a checked human outcome.
- **Replacement cover:** A worker is unavailable. Office reviews candidates, verifies an offer, receives native acceptance, approves the current assignment, verifies the replacement, and informs the participant. If nobody accepts, the case escalates for an alternative time or other explicit outcome.

### Automation, data exchange, and human boundary

Automation coordinates requests, evidence, offers, outstanding acceptance, deadlines, and checked outcomes. Rostering owns suitability and policy; workers retain the decision to accept. The dated MCP catalog exposes posting/shift operations but does not provide complete availability schedules, a Smart Match suggestion call, or a worker-acceptance write.

**Data exchanged:** ShiftCare → OCD: permitted roster/people/qualification/leave context. OCD → native process: approved offer/change. ShiftCare/native worker response → reviewer: offer, acceptance and assignment evidence. OCD → participant: verified outcome only. Actual native vacancy/decline behaviour follows the account's settings, not a hardcoded assumption.

### Exceptions and recovery

Missing availability, qualification/team evidence, changed assignments, conflicts, group scope, worker decline, or an expired offer returns the case to rostering. No cover triggers office contact and a recorded alternative; automation cannot create workforce capacity. An uncertain native offer/assignment is reconciled before another dispatch.

### Client benefit, expected outcome, and completion check

Less chasing and clearer ownership improve response to service risk. Success is a suitable accepted native assignment/change independently checked, or a documented participant-contact alternative with an owner. Measure cover coordination minutes, acceptance before the agreed deadline, unresolved vacancies, and avoidable changes to recurring services.

### Prototype demonstration and remaining work

Use BKG-502: review Elena Cruz, simulate/verify the offer, switch to **Worker → Elena** to accept, then return to the office for contact review and assignment verification. The earlier sample assignment remains until read-back. New bookings have separate acceptance checks; reschedule/no-cover cases need checked human outcomes. Real availability, complete conflict windows, native offer/response evidence, deadlines, and write operations remain to validate.

## W09: Visit records and significant care exceptions

### Purpose, current process, and pain point

Bring incomplete visit evidence, duration differences, and significant worker-reported issues to the appropriate office reviewer. Preserve original care records and avoid duplicate worker entry.

Workers already record actual time, tasks, progress and outcomes in ShiftCare. The office and bookkeeper need explanations when service runs longer and visibility of important notes. Confidential information must remain restricted. Reviewing every visit manually makes it easier to overlook an exception. [Client evidence: CSV lines 476–478 and 693–702](../dialpad_transcript_20261005_0923.csv#L476).

### Trigger, inputs, and responsibilities

- **Trigger:** Native visit data changes, a worker raises a major issue, or a scheduled/office-started care review.
- **Inputs:** Occurrence and staff/assignment IDs, scheduled and actual attendance, original note references, required tasks/goals/outcomes, and permitted issue flags.
- **Owner:** Office/care reviewer; bookkeeper handles duration/billing questions. Urgent concerns follow the existing response procedure immediately.
- **Supporting subsystems:** Complete care reads, deterministic exception rules, restricted review queue, native Care Signals where suitable, and W10/W11 handoff.

### Step-by-step workflow

1. The worker records attendance and care evidence in the existing ShiftCare app. The target design avoids asking for the same information again in OCD.
2. Retrieve the authorised occurrence, attendance, notes and relevant task/outcome evidence within the agreed scope. Show the retrieval time and missing-source limitations.
3. Check whether actual start/end evidence is present and valid. Use real dated timestamps for cross-day services; do not derive delivered duration from the roster.
4. Compare actual and planned duration. A difference creates a review question linked to the explanation; it is not automatically an overcharge, fraud finding, or pay adjustment.
5. Check required documentation against agreed rules. Missing/inaccessible notes or task outcomes remain evidence gaps; one general note does not establish that every required task or goal was completed.
6. Route an explicit major issue to a restricted office reviewer. Assess native Care Signals for supported risk/documentation flags before building duplicate AI interpretation. [Care Signals review](https://help.shiftcare.com/en/articles/14120774-care-signals-ai-smart-note-review).
7. The reviewer reads the original native evidence, contacts the worker where needed, and records the appropriate action or follow-up. Care decisions and formal incident handling remain with authorised people.
8. Send financial exceptions to W10/W11 without exposing unnecessary confidential care content. Refresh the exception when native evidence is corrected.
9. Close the review after the responsible person records a checked resolution. A major issue is not resolved merely because the system created an alert.

### Automation, data exchange, and human boundary

Automation finds missing fields, invalid attendance, duration differences, and explicit flags, then assigns review. Human reviewers interpret care context and determine action. It does not rewrite original notes or decide clinical outcomes.

**Data exchanged:** ShiftCare → OCD: authorised timing, note/task metadata and source references needed for the check. OCD → restricted reviewer: exception and native link. Reviewer/native correction → OCD: checked outcome. Finance receives the relevant duration/approval question, not unrestricted sensitive notes.

The recorded MCP progress-note search has a 90-day creation window. Older history and incomplete/permission-scoped data require another verified native report or human review; no-result must not be treated as proof that no note exists.

### Exceptions and recovery

Missing pages, invalid clock times, older/inaccessible notes, unclear task requirements, or restricted content makes the review incomplete. A worker-reported urgent issue follows the existing urgent process even if automation is unavailable. Updated evidence should refresh the existing case rather than create repeated alerts for the same occurrence/check.

### Client benefit, expected outcome, and completion check

Office attention goes to visits that need follow-up, helping staff respond earlier and preserve explanations for later billing/pay review. Success is an evidence-linked exception with a responsible reviewer and checked disposition. Measure review minutes, unresolved documentation gaps, significant-issue response time, and repeated requests for explanations.

### Prototype demonstration and remaining work

Use **Worker → Sam Walker → BKG-498** for sample attendance, note, tasks/goals, and a major-issue flag; then prepare a care review in **Bookkeeping**. This updates fictional native evidence. Real care reads, complete timestamp handling, approved documentation/alert rules, permissions, and urgent procedures require validation. No AI clinical interpretation is implemented.

## W10: Tuesday invoice preparation and exception review

### Purpose, current process, and pain point

Prepare a traceable list of billing exceptions before the client's Tuesday invoicing, so the bookkeeper spends less time opening each shift separately. Keep invoice approval and the existing export process authoritative.

The client said Tuesday invoices go to plan managers or self-managed participants. The bookkeeper checks actual versus rostered time and explanations, alongside funding/recipient context. Rejected invoices and repetitive individual checks are concerns. The rare export rounding issue was explicitly lower priority. [Client evidence: CSV lines 481–486, 719–726, and 762–775](../dialpad_transcript_20261005_0923.csv#L481).

### Trigger, inputs, and responsibilities

- **Trigger:** The agreed Tuesday cut-off, a manual review, corrected visit evidence, or an invoice query from W02.
- **Inputs:** Agreed inclusive period/time zone, occurrence IDs, actual attendance, note/outcome references, cancellation treatment, relevant funding/payer/service-line data, and existing invoice/export references.
- **Owner:** Bookkeeper; office/care reviewer resolves service explanations.
- **Supporting subsystems:** Scheduled reviews, complete paginated reads, W09 exceptions, finance checklist, native approval/export, and audit.

### Step-by-step workflow

1. The bookkeeper confirms the period, cut-off, operating time zone, and data needed for this cycle. Schedule the review only after these rules are agreed.
2. Retrieve completed-service evidence and relevant financial references for the whole scope. Record which pages and sources were successfully read.
3. Check actual attendance and compare duration with the roster. Flag missing explanations, unresolved cancellation/absence effects, and required note/outcome gaps.
4. Prepare payer, funding, rates, service-line, travel/kilometre and approval checks. Automatically evaluate only fields/rules validated for this account; keep the rest as explicit bookkeeper tasks.
5. Mark the report partial if any required source is missing. A list containing no findings cannot be labelled a clean period when coverage is incomplete.
6. The bookkeeper opens native evidence for each exception, confirms the correct billing recipient and financial treatment, and resolves discrepancies with the office where needed.
7. Record corrections and approvals in the appropriate native system, then refresh the same review cases with the corrected source evidence. Changed evidence invalidates an earlier completed checklist where relevant.
8. Approve/create/export invoices using the existing ShiftCare/Excel/Xero process. Native Xero export is documented to produce draft invoices; this requires its own financial approval/release process. [Xero invoice export](https://help.shiftcare.com/en/articles/9704468-getting-started-with-xero-integration).
9. Check the resulting invoice/export references and any mismatch or rejection. Record the period outcome without creating a second export from OCD.

### Automation, data exchange, and human boundary

Automation consolidates evidence and validated exceptions and tracks ownership. Bookkeeper judgement remains necessary for rates, recipient, funding, travel, corrections, and release. Preparing a report is not invoice approval.

**Data exchanged:** ShiftCare → OCD: permitted service/financial context and references. OCD → bookkeeper: period, source completeness, findings and manual checks. Native accounting path → reviewer: invoice/export outcome. OCD stores the checked reference and unresolved exceptions.

**Illustrative use case:** A visit is rostered for 120 minutes and recorded for 135. The system highlights the 15-minute difference and links the explanation. The bookkeeper decides the correct approved treatment; automation does not automatically bill another 15 minutes.

### Exceptions and recovery

Unknown payer/funding, unsupported rate/travel rules, incomplete attendance, locked records, rejected exports, or mismatched amounts stay with the bookkeeper. A lost export response requires checking the existing export/invoice before repeating it. Preserve existing financial history and avoid automatic invoice recreation.

### Client benefit, expected outcome, and completion check

Consolidated checks can reduce repetitive opening/searching and help catch errors before invoices reach the wrong person. Success is a complete period review with resolved exceptions or explicit held items, followed by a checked existing invoice/export outcome. Measure bookkeeper minutes per comparable cycle, corrections/rejections, unresolved items, and duplicate exports.

### Prototype demonstration and remaining work

In **Office → Bookkeeping**, prepare a Tuesday invoice review and try interrupted source data. Duration/documentation rules generate owned cases; payer/funding/rates/travel remain checklist prompts. Record a checked human outcome. Real source coverage, financial rules, scheduling, native approval, and export verification remain to validate; no invoice is sent by this workflow engine.

## W11: Fortnightly payroll preparation and exception review

### Purpose, current process, and pain point

Prepare reliable pay-period evidence and exceptions before the client's fortnightly payroll. Give workers a permitted view of their own recorded hours without presenting provisional values as final pay.

The client described checking hours, kilometres, and travel and handling pay concerns. Payroll occurs every two weeks. The exact payroll vendor and applicable pay/travel rules were not established by the meeting; those must come from the bookkeeper's actual process. [Client evidence: CSV lines 676–690, 762–791, and 1013](../dialpad_transcript_20261005_0923.csv#L676).

### Trigger, inputs, and responsibilities

- **Trigger:** The agreed fortnightly period cut-off, a manual preparation run, corrected evidence, or a worker pay query.
- **Inputs:** Period boundaries/time zone, staff and assignment IDs, verified attendance, approved hours/travel/kilometres, pay-item linkage, employment treatment, and native payroll references.
- **Owner:** Bookkeeper/payroll administrator; workers clarify their records; HR confirms employment information.
- **Supporting subsystems:** Period scheduler, complete reads, W04 linkage, W09 attendance exceptions, payroll checklist, worker access, and audit.

### Step-by-step workflow

1. Confirm the real payroll platform, pay period, cut-off, employment types, approval responsibilities, and the client's approved calculation rules.
2. Retrieve the complete authorised period evidence and preserve staff IDs separately from shift-assignment IDs.
3. Validate actual attendance before totaling recorded hours. Missing or invalid attendance is an unresolved gap, not zero worked time or rostered time automatically substituted as delivered work.
4. Prepare discrepancies for hours, travel, kilometres, allowances/pay items, and approval state using validated data. Flag an unresolved W09 explanation rather than guessing it.
5. Give the worker only their permitted recorded-hour overview and query route. Clearly label incomplete/provisional information; do not publish another worker's records or an unverified pay amount.
6. The bookkeeper compares exceptions with the native evidence and approved payroll rules, obtaining clarification from the worker/HR where needed.
7. Correct or approve records using the current native process and refresh the review evidence. Keep worker travel payment and participant travel billing as separate checks.
8. Use the existing approved export/payroll route. If Xero timesheet export is chosen, native staff linking and mapped pay items are prerequisites, and documented contractor limitations must be checked. [Xero timesheet setup](https://help.shiftcare.com/en/articles/9704468-getting-started-with-xero-integration).
9. Payroll staff perform calculation and release in the confirmed platform, then record the checked outcome/reference or explicit held items. OCD does not release pay.

### Automation, data exchange, and human boundary

Automation prepares evidence, missing-item checks, provisional recorded-hour totals, and follow-up. HR/bookkeeper retain employment classification, pay rules, adjustments, approval, and release. The transcript's unclear legal/rate figures are not configuration values.

**Data exchanged:** ShiftCare → reviewer/OCD: permitted attendance and relevant references. OCD → payroll reviewer: exceptions and checked source scope. Existing native export → payroll platform: approved inputs. Payroll → OCD: checked release/handoff reference where available. Workers see only their authorised view.

### Exceptions and recovery

Unconfirmed platform, incomplete pages, missing clock records, unknown travel/rate rules, unlinked pay items, disputed hours, or unclear employee/contractor treatment creates a payroll task. Payroll failure does not repeat worker creation or release another pay run. Uncertain exports/releases must be reconciled in the authoritative platform.

### Client benefit, expected outcome, and completion check

Earlier visibility of evidence gaps and a consolidated review list can reduce last-minute payroll chasing and pay corrections. Success is a complete pay-period review with each exception resolved or explicitly held, and a checked existing payroll outcome. Measure preparation minutes, pay queries/corrections, unresolved attendance, and late handoffs.

### Prototype demonstration and remaining work

Prepare a fortnightly review in **Bookkeeping**, then inspect **Worker → Hours & documents**. Invalid/incomplete attendance is excluded from displayed totals and requires review. The prototype does not calculate wages, allowances, statutory entitlements, or release pay. Real period rules, secure worker identity, financial evidence, vendor linkage, and native export/release checks remain to validate.

## W12: Document cleanup, expiry, and renewal follow-up

### Purpose, current process, and pain point

Make document alerts reliable and track genuinely missing or expiring worker evidence. Include initial data cleanup so documents that do not expire are not repeatedly treated as expired.

ShiftCare already tracks document expiry. The client described incorrect expiry flags on non-expiring records and the need to monitor missing checks and first aid evidence. Building more reminders around incorrect metadata would increase noise instead of solving the problem. [Client evidence: CSV lines 93, 105, and 446](../dialpad_transcript_20261005_0923.csv#L446).

### Trigger, inputs, and responsibilities

- **Trigger:** Initial cleanup, an agreed expiry review, missing-evidence detection, or a newly received certificate/document.
- **Inputs:** Person/document/qualification ID, original evidence, correct category, stored expiry/no-expiration state, visibility, and renewal requirement.
- **Owner:** HR/compliance administrator; rostering reviews any impact on service eligibility.
- **Supporting subsystems:** Native document/qualification reads, W02/W05 filing, evidence review, renewal queue, reminders, and W08 eligibility checks.

### Step-by-step workflow

1. Retrieve the required document/qualification records and the scope of the review. Separate worker qualifications, general staff files, and participant documents.
2. Identify missing, due, expired, or suspiciously configured records. A blank date is an unresolved fact until evidence is checked.
3. The reviewer checks the original document and approved document-type rules to determine whether it has a real expiry, genuinely never expires, or needs clarification.
4. Prepare the exact correction or renewal task, including category and visibility. Preserve evidence and the reason for the decision.
5. Correct the existing metadata through the supported native route. For a supported client-document MCP update, `no_expiration:true` is distinct from merely clearing a date. Worker document/qualification changes require their own verified operation or native UI; `update_client_document` is not a staff-document editor.
6. New files are reviewed and filed through native UI/Inbox Signals as in W05. Creating qualification metadata does not itself prove that a certificate file was uploaded or checked.
7. Retrieve/inspect the native record to verify category, expiry treatment, and filing. Remove the false exception only after that check.
8. For a genuine renewal, use the existing reminder configuration where suitable and track a named owner, follow-up, and returned evidence. Native staff-document and qualification reminders are documented separately. [ShiftCare reminders](https://help.shiftcare.com/en/articles/3022587-setting-up-reminders).
9. Update the related rostering eligibility review where required. Filing a document does not automatically establish that all screening requirements are met.

### Automation, data exchange, and human boundary

Automation prepares prioritised exception lists, dates, and follow-up ownership. HR verifies original evidence, document rules, suitability, and any restrictions. Native tracking remains the authoritative document status.

**Data exchanged:** ShiftCare → OCD: permitted metadata, source scope and native references. Document source → reviewer: original evidence. Supported native action → ShiftCare: reviewed metadata or filing. ShiftCare → OCD: verified state. Renewal delivery → W13/owner: checked contact result where available.

### Exceptions and recovery

Unreadable evidence, wrong person/category, unknown expiration treatment, missing permissions, or no supported update remains human review. A false alert must not be hidden merely because no date is present. An uncertain filing/correction is inspected before retry. Missing/expired eligibility evidence escalates to HR/rostering rather than silently confirming work.

### Client benefit, expected outcome, and completion check

Cleaner alerts help staff focus on genuine renewals, reducing unnecessary chasing and incorrect assumptions about readiness. Success is accurate verified native metadata or an owned renewal/missing-evidence task with an explicit outcome. Measure false-alert volume, overdue genuine renewals, follow-up minutes, and unresolved eligibility gaps.

### Prototype demonstration and remaining work

Use **Automation → Check documents** and review the fictional non-expiring induction acknowledgement. Record the evidence, select explicit never-expires treatment, simulate correction, and read back. This is a worker-document example, not proof of a live client-document operation. Actual type rules, staff update methods, original evidence, scheduled checks, and renewal delivery still need validation.

## W13: Communication history and delivery follow-through

### Purpose, current process, and pain point

Make service communication traceable, private, and actionable. Keep a verified native result separate from whether the relevant person was actually informed.

The client prefers messages/reminders in one place, ideally using app notifications, with retained administrative history. Personal phone numbers and worker home addresses need protection. Fragmented channels and unconfirmed delivery cause repeated calls and uncertainty about what was communicated. [Client evidence: CSV lines 395–399, 560–604, and 607](../dialpad_transcript_20261005_0923.csv#L596).

### Trigger, inputs, and responsibilities

- **Trigger:** A verified cancellation, replacement, or profile update; participant feedback/message; agreed follow-up; or an approved announcement.
- **Inputs:** Verified case/native reference, permitted recipient identity, approved message, channel preference/authority, delivery reference, and timestamps.
- **Owner:** Office team; the originating workflow owner handles failed contact or a required response.
- **Supporting subsystems:** Native chat/portal assessment, secure recipient matching, separate outbox, delivery receipts, history, retry, and fallback contact.

### Step-by-step workflow

1. Choose the approved channel for each event, assessing native ShiftCare chat/Family Portal before adding another inbox. Identify existing native notifications to prevent duplicate messages.
2. Check the recipient's actual identity, authority, record access, and preferences. Do not derive production permissions from the prototype's persona selector.
3. For an operational result, wait for W03/W07/W08 verification before saying the record changed. Earlier acknowledgements must say the request is received or pending review.
4. Prepare the permitted message using the checked outcome. Exclude private notes, personal contact details, worker home origin, and other participants' records.
5. Record a separate delivery task with a stable reference linked to the originating case. Sending a message must not dispatch the underlying native operation again.
6. Send through a supported native/manual route or an independently validated OCD delivery connector. Keep queued, sent, delivered, failed, and read/acknowledged states distinct where the channel provides evidence.
7. Retain the relevant actor, time, approved content/reference, recipient, and delivery outcome under agreed access/retention rules.
8. If delivery fails or an important response does not arrive by the agreed deadline, assign office fallback contact and record that outcome. Retrying delivery cannot repeat the cancellation or assignment.
9. Route received feedback or change requests to their proper workflow and named owner. A message appearing in an inbox is not itself a resolved complaint or confirmed booking.

### Automation, data exchange, and human boundary

Automation prepares result-based communication, recipient checks, delivery tracking, and safe retries. The office approves policy/channel/content and handles urgent or unresolved contact. Native conversations remain in ShiftCare unless a supported import/history method is validated.

**Data exchanged:** Verified workflow → delivery task: outcome/reference and allowed recipient. Delivery channel → OCD: available receipt/failure information. Recipient response → office/downstream case: message and provenance. The app owns history for its own channel, not an assumed copy of all native conversations.

Family Portal documents permission-controlled 1:1 messaging and service requests; provider-rostered cancellations remain pending approval. It does not establish an MCP chat interface or a universal document-sharing channel; its chat currently excludes PDF attachments. [Family Portal workflow](https://help.shiftcare.com/en/articles/11711159-navigating-the-family-portal-your-guide-to-staying-connected).

### Exceptions and recovery

Invalid recipient, revoked authority, rejected push, offline device, unavailable channel, or uncertain delivery creates a contact task. “Sent” must not be displayed as proof of reading. Native mutation success may remain valid while communication is pending/failed; display both states. Urgent care concerns use the organisation's existing urgent contact process.

### Client benefit, expected outcome, and completion check

Clear history and visible failures reduce repeated conversations and assumptions that someone was informed. Success is appropriate communication backed by available delivery/acknowledgement evidence or a checked fallback outcome, with the required response handled. Measure delivery failures, unresolved contact tasks, repeated enquiries, and time spent finding communication history.

### Prototype demonstration and remaining work

After a sample cancellation/cover/profile update, inspect the recipient-scoped outbox, simulate failed delivery, and retry. The history persists in browser demo state. These states do not send real messages or import native chat; existing opt-in Web Push is a separate feature. Approved channels, real recipients, delivery receipts, server history, retention, and fallback deadlines remain to implement.

## W14: Booking maps and worker arrival estimates

### Purpose, current process, and pain point

Give each role the relevant booking view and give a participant useful arrival information for their own service. Help the office explain delays and the worker plan travel while protecting location privacy.

Arrival visibility received client support, with concerns about exact location and home-address exposure. The subsequent user instruction added Mapbox 3D to Office, the existing Worker workspace selected for “employer,” and Participant/Client views. This is an addition to the meeting scope, not a request for a separate Employer system. [Meeting context: CSV lines 514 and 557–579](../dialpad_transcript_20261005_0923.csv#L557); requirement **L01** records the later instruction.

### Trigger, inputs, and responsibilities

- **Trigger:** Refreshed authorised bookings; the assigned worker explicitly starts a consented service journey or supplies an approved manual ETA.
- **Inputs:** Current occurrence/worker/participant IDs, permitted service location, worker identity, consent/start/stop, timestamp/accuracy, necessary device coordinates or manual estimate, and route result.
- **Owner:** Worker controls permitted journey sharing; office handles late-risk and unavailable-estimate cases.
- **Supporting subsystems:** Secure booking projection, journey service, consent/identity checks, Mapbox rendering/routing, freshness checks, and W13 contact.

### Step-by-step workflow

1. Retrieve current ShiftCare booking/assignment context and check real role/record permissions.
2. Show the office's permitted booking overview, the worker's own assignments/next visit, and the participant's own service location/details. A scheduled start is displayed as schedule information, not evidence of travel.
3. The assigned worker explicitly agrees to the defined location/ETA sharing and starts the service-specific journey. No trip starts automatically from the roster time.
4. For production, receive authorised device updates or an approved worker-entered estimate. Link them to the current assignment and store only what the agreed purpose requires.
5. Calculate route duration from necessary coordinates through the approved routing service. Mapbox Directions takes supplied waypoints and returns routing information; traffic-aware results depend on supported routing/geography. [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/).
6. Give the participant an arrival estimate, freshness/last-update context, and an available/unavailable status. Do not expose the worker's home origin, exact position, complete route, tracking history, or another participant's destination.
7. Refresh the estimate only from valid fresh information. A material delay can create office follow-up under an agreed rule; the estimate is not a guaranteed arrival time.
8. Stop or withdraw sharing on consent withdrawal, stopped journey, cancellation, reassignment, arrival, or stale/offline input. Display unavailable/withdrawn status instead of a continuing moving marker or old ETA.
9. The worker still records actual attendance in ShiftCare. Journey arrival does not clock in, prove delivered care, or establish payable service time.

### Automation, data exchange, and human boundary

Automation renders scoped bookings, computes estimates from supplied data, checks freshness, and withdraws invalid estimates. The worker provides consent/input; the office agrees sharing boundaries and handles arrival questions when data is unavailable.

**Data exchanged:** ShiftCare → OCD: service/assignment context. Worker device → OCD journey service: authorised temporary updates. OCD ↔ Mapbox: necessary route coordinates/duration. OCD → participant: permitted ETA/status and own booking details. Coordinates sent to a routing provider need approval under the chosen privacy arrangements.

ShiftCare's documented clock-in location check concerns location at attendance events; it does not establish a continuous travelling-worker feed for this app. [Native clock-in location check](https://help.shiftcare.com/en/articles/10557764-clockin-location-check).

### Exceptions and recovery

Missing consent, mismatched assignment, stale/inaccurate coordinates, offline/background-device gaps, or failed routing withdraws the estimate. Real phone/background behaviour must be tested; a browser demo cannot guarantee continuous tracking. A manually entered estimate must be labelled and time-stamped rather than presented as live GPS.

### Client benefit, expected outcome, and completion check

Useful arrival information can reduce “where is the worker?” calls and help participants plan, while clearer delay handling assists the office. Success is an appropriately scoped booking view and a fresh, authorised estimate, or a clear unavailable state with owned follow-up when needed. Measure arrival enquiries, delay-contact time, estimate freshness/accuracy, and stale estimates correctly withdrawn.

### Prototype demonstration and remaining work

Use the Office booking map, **Worker → Elena → Visit map → BKG-501**, then **Client → Olivia → Arrival status**. Explicitly consent/start the fictional journey, test stale updates, and stop sharing. Mapbox 3D rendering has been tested, but journey movement is simulated. Real identities, booking feeds, device location, server ETA projection, privacy approval, and actual-phone accuracy/background tests remain necessary.

## Shared supporting subsystems

These services support the 14 workflows. They are not additional counts of completed automation. Their value is to make each task understandable, accountable, recoverable, and verifiable.

| Subsystem | Purpose and practical use case | Workflows supported | Current prototype and remaining implementation |
| --- | --- | --- | --- |
| Intake and office queue | Receive public/office enquiries, assign an owner, retain the next action, and track the ShiftCare handoff. Example: a coordinator's referral remains assigned until intake or a checked alternative is recorded. | W01–W05, W08 | Server-backed enquiries exist. Operational automation cases use browser sample storage; shared production case ownership/deadlines need implementation. |
| Mail, scan, and evidence processing | Receive authorised messages, retain originals, prepare mapped fields and source references, and identify missing information. Example: the reviewer sees an extracted DOB beside the intake evidence. | W02–W07, W12 | Fictional sources and editable mapping exist. Real mailbox/OCR connectors and protected original-file storage remain to implement. Native Inbox Signals can cover eligible reviewed filing if available. |
| Identity and permissions | Link a real office/worker/participant/representative identity to permitted records and enforce access on the server. Example: a participant receives only their booking/ETA, while confidential notes stay with authorised office roles. | All; especially W09, W11, W13, W14 | Office sign-in exists. Worker/Client selectors are sample personas; production record permissions and representative authority remain to build. |
| Record matching and read projection | Retain `(account, record type, native ID)`, separate staff/assignment/series IDs, show read time/completeness, and match proposals to current native records. Example: a reply targets one Thursday occurrence rather than every recurring Thursday. | W02–W12, W14 | Sample matching and separate evidence/REST screens exist. Complete live reads, stronger identity matching, freshness, and secure role-filtered projections remain to validate. |
| Policy and approval | Store exact proposed fields/scope, source review, approving actor, policy/version, and current-state context. Example: cancellation approval specifies one occurrence and its treatment. | W03–W08, W10–W12 | Sample review gates exist. Client policies, production actors, approved field contracts, and enforceable server approvals remain required. |
| Supported ShiftCare adapter and native handoff | Use only validated reads/writes, route unsupported work to ShiftCare UI/supervised MCP, and independently retrieve results. Example: native filing remains a tracked manual step rather than an invented upload endpoint. | W02–W12, W14 | Office-only REST reads are implemented separately; trial assistant MCP access is demonstrated. Website operational writes and assistant-to-website OAuth/session integration are not implemented. |
| Shared job runner, scheduling, and recovery | Persist jobs, claim work once, schedule agreed checks, handle incomplete reads, reconcile unknown outcomes, and escalate missed deadlines. Example: a lost profile-create response triggers a native lookup before another create. | All | Browser demo transitions and failure examples exist. Production shared storage, atomic claiming, monitored schedules, backoff, and reconciliation jobs remain to build. Local evidence-review runs do not constitute an unattended job runner. |
| Communication outbox and history | Keep delivery separate from native mutations and retain authorised communication evidence. Example: retry a failed cancellation message without cancelling the visit again. | W01–W08, W12–W14 | Sample pending/failed/delivered states exist. Real channel integration, receipts, retention, recipient identity, and fallback escalation remain to implement. |
| Maps and journey service | Render authorised bookings, manage consented journey sessions, calculate ETA, and withdraw stale data. Example: reassignment invalidates the previous worker's estimate. | W08, W14 | 3D rendering exists with simulated journeys. Device input, server journey state, secure projection, privacy controls, and phone testing remain required. |
| Evidence, integration proof, and client reporting | Show dated source receipts, review results, verified native changes, remaining manual work, and measured effort. Example: demonstrate that one approved trial follow-up exists without implying live cancellations or payroll. | All | **Integration proof** and **Client walkthrough** exist. Production evidence persistence/refresh and independently collected business measurements remain required. |

### Office, Worker, and Participant workspaces

- **Office:** Review sources/proposals, own exceptions, inspect native references, coordinate cover, and hand finance questions to the bookkeeper. Calendar/people/maps support these tasks; they do not create a second authoritative roster.
- **Worker:** See permitted assignments, accept in ShiftCare, record care there, clarify document/hour questions, and optionally share an approved journey estimate. Avoid duplicating the worker's existing care-entry process.
- **Participant/representative:** See their permitted bookings, submit requests, access approved documents through a supported path, and view authorised arrival information. A request is distinguishable from an accepted native change.
- **Public/referrer:** Check area and submit an enquiry without access to care, staff, finance, or private location records.

Assess native Family Portal and the current worker app before adding a custom screen. A supporting portal is useful where it demonstrably removes manual work; its presence does not justify duplicating existing ShiftCare functions.

## How the workflows connect

### Participant enquiry to service delivery

1. **W01** checks area and assigns ownership.
2. **W02** routes emailed paperwork or follow-up; **W03** establishes a reviewed native profile and appropriate accounting handoff.
3. **W05** tracks and verifies the returned agreement/document.
4. **W08** handles service setup with reviewed prerequisites, capacity, participant agreement, and worker acceptance.
5. **W06** checks replies to the existing reminder. Requests branch to **W07** cancellation or **W08** change/cover.
6. **W14** supplies an optional consented ETA. **W09** reviews the actual visit evidence recorded in ShiftCare.
7. **W10** prepares invoice exceptions; **W11** prepares payroll exceptions. Their final approval/export/release remains in the existing systems.
8. **W13** supports communication throughout, with each message tied to the appropriate request or verified outcome.

### Worker onboarding to ongoing readiness

1. **W02/W04** prepare the staff setup and separate HR/payroll handoffs.
2. **W12** verifies document/qualification evidence and tracks renewals.
3. **W08** checks current readiness and availability again before offers/assignment.
4. **W09** surfaces care-record questions; **W11** supports recorded-hour/pay queries.
5. **W13** tracks communication; **W14** adds the approved journey function without replacing attendance.

### Invoice complaint to checked response

1. **W02** identifies the complaint and proposes the invoice match.
2. The bookkeeper verifies the native/accounting invoice and opens the relevant **W10** review.
3. Any duration or documentation question goes to **W09**; a disputed cancellation treatment goes to **W07**.
4. The bookkeeper performs any authorised native correction and checks the financial outcome.
5. **W13** records the approved response and delivery/fallback outcome. No automatic payment/refund is implied.

## Completion, exceptions, and verification

### Shared lifecycle

The proposed production lifecycle is:

`Received → Needs review → Approved → Executing → Verifying → Completed`

Not every workflow needs a native write. An area decision or a human follow-up may close after its own checked outcome. Other branches are:

| State | Meaning | Required next action |
| --- | --- | --- |
| Manual action required | Missing information, unsupported action, policy exception, or required human handoff | Named owner resolves it natively or obtains clarification and records checked evidence. |
| Retry scheduled | A failure is known to have happened before dispatch, or a read can safely be retried | Bounded retry after current-state checks; escalate when the agreed limit/deadline is reached. |
| Reconciliation required | A write may have happened but its result is unknown | Search/retrieve the native outcome before permitting another dispatch. |
| Rejected | The proposal is declined or cannot proceed | Preserve reason/history and communicate the appropriate outcome. |
| Communication pending/failed | The underlying operation may be verified, but delivery is outstanding | Retry delivery or use approved fallback contact; do not repeat the underlying operation. |

### Shared completion rules

1. **Review the original source.** Proposed identity, values, and reasons must be traceable to evidence.
2. **Use the correct account and native IDs.** Do not mix trial/production data, staff/assignment IDs, or recurring series/occurrences.
3. **Check complete current context.** Missing pages/permissions cannot support an “all clear” conclusion. Refresh relevant state before an approved mutation.
4. **Approve the exact action where required.** Changed targets, scope, or important fields invalidate the prior approval.
5. **Verify the native outcome independently.** Compare the relevant approved fields/state with a new retrieval or checked native inspection. A queue entry, API acceptance, or simulation is insufficient.
6. **Finish separate handoffs.** Accounting setup, HR readiness, worker acceptance, finance release, and communication retain their own status and evidence.
7. **Record human resolution.** A manual case needs who acted, what happened, a native/contact reference, and how the outcome was checked.
8. **Make unresolved work visible.** Show the owner, next action, missing evidence, and agreed deadline; do not close a task merely to make the dashboard appear complete.

### Required production failure behaviour

- Lost connector access or unavailable features stop the affected action and create an admin/native handoff; do not silently switch accounts.
- Incomplete reads mark the report partial and require gap resolution.
- Repeated sources/jobs are deduplicated using stable source/target/operation references and shared atomic claiming. This is an app responsibility, not assumed support for upstream idempotency keys.
- Native state changes invalidate stale proposals and approvals.
- Unknown write outcomes require reconciliation. Retrying a read and repeating a create/cancellation/export are different decisions.
- No-cover, failed delivery, and stale ETA remain owned service exceptions with agreed fallback contact.
- Audit records retain approvals, scoped IDs, source references, dispatch/read-back times, and sanitised errors. Generic reports/logs must not contain credentials or unnecessary care/document contents.

### Demonstrating genuine ShiftCare integration

Use **Office → Integration proof** alongside ShiftCare. The saved 7 October trial capture contains authenticated read receipts and one exactly approved native administrative follow-up, action **11221**, independently read back. Explain the capture date, record scope, and limitations before showing results.

Running captured-data checks analyses saved evidence; it does not refresh ShiftCare or run operational writes. Replaying the same capture demonstrates duplicate-review prevention. The recorded follow-up proves supervised task creation and field verification, not that its underlying service concern was resolved. A new verification can retrieve the known native record without creating another task. Future writes need their own applicable approval and check.

On a hosted build without the private capture, absent evidence must remain visibly absent. Production evidence refresh and shared persistence require implementation; local proof files are not automatically uploaded as part of the static website.

## Measuring value and planning the pilot

### Why this approach can improve the current process

The client keeps the systems and worker habits already in use. The new layer prepares repetitive work, groups exceptions, assigns responsibility, and checks outcomes. Staff spend more effort on decisions and participant communication and less on copying, sorting, and repeatedly opening records.

This can improve time use, accuracy, response consistency, and service continuity. These are expected benefits to measure, not savings already established by the prototype. Human review remains useful where identity, policy, care context, money, or workforce capacity needs judgement.

### Measurement plan

Record comparable baseline and assisted periods, sample size, case type, staff handling minutes, review/recovery time, corrections, unresolved items, and evidence references. Include difficult and failed cases. Agree deadlines and success thresholds with the client.

| Workflows | Useful measures | Evidence needed |
| --- | --- | --- |
| W01–W02 | First-response time, triage minutes, overdue enquiries, duplicate work | Comparable volumes, receipt/contact times, owned outcomes |
| W03–W05 | Onboarding/filing minutes, corrections, duplicates, signature turnaround | Equivalent forms, all review/handoff time, checked native references |
| W06–W07 | Reply-checking minutes, unmatched/overdue replies, cancellation corrections | Reminder scope, response provenance, native outcome and delivery evidence |
| W08 | Time to arrange cover, acceptance before deadline, unresolved vacancies | Actual offer/acceptance/assignment times and participant-contact outcomes |
| W09/W12 | Review/follow-up minutes, genuine unresolved issues, false expiry alerts | Complete source scope, original evidence, checked dispositions |
| W10–W11 | Bookkeeper minutes per comparable cycle, queries/corrections, duplicate exports | Equivalent periods, finance exceptions, native approval/export/release references |
| W13 | Failed/unresolved delivery, repeated contact, history-search time | Channel receipts, required responses, fallback records |
| W14 | Arrival enquiries, estimate accuracy/freshness, delay-contact time | Authorised journey updates, native attendance used separately, contact outcomes |

Potential staff capacity released can be calculated as:

```text
Cases per month × (manual minutes per case − assisted minutes per case) ÷ 60
```

Assisted minutes include review, exceptions, recovery, and required handoffs. Multiplying the result by an agreed hourly staff cost gives a gross staff-time cost equivalent. It is not automatically cash savings or project return: licensing, implementation, training, support, and operating costs must also be considered. If the assisted process takes longer, report that result rather than forcing a positive benefit.

### Recommended pilot sequence

1. **Confirm the real process:** Current admin and bookkeeper review the actual forms, account, coverage, permissions, policy, financial rules, payroll vendor, and baseline. The client requested their input; the transcript is not a complete approved specification.
2. **Start with W03/W04 paperwork:** Validate extraction/matching and native entry with staff approval, separate accounting/payroll verification, and representative incomplete/duplicate cases.
3. **Validate the shared foundation:** Shared jobs, evidence storage, supported operations, result checks, identity permissions, reconciliation, and owned escalation must work before unattended actions are enabled.
4. **Extend operational review:** Add W06/W07, W08, W12, and W09–W11 after their sources, policies, and native handoffs pass acceptance checks.
5. **Complete communication and selected portals:** Validate real recipients, delivery/fallback, retention, and access. Reuse native features where they fit.
6. **Pilot W14 separately:** Obtain sharing approval and test actual devices, freshness, accuracy, offline behaviour, and privacy before calling arrival tracking live.

No deadline, volume, price, guarantee, or savings target is assumed here. Agree those based on validated access and pilot evidence. **Office → Client walkthrough** provides the presentation, guided sample journeys, baseline/pilot scorecard, and downloadable client report.

## Coverage of additional requirements and proposals

The 27-item register is broader than the 14 operational workflows. The mapping below prevents discussed ideas and business aspirations from being mistaken for approved production features.

| Requirement | Coverage in this document / scope position |
| --- | --- |
| A01 — Participant and worker onboarding | W03/W04; source review and separate accounting/payroll handoff |
| A02 — Service area | W01; approved coverage and human capacity exceptions |
| A03 — Email and follow-up | W01/W02; ownership, triage, and urgent invoice queries |
| A04 — Reminders and cancellations | W06/W07; existing reminders, matched replies, approved native treatment |
| A05 — Availability and booking controls | W08; worker acceptance and protected recurring commitments |
| A06 — Continuity and cover | W08; deadline/no-cover escalation and participant contact |
| A07 — Documents and cleanup | W12; evidence-based expiry corrections and renewal tracking |
| A08 — Visit records and important notes | W09; restricted review and duration/documentation exceptions |
| A09 — Invoices and payroll | W10/W11; existing financial process and human approval/release |
| A10 — Agreements and filing | W05; existing signing process and checked native filing |
| A11 — Communication/privacy/history | W06/W13 and shared identity/history controls |
| A12 — Arrival estimates | W14; consent, limited visibility, freshness, and fallback |
| P01 — Participant portal | W03 profile requests, W05 approved documents, W06–W08 service requests, W13/W14 communication/arrival; real identities and native feature fit remain required |
| P02 — Worker portal | W04/W08/W09/W11/W12/W13/W14; keep acceptance and care entry in the existing native workflow |
| P03 — Office workspace | All workflows; shared queue, evidence, exceptions, bookkeeping, and authorised projections |
| L01 — Mapbox 3D addition | W14 in Office, existing Worker workspace, and Participant/Client views |
| T01 — Newsletter/promotion proposal | Separate scope decision; no approved campaign workflow, audience policy, or live delivery is established |
| T02 — Worker incentives proposal | Separate scope decision; no agreed incentive rules or automatic payment workflow |
| T03 — Broad AI quality checking | W09–W11 demonstrate limited deterministic checks and human review; general authoritative AI financial validation is not implemented |
| T04 — Fewer discovery calls proposal | W01/W03 can prepare information; necessary assessment/discovery calls are not automatically removed |
| T05 — Automatic matching proposal | W08 uses reviewed candidates and native acceptance; autonomous ranking/reassignment remains unapproved/unvalidated |
| T06 — Live integration proposal | Shared connector/job/read-back design; each actual operation requires validated access and a supported contract |
| B01 — HR/recruitment support | W04 helps administration; interview/selection decisions and a full recruitment module remain separate scope |
| B02 — Subcontractor relationships | W04/W11 record relevant handoffs; contracts/classification and a subcontractor-management module require separate review |
| B03 — Organic marketing/referrals | W01 captures referrals; a marketing campaign programme is not an approved first-phase workflow |
| B04 — Future data portability | Stable source references assist traceability; a migration project or independent full care database is not approved |
| B05 — Owner workload, cost, reliability | Expected business outcomes across workflows; measure through the baseline/pilot rather than claiming achieved savings |

## Sources and validation basis

### Client and design evidence

- [Client meeting transcript](../dialpad_transcript_20261005_0923.csv) — 5 October 2026; references above use physical CSV lines. The automated wording and shared speaker label require care; unclear rate/legal figures are not treated as approved rules.
- [Client needs and automation requirements](OCD_Client_Needs_and_Automation_Requirements.md) and [27-item register](OCD_Automation_Requirements_Register.csv).
- [ShiftCare integration design](OCD_ShiftCare_Integration_and_Automation_Design.md) — integration boundaries, current process, W01–W14, data flows, and human fallback.
- [Architecture diagram](../.archify/architecture-ocd-shiftcare-20261006-185221/ocd-shiftcare.html), [intake/documents diagram](../.archify/architecture-ocd-shiftcare-intake-20261006-185221/ocd-shiftcare-intake.html), [service response/cover diagram](../.archify/architecture-ocd-shiftcare-service-20261006-185221/ocd-shiftcare-service.html), and [care/finance diagram](../.archify/architecture-ocd-shiftcare-finance-20261006-185221/ocd-shiftcare-finance.html).

### Implementation and integration evidence

- [Prototype workflow plan and coverage](OCD_Prototype_Workflow_Plan_and_Validation.md), [8 October prototype review](OCD_Prototype_Review_2026-10-08.md), and [client presentation/report guide](OCD_Client_Presentation_and_Pilot_Report.md).
- [Native demonstration and verification runbook](OCD_ShiftCare_Live_Demo_and_Verification.md) and [dated redacted capability receipt](ShiftCare_Demo_Capability_Evidence_2026-10-07.json).
- [Workflow engine](../workspace/automation-engine.js), [Automation workspace](../workspace/automation.js), [maps](../workspace/maps.js), [client walkthrough](../workspace/client-presentation.js), and [server intake routes](../api/workflow.js).

Official ShiftCare/Mapbox product guidance is linked beside the relevant capability claims and was rechecked on 8 October. The 82-tool catalog and native read/write evidence are dated 7 October. Public product documentation does not establish that a particular trial/production account has each feature enabled. This documentation work did not perform new native writes or refresh the private account capture.

This document covers the complete **recorded 14-workflow plan** and the associated 27 scope items. Production forms, account configuration, detailed daily procedures, and client acceptance remain to confirm; documentation completeness does not establish that every internal process has been discovered or that every proposed automation is live.
