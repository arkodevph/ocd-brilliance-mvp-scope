import { configuration, createShiftCareClient } from '../shiftcare/shiftcare.client';
import { AutomationError, NativeRejection, object, string, type Data, type Job } from './types';
import { hash, type NativeOperation } from './service';
import { localDate } from './handlers';
import { personMapping } from './mapping';
import { ShiftCareGateway } from './shiftcare-gateway';

const bases: Record<string, string> = { au: 'https://api.shiftcare.com/api/v3/', ca: 'https://api.ca.shiftcare.com/api/v3/', us: 'https://api.us.shiftcare.com/api/v3/', uk: 'https://api.uk.shiftcare.com/api/v3/' };
const operationNames = ['client.upsert', 'staff.create', 'staff.update', 'shift.cancel', 'shift.assign'];
const id = (value: unknown): string => { const result = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : string(value); if (!/^[1-9]\d*$/.test(result)) throw new AutomationError(422, 'Use an actual numeric ShiftCare record ID.'); return result; };
const unwrap = (value: Data): Data => Object.keys(object(value.data)).length ? object(value.data) : value;
export class ShiftCareOperations {
  constructor(readonly env = process.env, readonly fetchImpl: typeof fetch = fetch) {}
  enabled(): string[] {
    if (!configuration(this.env).configured) return [];
    return (this.env.OCD_SHIFTCARE_WRITE_OPERATIONS || '').split(',').map(s => s.trim()).filter(s => operationNames.includes(s));
  }
  private async request(method: string, path: string, fields?: Data): Promise<Data> {
    const config = configuration(this.env);
    if (!config.configured) throw new AutomationError(503, 'Configure the server’s ShiftCare API credentials and account time zone.');
    const url = new URL(path, bases[config.region]);
    if (url.origin !== new URL(bases[config.region]).origin || !url.pathname.startsWith('/api/v3/')) throw new AutomationError(422, 'Unsupported native operation path.');
    const form = fields && ['clients', 'staff'].includes(path);
    const response = await this.fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', Authorization: `Basic ${Buffer.from(`${config.accountId}:${this.env.SHIFTCARE_API_KEY!.trim()}`).toString('base64')}`, ...(fields ? { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' } : {}) }, ...(fields ? { body: form ? new URLSearchParams(Object.entries(fields).map(([k,v]) => [k, String(v)])) : JSON.stringify(fields) } : {}) });
    if (!response.ok) {
      if (method !== 'GET' && [400,401,403,404,409,422].includes(response.status)) throw new NativeRejection(409, 'ShiftCare rejected this action. Refresh native evidence and review its permissions, state and required fields.');
      throw new AutomationError(response.status === 429 ? 503 : 502, 'ShiftCare did not accept the operation. Check permissions, current record state and the registered API contract.');
    }
    const reader = response.body?.getReader(); if (!reader) throw new AutomationError(502, 'ShiftCare returned no operation result.');
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > 2000000) { await reader.cancel(); throw new AutomationError(502, 'ShiftCare response exceeded the verification limit.'); } chunks.push(next.value); }
    try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
    catch { throw new AutomationError(502, 'ShiftCare returned an invalid operation result.'); }
  }
  private personFields(job: Job): Data {
    const fields = object(job.proposal?.fields.fields), client = job.workflow === 'W03';
    return personMapping(client, fields, Boolean(string(job.payload.nativeId)));
  }
  private async record(job: Job): Promise<Data> {
    const resource = job.workflow === 'W03' ? 'clients' : job.workflow === 'W04' ? 'staff' : 'shifts';
    const nativeId = job.workflow === 'W03' || job.workflow === 'W04' ? job.payload.nativeId : job.payload.shiftId;
    return unwrap(await this.request('GET', `${resource}/${id(nativeId)}${resource === 'staff' ? '' : '?time_zone=account'}`));
  }
  async capture(job: Job): Promise<Data> {
    const record = await this.record(job);
    if (!record.id) throw new AutomationError(502, 'ShiftCare returned an invalid native record.');
    const context: Data = { id: String(record.id), name: record.display_name || record.name || [record.first_name, record.family_name].filter(Boolean).join(' '), updatedAt: record.updated_at };
    if (job.workflow === 'W03') Object.assign(context, { firstName: record.first_name, familyName: record.family_name, dob: record.dob, email: record.email, phone: record.mobile_number });
    if (job.workflow === 'W04') Object.assign(context, { email: record.email, role: record.role });
    if (['W07','W08'].includes(job.workflow)) Object.assign(context, { startAt: record.start_at, endAt: record.end_at, clients: record.clients, staff: record.staff, cancelledAt: record.cancelled_at, approved: record.is_approved });
    const payload: Data = { nativeSnapshotHash: hash(record), nativeContext: context };
    if (job.workflow === 'W08' && job.payload.workerId) {
      const worker = unwrap(await this.request('GET', `staff/${id(job.payload.workerId)}`));
      payload.workerSnapshotHash = hash(worker);
      context.proposedWorker = { id: worker.id, name: worker.name, role: worker.role };
    }
    return payload;
  }
  private async candidates(job: Job): Promise<Data[]> {
    const client = job.workflow === 'W03', fields = object(job.proposal?.fields.fields);
    const name = string(client ? fields.firstName : fields.name);
    if (!name) throw new AutomationError(422, 'Confirm the explicit first name for a new client; do not split a full name automatically.');
    const resource = client ? 'clients' : 'staff';
    const data = await this.request('GET', `${resource}?filter_by_name=${encodeURIComponent(name)}&per_page=20&page=1&include_metadata=true`);
    const values = data[resource] || data.data;
    if (!Array.isArray(values)) throw new AutomationError(502, 'ShiftCare returned an unsupported identity search result.');
    if (values.length >= 20) throw new AutomationError(422, 'Identity search has more candidates. Select the exact native person manually.');
    return values.map(object);
  }
  async preflight(job: Job): Promise<void> {
    if (job.workflow === 'W03' || job.workflow === 'W04') {
      const fields = this.personFields(job);
      if (!job.payload.nativeId) {
        if (job.workflow === 'W03' && (!fields.first_name || !fields.dob)) throw new AutomationError(422, 'Confirm the explicit given name and date of birth before creating a client.');
        const candidates = await this.candidates(job), email = string(fields.email).toLowerCase();
        if (candidates.some(c => (email && string(c.email).toLowerCase() === email) || (job.workflow === 'W03' && c.dob === fields.dob && c.first_name === fields.first_name))) throw new AutomationError(422, 'An existing native person may match. Select and review their native ID before proceeding.');
        return;
      }
    }
    const current = await this.record(job);
    if (job.workflow === 'W04' && current.role !== 'staff') throw new AutomationError(422, 'Worker onboarding cannot modify back-office or administrator accounts. Use native account administration.');
    if (!job.payload.nativeSnapshotHash || hash(current) !== job.payload.nativeSnapshotHash) throw new AutomationError(409, 'Read the current native record and review the refreshed proposal before execution.');
    if (['W07', 'W08'].includes(job.workflow)) {
      if (current.cancelled_at || current.is_approved === true) throw new AutomationError(409, 'The shift is cancelled or has approved attendance. Use the native office review.');
      if (!Array.isArray(current.clients) || current.clients.length !== 1 || !Array.isArray(current.staff) || current.staff.length !== 1) throw new AutomationError(422, 'This adapter handles one client and one worker. Review group or vacant shifts in ShiftCare.');
      if (current.clients.some(c => object(c).absent_reason || object(c).last_absent_at)) throw new AutomationError(409, 'The client already has recorded absence on this occurrence. Review it in ShiftCare.');
      const clientId = id(object(current.clients[0]).id);
      const invoices = await new ShiftCareGateway(this.env,this.fetchImpl).list('invoices','invoices',{ client_id:[clientId] },15);
      if (invoices.some(invoice=>Array.isArray(invoice.invoice_items) && invoice.invoice_items.some(line=>String(object(line).shift_id)===String(current.id)))) throw new AutomationError(409, 'An invoice references this occurrence. The bookkeeper must review the change in ShiftCare.');
    }
    if (job.workflow === 'W07' && !['NSDH','NSDF','NSDT','NSDO'].includes(string(job.payload.absentReason))) throw new AutomationError(422, 'Confirm the native absence reason code under the cancellation policy.');
    if (job.workflow === 'W08') {
      const worker = unwrap(await this.request('GET', `staff/${id(job.payload.workerId)}`));
      if (worker.role !== 'staff') throw new AutomationError(422, 'Booking changes must select an eligible staff member.');
      if (!job.payload.workerSnapshotHash || hash(worker) !== job.payload.workerSnapshotHash) throw new AutomationError(409, 'The proposed worker changed. Refresh the native snapshot and review eligibility again.');
      id(job.payload.payGroupId);
      const startAt = string(job.payload.startAt) || string(current.start_at), endAt = string(job.payload.endAt) || string(current.end_at);
      if (!Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt)) || Date.parse(endAt) <= Date.parse(startAt)) throw new AutomationError(422, 'Confirm valid shift times with explicit time-zone offsets.');
      const config = configuration(this.env), fromDay = localDate(new Date(Date.parse(startAt) - 86400000), config.timeZone), toDay = localDate(new Date(endAt), config.timeZone);
      const gateway = new ShiftCareGateway(this.env, this.fetchImpl);
      const [shifts, leaves] = await Promise.all([
        gateway.list('shifts', 'shifts', { ...gateway.window(fromDay, toDay), include_staff: true, include_clients: true, staff_id: [id(job.payload.workerId)], time_zone: 'account' }, 15),
        gateway.list('leaves', 'leaves', { from: startAt, to: endAt, user_ids: [id(job.payload.workerId)], time_zone: 'account' }, 15),
      ]);
      for (const shift of shifts) {
        if (String(shift.id) === String(current.id) || shift.cancelled_at) continue;
        const staff = Array.isArray(shift.staff) ? shift.staff.map(object).find(s => String(s.id) === String(job.payload.workerId)) : null;
        if (staff && Date.parse(String(staff.start_at || shift.start_at)) < Date.parse(endAt) && Date.parse(String(staff.end_at || shift.end_at)) > Date.parse(startAt)) throw new AutomationError(409, 'The proposed worker has a conflicting native assignment. Review the roster.');
      }
      if (leaves.some(leave => !leave.declined_at && Date.parse(String(leave.start_at)) < Date.parse(endAt) && Date.parse(String(leave.end_at)) > Date.parse(startAt))) throw new AutomationError(409, 'The proposed worker has overlapping pending or approved leave. Confirm availability in ShiftCare.');
      const required = Array.isArray(job.payload.requiredQualificationIds) ? job.payload.requiredQualificationIds : [];
      if (required.length) {
        const response = await gateway.json(`staffs/${id(job.payload.workerId)}/qualifications`);
        const values = response.data || response.staff_qualifications;
        if (!Array.isArray(values)) throw new AutomationError(502, 'Qualification evidence could not be read.');
        const qualifications = values.map(object);
        if (required.some(qid => !qualifications.some(q => String(q.qualification_id) === id(qid) && q.verified_at && (!q.expires_at || Date.parse(String(q.expires_at)) >= Date.parse(endAt))))) throw new AutomationError(409, 'The proposed worker is missing a verified qualification valid for this service.');
      }
    }
  }
  private async execute(job: Job): Promise<{ reference: string }> {
    let result: Data;
    if (job.workflow === 'W03' || job.workflow === 'W04') {
      const client = job.workflow === 'W03', existing = string(job.payload.nativeId), fields = this.personFields(job);
      if (existing) fields.id = id(existing);
      if (!client && !existing) Object.assign(fields, { role: 'staff', onboarding_status: 'no_access', send_invitation: false });
      result = unwrap(await this.request(existing ? 'PUT' : 'POST', client ? 'clients' : 'staff', fields));
    } else if (job.workflow === 'W07') {
      result = unwrap(await this.request('POST', `shifts/${id(job.payload.shiftId)}/cancel`, { cancel_type: job.payload.treatment, cancel_reason: job.payload.reason, absent_reason: job.payload.absentReason }));
    } else {
      const fields: Data = { staff: [{ staff_id: Number(id(job.payload.workerId)), pay_group_id: Number(id(job.payload.payGroupId)) }], notify: false };
      if (job.payload.startAt && job.payload.endAt) Object.assign(fields, { start_at: job.payload.startAt, end_at: job.payload.endAt });
      result = unwrap(await this.request('PUT', `shifts/${id(job.payload.shiftId)}`, fields));
    }
    return { reference: id(result.id) };
  }
  private async verify(job: Job): Promise<{ matches: boolean; reference: string; details?: Data }> {
    if (job.workflow === 'W03' || job.workflow === 'W04') {
      let nativeId = job.receipt?.reference || string(job.payload.nativeId);
      if (!nativeId) {
        const fields = this.personFields(job);
        const candidates = (await this.candidates(job)).filter(c => Object.entries(fields).every(([k,v]) => String(c[k] ?? '') === String(v)));
        if (candidates.length !== 1) return { matches: false, reference: '' };
        nativeId = String(candidates[0].id);
      }
      const resource = job.workflow === 'W03' ? 'clients' : 'staff', actual = unwrap(await this.request('GET', `${resource}/${id(nativeId)}`));
      return { matches: Object.entries(this.personFields(job)).every(([k,v]) => String(actual[k] ?? '') === String(v)), reference: nativeId };
    }
    const actual = await this.record(job);
    if (job.workflow === 'W07') {
      const clients = Array.isArray(actual.clients) ? actual.clients.map(object) : [];
      const matches = job.payload.treatment === 'without_charge' ? Boolean(actual.cancelled_at) && actual.cancelled_reason === job.payload.reason : clients.length === 1 && clients[0].absent_reason === job.payload.absentReason && Boolean(clients[0].last_absent_at);
      return { matches, reference: String(actual.id), details: { treatment: job.payload.treatment, reasonRetainedInApplication: job.payload.reason } };
    }
    const staff = Array.isArray(actual.staff) ? actual.staff.map(object) : [];
    const matchedWorker = staff.length === 1 && String(staff[0].id) === String(job.payload.workerId);
    const matchedTimes = (!job.payload.startAt || Date.parse(String(actual.start_at)) === Date.parse(String(job.payload.startAt))) && (!job.payload.endAt || Date.parse(String(actual.end_at)) === Date.parse(String(job.payload.endAt)));
    return { matches: matchedWorker && matchedTimes, reference: String(actual.id) };
  }
  registry(): Record<string, NativeOperation> {
    return Object.fromEntries(this.enabled().map(name => [name, { preflight: (job: Job) => this.preflight(job), execute: (job: Job) => this.execute(job), verify: (job: Job) => this.verify(job) }]));
  }
}
