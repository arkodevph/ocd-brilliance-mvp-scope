import { AutomationError, object, string, type Data } from './types';
// Explicit, narrow mapping from reviewed source fields to the official API v3
// form parameters. Service, funding and assessment text require their own workflow.
export function personMapping(client: boolean, fields: Data, existing: boolean): Data {
  const mapped: Data = {};
  for (const [input, native] of (client ? [['name','display_name'],['firstName','first_name'],['familyName','family_name'],['dob','dob'],['email','email'],['phone','mobile_number']] : [['name','name'],['email','email'],['phone','mobile_number']])) {
    if (string(fields[input])) mapped[native] = string(fields[input]);
  }
  if (process.env.OCD_NATIVE_FIELD_MAPPINGS) {
    let config: Data;
    try { config = object(JSON.parse(process.env.OCD_NATIVE_FIELD_MAPPINGS)); } catch { throw new AutomationError(503, 'Configure valid approved native field mappings.'); }
    if (!string(config.approvedBy) || !string(config.version)) throw new AutomationError(503, 'Extended profile mappings require a version and approver.');
    const allowed = client ? ['address','address_unit_no','general_information','ndis_number','reference_number','notes','preferred_name','preferred_contact_method','phone_number','secondary_email'] : ['address','dob','phone_number','kin_name','kin_email','kin_phone_number','employment_type'];
    for (const [source,target] of Object.entries(object(config[client ? 'client' : 'staff']))) {
      if (typeof target !== 'string' || !allowed.includes(target)) throw new AutomationError(503, 'An extended mapping uses an unsupported native field.');
      if (string(fields[source],2000)) mapped[target] = string(fields[source],2000);
    }
  }
  if (!existing) Object.assign(mapped, client ? { client_status: 'prospect' } : { role: 'staff', onboarding_status: 'no_access' });
  return mapped;
}
