import type { Request, Response } from '../http';
import { catalog } from './catalog';
import { AutomationService, policy, presentJob } from './service';
import { AutomationStore } from './store';
import { AutomationError, object, string, type Data } from './types';
import { Microsoft365Mailbox, mailboxConfiguration } from './microsoft365';
import { configuration } from '../shiftcare/shiftcare.client';
import { ShiftCareOperations } from './shiftcare-operations';
import { createAutomationRuntime } from './runtime';
const {
  staffSession,
  staffRole,
  permits,
  originAllowed,
  secretEqual,
  ownerOptions,
} = require('../../lib/staff-auth.cjs');

function send(res: Response, status: number, value: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}
async function body(req: Request): Promise<Data> {
  const limit =
    new URL(req.url || '/', 'http://localhost').searchParams.get('action') === 'upload'
      ? 8 * 1024 * 1024
      : 200000;
  let value: unknown;
  if (req.body) value = req.body;
  else {
    let text = '';
    for await (const chunk of req) {
      text += chunk;
      if (Buffer.byteLength(text) > limit)
        throw new AutomationError(413, 'Workflow evidence exceeded the request limit.');
    }
    try {
      value = JSON.parse(text || '{}');
    } catch {
      throw new AutomationError(400, 'Supply a valid JSON object.');
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AutomationError(400, 'Supply a JSON object.');
  if (Buffer.byteLength(JSON.stringify(value)) > limit)
    throw new AutomationError(413, 'Workflow evidence exceeded the request limit.');
  return object(value);
}
export async function handleAutomation(req: Request, res: Response): Promise<void> {
  try {
    const url = new URL(req.url || '/', 'http://localhost'),
      action = url.searchParams.get('action') || 'status';
    if (!['GET', 'POST'].includes(req.method || ''))
      return send(res, 405, { error: 'Use GET or POST.' });
    const worker =
      req.method === 'POST' &&
      ['tick', 'ingest'].includes(action) &&
      (process.env.AUTOMATION_WORKER_TOKEN?.length || 0) >= 32 &&
      secretEqual(req.headers['x-ocd-automation-token'] || '', process.env.AUTOMATION_WORKER_TOKEN);
    if (!worker && !originAllowed(req))
      return send(res, 403, { error: 'Request origin is not allowed.' });
    const actor = worker ? 'Application worker' : staffSession(req);
    if (!actor) return send(res, 401, { error: 'Sign in to the office to use shared workflows.' });
    const permission =
      req.method === 'GET'
        ? 'read'
        : ['approve', 'execute', 'verify', 'schedule', 'close', 'restore-follow-ups'].includes(
              action,
            )
          ? 'approve'
          : 'write';
    if (!worker && !permits(actor, permission))
      return send(res, 403, { error: 'Your role does not permit this workflow action.' });
    const { store, native, service, documents, files, collector, mailbox, registeredOperations } =
      createAutomationRuntime();
    if (req.method === 'GET') {
      const state = await store.read();
      const visible = state.jobs
        .map(presentJob)
        .filter(
          (j) =>
            staffRole(actor) !== 'reader' ||
            !['W02', 'W03', 'W04', 'W05', 'W09', 'W10', 'W11', 'W12', 'W13'].includes(j.workflow),
        );
      if (action === 'status')
        return send(res, 200, {
          catalog,
          role: staffRole(actor),
          owner: actor,
          owners: ownerOptions(),
          storage: store.kind,
          timeZone: policy().timeZone,
          counts: Object.fromEntries(
            [...new Set(visible.map((j) => j.status))].map((status) => [
              status,
              visible.filter((j) => j.status === status).length,
            ]),
          ),
          overdue: visible.filter(
            (j) =>
              !['completed', 'rejected'].includes(j.status) &&
              j.dueAt &&
              Date.parse(j.dueAt) < Date.now(),
          ).length,
          schedules: state.schedules,
          connectors: {
            microsoft365: mailboxConfiguration(),
            shiftcare: {
              ...configuration(),
              readOnly: registeredOperations.length === 0,
              resources: [
                'clients',
                'staff',
                'shifts',
                'timesheets',
                'progress_notes',
                'invoices',
                'documents',
                'qualifications',
              ],
              registeredWriteOperations: registeredOperations,
            },
            communications: { mode: 'staff-native-handoff', automaticSending: false },
          },
        });
      if (action === 'jobs') {
        const page = Number(url.searchParams.get('page') || 1);
        if (!Number.isInteger(page) || page < 1 || page > 1000)
          throw new AutomationError(422, 'Choose a valid queue page.');
        const filtered = visible
          .filter(
            (j) =>
              (!url.searchParams.get('workflow') ||
                j.workflow === url.searchParams.get('workflow')) &&
              (!url.searchParams.get('status') || j.status === url.searchParams.get('status')),
          )
          .reverse();
        return send(res, 200, {
          jobs: filtered.slice((page - 1) * 20, page * 20),
          page,
          total: filtered.length,
          hasNext: page * 20 < filtered.length,
        });
      }
      if (action === 'job') {
        const job = visible.find((j) => j.id === url.searchParams.get('id'));
        if (!job) throw new AutomationError(404, 'Workflow case not found.');
        return send(res, 200, {
          job,
          followUps: (job.requiredChildren || []).map((link) => ({
            ...link,
            status: visible.find((child) => child.id === link.id)?.status || 'unavailable',
          })),
          files: (state.files || []).filter(
            (f) =>
              f.jobId === job.id ||
              (Array.isArray(job.payload.fileIds) && job.payload.fileIds.includes(f.id)),
          ),
        });
      }
      if (action === 'file') {
        const file = state.files?.find((f) => f.id === url.searchParams.get('id'));
        if (
          !file ||
          !visible.some(
            (j) =>
              j.id === file.jobId ||
              (Array.isArray(j.payload.fileIds) && j.payload.fileIds.includes(file.id)),
          )
        )
          throw new AutomationError(404, 'Evidence file not found.');
        const content = await files.get(file.id);
        res.writeHead(200, {
          'Content-Type': file.type,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(content.bytes);
        return;
      }
      if (action === 'document-types')
        return send(res, 200, {
          documentTypes: await collector.gateway.list('document_types', 'document_types'),
        });
      if (action === 'attachments') {
        if (!visible.some((j) => j.id === url.searchParams.get('id')))
          throw new AutomationError(404, 'Workflow case not found.');
        return send(res, 200, {
          attachments: await mailbox.attachments(string(url.searchParams.get('id'), 100)),
        });
      }
      return send(res, 404, { error: 'Unknown workflow query.' });
    }
    const data = await body(req);
    if (action === 'enqueue' || action === 'ingest')
      return send(res, 201, {
        job: await service.enqueue(worker ? data : { ...data, sourceKind: 'office-log' }, actor),
      });
    if (action === 'process' || action === 'tick') {
      const intakes = await service.syncIntakes(),
        schedules = await service.dueSchedules(),
        overdue = await service.followUpDeadlines();
      let mail: { imported: number; configured: boolean; error?: string } = {
        imported: 0,
        configured: mailboxConfiguration().configured,
      };
      if (data.pollMail === true) {
        try {
          mail = await mailbox.poll();
        } catch (_) {
          mail.error =
            'Mailbox import failed. Check Microsoft 365 access; other workflow checks still ran.';
        }
      }
      return send(res, 200, {
        intakes,
        schedules,
        overdue,
        mail,
        processed: await service.process(),
      });
    }
    if (action === 'schedule')
      return send(res, 200, { schedule: await service.schedule(data, actor) });
    const id = string(data.id, 100),
      revision = Number(data.revision);
    if (!id || !Number.isInteger(revision) || revision < 1)
      throw new AutomationError(422, 'Supply the current case and revision.');
    if (['approve', 'reject', 'revise'].includes(action))
      return send(res, 200, {
        job: await service.decide(id, revision, { ...data, action }, actor),
      });
    if (action === 'restore-follow-ups')
      return send(res, 200, { job: await service.restoreFollowUps(id, revision, actor) });
    if (action === 'assign')
      return send(res, 200, { job: await service.assign(id, revision, data, actor) });
    if (action === 'close')
      return send(res, 200, { job: await service.close(id, revision, data, actor) });
    if (['collect', 'upload', 'extract-file', 'import-attachments'].includes(action)) {
      const job = (await store.read()).jobs.find((j) => j.id === id);
      if (!job || job.revision !== revision)
        throw new AutomationError(409, 'Refresh the current case before collecting evidence.');
      if (
        !['blocked', 'needs_review', 'approved', 'awaiting_native', 'queued'].includes(job.status)
      )
        throw new AutomationError(
          409,
          'Resolve the dispatched outcome before changing source evidence.',
        );
      let payload: Data;
      if (action === 'collect') payload = await collector.collect(job);
      else if (action === 'import-attachments')
        payload = await mailbox.importAttachments(job.id, files);
      else {
        let fileId = string(data.fileId, 100);
        if (action === 'upload') {
          if (typeof data.content !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(data.content))
            throw new AutomationError(422, 'Supply the original file as base64.');
          const file = await files.save(
            job.id,
            string(data.name),
            string(data.type),
            Buffer.from(data.content, 'base64'),
            'Office original-file upload',
          );
          fileId = file.id;
        }
        const file = (await files.get(fileId)).file;
        if (
          file.jobId !== job.id &&
          !(Array.isArray(job.payload.fileIds) && job.payload.fileIds.includes(file.id))
        )
          throw new AutomationError(403, 'This file is not associated with the current case.');
        const fileIds = [
          ...new Set([...(Array.isArray(job.payload.fileIds) ? job.payload.fileIds : []), file.id]),
        ];
        payload = {
          fileIds,
          attachmentText: '',
          ...(job.workflow === 'W05' ? { fileId: file.id, documentName: file.name } : {}),
        };
      }
      // A queued case is already waiting for source preparation. All other states
      // go through the same revision-checked invalidation as a staff edit.
      if (job.status === 'queued') {
        await store.mutate((state) => {
          const current = state.jobs.find((j) => j.id === id)!;
          if (current.revision !== revision)
            throw new AutomationError(409, 'Case changed during collection.');
          current.payload = { ...current.payload, ...payload };
          current.revision++;
        });
      } else await service.decide(id, revision, { action: 'revise', payload }, actor);
      await service.process();
      return send(res, 200, { job: (await store.read()).jobs.find((j) => j.id === id) });
    }
    if (action === 'capture-native') {
      const job = (await store.read()).jobs.find((j) => j.id === id);
      if (!job) throw new AutomationError(404, 'Workflow case not found.');
      return send(res, 200, {
        job: await service.decide(
          id,
          revision,
          {
            action: 'revise',
            payload:
              job.workflow === 'W12' ? await documents.capture(job) : await native.capture(job),
          },
          actor,
        ),
      });
    }
    if (action === 'execute')
      return send(res, 200, { job: await service.execute(id, revision, actor) });
    if (action === 'verify')
      return send(res, 200, { job: await service.verify(id, revision, data, actor) });
    return send(res, 404, { error: 'Unknown workflow action.' });
  } catch (error) {
    if (error instanceof AutomationError) return send(res, error.status, { error: error.message });
    send(res, 503, {
      error:
        'The shared workflow service is unavailable. Check storage and connection configuration.',
    });
  }
}
