import { type Data } from './types';
const { extractText, validDate } = require('../../lib/intake-domain.cjs');

export function extractPerson(text: string): { fields: Data; evidence: Data; warnings: string[] } {
  const base = extractText(text), fields: Data = { ...base.fields }, evidence: Data = { ...base.evidence };
  const labels: Record<string,string> = { name:'(?:(?:full|participant|client|worker|employee) name|name)', firstName:'(?:first|given) name', familyName:'(?:(?:last|family) name|surname)', address:'(?:residential |street )?address', ndisNumber:'NDIS (?:number|no)', referenceNumber:'reference (?:number|no)' };
  for (const [key,label] of Object.entries(labels)) {
    const match = text.match(new RegExp(`(?:^|[\n;])\\s*${label}\\s*[:=]\\s*([^\n;]{1,300})`, 'i'));
    if (match) { fields[key] = match[1].trim(); evidence[key] = match[0].trim(); }
  }
  const match = text.match(/\b(?:DOB|date of birth|birth date)\s*[:=]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/i);
  if (match) {
    let dob = match[1];
    const numeric = dob.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (numeric) dob = `${numeric[3]}-${numeric[2].padStart(2,'0')}-${numeric[1].padStart(2,'0')}`;
    const named = dob.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (named) {
      const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const month = months.findIndex(m => m === named[2].toLowerCase() || m.slice(0,3) === named[2].toLowerCase());
      if (month >= 0) dob = `${named[3]}-${String(month+1).padStart(2,'0')}-${named[1].padStart(2,'0')}`;
    }
    if (validDate(dob)) { fields.dob = dob; evidence.dob = match[0]; }
    else base.warnings.push('Date of birth could not be parsed; check the original.');
  }
  return { fields, evidence, warnings: [...base.warnings, 'Source extraction is a suggestion. Confirm dates, names and identifiers before approval.'] };
}
