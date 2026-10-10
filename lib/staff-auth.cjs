const crypto = require('node:crypto');

function secretEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function staffEmail() { return process.env.WORKFLOW_STAFF_EMAIL?.trim().toLowerCase() || ''; }
function accounts() {
  if (process.env.WORKFLOW_STAFF_ACCOUNTS) {
    try {
      const users = JSON.parse(process.env.WORKFLOW_STAFF_ACCOUNTS);
      if (!Array.isArray(users) || users.some(user => typeof user.email !== 'string' || !user.email || typeof user.password !== 'string' || !user.password || !['admin', 'coordinator', 'reader'].includes(user.role))) return [];
      return users.map(user => ({ ...user, email: user.email.trim().toLowerCase() }));
    } catch { return []; }
  }
  return staffEmail() && process.env.WORKFLOW_STAFF_PASSWORD ? [{ email: staffEmail(), password: process.env.WORKFLOW_STAFF_PASSWORD, role: process.env.WORKFLOW_STAFF_ROLE || 'admin' }] : [];
}
function configured() { return Boolean(accounts().length && process.env.WORKFLOW_SESSION_SECRET?.length >= 32); }
function authenticate(email, password) {
  return accounts().find(user => user.email === String(email || '').trim().toLowerCase() && secretEqual(password, user.password))?.email || null;
}
function staffRole(email) { return accounts().find(user => user.email === email)?.role || ''; }
function ownerOptions() {
  return accounts().filter(user => ['admin', 'coordinator'].includes(user.role))
    .map(user => ({ email: user.email, name: typeof user.name === 'string' && user.name.trim() ? user.name.trim() : user.email, role: user.role }));
}
function intakeOwner() { return accounts().find(user => ['admin', 'coordinator'].includes(user.role))?.email || ''; }
function permits(email, permission) {
  const role = staffRole(email);
  return role === 'admin' || (role === 'coordinator' && ['read', 'write'].includes(permission)) || (role === 'reader' && permission === 'read');
}

function staffSession(req) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)ocd_staff=([^;]+)/);
  if (!match || !configured()) return null;
  try {
    const [value, signature, extra] = decodeURIComponent(match[1]).split('.');
    if (!value || !signature || extra !== undefined) return null;
    const expected = crypto.createHmac('sha256', process.env.WORKFLOW_SESSION_SECRET).update(value).digest('base64url');
    if (!secretEqual(signature, expected)) return null;
    const session = JSON.parse(Buffer.from(value, 'base64url').toString());
    return staffRole(session.email) && Number.isFinite(session.expires) && session.expires > Date.now() ? session.email : null;
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

module.exports = { secretEqual, staffEmail, configured, staffSession, sessionCookie, originAllowed, authenticate, staffRole, permits, intakeOwner, ownerOptions };
