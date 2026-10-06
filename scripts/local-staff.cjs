const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

async function seedLocalStaff() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return null;
  if (['WORKFLOW_STAFF_EMAIL', 'WORKFLOW_STAFF_PASSWORD', 'WORKFLOW_SESSION_SECRET'].some(key => process.env[key])) return null;

  const dir = process.env.WORKFLOW_DATA_DIR || path.join(__dirname, '..', '.local');
  const file = path.join(dir, 'seeded-staff.json');
  await fs.mkdir(dir, { recursive: true });
  let account;
  try {
    account = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    account = {
      email: 'office@ocd-brilliance.local',
      password: crypto.randomBytes(18).toString('base64url'),
      sessionSecret: crypto.randomBytes(32).toString('hex')
    };
    try {
      await fs.writeFile(file, JSON.stringify(account, null, 2), { mode: 0o600, flag: 'wx' });
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError;
      account = JSON.parse(await fs.readFile(file, 'utf8'));
    }
  }
  if (!account.email || !account.password || !account.sessionSecret || account.sessionSecret.length < 32) {
    throw new Error(`Invalid local staff account in ${file}`);
  }
  process.env.WORKFLOW_STAFF_EMAIL = account.email;
  process.env.WORKFLOW_STAFF_PASSWORD = account.password;
  process.env.WORKFLOW_SESSION_SECRET = account.sessionSecret;
  process.env.SERVICE_POSTCODES ||= '6024,6025,6026,6027,6065';
  return { email: account.email, password: account.password, file };
}

module.exports = seedLocalStaff;
