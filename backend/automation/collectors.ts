import { configuration } from '../shiftcare/shiftcare.client';
import { ShiftCareGateway, nativeId, unwrap } from './shiftcare-gateway';
import { AutomationError, object, string, type Data, type Job } from './types';
import { localDate } from './handlers';
import { hash } from './service';

const rows = (value: unknown): Data[] => Array.isArray(value) ? value.map(object) : [];
const idOf = (value: unknown) => String(value ?? '');
export class NativeEvidenceCollector {
  readonly gateway: ShiftCareGateway;
  constructor(readonly env = process.env, fetchImpl: typeof fetch = fetch) { this.gateway = new ShiftCareGateway(env, fetchImpl); }
  async collect(job: Job): Promise<Data> {
    if (!configuration(this.env).configured) throw new AutomationError(503, 'Connect ShiftCare before collecting native evidence.');
    let result: Data;
    if (job.workflow === 'W12') result = await this.documents(job);
    else if (['W09','W10','W11'].includes(job.workflow)) result = await this.visits(job);
    else if (['W02','W03','W04','W06'].includes(job.workflow)) result = await this.matches(job);
    else throw new AutomationError(422, 'Use the current-record check for this workflow.');
    return { ...result, nativeEvidence: { collectedAt: new Date().toISOString(), accountId: configuration(this.env).accountId, complete: true, digest: hash(result) }, collectionRequired: false, collectionError: '' };
  }
  private async visits(job: Job): Promise<Data> {
    const period = object(job.payload.period);
    const from = string(period.from || job.payload.periodFrom), to = string(period.to || job.payload.periodTo);
    if (!from || !to) throw new AutomationError(422, 'Choose an explicit review period before collecting attendance or finance evidence.');
    const window = this.gateway.window(from, to);
    const query: Data = { ...window, include_clients: true, include_staff: true, time_zone: 'account' };
    if (job.payload.nativeId) query.client_id = [nativeId(job.payload.nativeId)];
    if (job.payload.workerId) query.staff_id = [nativeId(job.payload.workerId)];
    const shifts = await this.gateway.list('shifts', 'shifts', query, 12);
    if (job.payload.nativeId && shifts.some(s=>!rows(s.clients).some(c=>idOf(c.id)===idOf(job.payload.nativeId)))) throw new AutomationError(502, 'Native evidence did not match the selected participant scope.');
    if (job.payload.workerId && shifts.some(s=>!rows(s.staff).some(w=>idOf(w.id)===idOf(job.payload.workerId)))) throw new AutomationError(502, 'Native evidence did not match the selected worker scope.');
    if (shifts.length > 100) throw new AutomationError(422, 'Choose a smaller review period or person; this collector supports 100 visits per batch.');
    const [timesheets, notes] = await Promise.all([
      this.gateway.list('timesheets', 'timesheets', { from: window.from_date, to: window.to_date, time_zone: 'account', include_staff: true, ...(job.payload.workerId ? { user_ids: [nativeId(job.payload.workerId)] } : {}) }, 15),
      this.gateway.list('progress_notes', 'progress_notes', { shift_date_from: from, shift_date_to: to, time_zone: 'account', ...(job.payload.nativeId ? { client_id: nativeId(job.payload.nativeId) } : {}), ...(job.payload.workerId ? { staff_id: nativeId(job.payload.workerId) } : {}) }, 15),
    ]);
    let invoices: Data[] = [];
    if (job.workflow === 'W10') invoices = await this.gateway.list('invoices', 'invoices', { start_date: from, end_date: to, include_client: true, ...(job.payload.nativeId ? { client_id: [nativeId(job.payload.nativeId)] } : {}) }, 12);
    const visits: Data[] = [];
    for (const shift of shifts) {
      if (shift.cancelled_at) continue;
      const staff = rows(shift.staff), clients = rows(shift.clients);
      // Group attendance is per worker; never collapse or add it twice into one worker's time.
      for (const worker of staff.length ? staff : [{}]) {
        if (job.payload.workerId && idOf(worker.id) !== idOf(job.payload.workerId)) continue;
        const sheets = timesheets.filter(t => idOf(t.shift_id) === idOf(shift.id) && idOf(t.staff_id) === idOf(worker.id));
        const sheet = sheets.length === 1 ? sheets[0] : {};
        const visitNotes = notes.filter(n => idOf(n.shift_id) === idOf(shift.id) && (job.workflow !== 'W09' || !n.staff || idOf(object(n.staff).id) === idOf(worker.id)));
        const items = rows(sheet.items);
        const relevantInvoices = invoices.filter(i => rows(i.invoice_items).some(line => idOf(line.shift_id) === idOf(shift.id)));
        const lines = relevantInvoices.flatMap(i => rows(i.invoice_items).filter(line => idOf(line.shift_id) === idOf(shift.id)));
        const kmItems = items.filter(i => ['km','kms','kilometre','kilometres','kilometer','kilometers'].includes(string(i.payable_unit).toLowerCase()));
        const travelItems = items.filter(i => /travel/i.test(string(i.payable_name)));
        const travelUnitsKnown = travelItems.length && travelItems.every(i => ['hour','hours','minute','minutes'].includes(string(i.payable_unit).toLowerCase()) && typeof i.amount === 'number');
        visits.push({
          shiftId: idOf(shift.id), workerId: idOf(worker.id), clientIds: clients.map(c => idOf(c.id)),
          startAt: worker.start_at || shift.start_at, endAt: worker.end_at || shift.end_at,
          clockIn: sheet.clockin_at || worker.clockin_at || null, clockOut: sheet.clockout_at || worker.clockout_at || null,
          note: visitNotes.map(n => string(n.message, 3000)).join('\n').slice(0, 6000),
          noteReferences: visitNotes.map(n => ({ id: idOf(n.id), category: n.category, clientId: object(n.client).id || null })),
          significantIssue: visitNotes.some(n => ['incident','injury'].includes(string(n.category))),
          payer: [...new Set(lines.map(l => string(l.payer)).filter(Boolean))].join('; '),
          funding: clients.map(c => string(c.fund_name)).filter(Boolean).join('; '),
          kilometres: kmItems.length && kmItems.every(i => typeof i.amount === 'number') ? kmItems.reduce((sum, i) => sum + Number(i.amount), 0) : null,
          travelMinutes: travelUnitsKnown ? travelItems.reduce((sum, i) => sum + Number(i.amount) * (/^hours?$/.test(string(i.payable_unit).toLowerCase()) ? 60 : 1), 0) : null,
          payItems: items.map(i => ({ id: i.payable_id, name: i.payable_name, unit: i.payable_unit, amount: i.amount })),
          invoiceIds: relevantInvoices.map(i => idOf(i.id)), fundingReferences: clients.map(c => ({ clientId: c.id, fundId: c.fund_id || null })),
          timesheetAmbiguous: sheets.length > 1, source: 'ShiftCare API v3',
        });
      }
    }
    if (Buffer.byteLength(JSON.stringify(visits)) > 150000) throw new AutomationError(422, 'Review a smaller period; source evidence exceeds the supported batch.');
    return { visits, period: { from, to }, invoices: invoices.map(i => ({ id: i.id, reference: i.reference_number, status: i.status, clientId: i.client_id, balance: i.balance })), collectionEmpty: visits.length === 0 };
  }
  private async documents(job: Job): Promise<Data> {
    const supplied = Array.isArray(job.payload.staffIds) ? job.payload.staffIds : string(job.payload.workerId) ? [job.payload.workerId] : (this.env.OCD_COMPLIANCE_STAFF_IDS || '').split(',').filter(Boolean);
    if (!supplied.length || supplied.length > 20) throw new AutomationError(422, 'Select 1–20 staff IDs or configure the approved compliance staff scope.');
    const categories = await this.gateway.list('qualifications', 'qualifications');
    const documents: Data[] = [];
    for (const value of supplied) {
      const staffId = nativeId(value);
      const worker = unwrap(await this.gateway.json(`staff/${staffId}`));
      if (worker.role !== 'staff' || String(worker.id)!==staffId) throw new AutomationError(422, 'Select verified staff members for the compliance review.');
      const [files, qualificationResponse] = await Promise.all([
        this.gateway.list('staff_files', 'documents', { user_id: staffId }),
        this.gateway.json(`staffs/${staffId}/qualifications`),
      ]);
      const qualifications = rows(qualificationResponse.data || qualificationResponse.staff_qualifications);
      if (!Array.isArray(qualificationResponse.data) && !Array.isArray(qualificationResponse.staff_qualifications)) throw new AutomationError(502, 'ShiftCare returned unsupported qualification evidence.');
      if (files.some(file=>String(file.user_id)!==staffId) || qualifications.some(q=>String(q.user_id)!==staffId)) throw new AutomationError(502, 'Document evidence did not match the selected staff owner.');
      for (const file of files) documents.push({ id: idOf(file.id), personId: staffId, category: string(file.category), expires: this.expiry(file.expires_at), noExpirationVerified: file.no_expiration === true || file.no_expiration === 'true', sourceKind: 'staff-file', nativeNoExpiration: file.no_expiration, nativeSnapshotHash: hash(file) });
      for (const q of qualifications) documents.push({ id: idOf(q.id), personId: staffId, category: string(categories.find(c => idOf(c.id) === idOf(q.qualification_id))?.name) || `Qualification ${q.qualification_id}`, expires: this.expiry(q.expires_at), verifiedAt: q.verified_at || null, sourceKind: 'staff-qualification', nativeSnapshotHash: hash(q) });
      if (!files.length && !qualifications.length) documents.push({ id: '', personId: staffId, category: 'No visible evidence returned', expires: '', sourceKind: 'missing-evidence' });
    }
    return { documents, staffIds: supplied.map(nativeId) };
  }
  private expiry(value: unknown): string {
    if (typeof value !== 'string' || !value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value); return Number.isFinite(date.getTime()) ? localDate(date, configuration(this.env).timeZone) : '';
  }
  async matches(job: Job): Promise<Data> {
    const fields = object(job.payload.fields), name = string(fields.firstName || fields.name || job.payload.name), email = string(fields.email || job.payload.sender).toLowerCase();
    const resource = job.workflow === 'W04' ? 'staff' : 'clients';
    if (!name && !email) return { matchCandidates: [], matchingNeedsReview: 'Supply a reviewed name or email before searching ShiftCare.' };
    const people = await this.gateway.list(resource, resource, name ? { filter_by_name: name } : {}, 15);
    const candidates = people.filter(p => (email && string(p.email).toLowerCase() === email) || (name && [string(p.display_name), string(p.name), [p.first_name,p.family_name].filter(Boolean).join(' ')].some(n => n.toLowerCase() === name.toLowerCase())));
    return { matchCandidates: candidates.map(p => ({ id: p.id, name: p.display_name || p.name || [p.first_name,p.family_name].filter(Boolean).join(' '), email: p.email || '', dob: p.dob || null })), matchingNeedsReview: 'Candidate matches are suggestions. Staff select the actual person and check duplicates.' };
  }
}
