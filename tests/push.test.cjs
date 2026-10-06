const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const webpush = require("web-push");

test("only subscribed devices receive demo pushes and can opt out", async t => {
  process.env.PUSH_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "ocd-push-"));
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.PUSH_DEMO_ADMIN_TOKEN = "test-sender-secret";
  const delivered = [];
  webpush.sendNotification = async (subscription, payload) => { delivered.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) }); return { statusCode: 201 }; };
  const handler = require("../api/push.js");
  const server = http.createServer(handler).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(process.env.PUSH_DATA_DIR, { recursive: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const subscription = name => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${name}`, keys: { p256dh: "abcdefghijklmnopqrs", auth: "abcdefghijklmnopqrs" } });
  const post = async (body, headers = {}) => {
    const response = await fetch(`${origin}/api/push`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...headers }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await post({ action: "subscribe", subscription: subscription("a") }, { Origin: "https://elsewhere.example" })).status, 403);
  assert.equal((await post({ action: "subscribe", subscription: { endpoint: "http://localhost/invalid", keys: {} } })).status, 400);
  assert.equal((await post({ action: "subscribe", subscription: { ...subscription("a"), endpoint: "https://fcm.googleapis.com.attacker.example/fcm/send/a" } })).status, 400);
  assert.equal((await post({ action: "subscribe", subscription: subscription("a") })).status, 200);
  assert.equal((await post({ action: "subscribe", subscription: subscription("b") })).status, 200);
  assert.equal((await post({ action: "test", endpoint: subscription("a").endpoint })).status, 200);
  assert.equal((await post({ action: "test", endpoint: subscription("a").endpoint })).status, 429);
  assert.deepEqual((await post({ action: "broadcast-demo" })).body, { sent: 2, subscribed: 2 });
  assert.equal((await post({ action: "broadcast", kind: "booking" })).status, 403);
  const broadcast = await post({ action: "broadcast", kind: "booking" }, { Authorization: "Bearer test-sender-secret" });
  assert.equal(broadcast.status, 200);
  assert.deepEqual(broadcast.body, { sent: 2, subscribed: 2 });
  assert.equal(delivered.length, 5);
  assert(delivered.every(item => !item.payload.body.includes("Olivia")));

  assert.equal((await post({ action: "unsubscribe", endpoint: subscription("a").endpoint })).status, 200);
  const afterOptOut = await post({ action: "broadcast", kind: "cover" }, { Authorization: "Bearer test-sender-secret" });
  assert.deepEqual(afterOptOut.body, { sent: 1, subscribed: 1 });
  assert.equal(delivered.at(-1).endpoint, subscription("b").endpoint);
});
