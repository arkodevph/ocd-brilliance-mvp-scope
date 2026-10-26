import { configuration, shiftWindow } from '../shiftcare/shiftcare.client';
import { AutomationError, NativeRejection, object, type Data } from './types';

const bases: Record<string, string> = { au: 'https://api.shiftcare.com/api/v3/', ca: 'https://api.ca.shiftcare.com/api/v3/', us: 'https://api.us.shiftcare.com/api/v3/', uk: 'https://api.uk.shiftcare.com/api/v3/' };
export const nativeId = (value: unknown): string => {
  const result = String(value ?? '');
  if (!/^[1-9]\d*$/.test(result) || !Number.isSafeInteger(Number(result))) throw new AutomationError(422, 'Choose an actual numeric ShiftCare record ID.');
  return result;
};
export const unwrap = (data: Data): Data => Object.keys(object(data.data)).length ? object(data.data) : data;

// Server-owned paths only. Continuation links and credentials never leave this class.
export class ShiftCareGateway {
  constructor(readonly env = process.env, readonly fetchImpl: typeof fetch = fetch) {}
  async response(method: string, path: string, fields?: Data | FormData): Promise<Response> {
    const config = configuration(this.env);
    if (!config.configured) throw new AutomationError(503, 'Configure the ShiftCare API account, key and time zone.');
    const url = new URL(path, bases[config.region]);
    if (url.origin !== new URL(bases[config.region]).origin || !url.pathname.startsWith('/api/v3/') || url.username || url.password || url.hash) throw new AutomationError(422, 'Unsupported ShiftCare request.');
    const multipart = fields instanceof FormData;
    const response = await this.fetchImpl(url, {
      method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json', Authorization: `Basic ${Buffer.from(`${config.accountId}:${this.env.SHIFTCARE_API_KEY!.trim()}`).toString('base64')}`, ...(!multipart && fields ? { 'Content-Type': 'application/json' } : {}) },
      ...(fields ? { body: multipart ? fields : JSON.stringify(fields) } : {}),
    });
    if (!response.ok) {
      if (method !== 'GET' && [400,401,403,404,409,422].includes(response.status)) throw new NativeRejection(409, 'ShiftCare rejected this action. Refresh the record and check the approved fields and permissions.');
      throw new AutomationError(response.status === 429 ? 503 : 502, 'The ShiftCare read is incomplete. Check access or retry after the service becomes available.');
    }
    return response;
  }
  async bytes(response: Response, limit = 6 * 1024 * 1024): Promise<Buffer> {
    const reader = response.body?.getReader();
    if (!reader) throw new AutomationError(502, 'The integration returned no response body.');
    const chunks: Uint8Array[] = []; let length = 0;
    try {
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.length;
        if (length > limit) throw new AutomationError(413, 'The integration response exceeded the supported size.');
        chunks.push(part.value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    return Buffer.concat(chunks);
  }
  async json(path: string, query: Data = {}, method = 'GET', fields?: Data | FormData): Promise<Data> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) for (const v of value) params.append(`${key}[]`, String(v));
      else if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const response = await this.response(method, `${path}${params.size ? `?${params}` : ''}`, fields);
    if (response.status === 204) return {};
    const bytes = await this.bytes(response, 2 * 1024 * 1024);
    try { const data = JSON.parse(bytes.toString('utf8')); return Array.isArray(data) ? { data } : object(data); }
    catch { throw new AutomationError(502, 'ShiftCare returned invalid JSON.'); }
  }
  async list(path: string, key: string, query: Data = {}, maxPages = 15): Promise<Data[]> {
    const all: Data[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const data = await this.json(path, { ...query, page, per_page: 20, include_metadata: true });
      const nested = object(data.data), values = data[key] ?? nested[key] ?? data.data;
      if (!Array.isArray(values)) throw new AutomationError(502, `ShiftCare returned an unsupported ${key} list.`);
      const rows = values.map(object); all.push(...rows);
      const metadata = object(data._metadata || data.meta), total = Number(metadata.total_count), pages = Number(metadata.total_pages);
      if ((Number.isInteger(total) && total >= 0 && all.length >= total) || (Number.isInteger(pages) && pages > 0 && page >= pages) || rows.length < 20) return all;
    }
    throw new AutomationError(422, 'This read exceeds the supported batch. Choose a smaller date range or person scope; partial data was not approved.');
  }
  window(from: string, to: string): Data { return shiftWindow(from, to, configuration(this.env).timeZone); }
}
