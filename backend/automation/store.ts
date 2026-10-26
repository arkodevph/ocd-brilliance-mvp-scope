import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { Redis } from '@upstash/redis';
import { AutomationError, type State } from './types';

const empty = (): State => ({ revision: 0, jobs: [], schedules: [], connectors: {} });
const writes = new Map<string, Promise<unknown>>();
const pools = new Map<string, Pool>();
export class AutomationStore {
  readonly scope: string;
  readonly file: string;
  readonly kind: 'postgres' | 'redis' | 'file';
  private pool?: Pool;
  private redis?: Redis;
  constructor(options: { directory?: string; pool?: Pool; redis?: Redis; scope?: string; env?: NodeJS.ProcessEnv } = {}) {
    const env = options.env || process.env;
    this.scope = options.scope || env.SHIFTCARE_ACCOUNT_ID?.trim() || 'local';
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(this.scope)) throw new AutomationError(503, 'Configure a valid automation account scope.');
    this.file = path.join(options.directory || env.WORKFLOW_DATA_DIR || path.resolve(__dirname, '../../.local'), `automation-${this.scope}.json`);
    if (options.pool || env.DATABASE_URL) {
      if (!options.pool && !pools.has(env.DATABASE_URL!)) pools.set(env.DATABASE_URL!, new Pool({ connectionString: env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 }));
      this.pool = options.pool || pools.get(env.DATABASE_URL!); this.kind = 'postgres';
    } else if (options.redis || (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)) {
      this.redis = options.redis || new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! }); this.kind = 'redis';
    } else {
      if (env.VERCEL) throw new AutomationError(503, 'Configure PostgreSQL or the existing shared Redis storage for automation.');
      this.kind = 'file';
    }
  }
  private async local(): Promise<State> {
    try { return JSON.parse(await fs.readFile(this.file, 'utf8')); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return empty(); throw e; }
  }
  private async lockFile(): Promise<() => Promise<void>> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const file = `${this.file}.lock`, token = crypto.randomUUID();
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const handle = await fs.open(file, 'wx', 0o600);
        try { await handle.writeFile(JSON.stringify({ token, pid: process.pid })); }
        finally { await handle.close(); }
        return async () => {
          try { const current = JSON.parse(await fs.readFile(file, 'utf8')); if (current.token === token) await fs.unlink(file); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        try {
          const current = JSON.parse(await fs.readFile(file, 'utf8'));
          if (Number.isInteger(current.pid) && current.pid > 0) {
            try { process.kill(current.pid, 0); }
            catch (check) { if ((check as NodeJS.ErrnoException).code === 'ESRCH') await fs.unlink(file); }
          }
        } catch (_) { /* Another process may still be writing the lock metadata. */ }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    throw new AutomationError(409, 'The local queue is busy. Refresh and retry.');
  }
  async read(): Promise<State> {
    if (this.pool) {
      const result = await this.pool.query('SELECT state FROM automation_state WHERE scope=$1', [this.scope]);
      return result.rows[0]?.state || empty();
    }
    if (this.redis) {
      const value = await this.redis.get<State | string>(`ocd:automation:${this.scope}`);
      return typeof value === 'string' ? JSON.parse(value) : value || empty();
    }
    await writes.get(this.file); return this.local();
  }
  async saveFile(id: string, content: Buffer): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(id) || content.length > 5 * 1024 * 1024) throw new AutomationError(422, 'Invalid evidence file.');
    if (this.pool) { await this.pool.query('INSERT INTO automation_documents(scope,id,content) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [this.scope, id, content]); return; }
    if (this.redis) { await this.redis.set(`ocd:automation-file:${this.scope}:${id}`, content.toString('base64'), { nx: true }); return; }
    const folder = path.join(path.dirname(this.file), `automation-files-${this.scope}`);
    await fs.mkdir(folder, { recursive: true, mode: 0o700 });
    try { await fs.writeFile(path.join(folder, id), content, { flag: 'wx', mode: 0o600 }); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
  }
  async readFile(id: string): Promise<Buffer> {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new AutomationError(404, 'Evidence file not found.');
    if (this.pool) { const data = await this.pool.query('SELECT content FROM automation_documents WHERE scope=$1 AND id=$2', [this.scope, id]); if (data.rows[0]) return data.rows[0].content; }
    else if (this.redis) { const data = await this.redis.get<string>(`ocd:automation-file:${this.scope}:${id}`); if (data) return Buffer.from(data, 'base64'); }
    else { try { return await fs.readFile(path.join(path.dirname(this.file), `automation-files-${this.scope}`, id)); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; } }
    throw new AutomationError(404, 'Evidence file not found.');
  }
  // Only synchronous state transitions are accepted: never hold a lock across I/O.
  async mutate<T>(change: (state: State) => T): Promise<T> {
    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO automation_state(scope,state) VALUES($1,$2) ON CONFLICT DO NOTHING', [this.scope, empty()]);
        const row = await client.query('SELECT state FROM automation_state WHERE scope=$1 FOR UPDATE', [this.scope]);
        const state: State = row.rows[0].state, result = change(state);
        state.revision++;
        await client.query('UPDATE automation_state SET state=$2,revision=$3,updated_at=now() WHERE scope=$1', [this.scope, state, state.revision]);
        await client.query('COMMIT'); return result;
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
    }
    const commit = async () => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const state = this.redis ? await this.read() : await this.local();
        const expected = state.revision, result = change(state); state.revision++;
        if (this.redis) {
          const saved = await this.redis.eval(`local old=redis.call('GET',KEYS[1]); if old and cjson.decode(old).revision~=tonumber(ARGV[1]) then return 0 end; if not old and tonumber(ARGV[1])~=0 then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1`, [`ocd:automation:${this.scope}`], [expected, JSON.stringify(state)]);
          if (!saved) continue;
        } else {
          await fs.mkdir(path.dirname(this.file), { recursive: true });
          const temp = `${this.file}.${crypto.randomUUID()}.tmp`;
          await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 });
          await fs.rename(temp, this.file);
        }
        return result;
      }
      throw new AutomationError(409, 'Workflow state changed. Refresh and try again.');
    };
    if (this.redis) return commit();
    const next = (writes.get(this.file) || Promise.resolve()).then(async () => {
      const unlock = await this.lockFile();
      try { return await commit(); } finally { await unlock(); }
    });
    writes.set(this.file, next.catch(() => {})); return next;
  }
  static async close(): Promise<void> { await Promise.all([...pools.values()].map(p => p.end())); pools.clear(); }
}
