// Planning source: docs/automation-feasibility-2026-10-25/feasibility.json
// These scope labels describe the proposed prototype, not enabled account integrations.
export type ModuleId =
  'intake' | 'documents' | 'rostering' | 'finance' | 'care' | 'communications' | 'shared';
export type WorkflowDefinition = {
  number: number;
  title: string;
  selection: 'C1' | 'C2' | 'G' | 'L';
  level: 'F' | 'P' | 'N';
  problem: string;
  automated_scope: string;
  manual_boundary: string;
  integration: string;
  remaining_work_or_gate: string;
  acceptance: string;
  workflow_families: string[];
  module: ModuleId;
};
export const WORKFLOWS: WorkflowDefinition[] = [
  {
    number: 1,
    title: 'Service area screening',
    selection: 'C1',
    level: 'F',
    problem:
      'People can complete full intake paperwork before learning that OCD cannot serve their location.',
    automated_scope:
      'Apply the approved coverage list before full intake and automatically route uncertain areas.',
    manual_boundary: 'Confirm actual capacity and exceptional locations.',
    integration: 'Application service-area configuration; no ShiftCare write is required.',
    remaining_work_or_gate:
      'Approve the list and routing rules; retain uncertainty rather than rejecting negotiable areas.',
    acceptance:
      'Covered, uncertain and unconfigured postcodes produce the correct recorded outcome.',
    workflow_families: ['W01'],
    module: 'intake',
  },
  {
    number: 2,
    title: 'Centralized enquiry collection',
    selection: 'C1',
    level: 'P',
    problem:
      'Website, email, telephone and coordinator referrals require separate monitoring and manual collection.',
    automated_scope:
      'Collect website and authorized mailbox sources, preserve originals and deduplicate enquiries.',
    manual_boundary: 'Log unsupported phone/voicemail sources and resolve uncertain identities.',
    integration:
      'Existing intake API and Microsoft Graph folder delta; ShiftCare client search supplies optional matches.',
    remaining_work_or_gate:
      'Test actual mailbox notifications, expired cursors, folder scope, attachments and source replay.',
    acceptance:
      'Repeated or changed sources create the correct case/version without duplicate enquiries.',
    workflow_families: ['W01', 'W02'],
    module: 'intake',
  },
  {
    number: 3,
    title: 'Enquiry ownership and prioritization',
    selection: 'C1',
    level: 'P',
    problem:
      'Several administrators can inspect the same message while another request remains unanswered or lacks an owner.',
    automated_scope:
      'Assign configured owners and deadlines, detect overdue requests and suggest urgency and routing.',
    manual_boundary: 'Confirm urgency, sensitive routing and candidate invoice/booking identity.',
    integration:
      'Application cases; ShiftCare clients/shifts/invoices for record context where needed.',
    remaining_work_or_gate:
      'Add approved assignment/escalation rules and notification outcomes; current classification is a suggestion.',
    acceptance:
      'Each request has one accountable next action; missed deadlines remain visible and owned.',
    workflow_families: ['W01', 'W02'],
    module: 'intake',
  },
  {
    number: 4,
    title: 'Missing information detection',
    selection: 'C1',
    level: 'F',
    problem:
      'Incomplete forms, unclear dates and missing supporting documents create repeated clarification work.',
    automated_scope:
      'Run deterministic required-field, attachment and format checks and prepare missing-information tasks.',
    manual_boundary: 'Resolve ambiguous dates, verify authenticity and provide missing answers.',
    integration:
      'Application forms and local extraction; no native mutation is needed for the checks.',
    remaining_work_or_gate:
      'Approve required fields and test representative forms. F applies to checking, not obtaining truthful answers.',
    acceptance:
      'Incomplete, unsupported and ambiguous sources are flagged without invented values.',
    workflow_families: ['W02', 'W03', 'W04'],
    module: 'intake',
  },
  {
    number: 5,
    title: 'Participant onboarding and profile updates',
    selection: 'C1',
    level: 'P',
    problem:
      'Staff copy information from forms and scans into participant records and must check for existing people.',
    automated_scope:
      'Extract evidenced draft fields, show duplicate candidates and execute approved basic participant changes with read-back.',
    manual_boundary:
      'Approve identity, consent, field values and separate service/accounting readiness.',
    integration: 'ShiftCare GET clients/client; POST or PUT clients using an explicit whitelist.',
    remaining_work_or_gate:
      'Validate native intake feature fit, actual forms, mapped fields and account writes; preserve prospects until activation is approved.',
    acceptance:
      'The source and exact approved fields link to one verified native identity; replay creates no duplicate.',
    workflow_families: ['W03'],
    module: 'intake',
  },
  {
    number: 6,
    title: 'Worker onboarding coordination',
    selection: 'C1',
    level: 'P',
    problem:
      'Worker information is re-entered and separate qualifications, access and payroll setup require chasing.',
    automated_scope:
      'Prepare worker fields, execute reviewed basic staff changes and track screening/access/payroll handoffs.',
    manual_boundary: 'HR verifies qualifications, employment decisions and payroll readiness.',
    integration:
      'ShiftCare GET staff/qualifications; POST or PUT staff. Existing payroll setup stays separate.',
    remaining_work_or_gate:
      'Test role/invitation behaviour and readiness checks. A recorded onboarding status does not itself establish sign-in permissions.',
    acceptance:
      'Approved basic staff data is verified and incomplete HR/payroll steps prevent readiness claims.',
    workflow_families: ['W04'],
    module: 'intake',
  },
  {
    number: 7,
    title: 'Client stages and agreed service details',
    selection: 'G',
    level: 'P',
    problem:
      'Staff search prospect and active lists and recover agreed hours or changes from emails and notes.',
    automated_scope:
      'Track reviewed stage transitions and source-linked service hours/effective changes.',
    manual_boundary: 'Approve activation, service hours, funding implications and effective dates.',
    integration:
      'Published clients PUT includes client_status; agreed hours also need native service/fund evidence and booking links.',
    remaining_work_or_gate:
      'Extend the mapping whitelist for explicit stage transitions; define which native record owns agreed hours rather than creating a second editable agreement.',
    acceptance:
      'Only an approved transition changes the native stage; hours retain their authoritative source.',
    workflow_families: ['W01', 'W03', 'W08'],
    module: 'intake',
  },
  {
    number: 8,
    title: 'Correspondence preparation',
    selection: 'C1',
    level: 'P',
    problem:
      'Staff repeatedly write similar messages, sometimes omitting the person, service time, outcome or next action.',
    automated_scope:
      'Prepare approved templates, validate recipients/context/attachments and record the communication handoff.',
    manual_boundary: 'Approve sensitive wording and send through the agreed channel.',
    integration:
      'Application templates and existing ShiftCare communication UI; Graph sending would require separate Mail.Send permission and implementation.',
    remaining_work_or_gate:
      'Implement reusable templates and checks. Do not depend on an unverified ShiftCare SMS/chat send API.',
    acceptance:
      'A complete reviewed message reaches an owned handoff; no task is labelled as a delivered message.',
    workflow_families: ['W13'],
    module: 'communications',
  },
  {
    number: 9,
    title: 'Communication tracking and history',
    selection: 'G',
    level: 'P',
    problem:
      'Communication evidence is scattered and staff must separately establish whether someone was notified or responded.',
    automated_scope:
      'Link supported communication references and distinguish dispatch, failure, response and checked native history.',
    manual_boundary:
      'Resolve unsupported channels and verify actual acknowledgement when required.',
    integration:
      'Graph Inbox/Sent Items and authorized native references; ShiftCare shift events may corroborate specific service communications.',
    remaining_work_or_gate:
      'Agree channel coverage and add permitted Sent Items/failure evidence. A Graph 202 response is not delivery proof; universal cross-channel read receipts are not promised.',
    acceptance:
      'Each status is backed by its own evidence, with unknown outcomes and failed delivery kept open.',
    workflow_families: ['W02', 'W13'],
    module: 'communications',
  },
  {
    number: 10,
    title: 'Booking preparation and availability checks',
    selection: 'C2',
    level: 'P',
    problem:
      'Staff copy booking details, clarify times and assess capacity; a free calendar slot may be personal time.',
    automated_scope:
      'Prepare one-off booking drafts and check dates, times, roster overlap, leave and available patterns.',
    manual_boundary:
      'Confirm suitability, worker willingness, participant agreement and native acceptance.',
    integration:
      'ShiftCare shifts/staff/leaves/qualifications; published availability_schedules and POST shifts can extend the adapter.',
    remaining_work_or_gate:
      'Add a whitelisted one-off create adapter and explicit native IDs/defaults if API creation is included. Availability patterns need date expansion; free time is not willingness.',
    acceptance:
      'A reviewed one-off arrangement has a verified native result or an explicit native creation handoff.',
    workflow_families: ['W01', 'W08'],
    module: 'rostering',
  },
  {
    number: 11,
    title: 'Booking change scope and verification',
    selection: 'C2',
    level: 'P',
    problem:
      'Staff clarify one-visit versus recurring changes and reopen bookings to check whether edits saved.',
    automated_scope:
      'Preview change scope and verify a supported saved occurrence against approved fields.',
    manual_boundary: 'Approve occurrence/series scope and resolve group or locked bookings.',
    integration:
      'ShiftCare GET/PUT shifts; published recurrence/shifts and recurrence/pattern operations need separately scoped adapters.',
    remaining_work_or_gate:
      'Keep initial writes to accepted occurrence scope. Series operations are published but not implemented in the existing adapter.',
    acceptance:
      'Only the approved scope changes; native mismatch, stale data and locks leave an owned exception.',
    workflow_families: ['W08'],
    module: 'rostering',
  },
  {
    number: 12,
    title: 'Travel checking and stale value detection',
    selection: 'C2',
    level: 'F',
    problem:
      'Travel distances, durations and blocks need manual checks and can remain outdated after booking or worker changes.',
    automated_scope:
      'Calculate route estimates from verified inputs and automatically flag stale or infeasible travel.',
    manual_boundary:
      'Verify ambiguous addresses and approve actual claims or scheduling decisions.',
    integration:
      'ShiftCare roster/address reads plus existing Mapbox routing; no automatic km/pay write is required.',
    remaining_work_or_gate:
      'Move dependency fingerprints/checks to shared server records. F covers estimates and stale-value checks, not mileage entitlement.',
    acceptance:
      'Changes to worker, address or preceding visit invalidate the estimate; no estimate becomes actual mileage.',
    workflow_families: ['W08', 'W11'],
    module: 'rostering',
  },
  {
    number: 13,
    title: 'Shift instruction maintenance',
    selection: 'G',
    level: 'P',
    problem:
      'Staff open bookings to copy missing instructions and track revised wording in separate tools.',
    automated_scope:
      'Find missing instructions and apply an approved version to explicitly selected native bookings.',
    manual_boundary: 'Approve wording, effective date and affected occurrences.',
    integration:
      'Published ShiftCare PUT shifts accepts description; recurrence/shifts also documents description.',
    remaining_work_or_gate:
      'Add a description-only adapter, version/hash checks and read-back. Validate series behaviour and locked/cancelled records before bulk changes.',
    acceptance:
      'Selected editable bookings match the approved instructions without changing unrelated fields.',
    workflow_families: ['W08', 'W09'],
    module: 'rostering',
  },
  {
    number: 14,
    title: 'Participant confirmation monitoring',
    selection: 'C2',
    level: 'P',
    problem:
      'Staff inspect reminder replies daily and determine which visit and follow-up each response concerns.',
    automated_scope:
      'Ingest native reminder replies, match exact occurrences and route confirmation/change/cancellation exceptions.',
    manual_boundary:
      'Resolve sender/occurrence ambiguity and approve any resulting service mutation.',
    integration:
      'Native reminders send SMS replies to admin email; Graph collects them. GET shift events provides an additional documented source.',
    remaining_work_or_gate:
      'Test actual notification formats, mailbox routing, quoted replies and occurrence matching; add event reads if needed.',
    acceptance:
      'A clear reply routes once; ambiguous replies and silence never trigger automatic cancellation.',
    workflow_families: ['W06', 'W07', 'W08'],
    module: 'rostering',
  },
  {
    number: 15,
    title: 'Complete cancellation handling',
    selection: 'G',
    level: 'P',
    problem:
      'A worker may be notified while the booking remains active, and travel charges require separate correction.',
    automated_scope:
      'Execute reviewed cancellation steps with separate verified travel, charge and communication outcomes.',
    manual_boundary:
      'Approve cause, notice, actual travel and financial treatment; review locked or unsupported changes.',
    integration:
      'ShiftCare shift reads/updates/cancel plus invoice/timesheet or invoiceable evidence; native communication handoff.',
    remaining_work_or_gate:
      'Add verified cleanup before cancellation where required. Cancelled shifts restrict later edits. Model cleanup-success/cancel-failure and block closure until required handoffs finish.',
    acceptance:
      'No untravelled charge remains incorrectly applied; partial or unknown outcomes stay open without duplicate dispatch.',
    workflow_families: ['W07', 'W13'],
    module: 'rostering',
  },
  {
    number: 16,
    title: 'Absence and replacement cover coordination',
    selection: 'C2',
    level: 'P',
    problem:
      'Sickness and departures trigger urgent reassignment, travel review and individual participant decisions across affected services.',
    automated_scope:
      'List disrupted services, prepare candidates, track offers/acceptance and each participant outcome.',
    manual_boundary:
      'Choose suitable cover and confirm worker acceptance and participant preference.',
    integration:
      'ShiftCare shifts/staff/leaves/qualifications; native job board/offers. Published job_board_postings is a possible later adapter.',
    remaining_work_or_gate:
      'Add shared cover-case dependencies and affected-service tracking. Keep offer and acceptance native until their adapters are accepted.',
    acceptance:
      'Each affected service has a verified arrangement or owned no-cover outcome, with required communication.',
    workflow_families: ['W08', 'W13'],
    module: 'rostering',
  },
  {
    number: 17,
    title: 'Factual absence histories',
    selection: 'L',
    level: 'P',
    problem:
      'Managers search roster and communication records to reconstruct when a worker was absent and which services were affected.',
    automated_scope: 'Assemble factual absence dates, affected services and authorized references.',
    manual_boundary: 'Management resolves disputed facts and all employment interpretation.',
    integration:
      'ShiftCare roster/leave/events plus approved staff-logged communication references.',
    remaining_work_or_gate:
      'Defer dedicated HR history until core absence coordination is accepted; define restricted access and corrections.',
    acceptance:
      'A source-linked history is visible only to authorized reviewers; it makes no performance conclusion.',
    workflow_families: ['W08'],
    module: 'rostering',
  },
  {
    number: 18,
    title: 'Document matching and filing',
    selection: 'C1',
    level: 'P',
    problem:
      'Files must be found across email and storage, matched to the right person and placed in the correct native location.',
    automated_scope:
      'Match reviewed originals and upload supported client documents with metadata and independent verification.',
    manual_boundary: 'Confirm person, signature/version, category and permitted visibility.',
    integration:
      'ShiftCare client documents/type/download APIs; approved download hosts. Staff filing stays an explicit handoff initially.',
    remaining_work_or_gate:
      'Validate actual document types, field/date formats and download hosts. Do not claim the adapter supports every staff file or image.',
    acceptance:
      'The correct original is verified under the correct native person, category and access setting.',
    workflow_families: ['W05'],
    module: 'documents',
  },
  {
    number: 19,
    title: 'Document completeness and attachment checks',
    selection: 'C1',
    level: 'F',
    problem:
      'Staff inspect records individually for paperwork and follow up emails referring to missing attachments.',
    automated_scope:
      'Compare configured required documents/attachments with complete available metadata and create specific exceptions.',
    manual_boundary:
      'Assess signature, authenticity and documents held outside the visible sources.',
    integration:
      'Graph attachments; ShiftCare client documents, staff_files and qualifications; approved requirement rules.',
    remaining_work_or_gate:
      'Add requirement matrices and complete-scope results. F covers presence/metadata checks, not proof that a valid agreement exists or is absent everywhere.',
    acceptance:
      'Missing, present and unreadable/unknown evidence remain distinct and generate the right follow-up.',
    workflow_families: ['W02', 'W05', 'W12'],
    module: 'documents',
  },
  {
    number: 20,
    title: 'Document date and expiry correction',
    selection: 'G',
    level: 'P',
    problem:
      'Plan and agreement dates can be confused, while incorrect metadata makes non-expiring documents appear expired.',
    automated_scope:
      'Prepare reviewed date/expiry corrections and verify accepted native metadata updates.',
    manual_boundary: 'Interpret document meaning and approve non-expiring classifications.',
    integration:
      'ShiftCare client document PUT and staff_qualifications PATCH; general staff-file edits need a supported method or native handoff.',
    remaining_work_or_gate:
      'Validate date/null/no-expiration response semantics. General staff-file expiry correction is not implemented in the current adapter.',
    acceptance:
      'Only evidence-backed corrections suppress false alerts; genuine expiries remain visible.',
    workflow_families: ['W05', 'W12'],
    module: 'documents',
  },
  {
    number: 21,
    title: 'Renewal and coordinator follow up',
    selection: 'C2',
    level: 'P',
    problem:
      'Genuine renewals and requests for updated dates, funding or supporting documents require repeated external chasing.',
    automated_scope:
      'Detect genuine due/missing evidence, schedule owned renewal/coordinator tasks and retain responses.',
    manual_boundary: 'Verify received documents, funding/date meaning and completion.',
    integration:
      'ShiftCare documents/qualifications/fund context and native expiry reminders; application schedules/Graph responses.',
    remaining_work_or_gate:
      'Reuse native reminder sending, repair metadata first, avoid duplicate alerts and implement missed-run recovery and escalation.',
    acceptance:
      'A due item creates one owned follow-up, remains open until checked and survives a missed schedule.',
    workflow_families: ['W05', 'W12', 'W13'],
    module: 'documents',
  },
  {
    number: 22,
    title: 'Invoice preparation checks',
    selection: 'C2',
    level: 'P',
    problem:
      'Staff compare service records individually and resolve coding, travel, tax-setting and unusual-invoice questions.',
    automated_scope:
      'Prepare period billing exceptions from actual attendance, notes and native invoiceable/invoice data.',
    manual_boundary:
      'Bookkeeper approves category, charge, tax and unusual treatment, then uses native export.',
    integration:
      'ShiftCare shifts/timesheets/progress_notes/invoices and published invoiceable_items; existing ShiftCare-Xero integration.',
    remaining_work_or_gate:
      'Add cursor-aware pre-invoice reads and agreed rules/cutoffs. Use native pricing rather than calculating care billing rates in the application.',
    acceptance:
      'Complete period evidence produces traceable exceptions; no duplicate invoice/export or false all-clear occurs.',
    workflow_families: ['W09', 'W10'],
    module: 'finance',
  },
  {
    number: 23,
    title: 'Special billing instructions and prepayments',
    selection: 'L',
    level: 'P',
    problem:
      'Advance payments and special arrangements depend on staff memory and scattered notes.',
    automated_scope:
      'Surface approved special instructions and verified Xero credit/prepayment references.',
    manual_boundary: 'Bookkeeper applies balances and approves accounting treatment.',
    integration:
      'Xero OAuth and read permissions for accounting evidence, linked by organization/ContactID; native references in ShiftCare.',
    remaining_work_or_gate:
      'Defer live balance integration until authorized Xero access and ID reconciliation are implemented. Do not create another ledger.',
    acceptance:
      'Current accounting evidence is linked without automatic credit allocation or balance invention.',
    workflow_families: ['W10'],
    module: 'finance',
  },
  {
    number: 24,
    title: 'Billing recipient verification',
    selection: 'L',
    level: 'P',
    problem: 'Plan-manager or payer changes may not reach staff before invoices are issued.',
    automated_scope:
      'Flag payer/contact changes and compare current recipient instructions with linked native records.',
    manual_boundary: 'Staff verify authority and effective payer changes before updating billing.',
    integration:
      'ShiftCare client/contact/invoice context; Xero contacts for full cross-system comparison.',
    remaining_work_or_gate:
      'Defer dedicated cross-system recipient automation; keep checks in existing onboarding/billing review until account mappings are verified.',
    acceptance:
      'A changed billing recipient has an authorized, effective instruction and verified native identity.',
    workflow_families: ['W02', 'W10'],
    module: 'finance',
  },
  {
    number: 25,
    title: 'Returned invoice resolution',
    selection: 'L',
    level: 'P',
    problem:
      'Staff locate rejected invoices, investigate reasons and coordinate corrections across records and conversations.',
    automated_scope:
      'Collect rejection correspondence, invoice/source references and correction ownership.',
    manual_boundary: 'Bookkeeper determines credit, correction or reissue and checks the result.',
    integration:
      'Graph/staff-logged rejection evidence and ShiftCare/Xero invoice IDs; rejection reason is not guaranteed by invoice status alone.',
    remaining_work_or_gate:
      'Defer a dedicated correction/reissue automation; reuse #3/#22 cases and native accounting actions first.',
    acceptance: 'The reason and corrected native outcome are linked without a duplicate invoice.',
    workflow_families: ['W02', 'W10', 'W13'],
    module: 'finance',
  },
  {
    number: 26,
    title: 'Payment follow up',
    selection: 'L',
    level: 'P',
    problem:
      "Calls, resending and payment checks require chasing, while unresolved invoices affect owners' cash planning.",
    automated_scope:
      'Build verified overdue/payment follow-up from the authoritative ledger and approved communication rules.',
    manual_boundary: 'Bookkeeper approves disputes, escalation and any collection action.',
    integration:
      'Xero invoice/payment status via new OAuth adapter; native ShiftCare due reminders where suitable.',
    remaining_work_or_gate:
      'Defer custom collection status until ledger IDs, tokens and reconciliation are accepted; do not treat a ShiftCare balance as verified Xero payment.',
    acceptance:
      'Paid invoices stop further chasing and ambiguous/reversed payment states stay reviewable.',
    workflow_families: ['W10', 'W13'],
    module: 'finance',
  },
  {
    number: 27,
    title: 'Pay period and employee checks',
    selection: 'L',
    level: 'P',
    problem:
      'Staff check run dates, employee lists and carried-over values; inactive workers or unexplained prior values need review.',
    automated_scope:
      'Check run periods, verified employee population and unexplained carried-over fields.',
    manual_boundary: 'Payroll confirms final-pay eligibility and the meaning of prior values.',
    integration:
      'ShiftCare staff/payroll fields plus the confirmed payroll platform API or approved export.',
    remaining_work_or_gate:
      'Defer payroll-side automation until the actual vendor/field mappings are known. Inactive ShiftCare access does not establish zero pay.',
    acceptance: 'Run dates/population reconcile and leavers needing final pay are retained.',
    workflow_families: ['W04', 'W11'],
    module: 'finance',
  },
  {
    number: 28,
    title: 'Timesheet hours and mileage reconciliation',
    selection: 'C2',
    level: 'P',
    problem:
      "Staff compare workers' hours and mileage with payroll inputs and investigate missing source timesheets.",
    automated_scope:
      'Check ShiftCare period completeness, actual hours and mileage units, then compare approved payroll input where available.',
    manual_boundary:
      'Payroll approves payable values and resolves discrepancies before native release.',
    integration:
      'ShiftCare timesheets/shifts/pay-item evidence; existing timesheet export and a confirmed payroll API/export for two-sided reconciliation.',
    remaining_work_or_gate:
      'First deliver source checks and reviewed handoff. Add two-sided comparison only against the real export/API; do not claim automated payroll reconciliation without it.',
    acceptance:
      'Missing timesheets never become zero pay; approved quantities and units trace to their source and period.',
    workflow_families: ['W09', 'W11'],
    module: 'finance',
  },
  {
    number: 29,
    title: 'Payroll adjustment tracking',
    selection: 'L',
    level: 'P',
    problem:
      'Adjustments, leave, back pay and first-job travel decisions must be recovered from notes and applied to the right period.',
    automated_scope:
      'Retain adjustment evidence, period, original/corrected values, approver and explanatory notes.',
    manual_boundary:
      'Payroll calculates and approves leave, back pay and travel treatment in the established payroll process.',
    integration:
      'Approved payroll export/API, leave evidence and restricted application adjustment records.',
    remaining_work_or_gate:
      'Keep calculations and native entry manual initially; support evidence through #28 rather than building an award/payroll engine.',
    acceptance:
      'Each applied adjustment has the correct period, authorization and verified native result.',
    workflow_families: ['W11'],
    module: 'finance',
  },
  {
    number: 30,
    title: 'Payroll completion handoffs',
    selection: 'L',
    level: 'N',
    problem:
      'Saving, finalizing and delivering payslips requires separate completion steps in the external payroll process.',
    automated_scope:
      'Track the preparation handoff and unresolved items in the supporting application.',
    manual_boundary:
      'Authorized payroll staff finalize the run, release payment and deliver payslips in the payroll platform.',
    integration:
      'Existing payroll process and native integration; no custom release connector is required.',
    remaining_work_or_gate:
      'Retain finalization and money movement in the established platform; a duplicate release workflow adds little benefit and substantial risk.',
    acceptance:
      'Preparation is handed off with evidence; payroll completion retains its own native approval trail.',
    workflow_families: ['W11'],
    module: 'finance',
  },
  {
    number: 31,
    title: 'Visit record and care exceptions',
    selection: 'C2',
    level: 'P',
    problem:
      'Missing notes, reported incomplete work, unusual durations and important events can be buried among routine records.',
    automated_scope:
      'Detect factual missing/invalid attendance or notes, duration differences and source-defined significant events.',
    manual_boundary: 'Supervisors investigate quality, care and employment concerns.',
    integration:
      'ShiftCare shifts/timesheets/progress_notes; care_plan_tasks reads can add validated task context.',
    remaining_work_or_gate:
      'Validate complete periods, staff-specific evidence and restricted access; task-specific completion comparisons need accepted source fields.',
    acceptance:
      'A factual exception cites its original record and owner without making a clinical or misconduct conclusion.',
    workflow_families: ['W09'],
    module: 'care',
  },
  {
    number: 32,
    title: 'Feedback complaint and safety follow through',
    selection: 'C2',
    level: 'P',
    problem:
      'Feedback calls, complaint histories, pending responses and safety follow-up require coordination across several sources.',
    automated_scope:
      'Schedule agreed feedback, retain authorized responses and track complaint/safety callbacks and corrective follow-up.',
    manual_boundary:
      'Managers handle safety, complaint outcomes and personnel decisions; urgent procedures remain active.',
    integration:
      'Staff-logged sources, Graph evidence and native record references; no automatic incident/complaint write is assumed.',
    remaining_work_or_gate:
      'Add restricted case fields, owners, follow-up schedule and explicit urgent escalation; avoid automatic clinical triage.',
    acceptance:
      'Every response/action has an accountable outcome; restricted information stays within permitted access.',
    workflow_families: ['W09', 'W13'],
    module: 'care',
  },
  {
    number: 33,
    title: 'Task completion handovers and escalation',
    selection: 'C1',
    level: 'F',
    problem:
      'Unconfirmed times, incomplete steps, routine questions and future plans depend on memory or return to the owners.',
    automated_scope:
      'Run configured assignment, deadline, handover and required-step completion checks automatically.',
    manual_boundary:
      'People perform tasks and management supplies delegated authority and actual coverage.',
    integration:
      'Shared application cases/actions/outbox; optional approved native action-item references.',
    remaining_work_or_gate:
      'Add parent-case dependencies, external notification outcomes and catch-up. Current native jobs can complete before their separate communication follow-up.',
    acceptance:
      'A parent case cannot close while any mandatory child outcome remains incomplete or uncertain.',
    workflow_families: ['W01', 'W02', 'W08', 'W13'],
    module: 'shared',
  },
  {
    number: 34,
    title: 'Operational outcome reporting',
    selection: 'L',
    level: 'F',
    problem:
      'Uncovered services, uneven demand, recurring costs and administration pressure complicate operating decisions.',
    automated_scope:
      'Generate factual period reports from complete case, enquiry and native service evidence.',
    manual_boundary: 'Management interprets staffing, cost and demand implications.',
    integration:
      'Read-only application/ShiftCare aggregates; use native financial reports unless ledger access is accepted.',
    remaining_work_or_gate:
      'Keep baseline pilot measures in core instrumentation; defer a dedicated reporting workflow until daily work is stable. No forecast model is proposed.',
    acceptance:
      'Reports state period, source completeness and actual outcomes; they make no unsupported savings or revenue claim.',
    workflow_families: ['W01', 'W08', 'W10'],
    module: 'shared',
  },
  {
    number: 35,
    title: 'Arrival visibility if the remaining gap is confirmed',
    selection: 'L',
    level: 'P',
    problem:
      'Participants interrupt the office to ask whether their worker is on the way or delayed.',
    automated_scope:
      'If a real native gap remains, show fresh consented ETA/status for the current assigned service.',
    manual_boundary: 'Approve access/consent and validate actual devices and withdrawal behaviour.',
    integration:
      'ShiftCare current roster plus verified service identities, browser location and routing provider.',
    remaining_work_or_gate:
      'Defer optional arrival work pending native-feature fit and device/privacy trials; continuous background tracking is not established.',
    acceptance:
      'Only permitted current service access sees fresh status; reassignment or stale updates withdraw it.',
    workflow_families: ['W14'],
    module: 'rostering',
  },
];
