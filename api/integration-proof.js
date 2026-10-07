const { staffSession, originAllowed } = require('../lib/staff-auth.cjs');
const { ShiftCareError } = require('../lib/shiftcare.cjs');
const { createProofStore } = require('../lib/integration-proof.cjs');
function send(res, status, data, headers = {}) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(JSON.stringify(data)); }
function createHandler(options = {}) {
  const store = createProofStore(options);
  return async (req, res) => {
    if (!originAllowed(req)) return send(res, 403, { error: 'Request origin is not allowed.' });
    if (!staffSession(req)) return send(res, 401, { error: 'Sign in to the office to view integration evidence.' });
    try {
      if (req.method === 'GET') return send(res, 200, await store.status());
      if (req.method !== 'POST') return send(res, 405, { error: 'Use GET to load evidence or POST to run read-only checks.' }, { Allow: 'GET, POST' });
      let input = req.body;
      if (!input || typeof input !== 'object') {
        let raw = ''; for await (const part of req) { raw += part; if (raw.length > 3000) throw new ShiftCareError(413, 'BODY_TOO_LARGE', 'The review request is too large.'); }
        try { input = JSON.parse(raw); } catch { throw new ShiftCareError(422, 'INVALID_INPUT', 'Send a valid review request.'); }
      }
      if (!input || Array.isArray(input) || input.action !== 'run') return send(res, 422, { error: 'Only read-only review runs are supported. Native writes use the supervised MCP handoff.' });
      return send(res, 200, await store.run(input));
    } catch (e) {
      if (e instanceof ShiftCareError) return send(res, e.status, { error: e.message, code: e.code });
      return send(res, 503, { error: 'Integration evidence could not be loaded or saved. Check the private local evidence files.' });
    }
  };
}
module.exports = createHandler(); module.exports.createHandler = createHandler;
