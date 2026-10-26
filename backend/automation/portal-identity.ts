import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { Request } from '../http';
import { AutomationError } from './types';
import { hash } from './service';

const scrypt = promisify(crypto.scrypt);
export interface PortalAccount { email: string; kind: 'worker' | 'client'; nativeId: string; salt: string; passwordHash: string; name?: string; }
export class PortalIdentity {
  constructor(readonly env = process.env) {}
  accounts(): PortalAccount[] {
    let accounts: unknown;
    try { accounts = JSON.parse(this.env.OCD_PORTAL_ACCOUNTS || '[]'); } catch { throw new AutomationError(503, 'Configure valid service access accounts.'); }
    if (!Array.isArray(accounts) || accounts.length > 1000 || accounts.some(a => !a || !['worker','client'].includes(a.kind) || !/^[1-9]\d*$/.test(a.nativeId) || !/^[a-f0-9]{32,128}$/.test(a.salt) || !/^[a-f0-9]{128}$/.test(a.passwordHash) || typeof a.email !== 'string' || !/^\S+@\S+\.\S+$/.test(a.email))) throw new AutomationError(503, 'Service accounts require an email, native person ID and salted password hash.');
    const values = accounts.map(a => ({ ...a, email: a.email.trim().toLowerCase() })) as PortalAccount[];
    if (new Set(values.map(a => a.email)).size !== values.length) throw new AutomationError(503, 'Service account emails must be unique.');
    return values;
  }
  configured(): boolean { return this.accounts().length > 0 && (this.env.WORKFLOW_SESSION_SECRET?.length || 0) >= 32; }
  async authenticate(email: string, password: string): Promise<PortalAccount | null> {
    if (password.length > 200 || !this.configured()) return null;
    const account = this.accounts().find(a => a.email === email.trim().toLowerCase());
    // Perform the same expensive operation for an unknown account.
    const calculated = await scrypt(password, account?.salt || '0'.repeat(32), 64) as Buffer;
    const expected = Buffer.from(account?.passwordHash || '0'.repeat(128), 'hex');
    return crypto.timingSafeEqual(calculated, expected) && account ? account : null;
  }
  private signature(value: string): string { return crypto.createHmac('sha256', this.env.WORKFLOW_SESSION_SECRET!).update(`portal:${value}`).digest('base64url'); }
  cookie(account: PortalAccount, req: Request): string {
    const value = Buffer.from(JSON.stringify({ email: account.email, account: hash(account), scope: this.env.SHIFTCARE_ACCOUNT_ID || 'local', expires: Date.now() + 2 * 3600000 })).toString('base64url');
    return `ocd_portal=${value}.${this.signature(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=7200${('encrypted' in req.socket && req.socket.encrypted) || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;
  }
  session(req: Request): PortalAccount | null {
    if (!this.configured()) return null;
    const match = (req.headers.cookie || '').match(/(?:^|;\s*)ocd_portal=([^;]+)/);
    if (!match) return null;
    try {
      const [value, signature, extra] = decodeURIComponent(match[1]).split('.');
      if (!value || !signature || extra) return null;
      const expected = Buffer.from(this.signature(value)), supplied = Buffer.from(signature);
      if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
      const data = JSON.parse(Buffer.from(value, 'base64url').toString()), account = this.accounts().find(a => a.email === data.email);
      return account && data.scope === (this.env.SHIFTCARE_ACCOUNT_ID || 'local') && data.account === hash(account) && Number.isFinite(data.expires) && data.expires > Date.now() ? account : null;
    } catch { return null; }
  }
}
