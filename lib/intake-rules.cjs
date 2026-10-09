const { fields, fieldIssues, WorkflowError } = require('./intake-domain.cjs');

function rules(env = process.env) {
  let input = {};
  try { input = JSON.parse(env.OCD_INTAKE_RULES || '{}'); }
  catch { throw new WorkflowError(503, 'OCD_INTAKE_RULES must contain valid JSON.'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new WorkflowError(503, 'OCD_INTAKE_RULES must be an object.');
  if (input.approvedBy && (!input.version || !input.source)) throw new WorkflowError(503, 'Approved rules need an explicit version and source.');
  const requiredFields = input.requiredFields || ['name', 'service', 'suburb', 'postcode'];
  const requiredDocuments = input.requiredDocuments || [];
  const mappings = input.mappings || {};
  const knowledge = input.knowledge || [];
  const inboxSignals = input.inboxSignals || { tested: false, gaps: [], evidence: '' };
  if (!Array.isArray(requiredFields) || requiredFields.some(key => !Object.hasOwn(fields, key)) ||
      !Array.isArray(requiredDocuments) || requiredDocuments.some(key => typeof key !== 'string' || !key.trim()) ||
      !mappings || typeof mappings !== 'object' || Array.isArray(mappings) || Object.entries(mappings).some(([key, value]) => !Object.hasOwn(fields, key) || typeof value !== 'string') ||
      !Array.isArray(knowledge) || knowledge.some(item => !item || typeof item.id !== 'string' || typeof item.text !== 'string' || typeof item.source !== 'string') ||
      !Array.isArray(inboxSignals.gaps) || inboxSignals.gaps.some(item => typeof item !== 'string') || typeof inboxSignals.evidence !== 'string' ||
      ['version', 'approvedBy', 'source'].some(key => input[key] !== undefined && (typeof input[key] !== 'string' || !input[key].trim()))) {
    throw new WorkflowError(503, 'OCD intake rules have invalid fields, documents or mappings.');
  }
  return { version: input.version || 'baseline', approvedBy: input.approvedBy || '', source: input.source || 'Technical baseline; OCD approval pending',
    servicePostcodes: (env.SERVICE_POSTCODES || '').split(',').map(x => x.trim()).filter(Boolean), requiredFields, requiredDocuments, mappings,
    knowledge, inboxSignals };
}
function issues(record, policy, coverage) {
  return [...new Set([...fieldIssues(record), ...policy.requiredFields.filter(key => !record[key]).map(key => `Missing ${key}`),
    ...policy.requiredDocuments.filter(key => !record.documents?.includes(key)).map(key => `Missing document: ${key}`),
    ...(coverage(record.postcode).status === 'covered' ? [] : ['Service area requires confirmation'])])];
}
function extractionAllowed(policy) {
  return Boolean(policy.approvedBy && policy.inboxSignals.tested === true && policy.inboxSignals.evidence && policy.inboxSignals.gaps?.length);
}
module.exports = { rules, issues, extractionAllowed };
