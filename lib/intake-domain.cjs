const fields = {
  name: 120,
  email: 200,
  phone: 40,
  service: 120,
  suburb: 120,
  postcode: 10,
  notes: 2000,
};
const statuses = [
  'New',
  'Contacting',
  'Reviewing',
  'Ready for ShiftCare',
  'Entered in ShiftCare',
  'Closed',
];
const sources = ['Email', 'Phone', 'Coordinator', 'Text upload', 'CSV import', 'Website'];
const handoffLabels = {
  name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  service: 'Requested service',
  suburb: 'Suburb',
  postcode: 'Postcode',
  notes: 'Intake notes',
};

class WorkflowError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function clean(value, limit = 200) {
  return String(value ?? '')
    .trim()
    .slice(0, limit);
}
function intakeFields(input) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, limit]) => [key, clean(input[key], limit)]),
  );
}
function validDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
function fieldIssues(record) {
  const issues = [];
  for (const key of ['name', 'service', 'suburb', 'postcode'])
    if (!record[key]) issues.push(`Missing ${key}`);
  if (!record.email && !record.phone) issues.push('Missing email or phone');
  if (record.email && !/^\S+@\S+\.\S+$/.test(record.email)) issues.push('Invalid email');
  if (record.phone && !/^\+?[\d ()-]{8,40}$/.test(record.phone)) issues.push('Invalid phone');
  if (record.postcode && !/^\d{4}$/.test(record.postcode)) issues.push('Invalid postcode');
  return issues;
}
function duplicateOf(record, records) {
  const phoneKey = (value) =>
    String(value || '')
      .replace(/\D/g, '')
      .replace(/^61(?=\d{9}$)/, '0');
  return records.find(
    (other) =>
      other.id !== record.id &&
      (record.bookingRequest
        ? other.bookingRequest &&
          other.status !== 'Closed' &&
          other.bookingRequest.preferredDate === record.bookingRequest.preferredDate &&
          [...other.bookingRequest.services].sort().join('|') ===
            [...record.bookingRequest.services].sort().join('|')
        : !other.bookingRequest) &&
      ((record.email && record.email.toLowerCase() === other.email?.toLowerCase()) ||
        (phoneKey(record.phone) && phoneKey(record.phone) === phoneKey(other.phone))),
  );
}

// Only explicit labels and unambiguous contact details are extracted; no inferred care facts.
function extractText(text) {
  if (typeof text !== 'string' || !text.trim())
    throw new WorkflowError(422, 'Paste enquiry text or upload a text file.');
  if (text.length > 12000)
    throw new WorkflowError(413, 'Source text must be at most 12,000 characters.');
  const values = {};
  const evidence = {};
  const aliases = {
    name: 'name',
    'full name': 'name',
    'participant name': 'name',
    email: 'email',
    phone: 'phone',
    mobile: 'phone',
    service: 'service',
    suburb: 'suburb',
    postcode: 'postcode',
    notes: 'notes',
    'support needs': 'notes',
  };
  const conflicts = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([a-z ]+)\s*:\s*(.+)$/i);
    const key = match && aliases[match[1].trim().toLowerCase()];
    if (!key) continue;
    if (values[key] && values[key] !== match[2].trim())
      conflicts.push(`Multiple values for ${key}; check the source`);
    else {
      values[key] = match[2].trim();
      evidence[key] = line.trim();
    }
  }
  if (!values.email) {
    const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];
    if (emails.length === 1) {
      values.email = emails[0];
      evidence.email = emails[0];
    }
    if (emails.length > 1) conflicts.push('Multiple email addresses; select the requester contact');
  }
  return {
    fields: intakeFields(values),
    evidence,
    warnings: conflicts,
    sourceText: text.trim(),
    extractor: 'labelled-text-v1',
  };
}

// RFC-style quoted fields, embedded newlines and CRLF; deliberately bounded for staff previews.
function csvRows(text) {
  if (typeof text !== 'string' || !text.trim()) throw new WorkflowError(422, 'Choose a CSV file.');
  if (text.length > 12000) throw new WorkflowError(413, 'CSV must be at most 12,000 characters.');
  const rows = [];
  let row = [],
    cell = '',
    quoted = false,
    closed = false;
  const finishCell = () => {
    row.push(cell);
    cell = '';
    closed = false;
  };
  const finishRow = () => {
    finishCell();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else cell += char;
    } else if (char === ',') finishCell();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      finishRow();
    } else if (char === '"' && !cell && !closed) quoted = true;
    else if (closed || char === '"') throw new WorkflowError(422, 'CSV has invalid quoting.');
    else cell += char;
  }
  if (quoted) throw new WorkflowError(422, 'CSV has an unclosed quoted field.');
  if (cell || row.length || closed) finishRow();
  if (rows.length < 2 || rows.length > 51)
    throw new WorkflowError(422, 'CSV needs a header and 1–50 data rows.');
  const headers = rows.shift().map((value) => value.replace(/^\uFEFF/, '').trim());
  if (headers.some((value) => !value) || new Set(headers).size !== headers.length)
    throw new WorkflowError(422, 'CSV headers must be unique and nonempty.');
  if (rows.some((values) => values.length !== headers.length))
    throw new WorkflowError(422, 'CSV rows must match the header column count.');
  return { headers, rows };
}
function mapCsv(text, mapping, existing) {
  const { headers, rows } = csvRows(text);
  if (!mapping || typeof mapping !== 'object' || !mapping.name || !headers.includes(mapping.name))
    throw new WorkflowError(422, 'Map a name column before previewing rows.');
  const selected = Object.keys(fields)
    .map((key) => mapping[key])
    .filter(Boolean);
  if (
    selected.some((header) => !headers.includes(header)) ||
    new Set(selected).size !== selected.length
  )
    throw new WorkflowError(422, 'Map each source column once using the CSV headers.');
  const candidates = [];
  return rows.map((values, index) => {
    const record = intakeFields(
      Object.fromEntries(
        Object.keys(fields).map((key) => [key, values[headers.indexOf(mapping[key])] || '']),
      ),
    );
    const duplicate = duplicateOf(record, [...existing, ...candidates]);
    candidates.push({ ...record, id: `CSV row ${index + 2}` });
    return {
      row: index + 2,
      fields: record,
      issues: fieldIssues(record),
      duplicate: duplicate ? { id: duplicate.id, name: duplicate.name } : null,
    };
  });
}

function validateWorkflow(record, coverage) {
  if (
    !statuses.includes(record.status) ||
    !record.nextAction ||
    !record.owner ||
    !record.followUp ||
    (record.followUp && !validDate(record.followUp)) ||
    (record.postcode && !/^\d{4}$/.test(record.postcode))
  ) {
    throw new WorkflowError(
      422,
      'Set a valid status, owner, next action, postcode, and follow-up date.',
    );
  }
  if (
    record.status === 'Entered in ShiftCare' &&
    (!record.shiftCareId ||
      record.shiftCareVerification?.reference !== record.shiftCareId ||
      !record.shiftCareVerification?.checkedAt)
  )
    throw new WorkflowError(
      422,
      'Check the saved ShiftCare profile and record staff verification before marking entered.',
    );
  if (['Ready for ShiftCare', 'Entered in ShiftCare'].includes(record.status)) {
    if (coverage(record.postcode).status !== 'covered')
      throw new WorkflowError(
        422,
        'Confirm a covered service postcode before the ShiftCare handoff.',
      );
    if (fieldIssues(record).length || !record.onboarding?.reviewedAt)
      throw new WorkflowError(
        422,
        'Complete and review the intake fields before the ShiftCare handoff.',
      );
  }
}
function handoffText(record) {
  return [
    'SHIFTCARE MANUAL HANDOFF',
    `Request: ${record.id}`,
    ...Object.keys(fields).map((key) => `${handoffLabels[key]}: ${record[key] || 'Not supplied'}`),
    `Owner: ${record.owner}`,
    `Next action: ${record.nextAction}`,
    `Follow-up: ${record.followUp || 'Not scheduled'}`,
    `Source: ${record.source}`,
    `Reviewed by: ${record.onboarding?.reviewedBy}`,
    `Reviewed at: ${record.onboarding?.reviewedAt}`,
    'Use these reviewed details to complete the matching fields in ShiftCare. Confirm service, notes, consent and care details in the original records; field mapping is not yet validated. Manual entry; no ShiftCare sync.',
  ].join('\n');
}

module.exports = {
  fields,
  statuses,
  sources,
  WorkflowError,
  clean,
  intakeFields,
  fieldIssues,
  duplicateOf,
  extractText,
  csvRows,
  mapCsv,
  validateWorkflow,
  handoffText,
  validDate,
};
