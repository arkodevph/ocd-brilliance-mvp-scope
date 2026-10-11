import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { Redis } from '@upstash/redis';
import type { ArrivalData, SeedData } from './types';
export type ArrivalStore = { redis: Redis; file?: never } | { file: string; redis?: never };
let writes: Promise<unknown> = Promise.resolve();
const root = path.resolve(__dirname, '../..');

async function seed(): Promise<ArrivalData> {
  const context: { window: { OCD_DEMO_SEED?: SeedData } } = { window: {} };
  vm.runInNewContext(await fs.readFile(path.join(root, 'workspace/data.js'), 'utf8'), context);
  const data = context.window.OCD_DEMO_SEED;
  if (!data) throw new Error('Prototype bookings are unavailable.');
  return { revision: '', bookings: data.bookings.map(b => ({ id: b.id, workerId: b.workerId, participantId: b.participantId, date: b.date, start: b.start, status: b.status, visited: data.visits.some(v => v.bookingId === b.id && v.clockIn), destination: data.participants.find(p => p.id === b.participantId)?.location?.coordinates || null })), journeys: {} };
}

export function storage(): ArrivalStore | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return { redis: Redis.fromEnv() };
  if (process.env.VERCEL) return null;
  return { file: path.join(process.env.WORKFLOW_DATA_DIR || path.join(root, '.local'), 'journeys.json') };
}

export async function read(store: ArrivalStore): Promise<ArrivalData> {
  if (store.redis) {
    const value = await store.redis.get<ArrivalData | string>('ocd:journeys');
    return value ? typeof value === 'string' ? JSON.parse(value) : value : seed();
  }
  try { return JSON.parse(await fs.readFile(store.file, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return seed(); throw error; }
}

export async function update<T>(store: ArrivalStore, change: (data: ArrivalData) => T): Promise<T> {
  async function commit() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const data = await read(store), revision = data.revision;
      const result = change(data);
      data.revision = crypto.randomUUID();
      if (store.redis) {
        const saved = await store.redis.eval(`
          local previous = redis.call('GET', KEYS[1])
          if previous and cjson.decode(previous).revision ~= ARGV[1] then return 0 end
          if not previous and ARGV[1] ~= '' then return 0 end
          redis.call('SET', KEYS[1], ARGV[2]); return 1
        `, ['ocd:journeys'], [revision, JSON.stringify(data)]);
        if (!saved) continue;
      } else {
        await fs.mkdir(path.dirname(store.file), { recursive: true });
        const temporary = `${store.file}.${crypto.randomUUID()}.tmp`;
        await fs.writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
        await fs.rename(temporary, store.file);
      }
      return result;
    }
    throw Object.assign(new Error('Arrival data changed. Retry the update.'), { status: 409 });
  }
  if (store.redis) return commit();
  const next = writes.then(commit);
  writes = next.catch(() => {});
  return next;
}
