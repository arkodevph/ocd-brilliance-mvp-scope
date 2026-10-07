const crypto = require('node:crypto');

function secretEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function staffEmail() { return process.env.WORKFLOW_STAFF_EMAIL?.trim().toLowerCase() || ''; }
function configured() { return Boolean(staffEmail() && process.env.WORKFLOW_STAFF_PASSWORD && process.env.WORKFLOW_SESSION_SECRET?.length >= 32); }

function staffSession(req) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)ocd_staff=([^;]+)/);
  if (!match || !configured()) return null;
  try {
    const [value, signature, extra] = decodeURIComponent(match[1]).split('.');
    if (!value || !signature || extra !== undefined) return null;
    const expected = crypto.createHmac('sha256', process.env.WORKFLOW_SESSION_SECRET).update(value).digest('base64url');
    if (!secretEqual(signature, expected)) return null;
    const session = JSON.parse(Buffer.from(value, 'base64url').toString());
    return session.email === staffEmail() && Number.isFinite(session.expires) && session.expires > Date.now() ? session.email : null;
  } catch (_) { return null; }
}

function sessionCookie(email, req) {
  const value = Buffer.from(JSON.stringify({ email, expires: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.WORKFLOW_SESSION_SECRET).update(value).digest('base64url');
  return `ocd_staff=${value}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === req.headers.host || host === req.headers['x-forwarded-host'];
  } catch (_) { return false; }
}

module.exports = { secretEqual, staffEmail, configured, staffSession, sessionCookie, originAllowed };
