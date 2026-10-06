const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Redis } = require('@upstash/redis');

const file = path.join(process.env.WORKFLOW_DATA_DIR || path.join(__dirname, '..', '.local'), 'intakes.json');
let localWrite = Promise.resolve();
const statuses = ['New', 'Contacting', 'Reviewing', 'Ready for ShiftCare', 'Entered in ShiftCare', 'Closed'];

function storage() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = Redis.fromEnv();
    const unpack = value => typeof value === 'string' ? JSON.parse(value) : value;
    return {
      all: async () => Object.values(await redis.hgetall('ocd:intakes') || {}).map(unpack),
      get: async id => unpack(await redis.hget('ocd:intakes', id)),
      set: async record => redis.hset('ocd:intakes', { [record.id]: JSON.stringify(record) })
    };
  }
  if (process.env.VERCEL) return null;
  async function read() {
    try { return JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  }
  return {
    all: async () => { await localWrite; return Object.values(await read()); },
    get: async id => { await localWrite; return (await read())[id] || null; },
    set: record => {
      const next = localWrite.then(async () => {
        await fs.mkdir(path.dirname(file), { recursive: true });
        const records = await read();
        records[record.id] = record;
        const temp = `${file}.tmp`;
        await fs.writeFile(temp, JSON.stringify(records, null, 2), { mode: 0o600 });
        await fs.rename(temp, file);
      });
      localWrite = next.catch(() => {});
      return next;
    }
  };
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(data));
}
function secretEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function staffEmail() { return process.env.WORKFLOW_STAFF_EMAIL?.trim().toLowerCase() || ''; }
function configured() { return Boolean(staffEmail() && process.env.WORKFLOW_STAFF_PASSWORD && process.env.WORKFLOW_SESSION_SECRET?.length >= 32); }
function cookie(req) {
  const match = (req.headers.cookie || '').match(/(?:^|; )ocd_staff=([^;]+)/);
  if (!match || !configured()) return null;
  const [value, signature] = decodeURIComponent(match[1]).split('.');
  if (!value || !signature) return null;
  const expected = crypto.createHmac('sha256', process.env.WORKFLOW_SESSION_SECRET).update(value).digest('base64url');
  if (!secretEqual(signature, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(value, 'base64url').toString());
    return session.email === staffEmail() && session.expires > Date.now() ? session.email : null;
  } catch (_) { return null; }
}
function sessionCookie(email, req) {
  const value = Buffer.from(JSON.stringify({ email, expires: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.WORKFLOW_SESSION_SECRET).update(value).digest('base64url');
  return `ocd_staff=${value}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let text = '';
  for await (const part of req) {
    text += part;
    if (text.length > 20000) throw new Error('Request too large');
  }
  return JSON.parse(text || '{}');
}
function clean(value, limit = 200) { return String(value || '').trim().slice(0, limit); }
function covered(postcode) {
  if (!configured() || !storage()) return { status: 'unconfigured', message: 'Requests are not open yet. Please contact the office.' };
  const approved = (process.env.SERVICE_POSTCODES || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!approved.length) return { status: 'unconfigured', message: 'Service area has not been configured. Please contact the office.' };
  if (!/^\d{4}$/.test(postcode)) return { status: 'invalid', message: 'Enter a four-digit Australian postcode.' };
  return approved.includes(postcode)
    ? { status: 'covered', message: 'We may be able to help in this area. Availability is confirmed after review.' }
    : { status: 'outside', message: 'We are not currently taking intake requests in this postcode. Please contact the office if you need advice.' };
}
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === req.headers.host || host === req.headers['x-forwarded-host'];
  } catch (_) { return false; }
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action');
    if (!originAllowed(req)) return send(res, 403, { error: 'Request origin is not allowed.' });
    if (action === 'area' && req.method === 'GET') return send(res, 200, covered(clean(url.searchParams.get('postcode'), 10)));
    if (action === 'session' && req.method === 'GET') return send(res, 200, { email: cookie(req), configured: configured(), storageReady: Boolean(storage()) });
    if (action === 'login' && req.method === 'POST') {
      const data = await body(req);
      if (!configured()) return send(res, 503, { error: 'Staff sign-in has not been configured.' });
      if (clean(data.email).toLowerCase() !== staffEmail() || !secretEqual(data.password, process.env.WORKFLOW_STAFF_PASSWORD)) return send(res, 401, { error: 'Email or password is incorrect.' });
      return send(res, 200, { email: staffEmail() }, { 'Set-Cookie': sessionCookie(staffEmail(), req) });
    }
    if (action === 'logout' && req.method === 'POST') return send(res, 200, { ok: true }, { 'Set-Cookie': 'ocd_staff=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    const db = storage();
    if (!db) return send(res, 503, { error: 'Server storage is not configured.' });
    if (action === 'intake' && req.method === 'POST') {
      const data = await body(req);
      const postcode = clean(data.postcode, 10);
      if (covered(postcode).status !== 'covered') return send(res, 422, { error: 'Please check a covered postcode before submitting.' });
      const name = clean(data.name, 120), email = clean(data.email, 200), phone = clean(data.phone, 40);
      const service = clean(data.service, 120), suburb = clean(data.suburb, 120), notes = clean(data.notes, 2000);
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || !phone || !service || !suburb || data.consent !== true) return send(res, 422, { error: 'Complete the required details and consent before submitting.' });
      const now = new Date().toISOString();
      const record = { id: `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, name, email, phone, service, suburb, postcode, notes, source: 'Website', status: 'New', owner: '', nextAction: 'Assign an owner and contact the requester', followUp: '', shiftCareId: '', createdAt: now, updatedAt: now, consentAt: now, history: [{ at: now, by: 'Public form', event: 'Submitted intake request' }] };
      await db.set(record);
      return send(res, 201, { id: record.id, message: 'Request received. The office will review it and contact you.' });
    }
    const staff = cookie(req);
    if (!staff) return send(res, 401, { error: 'Sign in to continue.' });
    if (action === 'staff-intake' && req.method === 'POST') {
      const data = await body(req);
      const name = clean(data.name, 120), email = clean(data.email, 200), phone = clean(data.phone, 40);
      const service = clean(data.service, 120), suburb = clean(data.suburb, 120), postcode = clean(data.postcode, 10), notes = clean(data.notes, 2000), source = clean(data.source, 30);
      if (!name || (!email && !phone) || (email && !/^\S+@\S+\.\S+$/.test(email)) || !service || !['Email', 'Phone', 'Coordinator'].includes(source) || (postcode && !/^\d{4}$/.test(postcode))) return send(res, 422, { error: 'Add a name, contact method, service, and source.' });
      const now = new Date().toISOString();
      const record = { id: `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, name, email, phone, service, suburb, postcode, notes, source, status: 'New', owner: staff, nextAction: 'Check service area and contact requester', followUp: '', shiftCareId: '', createdAt: now, updatedAt: now, consentAt: null, history: [{ at: now, by: staff, event: `Logged ${source.toLowerCase()} enquiry` }] };
      await db.set(record);
      return send(res, 201, { record });
    }
    if (action === 'intakes' && req.method === 'GET') {
      const records = await db.all();
      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, { records });
    }
    if (action === 'record' && req.method === 'PATCH') {
      const data = await body(req);
      const record = await db.get(clean(data.id, 40));
      if (!record) return send(res, 404, { error: 'Request not found.' });
      const status = clean(data.status, 40), owner = clean(data.owner, 120), nextAction = clean(data.nextAction, 250), followUp = clean(data.followUp, 20), shiftCareId = clean(data.shiftCareId, 100), postcode = clean(data.postcode, 10), suburb = clean(data.suburb, 120);
      if (!statuses.includes(status) || !nextAction || (status !== 'New' && !owner) || (status === 'Entered in ShiftCare' && !shiftCareId) || (followUp && !/^\d{4}-\d{2}-\d{2}$/.test(followUp)) || (postcode && !/^\d{4}$/.test(postcode))) return send(res, 422, { error: 'Set a valid status, owner, next action, postcode, and ShiftCare ID when applicable.' });
      if (['Ready for ShiftCare', 'Entered in ShiftCare'].includes(status) && covered(postcode).status !== 'covered') return send(res, 422, { error: 'Confirm a covered service postcode before the ShiftCare handoff.' });
      record.status = status; record.owner = owner; record.nextAction = nextAction; record.followUp = followUp; record.shiftCareId = shiftCareId; record.postcode = postcode; record.suburb = suburb;
      record.updatedAt = new Date().toISOString();
      record.history.unshift({ at: record.updatedAt, by: staff, event: `Updated to ${status}${owner ? ` · owner ${owner}` : ''}` });
      await db.set(record);
      return send(res, 200, { record });
    }
    return send(res, 404, { error: 'Unknown action.' });
  } catch (error) {
    console.error('Workflow request failed:', error);
    send(res, error.message === 'Request too large' ? 413 : 500, { error: 'The request could not be completed.' });
  }
};
