import crypto from 'node:crypto';
import { configuration } from '../shiftcare/shiftcare.client';
import { EvidenceFiles } from './evidence';
import { ShiftCareGateway, nativeId, unwrap } from './shiftcare-gateway';
import { AutomationError, object, string, type Data, type Job } from './types';
import { hash, type NativeOperation } from './service';

export class DocumentOperations {
  readonly gateway: ShiftCareGateway;
  constructor(readonly files: EvidenceFiles, readonly env = process.env, readonly fetchImpl: typeof fetch = fetch) { this.gateway = new ShiftCareGateway(env, fetchImpl); }
  enabled(): string[] {
    if (!configuration(this.env).configured) return [];
    return (this.env.OCD_SHIFTCARE_WRITE_OPERATIONS || '').split(',').map(s => s.trim()).filter(s => ['document.file','document.metadata','qualification.expiry','communication.handoff'].includes(s));
  }
  private async document(job: Job, id = job.payload.documentId): Promise<Data> {
    const docs = await this.gateway.list(`clients/${nativeId(job.payload.nativeId)}/documents`, 'documents');
    const doc = docs.find(d => String(d.id) === nativeId(id));
    if (!doc) throw new AutomationError(404, 'The document does not belong to this client or is not visible.');
    return doc;
  }
  async capture(job: Job): Promise<Data> {
    let record: Data;
    if (job.proposal?.operation === 'qualification.expiry' || job.payload.documentResource === 'staff-qualification') {
      const data = await this.gateway.json(`staffs/${nativeId(job.payload.workerId)}/qualifications`);
      const values = Array.isArray(data.data) ? data.data : data.staff_qualifications;
      if (!Array.isArray(values)) throw new AutomationError(502, 'Invalid qualification evidence.');
      record = values.map(object).find(q => String(q.id) === nativeId(job.payload.documentId)) || {};
      if (!record.id) throw new AutomationError(404, 'Qualification not found for this worker.');
    } else record = await this.document(job);
    return { metadataSnapshotHash: hash(record), nativeDocumentContext: { id: record.id, personId: record.client_id || record.user_id, expires: record.expires_at, noExpiration: record.no_expiration } };
  }
  async preflight(job: Job): Promise<void> {
    const operation = job.proposal?.operation;
    if (operation === 'document.file') {
      const { file } = await this.files.get(string(job.payload.fileId, 100));
      const permitted = file.jobId === job.id || (Array.isArray(job.payload.fileIds) && job.payload.fileIds.includes(file.id));
      if (!permitted) throw new AutomationError(403, 'Select an original file associated with this case.');
      if (!['application/pdf','text/plain'].includes(file.type)) throw new AutomationError(422, 'ShiftCare client uploads support PDF and text evidence here. Review image originals through the native filing process.');
      if (!this.env.SHIFTCARE_DOCUMENT_HOSTS?.trim()) throw new AutomationError(503, 'Configure the approved document download hosts for independent file verification.');
      const types = await this.gateway.list('document_types', 'document_types');
      if (!types.some(t => String(t.id) === nativeId(job.payload.documentTypeId))) throw new AutomationError(422, 'Choose an active document type in this ShiftCare account.');
      const client = unwrap(await this.gateway.json(`clients/${nativeId(job.payload.nativeId)}`));
      if (String(client.id) !== String(job.payload.nativeId)) throw new AutomationError(409, 'The document owner could not be verified.');
      if (job.payload.signedChecked !== true || job.payload.filingChecked !== true) throw new AutomationError(422, 'Check the signature/version, document category and staff visibility.');
      return;
    }
    if (operation === 'communication.handoff') {
      const worker = unwrap(await this.gateway.json(`staff/${nativeId(job.payload.assigneeId)}`));
      if (String(worker.id) !== String(job.payload.assigneeId)) throw new AutomationError(422, 'Select a real ShiftCare assignee.');
      return;
    }
    const captured = await this.capture(job);
    if (!job.payload.metadataSnapshotHash || captured.metadataSnapshotHash !== job.payload.metadataSnapshotHash) throw new AutomationError(409, 'Read the current native document and approve its refreshed metadata before applying a correction.');
  }
  private handoff(job: Job): Data {
    return { title: 'Contact participant about verified service update', assignee_id: Number(nativeId(job.payload.assigneeId)), description: `OCD workflow ${job.id}\nRecipient: ${string(job.payload.recipient)}\n${string(job.payload.message, 2000)}\nRecord the actual communication in ShiftCare and retain its reference.`, priority: 'medium', verification_method: 'self_attestation' };
  }
  async execute(job: Job): Promise<{ reference: string; details?: Data }> {
    let result: Data;
    if (job.proposal?.operation === 'document.file') {
      const { file, bytes } = await this.files.get(String(job.payload.fileId));
      const form = new FormData();
      form.set('file', new Blob([new Uint8Array(bytes)], { type: file.type }), file.name);
      form.set('document_type_id', nativeId(job.payload.documentTypeId));
      form.set('staff_visible', String(job.payload.staffVisible === true));
      if (job.payload.noExpiration === true) form.set('no_expiration', 'true');
      else if (job.payload.expires) form.set('expires_at', String(job.payload.expires));
      result = unwrap(await this.gateway.json(`clients/${nativeId(job.payload.nativeId)}/documents`, {}, 'POST', form));
      return { reference: nativeId(result.id), details: { originalFileHash: file.sha256, originalFileId: file.id } };
    }
    if (job.proposal?.operation === 'communication.handoff') result = unwrap(await this.gateway.json('action_items', {}, 'POST', this.handoff(job)));
    else if (job.proposal?.operation === 'qualification.expiry') {
      const form = new FormData(); form.set('expires_at', `${job.payload.expires}T00:00:00${this.accountOffset(String(job.payload.expires))}`);
      result = unwrap(await this.gateway.json(`staff_qualifications/${nativeId(job.payload.documentId)}`, {}, 'PATCH', form));
    } else {
      const fields: Data = job.payload.noExpiration === true ? { no_expiration: true } : { expires_at: String(job.payload.expires), no_expiration: false };
      result = unwrap(await this.gateway.json(`clients/${nativeId(job.payload.nativeId)}/documents/${nativeId(job.payload.documentId)}`, {}, 'PUT', fields));
    }
    return { reference: nativeId(result.id) };
  }
  private accountOffset(date: string): string {
    const instant = new Date(String(this.gateway.window(date,date).from_date));
    const difference = Date.parse(`${date}T00:00:00Z`) - instant.getTime();
    return `${difference < 0 ? '-' : '+'}${String(Math.floor(Math.abs(difference) / 3600000)).padStart(2,'0')}:${String(Math.abs(difference) / 60000 % 60).padStart(2,'0')}`;
  }
  async verify(job: Job): Promise<{ matches: boolean; reference: string; details?: Data }> {
    const reference = job.receipt?.reference || string(job.payload.documentId);
    if (!reference) return { matches: false, reference: '' };
    if (job.proposal?.operation === 'communication.handoff') {
      const result = unwrap(await this.gateway.json(`action_items/${nativeId(reference)}`)), expected = this.handoff(job);
      return { matches: Object.entries(expected).every(([k,v]) => String(result[k] ?? '') === String(v)), reference, details: { handoffCreated: true, deliveryVerified: false } };
    }
    if (job.proposal?.operation === 'qualification.expiry') {
      const captured = await this.capture(job), context = object(captured.nativeDocumentContext);
      const expected = Date.parse(`${job.payload.expires}T00:00:00${this.accountOffset(String(job.payload.expires))}`);
      return { matches: Date.parse(String(context.expires)) === expected, reference };
    }
    const doc = await this.document(job, reference);
    if (job.proposal?.operation === 'document.metadata') return { matches: job.payload.noExpiration === true ? doc.no_expiration === true && !doc.expires_at : doc.expires_at === job.payload.expires && doc.no_expiration !== true, reference };
    const { file } = await this.files.get(String(job.payload.fileId));
    const metadataMatches = String(doc.document_type_id) === String(job.payload.documentTypeId) && doc.staff_visible === (job.payload.staffVisible === true) && (job.payload.noExpiration === true ? doc.no_expiration === true && !doc.expires_at : String(doc.expires_at || '') === String(job.payload.expires || ''));
    if (!metadataMatches) return { matches: false, reference };
    const link = unwrap(await this.gateway.json(`clients/${nativeId(job.payload.nativeId)}/documents/${nativeId(reference)}/download`));
    let url: URL;
    try { url = new URL(String(link.url)); } catch { throw new AutomationError(502, 'The document download link is invalid.'); }
    const hosts = (this.env.SHIFTCARE_DOCUMENT_HOSTS || '').split(',').map(s => s.trim().toLowerCase());
    if (url.protocol !== 'https:' || url.port || url.username || url.password || !hosts.includes(url.hostname) || !Number.isFinite(Date.parse(String(link.expires_at))) || Date.parse(String(link.expires_at)) <= Date.now()) throw new AutomationError(502, 'The document download does not match the approved storage host or has expired.');
    const response = await this.fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new AutomationError(502, 'The uploaded original could not be independently read.');
    const bytes = await this.gateway.bytes(response, 5 * 1024 * 1024);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    return { matches: digest === file.sha256, reference, details: { originalFileHash: file.sha256, nativeFileHash: digest, fileId: file.id } };
  }
  registry(): Record<string, NativeOperation> { return Object.fromEntries(this.enabled().map(name => [name, { preflight: (job: Job) => this.preflight(job), execute: (job: Job) => this.execute(job), verify: (job: Job) => this.verify(job) }])); }
}
