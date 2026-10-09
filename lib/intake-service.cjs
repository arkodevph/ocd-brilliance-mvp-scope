const crypto = require('node:crypto');
const D = require('./intake-domain.cjs');
const R = require('./intake-rules.cjs');
const { arrange } = require('./intake-ai.cjs');

class IntakeService {
  constructor(repository, coverage, policy = R.rules()) {
    this.repository = repository;
    this.coverage = coverage;
    this.policy = policy;
  }
  async previewText(text, ai = false) {
    if (ai && !R.extractionAllowed(this.policy)) throw new D.WorkflowError(422, 'Record the Inbox Signals trial and remaining extraction gaps before enabling AI extraction.');
    const baseline = D.extractText(text);
    const draft = ai ? await arrange(text, this.policy, R.issues(baseline.fields, this.policy, this.coverage)) : baseline;
    const duplicate = D.duplicateOf(draft.fields, await this.repository.all());
    const issues = R.issues(draft.fields, this.policy, this.coverage);
    draft.explanations = (draft.explanations || []).filter(item => issues.includes(item.finding));
    return { draft, issues, rules: this.policy, duplicate: duplicate ? { id: duplicate.id, name: duplicate.name } : null };
  }
  async previewCsv(text, mapping) { return D.mapCsv(text, mapping, await this.repository.all()); }
  async createDraft(input, staff) {
    const fields = D.intakeFields(input);
    const source = D.clean(input.source, 30);
    if (!D.sources.includes(source) || !Object.values(fields).some(Boolean)) throw new D.WorkflowError(422, 'Add intake details and a valid source.');
    const duplicate = D.duplicateOf(fields, await this.repository.all());
    if (duplicate && !input.idempotencyKey) throw new D.WorkflowError(409, 'A matching enquiry exists. Review it before creating another draft.', { duplicate: { id: duplicate.id, name: duplicate.name } });
    const sourceText = ['CSV import', 'Website'].includes(source) ? Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n') : D.clean(input.sourceText, 12000);
    const extraction = sourceText && source !== 'CSV import' ? D.extractText(sourceText) : null;
    let originalDocument = null;
    if (input.originalDocument) {
      const { name, type, data } = input.originalDocument;
      if (typeof data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length > 2800000) throw new D.WorkflowError(422, 'Invalid document attachment.');
      const bytes = Buffer.from(data, 'base64');
      const supported = (type === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-') ||
        (type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) ||
        (type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255);
      if (!supported || bytes.length > 2 * 1024 * 1024) throw new D.WorkflowError(422, 'Use a valid PDF, PNG or JPEG of at most 2 MB.');
      if (!R.extractionAllowed(this.policy)) throw new D.WorkflowError(422, 'Complete the Inbox Signals trial before saving custom document extraction.');
      originalDocument = { name: D.clean(name, 120), type, data };
    }
    const evidence = { ...(extraction?.evidence || {}) };
    for (const [key, quote] of Object.entries(input.evidence || {})) {
      if (Object.hasOwn(fields, key) && fields[key] && typeof quote === 'string' && sourceText.includes(quote) && quote.includes(fields[key])) evidence[key] = quote;
    }
    const warnings = [...(extraction?.warnings || [])];
    if (sourceText && source !== 'CSV import') for (const key of Object.keys(fields)) {
      if (fields[key] && !evidence[key]?.includes(fields[key])) {
        delete evidence[key];
        warnings.push(`No matching source evidence for ${key}; staff check required`);
      }
    }
    const now = new Date().toISOString();
    const record = { ...fields, id: `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, source, status: 'New', owner: staff, nextAction: 'Review source and confirm missing details', followUp: now.slice(0, 10), shiftCareId: '', createdAt: now, updatedAt: now, revision: crypto.randomUUID(), consentAt: null, documents: [],
      onboarding: { sourceText, sourceName: D.clean(input.sourceName, 120), originalDocument, evidence, warnings, capturedAt: now, reviewedAt: null, reviewedBy: null },
      history: [{ at: now, by: staff, event: 'Saved onboarding draft; source review required' }] };
    if (source === 'Website' && input.consent === true) record.consentAt = now;
    if (input.idempotencyKey) {
      if (typeof input.idempotencyKey !== 'string' || !/^[\w-]{8,100}$/.test(input.idempotencyKey)) throw new D.WorkflowError(422, 'Use an idempotency key of 8–100 letters, numbers, underscores or hyphens.');
      record.creationKey = `${staff}:${input.idempotencyKey}`;
      record.creationHash = crypto.createHash('sha256').update(JSON.stringify({ fields, source, sourceText, sourceName: record.onboarding.sourceName, originalDocument })).digest('hex');
      record.creationResult = JSON.stringify(record);
    }
    return this.repository.set(record, undefined, { unique: true });
  }
  async update(input, staff, review = false) {
    const record = await this.repository.get(D.clean(input.id, 40));
    if (!record) throw new D.WorkflowError(404, 'Request not found.');
    const replay = this.replay(record, input, staff, review ? 'review' : 'update');
    if (replay) return replay;
    if (!input.revision || input.revision !== (record.revision || record.updatedAt)) throw new D.WorkflowError(409, 'This request changed. Refresh it before saving.');
    if (input.status === 'Entered in ShiftCare' && (review || record.status !== 'Entered in ShiftCare' || input.shiftCareId !== record.shiftCareId)) throw new D.WorkflowError(422, 'Use the saved-profile verification step to complete the ShiftCare handoff.');
    const next = { ...record };
    if (['Entered in ShiftCare', 'Closed'].includes(record.status) && review) throw new D.WorkflowError(422, 'Completed or closed requests cannot be reviewed.');
    if (review) {
      Object.assign(next, D.intakeFields(input));
      next.documents = Array.isArray(input.documents) ? input.documents.filter(key => this.policy.requiredDocuments.includes(key)) : (record.documents || []);
      const issues = R.issues(next, this.policy, this.coverage);
      if (issues.length || input.sourceReviewed !== true) throw new D.WorkflowError(422, 'Check the source and complete valid intake fields.', { issues });
      const duplicate = D.duplicateOf(next, await this.repository.all());
      if (duplicate) throw new D.WorkflowError(409, 'A matching enquiry exists. Review the duplicate first.', { duplicate: { id: duplicate.id, name: duplicate.name } });
      next.onboarding = { ...record.onboarding, sourceText: record.onboarding?.sourceText || Object.keys(D.fields).map(key => `${key}: ${record[key] || 'Not supplied'}`).join('\n'), capturedAt: record.onboarding?.capturedAt || record.createdAt, reviewedAt: new Date().toISOString(), reviewedBy: staff };
      next.shiftCareVerification = null;
      next.handoffApproval = null;
    }
    for (const [key, limit] of Object.entries({ status: 40, owner: 120, nextAction: 250, followUp: 20, shiftCareId: 100, postcode: 10, suburb: 120 })) next[key] = D.clean(input[key], limit);
    if (!review && record.onboarding && (next.postcode !== record.postcode || next.suburb !== record.suburb)) {
      next.onboarding = { ...record.onboarding, reviewedAt: null, reviewedBy: null };
      next.shiftCareVerification = null;
      next.handoffApproval = null;
    }
    if (next.handoffApproval && this.handoffDigest(next) !== this.handoffDigest(record)) next.handoffApproval = null;
    if (['Ready for ShiftCare', 'Entered in ShiftCare'].includes(next.status)) await this.checkDuplicate(next);
    D.validateWorkflow(next, this.coverage);
    next.updatedAt = new Date().toISOString();
    next.revision = crypto.randomUUID();
    next.history = [{ at: next.updatedAt, by: staff, event: `${review ? 'Reviewed source and intake fields' : 'Updated request'} · ${next.status} · owner ${next.owner || 'unassigned'} · next ${next.nextAction} · due ${next.followUp || 'unscheduled'}${next.shiftCareId ? ` · ShiftCare ${next.shiftCareId}` : ''}` }, ...(record.history || [])];
    this.receipt(next, input, staff, review ? 'review' : 'update');
    return this.repository.set(next, record.revision || record.updatedAt, { unique: ['Ready for ShiftCare', 'Entered in ShiftCare'].includes(next.status) || review });
  }
  async handoff(id, revision) {
    const record = await this.repository.get(id);
    if (!record) throw new D.WorkflowError(404, 'Request not found.');
    if (revision && revision !== (record.revision || record.updatedAt)) throw new D.WorkflowError(409, 'This request changed. Refresh it before copying.');
    if (!['Ready for ShiftCare', 'Entered in ShiftCare'].includes(record.status)) throw new D.WorkflowError(422, 'Mark the reviewed request ready for ShiftCare before generating a handoff.');
    D.validateWorkflow(record, this.coverage);
    this.checkPolicy(record);
    if (!record.handoffApproval || record.handoffApproval.digest !== this.handoffDigest(record)) throw new D.WorkflowError(422, 'Approve the exact handoff before copying or confirming it.');
    await this.checkDuplicate(record);
    return D.handoffText(record);
  }
  async checkDuplicate(record) {
    const duplicate = D.duplicateOf(record, await this.repository.all());
    if (duplicate) throw new D.WorkflowError(409, 'A matching enquiry exists. Review the duplicate first.', { duplicate: { id: duplicate.id, name: duplicate.name } });
  }
  checkPolicy(record) {
    if (!this.policy.approvedBy || !this.policy.version || !this.policy.source) throw new D.WorkflowError(422, 'OCD must approve the intake rules before a handoff.');
    const issues = R.issues(record, this.policy, this.coverage);
    if (issues.length) throw new D.WorkflowError(422, 'Resolve the intake findings before a handoff.', { issues });
  }
  handoffDigest(record) {
    return crypto.createHash('sha256').update(JSON.stringify({ handoff: D.handoffText(record), documents: record.documents || [], policy: this.policy })).digest('hex');
  }
  operationHash(input) {
    const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    return crypto.createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');
  }
  replay(record, input, staff, action) {
    const operation = (record.operations || []).find(item => item.inputRevision === input.revision && item.by === staff && item.action === action);
    if (!operation) return null;
    if (operation.hash !== this.operationHash(input)) throw new D.WorkflowError(409, 'This operation was already applied with different details. Refresh the request.');
    return JSON.parse(operation.result);
  }
  receipt(record, input, staff, action) {
    const { operations, creationResult, ...result } = record;
    record.operations = [...(operations || []), { inputRevision: input.revision, by: staff, action, hash: this.operationHash(input), result: JSON.stringify(result) }];
  }
  async approve(input, staff) {
    const record = await this.repository.get(D.clean(input.id, 40));
    if (!record) throw new D.WorkflowError(404, 'Request not found.');
    const replay = this.replay(record, input, staff, 'approve');
    if (replay) return replay;
    if (!input.revision || input.revision !== record.revision) {
      throw new D.WorkflowError(409, 'This request changed. Refresh before approval.');
    }
    if (record.status !== 'Ready for ShiftCare' || input.approved !== true || input.existingPeopleChecked !== true) throw new D.WorkflowError(422, 'Approve the displayed handoff and confirm existing ShiftCare people were checked.');
    this.checkPolicy(record);
    await this.checkDuplicate(record);
    const now = new Date().toISOString();
    const next = { ...record, revision: crypto.randomUUID(), updatedAt: now, handoffApproval: { by: staff, at: now, digest: this.handoffDigest(record), inputRevision: record.revision, mode: 'manual' }, history: [{ at: now, by: staff, event: 'Approved exact manual ShiftCare handoff' }, ...record.history] };
    this.receipt(next, input, staff, 'approve');
    return this.repository.set(next, record.revision, { unique: true });
  }
  async queue() {
    const records = await this.repository.all();
    return records.filter(record => !['Closed', 'Entered in ShiftCare'].includes(record.status)).map(record => {
      const duplicate = D.duplicateOf(record, records) || records.find(other => other.id !== record.id && other.name?.toLowerCase() === record.name?.toLowerCase() && other.postcode === record.postcode);
      const issues = R.issues(record, this.policy, this.coverage);
      if (!record.owner) issues.push('Missing owner');
      if (!record.followUp) issues.push('Missing due date');
      if (!record.onboarding?.reviewedAt) issues.push(...(record.onboarding?.warnings || []));
      if (duplicate) issues.push(`Possible duplicate: ${duplicate.id}`);
      if (record.transferFailure) issues.push(`Failed transfer: ${record.transferFailure.reason}`);
      if (record.status === 'Ready for ShiftCare' && (!record.handoffApproval || record.handoffApproval.digest !== this.handoffDigest(record))) issues.push('Handoff approval required');
      return { id: record.id, name: record.name, owner: record.owner, nextAction: record.nextAction, dueDate: record.followUp, overdue: Boolean(record.followUp && record.followUp < new Date().toISOString().slice(0, 10)), issues, duplicateId: duplicate?.id };
    });
  }
  async failure(input, staff) {
    const record = await this.repository.get(D.clean(input.id, 40));
    if (!record) throw new D.WorkflowError(404, 'Request not found.');
    const replay = this.replay(record, input, staff, 'failure');
    if (replay) return replay;
    if (!input.revision || input.revision !== record.revision) throw new D.WorkflowError(409, 'Refresh this request before recording a failure.');
    const reason = D.clean(input.reason, 500);
    if (['Entered in ShiftCare', 'Closed'].includes(record.status)) throw new D.WorkflowError(422, 'This request is already complete or closed.');
    if (!reason || !input.nextAction || !input.owner || !D.validDate(input.followUp)) throw new D.WorkflowError(422, 'Supply the failure, owner, next action and due date.');
    const now = new Date().toISOString();
    const next = { ...record, status: 'Reviewing', owner: D.clean(input.owner, 120), nextAction: D.clean(input.nextAction, 250), followUp: input.followUp, handoffApproval: null, transferFailure: { reason, at: now, by: staff }, updatedAt: now, revision: crypto.randomUUID(), history: [{ at: now, by: staff, event: `Manual transfer failed: ${reason}` }, ...record.history] };
    D.validateWorkflow(next, this.coverage);
    this.receipt(next, input, staff, 'failure');
    return this.repository.set(next, record.revision);
  }
  async verify(input, staff) {
    const record = await this.repository.get(D.clean(input.id, 40));
    if (!record) throw new D.WorkflowError(404, 'Request not found.');
    const replay = this.replay(record, input, staff, 'verify');
    if (replay) return replay;
    if (!input.revision || input.revision !== (record.revision || record.updatedAt)) throw new D.WorkflowError(409, 'This request changed. Refresh it before saving.');
    if (record.status !== 'Ready for ShiftCare') throw new D.WorkflowError(422, 'Complete the source review and mark ready before checking the saved profile.');
    D.validateWorkflow(record, this.coverage);
    await this.handoff(record.id, record.revision);
    await this.checkDuplicate(record);
    const reference = D.clean(input.shiftCareId, 100);
    if (!reference || input.profileChecked !== true) throw new D.WorkflowError(422, 'Add the ShiftCare client reference and confirm you compared the saved profile with this handoff.');
    const now = new Date().toISOString();
    const next = { ...record, status: 'Entered in ShiftCare', shiftCareId: reference,
      transferFailure: null,
      shiftCareVerification: { reference, checkedBy: staff, checkedAt: now, method: 'staff-manual', reviewedAt: record.onboarding.reviewedAt, inputRevision: record.revision },
      updatedAt: now, revision: crypto.randomUUID(),
      history: [{ at: now, by: staff, event: `Staff checked saved ShiftCare profile · ${reference} · manual verification; no API read-back` }, ...(record.history || [])] };
    D.validateWorkflow(next, this.coverage);
    this.receipt(next, input, staff, 'verify');
    return this.repository.set(next, record.revision || record.updatedAt, { unique: true });
  }
}
module.exports = { IntakeService };
