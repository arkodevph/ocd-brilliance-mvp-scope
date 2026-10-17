import domain from '../lib/intake-domain.cjs';

export const DEMO_INTAKE_KEY = 'ocd-brilliance-demo-intakes-v1';
export const demoIntakeRules = {
  requiredFields: ['name', 'service', 'suburb', 'postcode'],
  requiredDocuments: [],
  mappings: {},
  servicePostcodes: ['6024', '6025', '6026', '6027', '6065'],
};

export function readDemoIntakes(storage) {
  try {
    const records = JSON.parse(storage.getItem(DEMO_INTAKE_KEY) || '[]');
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function demoIntakeRequest(action, input, storage, identity) {
  const records = readDemoIntakes(storage);
  const issues = (fields) => [
    ...domain.fieldIssues(fields),
    ...(demoIntakeRules.servicePostcodes.includes(fields.postcode)
      ? []
      : ['Service area requires confirmation']),
  ];
  if (action === 'draft-preview') {
    const draft = domain.extractText(input.text);
    const duplicate = domain.duplicateOf(draft.fields, records);
    return {
      draft,
      issues: issues(draft.fields),
      rules: demoIntakeRules,
      duplicate: duplicate ? { id: duplicate.id, name: duplicate.name } : null,
    };
  }

  const now = new Date().toISOString();
  let record;
  if (action === 'draft') {
    const existing = records.find((item) => item.idempotencyKey === input.idempotencyKey);
    if (existing) return { record: existing };

    const fields = domain.intakeFields(input);
    if (domain.duplicateOf(fields, records))
      throw new Error('A matching demo intake is already cached.');
    const extraction = domain.extractText(input.sourceText);
    record = {
      ...fields,
      id: `DEMO-${identity()}`,
      idempotencyKey: input.idempotencyKey,
      source: 'Text upload',
      status: 'New',
      owner: 'Demo office',
      nextAction: 'Review source and confirm missing details',
      followUp: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
      revision: identity(),
      documents: [],
      history: [],
      onboarding: {
        sourceText: extraction.sourceText,
        evidence: extraction.evidence,
        warnings: extraction.warnings,
        originalDocument: input.originalDocument || null,
        sourceName: input.sourceName || '',
        capturedAt: now,
        reviewedAt: null,
        reviewedBy: null,
      },
    };

    records.unshift(record);
  } else if (action === 'ai-email') {
    record = input.id
      ? records.find((item) => item.id === input.id)
      : domain.intakeFields(input.fields || {});

    if (!record) throw new Error('This demo intake is no longer cached.');
    const missing = Object.entries({
      name: 'your full name',
      service: 'the support you need',
      suburb: 'your suburb',
      postcode: 'your postcode',
    })
      .filter(([key]) => !record[key])
      .map(([, label]) => label);
    if (!record.email && !record.phone) missing.push('a contact email or phone number');
    const message = `Hi ${record.name?.split(' ')[0] || 'there'},\n\nThank you for contacting OCD Brilliance${record.service ? ` about ${record.service}` : ''}.\n\n${missing.length ? `Could you please provide ${missing.join(', ')} so our office can review your enquiry?` : 'Could you please let us know your preferred days and times for support? Our office will review your needs and confirm availability and the next steps.'}\n\nKind regards,\nOCD Brilliance team`;
    Object.assign(record, {
      emailSubject: 'Your enquiry with OCD Brilliance',
      emailDraft: message,
      emailAI: { provider: 'Demo', model: 'Local sample draft', demo: true },
      emailStatus: 'Needs review',
    });

    if (!input.id)
      return { subject: record.emailSubject, message: record.emailDraft, ai: record.emailAI };
  } else if (action === 'draft-review') {
    record = records.find((item) => item.id === input.id);
    if (!record) throw new Error('This demo intake is no longer cached.');
    if (record.revision !== input.revision)
      throw new Error('This demo intake changed. Reload before saving.');
    if (!input.sourceReviewed)
      throw new Error('Compare the details with the source before saving.');
    const fields = domain.intakeFields(input);
    if (input.status === 'Ready for ShiftCare' && issues(fields).length)
      throw new Error(issues(fields).join(' '));
    Object.assign(record, fields, {
      status: input.status,
      nextAction: input.nextAction,
      owner: input.owner || 'Demo office',
      updatedAt: now,
      revision: identity(),
      documents: input.documents || [],
    });

    Object.assign(record.onboarding, { reviewedAt: now, reviewedBy: 'Demo office' });
  } else {
    throw new Error(
      'This action needs connected office storage. Demo drafts and reviews are cached on this browser.',
    );
  }

  try {
    storage.setItem(DEMO_INTAKE_KEY, JSON.stringify(records));
  } catch {
    throw new Error(
      'Browser cache is full or unavailable. Use a smaller document or free browser storage.',
    );
  }

  return action === 'ai-email'
    ? { subject: record.emailSubject, message: record.emailDraft, ai: record.emailAI }
    : { record };
}
