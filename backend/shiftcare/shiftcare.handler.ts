import type { Response } from 'express';
import type { ApiHandler } from '../http';
const { staffSession, originAllowed } = require('../../lib/staff-auth.cjs');
import { createShiftCareClient, ShiftCareError, type ShiftCareOptions } from './shiftcare.client';
import { checkShiftCareReadiness } from './shiftcare-readiness';

function send(
  res: Response,
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

export function createShiftCareHandler(options?: ShiftCareOptions): ApiHandler {
  return async (req, res) => {
    if (!originAllowed(req)) return send(res, 403, { error: 'Request origin is not allowed.' });
    if (!staffSession(req)) return send(res, 401, { error: 'Sign in to the office to continue.' });
    if (req.method !== 'GET')
      return send(res, 405, { error: 'This connection supports reads only.' }, { Allow: 'GET' });
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const action = url.searchParams.get('action') || 'status';
      if (!['status', 'check', 'readiness', 'clients', 'staff', 'shifts'].includes(action))
        return send(res, 404, { error: 'Unknown ShiftCare action.' });
      const client = createShiftCareClient(options);
      if (action === 'status') return send(res, 200, { ...client.configuration, readOnly: true });
      if (action === 'readiness')
        return send(
          res,
          200,
          await checkShiftCareReadiness(
            client,
            url.searchParams.get('from') || '',
            url.searchParams.get('to') || '',
          ),
        );
      if (action === 'check') {
        const result = await client.list('clients', { per_page: 1 });
        return send(res, 200, {
          connected: true,
          checkedAt: result.fetchedAt,
          accountId: result.accountId,
          timeZone: result.timeZone,
        });
      }
      const result = await client.list(action, Object.fromEntries(url.searchParams));
      return send(res, 200, result);
    } catch (error) {
      if (error instanceof ShiftCareError)
        return send(
          res,
          error.status,
          { error: error.message, code: error.code },
          error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {},
        );
      return send(res, 500, {
        error: 'The ShiftCare request could not be completed.',
      });
    }
  };
}
