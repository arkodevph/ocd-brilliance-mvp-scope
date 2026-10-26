import type { WorkflowId } from './types';

export const catalog: { id: WorkflowId; title: string; trigger: string; painPoints: string[]; nativeStep: string }[] = [
  { id: 'W01', title: 'Area screening and enquiry ownership', trigger: 'Server intake received', painPoints: ['A02', 'A03'], nativeStep: 'Confirm capacity before native referral acceptance' },
  { id: 'W02', title: 'Microsoft 365 email triage', trigger: 'New or changed authorised mailbox message', painPoints: ['A03'], nativeStep: 'Staff confirm person, invoice and downstream route' },
  { id: 'W03', title: 'Participant onboarding and profile updates', trigger: 'Reviewed intake or participant paperwork', painPoints: ['A01'], nativeStep: 'Reviewed client update; separate accounting check' },
  { id: 'W04', title: 'Worker onboarding and payroll handoff', trigger: 'Worker paperwork received', painPoints: ['A01'], nativeStep: 'Native staff setup, screening and payroll handoff' },
  { id: 'W05', title: 'Agreements and returned documents', trigger: 'Agreement due or returned document received', painPoints: ['A10'], nativeStep: 'Existing signing process and native document filing' },
  { id: 'W06', title: 'Reminder responses', trigger: 'Native reminder reply received', painPoints: ['A04', 'A11'], nativeStep: 'Keep native reminders; match one occurrence' },
  { id: 'W07', title: 'Cancellation review and execution', trigger: 'Exact cancellation request matched', painPoints: ['A04'], nativeStep: 'Check notice, charges and affected clients' },
  { id: 'W08', title: 'Booking changes and replacement cover', trigger: 'Change, sickness, decline or vacancy', painPoints: ['A05', 'A06'], nativeStep: 'Native matching, worker acceptance and roster update' },
  { id: 'W09', title: 'Visit and care exceptions', trigger: 'Visit evidence received or scheduled review', painPoints: ['A08'], nativeStep: 'Native care entry and office review' },
  { id: 'W10', title: 'Invoice exception review', trigger: 'Approved Tuesday cut-off or invoice query', painPoints: ['A09'], nativeStep: 'Bookkeeper approval and existing Xero export' },
  { id: 'W11', title: 'Payroll exception review', trigger: 'Approved pay-period cut-off or pay query', painPoints: ['A09'], nativeStep: 'Bookkeeper approval and existing payroll release' },
  { id: 'W12', title: 'Document cleanup and renewal follow-up', trigger: 'Expiry check or new evidence', painPoints: ['A07'], nativeStep: 'Evidence-based native document correction' },
  { id: 'W13', title: 'Communication and delivery follow-through', trigger: 'Verified outcome or message for review', painPoints: ['A11'], nativeStep: 'Approved channel and independently recorded delivery' },
  { id: 'W14', title: 'Arrival and journey freshness', trigger: 'Consented journey update', painPoints: ['A12', 'L01'], nativeStep: 'Verified assignment and permitted arrival visibility' },
];
