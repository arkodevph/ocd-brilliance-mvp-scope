export const workflowIds = [
  'W01',
  'W02',
  'W03',
  'W04',
  'W05',
  'W06',
  'W07',
  'W08',
  'W09',
  'W10',
  'W11',
  'W12',
  'W13',
  'W14',
] as const;
export type WorkflowId = (typeof workflowIds)[number];
export type Data = Record<string, unknown>;
export type JobStatus =
  | 'queued'
  | 'running'
  | 'blocked'
  | 'needs_review'
  | 'approved'
  | 'awaiting_native'
  | 'executing'
  | 'awaiting_verification'
  | 'reconciliation_required'
  | 'follow_up'
  | 'completed'
  | 'rejected';
export interface Proposal {
  summary: string;
  findings: string[];
  missing: string[];
  nextAction: string;
  effect: 'internal' | 'native' | 'delivery' | 'journey';
  operation: string;
  fields: Data;
}
export interface Job {
  id: string;
  workflow: WorkflowId;
  sourceId: string;
  sourceRevision: string;
  sourceKind: string;
  inputHash: string;
  payload: Data;
  owner: string;
  revision: number;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  policyVersion: string;
  attempts: number;
  availableAt: string;
  lease?: { token: string; until: string };
  dueAt?: string;
  escalatedAt?: string;
  proposal?: Proposal;
  proposalHash?: string;
  approval?: { by: string; at: string; hash: string };
  dispatch?: { id: string; at: string };
  receipt?: { method: string; reference: string; checkedBy?: string; at: string; details?: Data };
  followUpReviewRequired?: boolean;
  requiredChildren?: { id: string; label: string }[];
  history: { at: string; by: string; event: string }[];
}
export interface Schedule {
  id: string;
  workflow: WorkflowId;
  enabled: boolean;
  owner: string;
  cadence: 'daily' | 'weekly' | 'fortnightly';
  localTime: string;
  weekday: number;
  anchorDate: string;
  lastSlot?: string;
  periodDays?: number;
  includeCutoff?: boolean;
}
export interface State {
  revision: number;
  jobs: Job[];
  schedules: Schedule[];
  connectors: Record<
    string,
    { cursor?: string; lease?: { token: string; until: string }; updatedAt?: string }
  >;
  files?: StoredFile[];
  arrivals?: Record<string, Data>;
}
export interface StoredFile {
  id: string;
  jobId: string;
  name: string;
  type: string;
  size: number;
  sha256: string;
  createdAt: string;
  source: string;
  text?: string;
  extraction?: string;
}
export interface Policy {
  version: string;
  timeZone: string;
  postcodes: string[];
  documentNoticeDays: number;
  etaFreshSeconds: number;
  onboardingReady: boolean;
  intakePolicyVersion: string;
}
export class AutomationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export class NativeRejection extends AutomationError {}
export const object = (value: unknown): Data =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};
export const string = (value: unknown, limit = 200): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';
