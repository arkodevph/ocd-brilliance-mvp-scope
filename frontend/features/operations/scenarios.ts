import type { ModuleId } from './catalogue';

export type Scenario = {
  person: string;
  subject: string;
  source: string;
  channel: string;
  fields: [string, string, string, string][];
  checks: string[];
  effects: string[];
  outcomes: string[];
  route: string;
};

export const MODULES: { id: ModuleId; label: string; description: string; icon: string }[] = [
  {
    id: 'intake',
    label: 'Intake & people',
    description: 'Enquiries, participant onboarding and worker readiness.',
    icon: 'people',
  },
  {
    id: 'documents',
    label: 'Documents & renewals',
    description: 'The right original, the right person and a clear follow-up.',
    icon: 'file',
  },
  {
    id: 'rostering',
    label: 'Rostering & cover',
    description: 'Bookings, travel, confirmations and service changes.',
    icon: 'calendar',
  },
  {
    id: 'finance',
    label: 'Finance & payroll',
    description: 'Complete source checks before the native financial process.',
    icon: 'finance',
  },
  {
    id: 'care',
    label: 'Care & feedback',
    description: 'Factual exceptions, restricted follow-up and human decisions.',
    icon: 'heart',
  },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Reviewed messages and evidence of what happened next.',
    icon: 'mail',
  },
  {
    id: 'shared',
    label: 'Ownership & reporting',
    description: 'Accountable handovers and checked operational outcomes.',
    icon: 'activity',
  },
];

const base = (module: ModuleId): Scenario => ({
  person: 'Olivia Hart',
  subject: 'Review the next operational step',
  source:
    'Fictional office record. Confirm the person, supporting source and next action before proceeding.',
  channel: 'Staff-logged sample',
  fields: [
    ['person', 'Person / record', 'Olivia Hart', 'Olivia Hart'],
    ['reference', 'Source reference', 'Not linked', 'SAMPLE-SC-101'],
  ],
  checks: [
    'The person and source record match',
    'The requested scope is clear',
    'The responsible reviewer has checked the evidence',
  ],
  effects: ['Prepare the checked office outcome'],
  outcomes: ['Record the required follow-through'],
  route:
    module === 'finance'
      ? 'office/finance'
      : module === 'rostering'
        ? 'office/schedule'
        : module === 'documents'
          ? 'office/agreements'
          : module === 'care'
            ? 'office/visits'
            : module === 'communications'
              ? 'office/inbox-tasks'
              : 'office/enquiries',
});

const examples: Record<number, Partial<Scenario>> = {
  1: {
    person: 'Ava Bennett',
    subject: 'Check coverage before full intake',
    source:
      'Website enquiry: Ava is requesting weekly domestic assistance in Joondalup, postcode 6027. Please check the configured sample area before asking for full intake paperwork.',
    channel: 'Website enquiry',
    fields: [
      ['postcode', 'Service postcode', 'Not checked', '6027'],
      ['coverage', 'Sample coverage rule', 'Not checked', 'Covered sample area'],
    ],
    checks: ['The service postcode is available', 'The sample coverage list is the current rule'],
    effects: [],
    outcomes: [],
    route: 'public/intake',
  },
  2: {
    person: 'Grace Miller',
    subject: 'Bring a referral into the shared queue',
    source:
      'Referral email: Grace is asking about domestic assistance in Duncraig. A second forwarded copy of the same message was received. Retain one enquiry with both source references.',
    channel: 'Demo inbox',
    fields: [
      ['identity', 'Original message identity', 'Unlinked', 'SAMPLE-MAIL-1044'],
      ['person', 'Enquiry', 'Not captured', 'Grace Miller · domestic assistance'],
    ],
    checks: ['The original message is retained', 'The duplicate refers to the same enquiry'],
    effects: ['Capture one sample enquiry and link its sources'],
    outcomes: [],
    route: 'office/enquiries',
  },
  3: {
    person: 'Owen Brooks',
    subject: 'Give an unanswered enquiry an owner',
    source:
      'Phone enquiry: Owen is available for a callback about community access. The record needs one responsible team and an agreed next step.',
    fields: [
      ['nextAction', 'Next action', 'Unassigned', 'Call to confirm preferred afternoon'],
      ['priority', 'Reviewed priority', 'Not assessed', 'Normal'],
    ],
    checks: ['The original request has been reviewed', 'The owner and deadline are appropriate'],
    effects: ['Record the sample assignment and deadline'],
    outcomes: ['Record the callback outcome'],
    route: 'office/enquiries/ENQ-1043',
  },
  4: {
    person: 'Ava Bennett',
    subject: 'Identify the missing intake information',
    source:
      'Intake scan: requested service and postcode are visible. A preferred contact address is missing. Do not infer the answer from an older document.',
    channel: 'Sample intake document',
    fields: [
      ['name', 'Participant name', 'Ava Bennett', 'Ava Bennett'],
      ['postcode', 'Service postcode', '6027', '6027'],
      ['contact', 'Preferred contact', 'Not supplied', ''],
    ],
    checks: ['Required-field rules are available', 'The original is readable'],
    effects: [],
    outcomes: [],
    route: 'office/intake/new',
  },
  5: {
    person: 'Ava Bennett',
    subject: 'Review participant onboarding',
    source:
      'Ava’s fictional intake requests domestic assistance on Tuesday mornings. Review the proposed basic profile. Activation, funding, service agreement and billing readiness remain separate checks.',
    channel: 'Sample intake document',
    fields: [
      ['name', 'Participant name', 'No matched profile', 'Ava Bennett'],
      ['service', 'Requested service', 'Not recorded', 'Domestic assistance'],
      ['postcode', 'Service postcode', 'Not recorded', '6027'],
    ],
    checks: [
      'The original intake and consent are checked',
      'Existing people were checked for a possible match',
      'The displayed basic fields are correct',
    ],
    effects: ['Save the approved sample participant fields'],
    outcomes: ['Verify agreement and required documents', 'Record the billing-readiness handoff'],
    route: 'office/intake/new',
  },
  6: {
    person: 'Sophie Nguyen',
    subject: 'Coordinate a new worker’s readiness',
    source:
      'Sample worker onboarding: Sophie has returned basic details. HR still needs to confirm screening and qualifications, access readiness and the payroll handoff.',
    channel: 'Sample worker form',
    fields: [
      ['name', 'Worker name', 'No matched staff profile', 'Sophie Nguyen'],
      ['role', 'Requested role', 'Not recorded', 'Support worker'],
      ['team', 'Sample team', 'Not recorded', 'Perth North · sample'],
    ],
    checks: [
      'The worker identity is confirmed',
      'Basic fields match the source',
      'HR retains employment and screening decisions',
    ],
    effects: ['Save approved sample staff fields'],
    outcomes: [
      'HR confirms screening and qualification checks',
      'Verify access and invitation outcome',
      'Record the payroll setup handoff',
    ],
    route: 'office/staff',
  },
  7: {
    subject: 'Review stage and service details',
    source:
      'Sample service review: the office proposes moving the participant stage after the current agreement is checked. Agreed service hours must retain their authoritative native source.',
    fields: [
      ['stage', 'Participant stage', 'Onboarding', 'Active'],
      ['agreement', 'Authoritative service reference', 'Not linked', 'SAMPLE-AGREEMENT-101'],
      ['effective', 'Effective date', 'Not reviewed', '2026-10-26'],
    ],
    checks: [
      'An authorized reviewer agrees to activation',
      'The agreement and effective date are checked',
      'Service hours retain their authoritative source',
    ],
    effects: ['Apply the approved sample stage transition'],
    outcomes: ['Confirm any required service and billing handoffs'],
  },
  8: {
    person: 'Ava Bennett',
    subject: 'Prepare an onboarding update',
    source:
      'The intake team needs a clear reply confirming the next onboarding step. Check the recipient, wording and attachments. Preparing a message does not establish that it was sent or received.',
    channel: 'Office correspondence request',
    fields: [
      ['recipient', 'Recipient', 'Not checked', 'ava.bennett@example.test'],
      [
        'message',
        'Message draft',
        'Not drafted',
        'Hi Ava, thank you for your enquiry. Please confirm your preferred contact details so we can complete the next onboarding step. Kind regards, OCD Brilliance.',
      ],
    ],
    checks: [
      'Recipient identity and authority are checked',
      'Wording and required attachments are reviewed',
    ],
    effects: ['Prepare the reviewed sample correspondence handoff'],
    outcomes: ['Record staff-checked message dispatch', 'Check the required communication outcome'],
    route: 'office/inbox-tasks',
  },
  9: {
    subject: 'Link communication evidence to the case',
    source:
      'A sample message has a sending reference but no confirmed response. Keep dispatch, failed delivery and a checked response as different states.',
    fields: [
      ['reference', 'Sending reference', 'Not linked', 'SAMPLE-SENT-101'],
      ['coverage', 'Accepted channel coverage', 'Unconfirmed', 'Demo mailbox only'],
    ],
    checks: [
      'The communication matches this exact case',
      'The channel evidence and its limits are understood',
    ],
    effects: ['Link the sample channel evidence'],
    outcomes: ['Record the required response or owned next action'],
    route: 'office/inbox-tasks',
  },
  10: {
    subject: 'Prepare a new domestic assistance visit',
    source:
      'Sample request: Olivia would like a two-hour morning visit. Check worker suitability, overlaps, leave and willingness; a free slot is not acceptance.',
    channel: 'Reviewed booking request',
    fields: [
      ['date', 'Occurrence date', 'Not booked', '2026-10-27'],
      ['time', 'Requested time', 'Not booked', '09:00–11:00'],
      ['worker', 'Proposed worker', 'Unassigned', 'Elena Cruz'],
    ],
    checks: [
      'Participant and exact time are confirmed',
      'Overlap, leave and qualification context are reviewed',
      'Worker suitability and willingness are confirmed',
    ],
    effects: ['Create the approved sample one-off booking'],
    outcomes: ['Check native worker acceptance', 'Confirm the participant’s arrangement'],
    route: 'office/schedule',
  },
  11: {
    subject: 'Move one visit to the agreed time',
    source:
      'Sample change request: move only the 27 October visit from 09:00 to 10:00. Do not change the recurring series or unrelated bookings.',
    channel: 'Participant change request',
    fields: [
      ['occurrence', 'Exact occurrence', '27 October · one visit', '27 October · one visit'],
      ['time', 'Visit time', '09:00–11:00', '10:00–12:00'],
    ],
    checks: [
      'The exact occurrence is confirmed',
      'Availability and participant agreement are checked',
      'Locked and series scope have been reviewed',
    ],
    effects: ['Update only the approved sample occurrence'],
    outcomes: [
      'Confirm the changed arrangement with the participant',
      'Check worker acceptance of the change',
    ],
    route: 'office/schedule',
  },
  12: {
    subject: 'Recheck travel after a roster change',
    source:
      'The proposed worker or preceding visit changed. The previous estimate must be treated as stale until verified inputs are rechecked. An estimate is not actual mileage or pay entitlement.',
    channel: 'Sample roster change',
    fields: [
      ['worker', 'Assigned worker', 'Previous worker', 'Elena Cruz'],
      ['origin', 'Preceding service', 'Old roster context', 'Sample preceding visit · Woodvale'],
      ['destination', 'Destination', 'Previous address', 'Sample service · Kingsley'],
    ],
    checks: [
      'The exact occurrence and addresses are checked',
      'The preceding visit and assigned worker are current',
    ],
    effects: [],
    outcomes: [],
    route: 'office/fees',
  },
  13: {
    subject: 'Apply approved visit instructions',
    source:
      'The coordinator proposes a reviewed access instruction for selected editable visits. Confirm its version, effective date and explicit occurrence list.',
    fields: [
      [
        'instructions',
        'Approved instructions',
        'Previous access instruction',
        'Please use the front entrance and ring the bell.',
      ],
      ['scope', 'Affected scope', 'Not selected', 'Selected sample occurrence only'],
    ],
    checks: [
      'Wording and visibility are approved',
      'The effective version and occurrences are checked',
      'Cancelled and locked visits are excluded',
    ],
    effects: ['Apply the approved sample instructions'],
    outcomes: ['Check the affected visits against the approved version'],
    route: 'office/schedule',
  },
  14: {
    subject: 'Match a reminder reply to the right visit',
    source:
      'Sample native reminder reply: “Yes, Tuesday morning works.” Match the sender, participant and exact occurrence. An unclear reply or silence must never cancel a booking.',
    channel: 'Native reply → demo inbox',
    fields: [
      ['sender', 'Sender match', 'Not matched', 'Olivia Hart · sample contact'],
      ['occurrence', 'Exact occurrence', 'Not matched', '2026-10-27 · 09:00–11:00'],
      ['response', 'Reviewed response', 'Unclassified', 'Confirmed'],
    ],
    checks: [
      'The sender is confidently matched',
      'One exact occurrence is identified',
      'The reply meaning is confirmed by the office',
    ],
    effects: ['Record the matched sample confirmation'],
    outcomes: [],
    route: 'office/automation',
  },
  15: {
    subject: 'Cancel the exact visit with complete follow-through',
    source:
      'Sample cancellation request for 27 October: the worker has not travelled. Review notice and financial treatment. Verify required travel cleanup before cancellation if cancelled records restrict later edits.',
    channel: 'Reviewed cancellation request',
    fields: [
      ['occurrence', 'Exact occurrence', 'Scheduled', '2026-10-27 · sample visit'],
      ['treatment', 'Reviewed treatment', 'Not reviewed', 'Sample: no untravelled mileage'],
      ['reason', 'Reason', 'Not recorded', 'Participant requested cancellation'],
    ],
    checks: [
      'The cause, notice and treatment are approved',
      'Actual travel evidence is checked',
      'The occurrence and native edit restrictions are checked',
    ],
    effects: [
      'Check and clear required sample travel values',
      'Cancel the approved sample occurrence',
    ],
    outcomes: [
      'Verify the required financial treatment',
      'Check the participant update outcome',
      'Check the assigned worker update outcome',
    ],
    route: 'office/schedule',
  },
  16: {
    subject: 'Arrange cover for an affected service',
    source:
      'Sample worker absence affects one visit. Prepare suitable cover, keep offers and acceptance distinct, and retain an owned no-cover outcome if no arrangement can be agreed.',
    channel: 'Staff-logged absence',
    fields: [
      ['service', 'Affected service', 'Original assignment', '2026-10-27 · Olivia Hart'],
      ['worker', 'Proposed replacement', 'No cover confirmed', 'Sophie Nguyen · sample candidate'],
    ],
    checks: [
      'All affected sample services are listed',
      'Candidate suitability and availability are checked',
      'The selected worker has accepted in the sample',
    ],
    effects: ['Save the accepted sample replacement assignment'],
    outcomes: [
      'Confirm participant preference and arrangement',
      'Check required worker and office updates',
    ],
    route: 'office/schedule',
  },
  17: {
    subject: 'Retain a factual absence reference',
    source:
      'Sample management request: retain factual absence dates and affected service references. Disputed facts and all employment interpretation remain with management.',
    fields: [
      ['date', 'Absence date', 'Not linked', '2026-10-27'],
      ['reference', 'Restricted source reference', 'Not linked', 'SAMPLE-ABSENCE-101'],
    ],
    checks: ['The factual source is checked', 'Management has confirmed permitted access'],
    effects: ['Retain the staff-checked native history reference'],
    outcomes: [],
    route: 'office/staff',
  },
  18: {
    subject: 'File the returned agreement under the correct person',
    source:
      'Sample returned agreement: confirm Olivia’s identity, original version, signature, document category and visibility before filing. Staff-file support remains an explicit native handoff where needed.',
    channel: 'Demo inbox attachment',
    fields: [
      ['person', 'Matched participant', 'Not matched', 'Olivia Hart · SAMPLE-SC-101'],
      ['file', 'Original document', 'Unfiled', 'sample-service-agreement-v2.pdf'],
      ['visibility', 'Reviewed visibility', 'Not set', 'Authorized office users'],
    ],
    checks: [
      'Person and original version are checked',
      'Signature, category and permitted visibility are reviewed',
      'The original file is retained',
    ],
    effects: ['File the approved sample original'],
    outcomes: ['Independently check the native filing result'],
    route: 'office/agreements',
  },
  19: {
    subject: 'Check the visible required-document set',
    source:
      'Sample metadata review: compare the configured required-document list against the complete available sample scope. Presence does not prove signature validity or authenticity.',
    channel: 'Scheduled metadata check',
    fields: [
      ['scope', 'Visible source scope', 'Not checked', 'Complete sample metadata'],
      ['requirements', 'Required-document rule', 'Not checked', 'Sample requirement matrix v1'],
    ],
    checks: ['The requirement matrix is available', 'All sample metadata pages are present'],
    effects: [],
    outcomes: [],
    route: 'office/agreements',
  },
  20: {
    person: 'Sophie Nguyen',
    subject: 'Review a false document-expiry alert',
    source:
      'A fictional qualification appears to have an incorrect expiry date. An authorized reviewer must interpret the original and approve the precise metadata correction. Genuine expiries must stay visible.',
    channel: 'Document exception',
    fields: [
      ['file', 'Native document reference', 'Not linked', 'SAMPLE-QUALIFICATION-201'],
      ['expiry', 'Evidence-backed expiry', 'Incorrect sample date', '2027-10-25'],
    ],
    checks: [
      'The original document and date meaning are checked',
      'The exact metadata field is supported in the sample',
      'No-expiry and visibility decisions are approved',
    ],
    effects: ['Apply the approved sample metadata correction'],
    outcomes: ['Recheck the corrected date and genuine renewal status'],
    route: 'office/staff',
  },
  21: {
    person: 'Sophie Nguyen',
    subject: 'Follow up a genuine renewal',
    source:
      'The sample credential needs a genuine renewal after its metadata has been checked. Assign an owner and deadline; do not create duplicate reminders. A received file still needs review.',
    channel: 'Scheduled renewal check',
    fields: [
      ['document', 'Renewal item', 'Due for review', 'Sample screening evidence'],
      [
        'nextAction',
        'Next action',
        'Unassigned',
        'Request current evidence and review the returned original',
      ],
    ],
    checks: [
      'A genuine due or missing item is confirmed',
      'Native reminders and existing tasks were checked',
    ],
    effects: ['Create one owned sample renewal follow-up'],
    outcomes: ['Verify the received original and filing result'],
    route: 'office/staff',
  },
  22: {
    person: 'Period review',
    subject: 'Prepare the Tuesday invoice exception list',
    source:
      'Review the fictional service period using actual attendance, notes and invoiceable context. The bookkeeper retains native category, price, tax, charge treatment and export approval.',
    channel: 'Scheduled billing review',
    fields: [
      ['period', 'Service period', 'Not reviewed', '2026-10-12 to 2026-10-25'],
      ['scope', 'Source completeness', 'Not checked', 'All sample source pages'],
    ],
    checks: [
      'Period boundaries and all pages are checked',
      'Attendance, notes and invoiceable context are available',
      'Bookkeeper ownership is confirmed',
    ],
    effects: ['Prepare the sample invoice exception list'],
    outcomes: ['Record the bookkeeper’s reviewed native export handoff'],
    route: 'office/finance',
  },
  23: {
    person: 'Bookkeeper review',
    subject: 'Check special billing and prepayment evidence',
    source:
      'Sample billing note mentions a prepayment. Verify the current credit in the authoritative ledger; do not invent a balance or allocate a credit in the supporting app.',
    fields: [
      ['reference', 'Verified ledger reference', 'Not linked', 'SAMPLE-XERO-REFERENCE'],
      [
        'instruction',
        'Reviewed instruction',
        'Unverified',
        'Bookkeeper to check the native balance and treatment',
      ],
    ],
    effects: ['Record the staff-checked accounting handoff'],
    outcomes: [],
    route: 'office/invoices',
  },
  24: {
    subject: 'Verify an effective payer change',
    source:
      'Sample email requests a new invoice recipient. Staff must verify authority and effective instructions against the linked native person and accounting contact.',
    fields: [
      [
        'recipient',
        'Reviewed billing recipient',
        'Previous recipient',
        'Authorized sample plan manager',
      ],
      ['reference', 'Authority reference', 'Not checked', 'SAMPLE-PAYER-INSTRUCTION-101'],
    ],
    effects: ['Retain the verified native billing recipient reference'],
    outcomes: [],
    route: 'office/invoices',
  },
  25: {
    subject: 'Resolve a returned invoice without duplication',
    source:
      'Sample invoice correspondence gives a rejection reason. The bookkeeper decides correction, credit or reissue in the established accounting process and checks the actual result.',
    fields: [
      ['invoice', 'Native invoice reference', 'Not linked', 'SAMPLE-INVOICE-101'],
      ['reason', 'Confirmed return reason', 'Not reviewed', 'Sample recipient mismatch'],
    ],
    effects: ['Record the checked native correction outcome'],
    outcomes: ['Check the required invoice correspondence'],
    route: 'office/invoices',
  },
  26: {
    subject: 'Check payment status before a follow-up',
    source:
      'Sample payment follow-up: verify the current ledger status before contacting the payer. Paid, disputed, reversed and unknown payment states need different treatment.',
    fields: [
      ['reference', 'Current ledger reference', 'Not linked', 'SAMPLE-LEDGER-101'],
      ['state', 'Staff-checked payment state', 'Unknown', 'Overdue sample invoice'],
    ],
    effects: ['Record the reviewed native payment follow-up'],
    outcomes: ['Check the required payer-contact outcome'],
    route: 'office/finance',
  },
  27: {
    person: 'Payroll review',
    subject: 'Check the pay period and employee population',
    source:
      'Sample pay-run preparation: confirm the real period and employee population, including leavers who may still be due final pay. Inactive access does not establish zero pay.',
    fields: [
      ['period', 'Pay period', 'Not checked', '2026-10-12 to 2026-10-25'],
      ['population', 'Employee population reference', 'Not checked', 'SAMPLE-PAYROLL-POPULATION'],
    ],
    effects: ['Retain the payroll reviewer’s checked source reference'],
    outcomes: [],
    route: 'office/payroll',
  },
  28: {
    person: 'Payroll review',
    subject: 'Check hours and actual mileage before handoff',
    source:
      'Sample fortnightly preparation: confirm complete ShiftCare timesheet evidence and actual mileage units. The payroll provider is unconfirmed; this first scope is source checks and a reviewed handoff.',
    channel: 'Scheduled payroll source check',
    fields: [
      ['period', 'Source period', 'Not checked', '2026-10-12 to 2026-10-25'],
      ['units', 'Reviewed quantities', 'Not reviewed', 'Actual hours and actual km'],
      [
        'payroll',
        'Payroll-side source',
        'Unconfirmed',
        'Native reviewer handoff · provider to confirm',
      ],
    ],
    checks: [
      'All sample timesheets and period boundaries are checked',
      'Actual hours and mileage units are reviewed',
      'Missing records are not treated as zero pay',
    ],
    effects: ['Prepare the reviewed sample source-check handoff'],
    outcomes: ['Payroll reviewer checks native input and unresolved discrepancies'],
    route: 'office/payroll',
  },
  29: {
    person: 'Payroll review',
    subject: 'Retain evidence for a native pay adjustment',
    source:
      'Sample adjustment request needs a period, original value, corrected value and approval. Payroll retains award interpretation and all pay calculations.',
    fields: [
      ['period', 'Adjustment period', 'Not linked', '2026-10-12 to 2026-10-25'],
      ['reference', 'Native adjustment reference', 'Not checked', 'SAMPLE-PAYROLL-ADJUSTMENT'],
    ],
    effects: ['Record the reviewed native adjustment outcome'],
    outcomes: [],
    route: 'office/payroll',
  },
  30: {
    person: 'Payroll team',
    subject: 'Hand reviewed preparation to authorized payroll',
    source:
      'The sample worksheet is ready for authorized native payroll review. Finalization, money movement and payslip delivery remain in the established payroll platform.',
    fields: [
      ['period', 'Preparation period', 'Draft reviewed', '2026-10-12 to 2026-10-25'],
      ['reference', 'Native payroll approval reference', 'Not checked', 'SAMPLE-PAYROLL-HANDOFF'],
    ],
    checks: [
      'Preparation and unresolved items are reviewed',
      'The authorized payroll owner receives the handoff',
    ],
    effects: ['Record the native payroll handoff reference'],
    outcomes: [],
    route: 'office/payroll',
  },
  31: {
    subject: 'Investigate a factual visit-record exception',
    source:
      'Sample visit evidence shows a missing note or a duration difference. Cite the source and assign a supervisor. The system must not make a clinical or misconduct conclusion.',
    channel: 'Visit-record check',
    fields: [
      ['visit', 'Source visit', 'Not linked', 'SAMPLE-VISIT-101'],
      ['exception', 'Factual exception', 'Not reviewed', 'Required visit note needs review'],
    ],
    checks: [
      'The period and staff-specific evidence are complete',
      'The factual exception cites its original record',
      'Restricted care details remain in the native record',
    ],
    effects: ['Create the owned sample factual exception'],
    outcomes: ['Supervisor checks the native record and records the outcome'],
    route: 'office/visits',
  },
  32: {
    subject: 'Keep a feedback callback and corrective action owned',
    source:
      'Fictional feedback requests an office callback. Retain only the operational follow-up here; sensitive detail and any native complaint or incident record remain appropriately restricted. Urgent concerns follow the existing human procedure immediately.',
    channel: 'Staff-logged feedback',
    fields: [
      ['callback', 'Required callback', 'Not assigned', 'Supervisor to contact the participant'],
      ['reference', 'Restricted native reference', 'Not linked', 'SAMPLE-RESTRICTED-101'],
    ],
    checks: [
      'A responsible supervisor is assigned',
      'Any immediate concern follows the human safety procedure',
      'Only permitted operational detail is recorded here',
    ],
    effects: ['Record the restricted sample follow-up ownership'],
    outcomes: [
      'Supervisor records the reviewed callback outcome',
      'Check the required corrective follow-through',
    ],
    route: 'office/visits',
  },
  33: {
    person: 'Office team',
    subject: 'Check completion and handover dependencies',
    source:
      'Run the configured sample owner, deadline and mandatory-outcome checks. A completed native action is not sufficient if a required communication, HR or financial outcome is still missing.',
    channel: 'Scheduled ownership check',
    fields: [
      ['scope', 'Checked case scope', 'Not checked', 'Current sample cases'],
      ['rule', 'Completion policy', 'Not checked', 'All mandatory outcomes require evidence'],
    ],
    checks: [
      'The configured owner and deadline rules are available',
      'Required child outcomes are included',
    ],
    effects: [],
    outcomes: [],
    route: 'office/work',
  },
  34: {
    person: 'Management',
    subject: 'Review factual outcomes for a complete period',
    source:
      'Later reporting concept: summarize actual sample case outcomes with their source completeness. No savings, revenue or forecasting claim is inferred from these fictional records.',
    fields: [
      ['period', 'Report period', 'Not selected', '2026-10-12 to 2026-10-25'],
      ['scope', 'Source completeness statement', 'Not checked', 'Sample application records only'],
    ],
    effects: ['Record the reviewed reporting handoff'],
    outcomes: [],
    route: 'office/overview',
  },
  35: {
    subject: 'Review whether an arrival gap remains',
    source:
      'Optional arrival concept: first establish whether native features already meet the need. Any custom estimate needs explicit consent, current service access, fresh inputs and withdrawal on reassignment. No device tracking is started by this prototype.',
    fields: [
      ['assignment', 'Current service', 'Not checked', 'Current assigned sample occurrence'],
      ['consent', 'Consent and device trial', 'Not accepted', 'Requires separate live acceptance'],
    ],
    checks: [
      'A real remaining native-feature gap is confirmed in the sample',
      'Consent, freshness and current-service access are reviewed',
      'Stale or reassigned access must be withdrawn',
    ],
    effects: ['Record the optional-feature review handoff'],
    outcomes: [],
    route: 'client/map',
  },
};

export function scenarioFor(number: number, module: ModuleId): Scenario {
  return { ...base(module), ...examples[number] };
}
