import type { Request, Response } from 'express';
import type { PushSubscription } from 'web-push';
import type { ErrorDetails } from '../http';
interface SubscriptionRecord {
  subscription: PushSubscription;
  lastTest: number;
}
interface VapidKeys {
  publicKey: string;
  privateKey: string;
  adminToken: string;
}
interface PushInput {
  action: string;
  kind: keyof typeof messages;
  subscription: PushSubscription;
  endpoint: string;
}
interface PushMessage {
  title: string;
  body: string;
  route: string;
}
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpush from 'web-push';
import { Redis } from '@upstash/redis';

const root = path.resolve(__dirname, '../..');
const localDir = process.env.PUSH_DATA_DIR || path.join(root, '.local');
const subscriptionsFile = path.join(localDir, 'push-subscriptions.json');
const keysFile = path.join(localDir, 'push-keys.json');
const redisKey = 'ocd-brilliance:demo-push:subscriptions';
const messages = {
  update: {
    title: 'OCD Brilliance demo',
    body: 'A new demo update is ready. Open the app to take a look.',
    route: 'office/overview',
  },
  booking: {
    title: 'Demo booking update',
    body: 'A sample booking changed in OCD Brilliance.',
    route: 'client/home',
  },
  cover: {
    title: 'Demo cover request',
    body: 'A sample visit needs cover in OCD Brilliance.',
    route: 'office/schedule',
  },
};
let lastLocalBroadcast = 0;
let localMutation = Promise.resolve();

async function keys(): Promise<VapidKeys | null> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      adminToken: process.env.PUSH_DEMO_ADMIN_TOKEN || '',
    };
  }
  if (process.env.VERCEL) return null;
  await fs.mkdir(localDir, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(keysFile, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const generated = {
    ...webpush.generateVAPIDKeys(),
    adminToken: crypto.randomBytes(24).toString('base64url'),
  };
  try {
    await fs.writeFile(keysFile, JSON.stringify(generated, null, 2), {
      mode: 0o600,
      flag: 'wx',
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      return JSON.parse(await fs.readFile(keysFile, 'utf8'));
    throw error;
  }
  return generated;
}

async function readLocal(): Promise<Record<string, SubscriptionRecord>> {
  try {
    return JSON.parse(await fs.readFile(subscriptionsFile, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

function mutateLocal(change: (records: Record<string, SubscriptionRecord>) => void) {
  const operation = localMutation.then(async () => {
    const records = await readLocal();
    change(records);
    const temporary = `${subscriptionsFile}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(records, null, 2), {
      mode: 0o600,
    });
    await fs.rename(temporary, subscriptionsFile);
  });
  localMutation = operation.catch(() => {});
  return operation;
}

function storage() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = Redis.fromEnv();
    const unpack = (value: unknown): SubscriptionRecord | null =>
      typeof value === 'string' ? JSON.parse(value) : (value as SubscriptionRecord | null);
    return {
      get: async (id: string) => unpack(await redis.hget(redisKey, id)),
      set: async (id: string, record: SubscriptionRecord) =>
        redis.hset(redisKey, { [id]: JSON.stringify(record) }),
      delete: async (id: string) => redis.hdel(redisKey, id),
      all: async () =>
        ((await redis.hvals(redisKey)) || [])
          .map(unpack)
          .filter(
            (value: SubscriptionRecord | null): value is SubscriptionRecord => value !== null,
          ),
    };
  }
  if (process.env.VERCEL) return null;
  return {
    get: async (id: string) => {
      await localMutation;
      return (await readLocal())[id] || null;
    },
    set: async (id: string, record: SubscriptionRecord) =>
      mutateLocal((records) => {
        records[id] = record;
      }),
    delete: async (id: string) =>
      mutateLocal((records) => {
        delete records[id];
      }),
    all: async () => {
      await localMutation;
      return Object.values(await readLocal());
    },
  };
}

function subscriptionId(endpoint: string) {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

function trustedPushHost(hostname: string) {
  return (
    hostname === 'fcm.googleapis.com' ||
    hostname === 'updates.push.services.mozilla.com' ||
    hostname === 'push.services.mozilla.com' ||
    hostname.endsWith('.push.apple.com') ||
    hostname.endsWith('.notify.windows.com')
  );
}

function validSubscription(subscription: PushSubscription) {
  if (
    !subscription ||
    typeof subscription !== 'object' ||
    typeof subscription.endpoint !== 'string' ||
    subscription.endpoint.length > 2048
  )
    return false;
  let url;
  try {
    url = new URL(subscription.endpoint);
  } catch (_) {
    return false;
  }
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !trustedPushHost(url.hostname)
  )
    return false;
  return (['p256dh', 'auth'] as const).every(
    (key) =>
      typeof subscription.keys?.[key] === 'string' &&
      /^[A-Za-z0-9_-]+$/.test(subscription.keys[key]) &&
      subscription.keys[key].length >= 16 &&
      subscription.keys[key].length <= 200,
  );
}

function respond(res: Response, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

async function bodyOf(req: Request): Promise<PushInput> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16384) throw new Error('Request too large.');
  }
  return JSON.parse(body || '{}');
}

function sameOrigin(req: Request) {
  try {
    const origin = new URL(req.headers.origin || '');
    return origin.host === req.headers.host;
  } catch (_) {
    return false;
  }
}

function isLoopback(req: Request) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress || '');
}

async function send(subscription: PushSubscription, payload: PushMessage, vapid: VapidKeys) {
  return webpush.sendNotification(
    subscription,
    JSON.stringify({ ...payload, tag: `ocd-${Date.now()}` }),
    {
      vapidDetails: {
        subject: process.env.VAPID_SUBJECT || 'https://ocd-demo-system.vercel.app',
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
      },
      TTL: 3600,
      timeout: 10000,
    },
  );
}

export async function handlePush(req: Request, res: Response): Promise<void> {
  try {
    const vapid = await keys();
    const store = storage();
    if (req.method === 'GET')
      return respond(res, 200, {
        available: Boolean(vapid && store),
        publicKey: vapid?.publicKey || '',
        localDemo: !process.env.VERCEL && isLoopback(req),
      });
    if (req.method !== 'POST') return respond(res, 405, { error: 'Method not allowed.' });
    const body = await bodyOf(req);
    const action = body.action;
    const suppliedToken = Buffer.from(req.headers.authorization || '');
    const expectedToken = Buffer.from(`Bearer ${vapid?.adminToken || ''}`);
    const admin =
      action === 'broadcast' &&
      Boolean(vapid?.adminToken) &&
      suppliedToken.length === expectedToken.length &&
      crypto.timingSafeEqual(suppliedToken, expectedToken);
    const localDemo = action === 'broadcast-demo' && !process.env.VERCEL && isLoopback(req);
    if (!sameOrigin(req) && !admin)
      return respond(res, 403, {
        error: 'This request must come from the app.',
      });
    if (!vapid || !store)
      return respond(res, 503, {
        error: 'Push is not configured on this server.',
      });

    if (action === 'broadcast' || action === 'broadcast-demo') {
      if (!admin && !localDemo) return respond(res, 403, { error: 'Demo sender token required.' });
      if (localDemo && Date.now() - lastLocalBroadcast < 30000)
        return respond(res, 429, {
          error: 'Wait 30 seconds before another demo update.',
        });
      const message = messages[localDemo ? 'update' : body.kind];
      if (!message) return respond(res, 400, { error: 'Unknown demo update.' });
      if (localDemo) lastLocalBroadcast = Date.now();
      const records = await store.all();
      let sent = 0;
      for (const record of records) {
        try {
          await send(record.subscription, message, vapid);
          sent += 1;
        } catch (error) {
          if ([404, 410].includes((error as ErrorDetails).statusCode || 0))
            await store.delete(subscriptionId(record.subscription.endpoint));
        }
      }
      return respond(res, 200, { sent, subscribed: records.length });
    }

    if (action === 'subscribe') {
      if (!validSubscription(body.subscription))
        return respond(res, 400, { error: 'Invalid push subscription.' });
      const id = subscriptionId(body.subscription.endpoint);
      const previous = await store.get(id);
      await store.set(id, {
        subscription: body.subscription,
        lastTest: previous?.lastTest || 0,
      });
      return respond(res, 200, { subscribed: true });
    }

    if (typeof body.endpoint !== 'string' || body.endpoint.length > 2048)
      return respond(res, 400, { error: 'Subscription endpoint required.' });
    const id = subscriptionId(body.endpoint);
    const record = await store.get(id);
    if (action === 'unsubscribe') {
      await store.delete(id);
      return respond(res, 200, { subscribed: false });
    }
    if (action === 'test') {
      if (!record) return respond(res, 404, { error: 'Subscribe to alerts first.' });
      if (Date.now() - record.lastTest < 30000)
        return respond(res, 429, {
          error: 'Wait 30 seconds before sending another test.',
        });
      record.lastTest = Date.now();
      await store.set(id, record);
      try {
        await send(
          record.subscription,
          {
            title: 'OCD Brilliance test',
            body: 'Push alerts are working on this device.',
            route: 'office/overview',
          },
          vapid,
        );
      } catch (error) {
        if ([404, 410].includes((error as ErrorDetails).statusCode || 0)) await store.delete(id);
        else {
          record.lastTest = 0;
          await store.set(id, record);
        }
        return respond(res, 502, {
          error: 'The push service did not accept the test. Try subscribing again.',
        });
      }
      return respond(res, 200, { sent: true });
    }
    return respond(res, 400, { error: 'Unknown action.' });
  } catch (error) {
    console.error('Push request failed:', (error as Error).message);
    return respond(res, 500, { error: 'Push is temporarily unavailable.' });
  }
}
