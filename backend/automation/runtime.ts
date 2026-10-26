import { AutomationService } from './service';
import { AutomationStore } from './store';
import { ShiftCareOperations } from './shiftcare-operations';
import { DocumentOperations } from './document-operations';
import { NativeEvidenceCollector } from './collectors';
import { Microsoft365Mailbox, mailboxConfiguration } from './microsoft365';
import { EvidenceFiles } from './evidence';
import { configuration } from '../shiftcare/shiftcare.client';
import type { Data, Job } from './types';

export function createAutomationRuntime(options: { store?: AutomationStore; env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {}) {
  const env = options.env || process.env, fetchImpl = options.fetchImpl || fetch;
  const store = options.store || new AutomationStore({ env });
  const files = new EvidenceFiles(store), native = new ShiftCareOperations(env, fetchImpl), documents = new DocumentOperations(files, env, fetchImpl), collector = new NativeEvidenceCollector(env, fetchImpl);
  let mailbox: Microsoft365Mailbox;
  async function collect(job: Job): Promise<Data> {
    let result: Data = {};
    if (job.sourceKind === 'microsoft365' && job.payload.hasAttachments && mailboxConfiguration(env).configured) result = await mailbox.importAttachments(job.id, files);
    const ids = Array.isArray(result.fileIds || job.payload.fileIds) ? (result.fileIds || job.payload.fileIds) as string[] : [];
    if (ids.length && !job.payload.attachmentText) {
      const extracted = [];
      for (const id of ids.slice(0, 5)) extracted.push(await files.extract(id));
      result.attachmentText = extracted.map(file => `${file.name}\n${file.text || ''}`).join('\n').slice(0, 12000);
      result.attachmentExtraction = extracted.map(file => ({ id: file.id, method: file.extraction, originalHash: file.sha256 }));
    }
    if (job.payload.collectionRequired === true && configuration(env).configured && ['W09','W10','W11','W12'].includes(job.workflow)) Object.assign(result, await collector.collect({ ...job, payload: { ...job.payload, ...result } }));
    return result;
  }
  const service = new AutomationService(store, { ...native.registry(), ...documents.registry() }, () => new Date(), collect);
  mailbox = new Microsoft365Mailbox(service, env, fetchImpl);
  return { store, service, files, native, documents, collector, mailbox, registeredOperations: [...native.enabled(), ...documents.enabled()] };
}
