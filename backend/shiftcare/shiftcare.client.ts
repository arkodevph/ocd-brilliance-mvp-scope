export type ShiftCareEnvironment = Record<string, string | undefined>;
export interface ShiftCareOptions { env?: ShiftCareEnvironment; fetchImpl?: typeof fetch; timeoutMs?: number }
export interface ShiftCarePerson { id: string; name: string }
export interface ShiftCareShift extends ShiftCarePerson { startAt: string; endAt: string; clients: ShiftCarePerson[] | null; staff: ShiftCarePerson[] | null }
export type ShiftCareRecord = ShiftCarePerson | ShiftCareShift;
const REGIONS: Readonly<Record<string, string>> = Object.freeze({
  au: 'https://api.shiftcare.com/api/v3/',
  ca: 'https://api.ca.shiftcare.com/api/v3/',
  us: 'https://api.us.shiftcare.com/api/v3/',
  uk: 'https://api.uk.shiftcare.com/api/v3/'
});

export class ShiftCareError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export function configuration(env: ShiftCareEnvironment = process.env) {
  const region = (env.SHIFTCARE_API_REGION || 'au').trim().toLowerCase();
  const accountId = (env.SHIFTCARE_ACCOUNT_ID || '').trim();
  const apiKey = (env.SHIFTCARE_API_KEY || '').trim();
  const timeZone = (env.SHIFTCARE_TIME_ZONE || '').trim();
  const missing = ['SHIFTCARE_ACCOUNT_ID', 'SHIFTCARE_API_KEY', 'SHIFTCARE_TIME_ZONE'].filter(key => !env[key]?.trim());
  let error = '';
  if (!Object.hasOwn(REGIONS, region)) error = 'Select a supported ShiftCare region: au, ca, us, or uk.';
  else if (accountId && !/^\d+$/.test(accountId)) error = 'The ShiftCare account ID must be numeric.';
  else if (apiKey && (apiKey.length > 1024 || /[\r\n]/.test(apiKey))) error = 'The ShiftCare API key format is invalid.';
  else if (timeZone) {
    try { new Intl.DateTimeFormat('en', { timeZone }).format(); }
    catch (_) { error = 'Set a valid IANA time zone for the ShiftCare account.'; }
  }
  return { configured: missing.length === 0 && !error, missing, error, region, accountId, timeZone };
}

function invalid(message: string): never { throw new ShiftCareError(422, 'INVALID_QUERY', message); }
function positiveInteger(value: unknown, name: string, max: number) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > max) invalid(`${name} must be between 1 and ${max}.`);
  return Number(value);
}

// Find the UTC offset at this account's midnight, including a DST change day.
function midnight(date: string, timeZone: string): number {
  const expected = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(expected) || new Date(expected).toISOString().slice(0, 10) !== date) invalid('Enter valid dates in YYYY-MM-DD format.');
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let instant = expected;
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
    const observed = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    const delta = expected - observed;
    if (!delta) return instant;
    instant += delta;
  }
  invalid('This date has no midnight in the account time zone. Choose another date.');
}

export function shiftWindow(from: string, to: string, timeZone: string) {
  const start = midnight(from || '', timeZone);
  midnight(to || '', timeZone);
  const difference = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  if (difference < 0 || difference > 30) invalid('Choose a date range of up to 31 days, with the end on or after the start.');
  const next = new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return { from_date: new Date(start).toISOString(), to_date: new Date(midnight(next, timeZone) - 1).toISOString() };
}

function text(value: unknown): string { return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }
function person(record: unknown): ShiftCarePerson {
  if (!record || typeof record !== 'object') throw new ShiftCareError(502, 'INVALID_RESPONSE', 'ShiftCare returned an unsupported record.');
  const item = record as Record<string, unknown>;
  const fields = (item.attributes || item) as Record<string, unknown>;
  const name = text(fields.display_name) || text(fields.name) || [text(fields.first_name), text(fields.family_name || fields.last_name)].filter(Boolean).join(' ');
  return { id: text(item.id || fields.id), name };
}
function shift(record: unknown): ShiftCareShift {
  if (!record || typeof record !== 'object') throw new ShiftCareError(502, 'INVALID_RESPONSE', 'ShiftCare returned an unsupported record.');
  const item = record as Record<string, unknown>;
  const fields = (item.attributes || item) as Record<string, unknown>;
  return {
    id: text(item.id || fields.id), name: text(fields.name),
    startAt: text(fields.start_at), endAt: text(fields.end_at),
    clients: Array.isArray(fields.clients) ? fields.clients.map(person) : null,
    staff: Array.isArray(fields.staff) ? fields.staff.map(person) : null
  };
}

function pageRecords(payload: unknown, resource: string, page: number, perPage: number) {
  const object = payload as Record<string, unknown> | null;
  const nested = object?.data as Record<string, unknown> | undefined;
  const metadata = (object?._metadata || object?.meta) as Record<string, unknown> | undefined;
  const records = [payload, object?.data, object?.[resource], nested?.[resource]].find(Array.isArray);
  if (!records) throw new ShiftCareError(502, 'INVALID_RESPONSE', 'ShiftCare returned an unsupported list format.');
  const rawCount = metadata?.total_count;
  const count = /^\d+$/.test(String(rawCount)) ? Number(rawCount) : NaN;
  const total = Number.isSafeInteger(count) && count >= 0 ? count : null;
  return {
    records: records.map(resource === 'shifts' ? shift : person),
    pagination: { page, perPage, total, hasNext: total === null ? records.length >= perPage : page * perPage < total }
  };
}

export function createShiftCareClient({ env = process.env, fetchImpl = fetch, timeoutMs = 10000 }: ShiftCareOptions = {}) {
  const config = configuration(env);
  async function list(resource: string, params: Record<string, string | number> = {}) {
    if (!['clients', 'staff', 'shifts'].includes(resource)) invalid('Unsupported ShiftCare resource.');
    if (!config.configured) throw new ShiftCareError(503, 'NOT_CONFIGURED', config.error || 'The ShiftCare connection is awaiting account credentials.');
    const page = positiveInteger(params.page ?? 1, 'page', 10000);
    const perPage = positiveInteger(params.per_page ?? 20, 'per_page', 20);
    const query = { page, per_page: perPage, include_metadata: true };
    if (resource !== 'staff') Object.assign(query, { time_zone: 'account' });
    if (resource === 'shifts') Object.assign(query, shiftWindow(String(params.from || ''), String(params.to || ''), config.timeZone), { include_clients: true, include_staff: true });
    const url = new URL(resource, REGIONS[config.region]);
    url.search = new URLSearchParams(Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)]))).toString();
    let response;
    let payload;
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      response = await fetchImpl(url, {
        method: 'GET', redirect: 'error', cache: 'no-store', signal,
        headers: {
          Accept: 'application/json', 'User-Agent': 'OCD-Brilliance/1.0',
          Authorization: `Basic ${Buffer.from(`${config.accountId}:${env.SHIFTCARE_API_KEY!.trim()}`).toString('base64')}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) throw new ShiftCareError(502, 'SHIFTCARE_UNAUTHORIZED', 'ShiftCare rejected the account ID or API key. Check the credentials and region.');
        if (response.status === 403) throw new ShiftCareError(502, 'SHIFTCARE_FORBIDDEN', 'ShiftCare API access is not enabled for these credentials. Check the account plan and API permissions.');
        if (response.status === 429) {
          const delay = Number(response.headers.get('retry-after'));
          throw new ShiftCareError(503, 'SHIFTCARE_RATE_LIMITED', 'ShiftCare is limiting requests. Try again later.', Number.isSafeInteger(delay) && delay > 0 && delay <= 3600 ? delay : undefined);
        }
        throw new ShiftCareError(502, 'SHIFTCARE_UNAVAILABLE', 'ShiftCare could not complete the read. Try again later.');
      }
      // Bound the response as well as the time spent waiting for it.
      if (!response.body) throw new ShiftCareError(502, 'INVALID_RESPONSE', 'ShiftCare returned an empty response.');
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2 * 1024 * 1024) throw new ShiftCareError(502, 'INVALID_RESPONSE', 'The ShiftCare response was too large.');
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel().catch(() => {}); }
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch (_) { throw new ShiftCareError(502, 'INVALID_RESPONSE', 'ShiftCare did not return a valid JSON response.'); }
    } catch (error) {
      if (error instanceof ShiftCareError) throw error;
      if (signal.aborted) throw new ShiftCareError(504, 'SHIFTCARE_TIMEOUT', 'ShiftCare did not respond in time. Try again.');
      throw new ShiftCareError(502, 'SHIFTCARE_UNAVAILABLE', 'The server could not reach ShiftCare. Try again later.');
    }
    return { ...pageRecords(payload, resource, page, perPage), accountId: config.accountId, timeZone: config.timeZone, fetchedAt: new Date().toISOString() };
  }
  return { configuration: config, list };
}
