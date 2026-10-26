import crypto from 'node:crypto';
import { AutomationStore } from './store';
import { prepare, localDate } from './handlers';
import {
  AutomationError,
  NativeRejection,
  object,
  string,
  workflowIds,
  type Data,
  type Job,
  type Policy,
  type Schedule,
  type State,
  type WorkflowId,
} from './types';
const { IntakeRepository } = require('../../lib/intake-repository.cjs');
const { ownerOptions, intakeOwner } = require('../../lib/staff-auth.cjs');
const intakeRules = require('../../lib/intake-rules.cjs');

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Data)[k])}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export const hash = (value: unknown) =>
  crypto.createHash('sha256').update(canonical(value)).digest('hex');
export function policy(env = process.env): Policy {
  const intake = intakeRules.rules(env);
  const documentNoticeDays = Number(env.OCD_DOCUMENT_NOTICE_DAYS || 30),
    etaFreshSeconds = Number(env.OCD_ETA_FRESH_SECONDS || 90);
  if (
    !Number.isInteger(documentNoticeDays) ||
    documentNoticeDays < 1 ||
    documentNoticeDays > 180 ||
    !Number.isInteger(etaFreshSeconds) ||
    etaFreshSeconds < 30 ||
    etaFreshSeconds > 300
  )
    throw new AutomationError(503, 'Configure valid document notice and arrival freshness limits.');
  const result = {
    version: 'native-v2',
    timeZone: env.SHIFTCARE_TIME_ZONE || 'Australia/Perth',
    postcodes: (env.SERVICE_POSTCODES || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d{4}$/.test(s)),
    documentNoticeDays,
    etaFreshSeconds,
    onboardingReady: intakeRules.extractionAllowed(intake),
    intakePolicyVersion: hash(intake),
    writeOperations: env.OCD_SHIFTCARE_WRITE_OPERATIONS || '',
    cancellationPolicy: env.OCD_CANCELLATION_POLICY || '',
    portalPolicy: env.OCD_PORTAL_ACCOUNTS || '',
    complianceScope: env.OCD_COMPLIANCE_STAFF_IDS || '',
    extendedMappings: env.OCD_NATIVE_FIELD_MAPPINGS || '',
  };
  try {
    new Intl.DateTimeFormat('en', { timeZone: result.timeZone }).format();
  } catch {
    throw new AutomationError(503, 'Configure a valid account time zone.');
  }
  return { ...result, version: `native-v2:${hash(result).slice(0, 16)}` };
}
function touch(job: Job, event: string, by: string, now: Date): Job {
  job.revision++;
  job.updatedAt = now.toISOString();
  job.history.push({ at: job.updatedAt, by, event });
  return job;
}
function get(state: State, id: string, revision?: number): Job {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) throw new AutomationError(404, 'Workflow case not found.');
  if (revision !== undefined && job.revision !== revision)
    throw new AutomationError(409, 'This case changed. Refresh before acting.');
  return job;
}

export function presentJob(job: Job): Job {
  if (
    ['W07', 'W08'].includes(job.workflow) &&
    ['completed', 'follow_up'].includes(job.status) &&
    job.receipt &&
    !job.requiredChildren?.length
  )
    return { ...job, status: 'follow_up', followUpReviewRequired: true };
  return job;
}

export interface NativeOperation {
  preflight?(job: Job): Promise<void>;
  execute(job: Job): Promise<{ reference: string; details?: Data }>;
  verify(job: Job): Promise<{ matches: boolean; reference: string; details?: Data }>;
}
export class AutomationService {
  constructor(
    readonly store = new AutomationStore(),
    readonly operations: Record<string, NativeOperation> = {},
    readonly clock = () => new Date(),
    readonly collect?: (job: Job) => Promise<Data>,
  ) {}
  enqueueState(state: State, input: Data, actor: string): Job {
    const workflow = string(input.workflow) as WorkflowId;
    if (!workflowIds.includes(workflow))
      throw new AutomationError(422, 'Choose a workflow from W01–W14.');
    const sourceId = string(input.sourceId, 1024),
      sourceRevision = string(input.sourceRevision, 200) || '1';
    if (!sourceId)
      throw new AutomationError(422, 'Supply a stable source ID for duplicate prevention.');
    const payload = object(input.payload),
      owner = string(input.owner) || intakeOwner();
    if (!ownerOptions().some((o: { email: string }) => o.email === owner))
      throw new AutomationError(422, 'Assign a real configured office owner.');
    const inputHash = hash({
      payload,
      owner,
      sourceKind: string(input.sourceKind) || 'staff-submitted',
    });
    const existing = state.jobs.find(
      (j) =>
        j.workflow === workflow && j.sourceId === sourceId && j.sourceRevision === sourceRevision,
    );
    if (existing) {
      if (existing.inputHash !== inputHash)
        throw new AutomationError(
          409,
          'This source version already has different content. Revise the case or submit a new source version.',
        );
      return existing;
    }
    if (state.jobs.length >= 2000)
      throw new AutomationError(
        503,
        'The pilot queue reached its retention limit. Archive reviewed history before importing more cases.',
      );
    const now = this.clock();
    for (const older of state.jobs.filter(
      (j) =>
        j.workflow === workflow &&
        j.sourceId === sourceId &&
        !['completed', 'rejected', 'follow_up'].includes(j.status),
    )) {
      const dispatched = ['executing', 'awaiting_verification', 'reconciliation_required'].includes(
        older.status,
      );
      older.status = dispatched ? 'reconciliation_required' : 'blocked';
      if (!dispatched) older.approval = undefined;
      touch(
        older,
        'Source changed; this proposal is superseded. Review the latest case; reconcile any dispatched action.',
        actor,
        now,
      );
    }
    const job: Job = {
      id: crypto.randomUUID(),
      workflow,
      sourceId,
      sourceRevision,
      sourceKind: string(input.sourceKind) || 'staff-submitted',
      inputHash,
      payload,
      owner,
      revision: 1,
      status: 'queued',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      policyVersion: policy().version,
      attempts: 0,
      availableAt: now.toISOString(),
      history: [
        {
          at: now.toISOString(),
          by: actor,
          event: 'Source accepted into the shared server queue.',
        },
      ],
    };
    if (input.dueAt !== undefined) {
      const value = string(input.dueAt);
      if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
        throw new AutomationError(422, 'Supply a follow-up deadline with an explicit time zone.');
      job.dueAt = new Date(value).toISOString();
    }
    state.jobs.push(job);
    return job;
  }
  async enqueue(input: Data, actor: string): Promise<Job> {
    return this.store.mutate((state) => structuredClone(this.enqueueState(state, input, actor)));
  }
  async assign(id: string, revision: number, input: Data, actor: string): Promise<Job> {
    return this.store.mutate((state) => {
      const job = get(state, id, revision);
      if (['completed', 'rejected'].includes(job.status))
        throw new AutomationError(409, 'This case is closed; its ownership history is retained.');
      const owner = string(input.owner);
      if (!ownerOptions().some((o: { email: string }) => o.email === owner))
        throw new AutomationError(422, 'Choose a real configured owner.');
      const dueAt = input.dueAt === undefined ? job.dueAt : string(input.dueAt);
      if (
        dueAt &&
        (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(dueAt) || !Number.isFinite(Date.parse(dueAt)))
      )
        throw new AutomationError(422, 'Supply a deadline with a time-zone offset.');
      job.owner = owner;
      job.dueAt = dueAt ? new Date(dueAt).toISOString() : undefined;
      job.escalatedAt = undefined;
      if (job.status === 'approved' && !job.dispatch && !job.receipt) {
        job.approval = undefined;
        job.status = 'needs_review';
      }
      return structuredClone(
        touch(
          job,
          'Follow-up responsibility updated; saved native results and checked evidence were preserved.',
          actor,
          this.clock(),
        ),
      );
    });
  }
  private ensureFollowUps(state: State, job: Job, actor: string): void {
    job.status = 'follow_up';
    const context = object(job.payload.nativeContext);
    const clients = context.clients;
    const client = Array.isArray(clients) && clients.length === 1 ? object(clients[0]) : {};
    const staff =
      Array.isArray(context.staff) && context.staff.length === 1 ? object(context.staff[0]) : {};
    const workerId =
      job.workflow === 'W08'
        ? string(job.payload.workerId)
        : String(staff.id || staff.staff_id || '');
    const nextOwner = ownerOptions().some((o: { email: string }) => o.email === job.owner)
      ? job.owner
      : actor;
    job.requiredChildren = [
      {
        audience: 'participant',
        label: 'Participant communication',
        recipient: client.id ? `ShiftCare client ${client.id}` : '',
      },
      {
        audience: 'worker',
        label: 'Worker communication',
        recipient: workerId ? `ShiftCare staff ${workerId}` : '',
      },
    ].map((target) => {
      const existing = state.jobs.find(
        (child) =>
          child.workflow === 'W13' &&
          child.payload.outcomeJobId === job.id &&
          (child.payload.audience === target.audience ||
            (!child.payload.audience && target.audience === 'participant')),
      );
      const child =
        existing ||
        this.enqueueState(
          state,
          {
            workflow: 'W13',
            sourceId: `outcome:${job.id}:${target.audience}`,
            sourceKind: 'verified-outcome',
            owner: nextOwner,
            ...(job.dueAt ? { dueAt: job.dueAt } : {}),
            payload: {
              evidenceReference: `${job.receipt!.method}:${job.receipt!.reference}`,
              outcomeJobId: job.id,
              audience: target.audience,
              outcomeVerified: true,
              recipient: target.recipient,
              channel: 'native',
              message:
                'An update to your service has been checked by the office. Please contact us if you have questions.',
            },
          },
          actor,
        );
      return { id: child.id, label: target.label };
    });
    touch(
      job,
      'Native action verified. The business case remains open for required financial and participant/worker communication follow-through.',
      actor,
      this.clock(),
    );
  }
  async restoreFollowUps(id: string, revision: number, actor: string): Promise<Job> {
    return this.store.mutate((state) => {
      const job = get(state, id, revision);
      if (
        !['W07', 'W08'].includes(job.workflow) ||
        !['completed', 'follow_up'].includes(job.status) ||
        !job.receipt ||
        !['staff-manual', 'api-read-back'].includes(job.receipt.method)
      )
        throw new AutomationError(
          409,
          'Only a previously verified service action can enter follow-through review.',
        );
      if (job.requiredChildren?.length === 2) return structuredClone(job);
      this.ensureFollowUps(state, job, actor);
      return structuredClone(
        touch(
          job,
          'Opened required follow-through for a previously verified native action. Its original receipt and existing communication were preserved; no native action was repeated.',
          actor,
          this.clock(),
        ),
      );
    });
  }
  async close(id: string, revision: number, input: Data, actor: string): Promise<Job> {
    return this.store.mutate((state) => {
      const job = get(state, id, revision);
      if (job.status === 'completed' && job.requiredChildren?.length) return structuredClone(job);
      if (job.status !== 'follow_up' || !job.receipt || !job.requiredChildren?.length)
        throw new AutomationError(
          409,
          'Verify the native result before closing its business case.',
        );
      const incomplete = job.requiredChildren.filter((link) => {
        const child = state.jobs.find(
          (candidate) =>
            candidate.id === link.id &&
            candidate.workflow === 'W13' &&
            candidate.payload.outcomeJobId === job.id,
        );
        return (
          child?.status !== 'completed' ||
          !child.receipt?.details?.communicationReference ||
          !child.receipt.details.deliveryVerifiedBy
        );
      });
      if (incomplete.length)
        throw new AutomationError(
          409,
          'Complete and check every required participant and worker communication before case closure.',
        );
      if (job.workflow === 'W07') {
        if (job.payload.travelChecked !== true || !string(job.payload.travelReference, 1000)) {
          if (input.travelChecked !== true || !string(input.travelReference, 1000))
            throw new AutomationError(
              422,
              'This older cancellation needs a retrospective native travel/cleanup check and its reference before closure.',
            );
          job.receipt.details = {
            ...job.receipt.details,
            retrospectiveTravelReference: string(input.travelReference, 1000),
            retrospectiveTravelCheckedBy: actor,
          };
        }
        if (input.financialChecked !== true || !string(input.financialReference, 1000))
          throw new AutomationError(
            422,
            'Check the final cancellation charge/pay outcome and record its native reference or an explicit not-required explanation.',
          );
        job.receipt.details = {
          ...job.receipt.details,
          financialReference: string(input.financialReference, 1000),
          financialCheckedBy: actor,
          financialCheckedAt: this.clock().toISOString(),
        };
      }
      job.status = 'completed';
      return structuredClone(
        touch(
          job,
          'Business case closed after the native action and every required follow-through outcome were checked.',
          actor,
          this.clock(),
        ),
      );
    });
  }
  async syncIntakes(): Promise<number> {
    const repository = IntakeRepository.configured();
    if (!repository) return 0;
    const intakes = await repository.all();
    return this.store.mutate((state) => {
      let created = 0;
      for (const record of intakes) {
        const workflow: WorkflowId = record.status === 'Ready for ShiftCare' ? 'W03' : 'W01';
        // Entered/closed cases are owned by the existing verified intake handoff.
        if (['Entered in ShiftCare', 'Closed'].includes(record.status)) continue;
        const before = state.jobs.length;
        const id = `intake:${record.id}`;
        const fields = {
          ...Object.fromEntries(
            ['name', 'email', 'phone', 'service', 'suburb', 'postcode', 'notes'].map((k) => [
              k,
              record[k] || '',
            ]),
          ),
          ...object(record.onboarding?.fields),
        };
        this.enqueueState(
          state,
          {
            workflow,
            sourceId: id,
            sourceRevision: record.revision,
            sourceKind: 'server-intake',
            owner: record.owner || intakeOwner(),
            payload: {
              intakeId: record.id,
              evidenceReference: record.id,
              postcode: record.postcode,
              fields,
              text: string(record.onboarding?.sourceText, 12000),
              consent: Boolean(record.consentAt),
              nativeId: record.shiftCareId || '',
            },
          },
          'Intake collector',
        );
        if (state.jobs.length > before) created++;
      }
      return created;
    });
  }
  async claim(): Promise<Job | null> {
    const now = this.clock();
    return this.store.mutate((state) => {
      for (const job of state.jobs) {
        if (job.status === 'running' && job.lease && Date.parse(job.lease.until) <= now.getTime()) {
          job.status = 'queued';
          job.lease = undefined;
          touch(job, 'Preparation lease expired; queued for a safe recheck.', 'Worker', now);
        }
        if (
          job.status === 'executing' &&
          job.dispatch &&
          now.getTime() - Date.parse(job.dispatch.at) > 120000
        ) {
          job.status = 'reconciliation_required';
          touch(
            job,
            'Dispatch outcome is unknown. Check the native record before another action.',
            'Worker',
            now,
          );
        }
      }
      const job = state.jobs.find(
        (j) => j.status === 'queued' && Date.parse(j.availableAt) <= now.getTime(),
      );
      if (!job) return null;
      job.status = 'running';
      job.attempts++;
      job.lease = {
        token: crypto.randomUUID(),
        until: new Date(now.getTime() + 90000).toISOString(),
      };
      touch(job, 'Worker claimed the preparation step.', 'Worker', now);
      return structuredClone(job);
    });
  }
  async process(limit = 10): Promise<number> {
    let count = 0;
    while (count < Math.min(25, limit)) {
      const claimed = await this.claim();
      if (!claimed) break;
      const currentPolicy = policy();
      let payload = claimed.payload;
      if (this.collect) {
        try {
          payload = { ...payload, ...(await this.collect(claimed)) };
        } catch (error) {
          payload = {
            ...payload,
            collectionError:
              error instanceof AutomationError
                ? error.message
                : 'The source read failed. Review the original or try collecting again.',
            collectionRequired: true,
          };
        }
      }
      let proposal;
      try {
        proposal = prepare(claimed.workflow, payload, currentPolicy, this.clock());
      } catch (_) {
        proposal = {
          summary: 'Original evidence needs office review.',
          findings: [],
          missing: ['The source could not be parsed. Check the original and revise the evidence.'],
          nextAction: 'Review the original evidence.',
          effect: 'internal' as const,
          operation: 'review.record',
          fields: {},
        };
      }
      await this.store.mutate((state) => {
        const job = get(state, claimed.id);
        if (job.status !== 'running' || job.lease?.token !== claimed.lease?.token) return;
        job.payload = payload;
        job.proposal = proposal;
        job.policyVersion = currentPolicy.version;
        job.proposalHash = hash({
          inputHash: job.inputHash,
          payload: job.payload,
          proposal,
          policyVersion: job.policyVersion,
        });
        job.status = proposal.missing.length ? 'blocked' : 'needs_review';
        job.lease = undefined;
        touch(
          job,
          proposal.missing.length
            ? 'Preparation found missing evidence; office follow-up required.'
            : 'Prepared an evidence-based proposal for staff review.',
          'Worker',
          this.clock(),
        );
      });
      count++;
    }
    return count;
  }
  private async fresh(job: Job, checkPolicy = true): Promise<void> {
    if (checkPolicy && job.policyVersion !== policy().version)
      throw new AutomationError(
        409,
        'The account rules changed. Revise and recheck this proposal.',
      );
    if (job.sourceKind === 'server-intake') {
      const repository = IntakeRepository.configured(),
        record = repository && (await repository.get(string(job.payload.intakeId)));
      if (!record || record.revision !== job.sourceRevision)
        throw new AutomationError(
          409,
          'The original intake changed. Import its latest version before acting.',
        );
    }
  }
  async decide(id: string, revision: number, input: Data, actor: string): Promise<Job> {
    const snapshot = get(await this.store.read(), id, revision);
    await this.fresh(snapshot, input.action !== 'revise');
    return this.store.mutate((state) => {
      const job = get(state, id, revision);
      if (input.action === 'revise') {
        if (!['blocked', 'needs_review', 'approved', 'awaiting_native'].includes(job.status))
          throw new AutomationError(409, 'Resolve the pending outcome before revising this case.');
        const newer = state.jobs
          .slice(state.jobs.indexOf(job) + 1)
          .find((j) => j.workflow === job.workflow && j.sourceId === job.sourceId);
        if (newer) throw new AutomationError(409, 'A newer source case exists. Review that case.');
        job.payload = { ...job.payload, ...object(input.payload) };
        if (input.owner !== undefined) {
          if (!ownerOptions().some((o: { email: string }) => o.email === input.owner))
            throw new AutomationError(422, 'Choose a real configured owner.');
          job.owner = String(input.owner);
        }
        if (input.dueAt !== undefined) {
          const deadline = string(input.dueAt);
          if (
            deadline &&
            (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(deadline) || !Number.isFinite(Date.parse(deadline)))
          )
            throw new AutomationError(422, 'Supply a deadline with a time-zone offset.');
          job.dueAt = deadline ? new Date(deadline).toISOString() : undefined;
          job.escalatedAt = undefined;
        }
        job.status = 'queued';
        job.approval = undefined;
        job.proposal = undefined;
        job.proposalHash = undefined;
        return structuredClone(
          touch(
            job,
            'Staff revised the evidence; prior approval invalidated.',
            actor,
            this.clock(),
          ),
        );
      }
      if (input.action === 'reject') {
        if (!['blocked', 'needs_review', 'approved', 'awaiting_native'].includes(job.status))
          throw new AutomationError(409, 'Resolve a dispatched action before rejecting this case.');
        job.status = 'rejected';
        job.approval = undefined;
        return structuredClone(
          touch(
            job,
            `Rejected: ${string(input.reason, 1000) || 'Office review'}`,
            actor,
            this.clock(),
          ),
        );
      }
      if (job.status !== 'needs_review' || !job.proposal || !job.proposalHash)
        throw new AutomationError(
          409,
          'This case is not ready for approval. Resolve the missing evidence first.',
        );
      if (input.sourceReviewed !== true || input.proposalHash !== job.proposalHash)
        throw new AutomationError(422, 'Review and confirm this exact source and proposal.');
      job.approval = { by: actor, at: this.clock().toISOString(), hash: job.proposalHash };
      job.status = 'approved';
      return structuredClone(
        touch(job, 'Staff approved this exact proposal and rule version.', actor, this.clock()),
      );
    });
  }
  async execute(id: string, revision: number, actor: string): Promise<Job> {
    const snapshot = get(await this.store.read(), id, revision);
    await this.fresh(snapshot);
    if (
      snapshot.status !== 'approved' ||
      !snapshot.proposal ||
      snapshot.approval?.hash !== snapshot.proposalHash
    )
      throw new AutomationError(409, 'Approve the current proposal before execution.');
    try {
      await this.operations[snapshot.proposal.operation]?.preflight?.(snapshot);
    } catch (error) {
      return this.store.mutate((state) => {
        const job = get(state, id, revision);
        job.status = 'blocked';
        job.approval = undefined;
        const message =
          error instanceof AutomationError
            ? error.message
            : 'Current native evidence could not be verified. Check the connection and source.';
        job.proposal!.missing.push(message);
        return structuredClone(
          touch(job, `Preflight stopped before any native write: ${message}`, actor, this.clock()),
        );
      });
    }
    const ready = await this.store.mutate((state) => {
      const job = get(state, id, revision);
      if (job.status !== 'approved' || !job.proposal || job.approval?.hash !== job.proposalHash)
        throw new AutomationError(409, 'Approve the current proposal before execution.');
      if (job.proposal.effect === 'internal') {
        job.status = 'completed';
        job.receipt = {
          method: 'application-review',
          reference: job.id,
          checkedBy: actor,
          at: this.clock().toISOString(),
        };
        touch(
          job,
          'Application review recorded. No native roster action, financial export or pay release is implied.',
          actor,
          this.clock(),
        );
        if (
          job.workflow === 'W02' &&
          workflowIds.includes(job.proposal.fields.suggestedWorkflow as WorkflowId)
        ) {
          const reply = object(job.proposal.fields.replyCandidate);
          this.enqueueState(
            state,
            {
              workflow: job.proposal.fields.suggestedWorkflow,
              sourceId: `triage:${job.id}`,
              owner: job.owner,
              sourceKind: 'reviewed-mail',
              dueAt: job.dueAt,
              payload: {
                ...object(job.proposal.fields.extracted),
                evidenceReference: job.sourceId,
                messageId: job.payload.messageId,
                subject: job.payload.subject,
                text: job.payload.text,
                attachmentText: job.payload.attachmentText,
                fileIds: job.payload.fileIds,
                sourceMailJobId: job.id,
                matchCandidates: job.payload.matchCandidates,
                fields: job.proposal.fields.extracted,
                shiftId: job.payload.shiftId || reply.shiftId || '',
                response: reply.response || '',
                recipient: job.payload.sender || '',
              },
            },
            actor,
          );
        }
        if (
          job.workflow === 'W06' &&
          ['no', 'cancel', 'change'].includes(string(job.proposal.fields.response))
        ) {
          this.enqueueState(
            state,
            {
              workflow: job.proposal.fields.response === 'change' ? 'W08' : 'W07',
              sourceId: `reply:${job.id}`,
              owner: job.owner,
              sourceKind: 'reviewed-reply',
              payload: {
                evidenceReference: job.sourceId,
                shiftId: job.proposal.fields.shiftId,
                reason: job.proposal.fields.reason,
              },
            },
            actor,
          );
        }
        return structuredClone(job);
      }
      if (!this.operations[job.proposal.operation]) {
        job.status = 'awaiting_native';
        return structuredClone(
          touch(
            job,
            'Supported application write adapter is not configured. Perform the reviewed native step and record a checked reference.',
            actor,
            this.clock(),
          ),
        );
      }
      const targetKey = (candidate: Job): string => {
        if (['W07', 'W08'].includes(candidate.workflow))
          return `shift:${candidate.payload.shiftId}`;
        if (!['W03', 'W04'].includes(candidate.workflow)) return candidate.id;
        const resource = candidate.workflow === 'W03' ? 'client' : 'staff';
        if (candidate.payload.nativeId) return `${resource}:${candidate.payload.nativeId}`;
        const fields = object(candidate.proposal?.fields.fields);
        return `${resource}:new:${hash(candidate.workflow === 'W03' ? { firstName: string(fields.firstName) || string(fields.name), familyName: string(fields.familyName), dob: string(fields.dob) } : { email: string(fields.email).toLowerCase() })}`;
      };
      if (
        state.jobs.some(
          (other) =>
            other.id !== job.id &&
            ['executing', 'awaiting_verification', 'reconciliation_required'].includes(
              other.status,
            ) &&
            targetKey(other) === targetKey(job),
        )
      ) {
        job.status = 'blocked';
        job.approval = undefined;
        job.proposal.missing.push(
          'Another case is acting on this native target or identity. Resolve that outcome and refresh the native evidence first.',
        );
        return structuredClone(
          touch(
            job,
            'Prevented concurrent dispatches for the same native target or new identity.',
            actor,
            this.clock(),
          ),
        );
      }
      job.status = 'executing';
      job.dispatch = { id: crypto.randomUUID(), at: this.clock().toISOString() };
      return structuredClone(
        touch(
          job,
          'Persisted dispatch before calling the registered operation.',
          actor,
          this.clock(),
        ),
      );
    });
    if (ready.status !== 'executing') return ready;
    try {
      const receipt = await this.operations[ready.proposal!.operation].execute(ready);
      return this.store.mutate((state) => {
        const job = get(state, id);
        if (job.status !== 'executing' || job.dispatch?.id !== ready.dispatch?.id)
          return structuredClone(job);
        job.status = 'awaiting_verification';
        job.receipt = { method: 'api-dispatch', ...receipt, at: this.clock().toISOString() };
        return structuredClone(
          touch(
            job,
            'Dispatch returned; independent native read-back is required.',
            actor,
            this.clock(),
          ),
        );
      });
    } catch (error) {
      return this.store.mutate((state) => {
        const job = get(state, id);
        if (error instanceof NativeRejection) {
          job.status = 'blocked';
          job.approval = undefined;
          job.proposal!.missing.push(error.message);
          return structuredClone(
            touch(
              job,
              'Native API returned a definite rejection; refresh evidence and obtain a new approval before another attempt.',
              actor,
              this.clock(),
            ),
          );
        }
        job.status = 'reconciliation_required';
        return structuredClone(
          touch(
            job,
            'Dispatch did not return a definite result. Reconcile the native outcome; do not resend automatically.',
            actor,
            this.clock(),
          ),
        );
      });
    }
  }
  async verify(id: string, revision: number, input: Data, actor: string): Promise<Job> {
    const snapshot = get(await this.store.read(), id, revision);
    if (
      !['awaiting_native', 'awaiting_verification', 'reconciliation_required'].includes(
        snapshot.status,
      )
    )
      throw new AutomationError(409, 'This case has no native outcome to verify.');
    if (!snapshot.approval || snapshot.approval.hash !== snapshot.proposalHash)
      throw new AutomationError(
        409,
        'This proposal’s approval is no longer valid. Reconcile it with the office.',
      );
    if (
      ['W03', 'W04'].includes(snapshot.workflow) &&
      (input.accountingChecked !== true || !string(input.accountingReference, 1000))
    )
      throw new AutomationError(
        422,
        'Record the separate checked accounting/payroll handoff, or an explicit not-required explanation.',
      );
    if (
      snapshot.workflow === 'W08' &&
      snapshot.payload.payGroupId &&
      input.payGroupChecked !== true
    )
      throw new AutomationError(
        422,
        'Check the native pay group separately; the shift read-back does not expose that field.',
      );
    if (
      snapshot.workflow === 'W13' &&
      (input.communicationChecked !== true || !string(input.communicationReference, 1000))
    )
      throw new AutomationError(
        422,
        'Complete the actual communication in ShiftCare and record its checked history reference. A follow-up task alone is not delivery evidence.',
      );
    let receipt: Job['receipt'];
    const operation = snapshot.proposal && this.operations[snapshot.proposal.operation];
    if (operation) {
      const result = await operation.verify(
        snapshot.receipt || !input.reference
          ? snapshot
          : {
              ...snapshot,
              receipt: {
                method: 'staff-reconciliation-candidate',
                reference: string(input.reference, 1000),
                at: this.clock().toISOString(),
              },
            },
      );
      if (!result.matches)
        throw new AutomationError(
          409,
          'Native read-back did not match the approved proposal. Reconcile the result.',
        );
      receipt = {
        method: 'api-read-back',
        reference: result.reference,
        details: {
          ...result.details,
          accountingReference: string(input.accountingReference, 1000),
          ...(snapshot.workflow === 'W08' ? { payGroupCheckedBy: actor } : {}),
          ...(snapshot.workflow === 'W13'
            ? {
                communicationReference: string(input.communicationReference, 1000),
                deliveryVerifiedBy: actor,
                deliveryEvidence: 'staff-native-communication',
              }
            : {}),
        },
        checkedBy: actor,
        at: this.clock().toISOString(),
      };
    } else {
      if (input.nativeChecked !== true || !string(input.reference, 1000))
        throw new AutomationError(422, 'Check the actual native outcome and supply its reference.');
      receipt = {
        method: 'staff-manual',
        reference: string(input.reference, 1000),
        details: {
          accountingReference: string(input.accountingReference, 1000),
          note: string(input.note, 2000),
          ...(snapshot.workflow === 'W13'
            ? {
                communicationReference: string(input.communicationReference, 1000),
                deliveryVerifiedBy: actor,
                deliveryEvidence: 'staff-native-communication',
              }
            : {}),
        },
        checkedBy: actor,
        at: this.clock().toISOString(),
      };
    }
    const completed = await this.store.mutate((state) => {
      const job = get(state, id, revision);
      job.receipt = receipt;
      job.status = 'completed';
      if (['W07', 'W08'].includes(job.workflow)) this.ensureFollowUps(state, job, actor);
      return structuredClone(
        touch(
          job,
          receipt?.method === 'staff-manual'
            ? 'Staff recorded a checked native outcome; this is not an API read-back.'
            : 'Independent native read-back matched the approved proposal.',
          actor,
          this.clock(),
        ),
      );
    });
    if (completed.workflow !== 'W03' || completed.sourceKind !== 'server-intake') return completed;
    let linked = false;
    try {
      const repository = IntakeRepository.configured();
      const record = repository && (await repository.get(string(completed.payload.intakeId)));
      if (
        record &&
        /^\d+$/.test(receipt!.reference) &&
        record.revision === completed.sourceRevision &&
        record.status === 'Ready for ShiftCare' &&
        record.onboarding?.reviewedAt
      ) {
        const originalRevision = record.revision;
        record.status = 'Entered in ShiftCare';
        record.shiftCareId = receipt!.reference;
        record.revision = crypto.randomUUID();
        record.updatedAt = this.clock().toISOString();
        record.shiftCareVerification = {
          method: receipt!.method,
          verifiedBy: actor,
          verifiedAt: record.updatedAt,
          reviewedAt: record.onboarding.reviewedAt,
          nativeWriteFields: completed.proposal?.fields.nativeWriteFields,
          automationJobId: completed.id,
          accountingReference: string(input.accountingReference, 1000),
        };
        record.history.unshift({
          at: record.updatedAt,
          by: actor,
          event: `Basic native profile linked from shared workflow ${completed.id}; verification: ${receipt!.method}. Service/funding setup remains separate.`,
        });
        await repository.set(record, originalRevision);
        linked = true;
      }
    } catch (_) {
      /* Preserve the verified native receipt; surface a failed local link separately. */
    }
    return this.store.mutate((state) => {
      const job = get(state, completed.id);
      job.receipt!.details = {
        ...job.receipt!.details,
        originalIntakeLink: linked ? 'linked' : 'office_review_required',
      };
      return structuredClone(
        touch(
          job,
          linked
            ? 'Linked the checked basic profile to the unchanged original intake.'
            : 'Native receipt preserved; the original intake changed or could not be linked. Office must reconcile the local handoff.',
          actor,
          this.clock(),
        ),
      );
    });
  }
  async schedule(input: Data, actor: string): Promise<Schedule> {
    const workflow = string(input.workflow) as WorkflowId,
      cadence = string(input.cadence) as Schedule['cadence'];
    if (
      !['W09', 'W10', 'W11', 'W12'].includes(workflow) ||
      !['daily', 'weekly', 'fortnightly'].includes(cadence)
    )
      throw new AutomationError(
        422,
        'Configure a care, invoice, payroll or document review schedule.',
      );
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(string(input.localTime)) ||
      !Number.isInteger(input.weekday) ||
      Number(input.weekday) < 0 ||
      Number(input.weekday) > 6
    )
      throw new AutomationError(422, 'Supply a valid local time and weekday (0–6).');
    const anchorDate = string(input.anchorDate);
    if (
      cadence === 'fortnightly' &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate) ||
        !Number.isFinite(Date.parse(`${anchorDate}T00:00:00Z`)) ||
        new Date(`${anchorDate}T00:00:00Z`).toISOString().slice(0, 10) !== anchorDate)
    )
      throw new AutomationError(422, 'Confirm the payroll period’s anchor date.');
    const owner = string(input.owner) || actor;
    if (!ownerOptions().some((o: { email: string }) => o.email === owner))
      throw new AutomationError(422, 'Choose a real office owner.');
    return this.store.mutate((state) => {
      const existing = state.schedules.find((s) => s.workflow === workflow);
      if (
        input.periodDays !== undefined &&
        (!Number.isInteger(Number(input.periodDays)) ||
          Number(input.periodDays) < 1 ||
          Number(input.periodDays) > 31)
      )
        throw new AutomationError(422, 'Choose 1–31 days for the approved review period.');
      const schedule: Schedule = {
        id: existing?.id || crypto.randomUUID(),
        workflow,
        cadence,
        owner,
        localTime: string(input.localTime),
        weekday: Number(input.weekday),
        anchorDate,
        enabled: input.enabled === true,
        lastSlot: existing?.lastSlot,
        periodDays:
          input.periodDays !== undefined ? Number(input.periodDays) : existing?.periodDays,
        includeCutoff: input.includeCutoff === true,
      };
      if (existing) Object.assign(existing, schedule);
      else state.schedules.push(schedule);
      return structuredClone(schedule);
    });
  }
  async dueSchedules(): Promise<number> {
    const now = this.clock(),
      rules = policy(),
      today = localDate(now, rules.timeZone);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: rules.timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
    const time = `${parts.hour}:${parts.minute}`,
      weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    return this.store.mutate((state) => {
      let count = 0;
      for (const schedule of state.schedules.filter(
        (s) => s.enabled && s.lastSlot !== today && s.localTime <= time,
      )) {
        if (schedule.cadence !== 'daily' && schedule.weekday !== weekday) continue;
        if (schedule.cadence === 'fortnightly') {
          const days =
            (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${schedule.anchorDate}T00:00:00Z`)) /
            86400000;
          if (days < 0 || days % 14 !== 0) continue;
        }
        const endDay = new Date(
          Date.parse(`${today}T00:00:00Z`) - (schedule.includeCutoff ? 0 : 86400000),
        );
        const period = schedule.periodDays
          ? {
              cutOffDate: today,
              from: new Date(endDay.getTime() - (schedule.periodDays - 1) * 86400000)
                .toISOString()
                .slice(0, 10),
              to: endDay.toISOString().slice(0, 10),
            }
          : { cutOffDate: today };
        this.enqueueState(
          state,
          {
            workflow: schedule.workflow,
            sourceId: `schedule:${schedule.id}:${today}`,
            sourceKind: 'scheduled-review',
            owner: schedule.owner,
            payload: { evidenceReference: `schedule:${today}`, period, collectionRequired: true },
          },
          'Scheduler',
        );
        schedule.lastSlot = today;
        count++;
      }
      return count;
    });
  }
  async followUpDeadlines(): Promise<number> {
    return this.store.mutate((state) => {
      let count = 0;
      for (const job of state.jobs) {
        if (
          ['completed', 'rejected'].includes(job.status) ||
          !job.dueAt ||
          job.escalatedAt ||
          Date.parse(job.dueAt) > this.clock().getTime()
        )
          continue;
        job.escalatedAt = this.clock().toISOString();
        touch(
          job,
          'Follow-up deadline passed. The owner must contact the relevant person or arrange an alternative in ShiftCare.',
          'Application worker',
          this.clock(),
        );
        count++;
      }
      return count;
    });
  }
}
