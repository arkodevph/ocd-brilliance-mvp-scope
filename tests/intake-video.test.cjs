const test = require('node:test');
const assert = require('node:assert/strict');
const { intakeVideo, MAX_VIDEO_BYTES } = require('../lib/intake-video.cjs');

test('optional videos accept supported signatures and reject disguised or oversized attachments', () => {
  assert.equal(intakeVideo(null), null);
  const webm = { name: 'tasks.webm', type: 'video/webm', data: Buffer.from('1a45dfa30000', 'hex').toString('base64') };
  assert.equal(intakeVideo(webm).size, 6);
  for (const value of [
    true, 42, 'video', [],
    { ...webm, type: 'video/mp4' },
    { ...webm, data: Buffer.from('<script>alert(1)</script>').toString('base64') },
    { ...webm, data: 'not base64' },
    { ...webm, data: Buffer.alloc(MAX_VIDEO_BYTES + 1).toString('base64') },
  ]) assert.throws(() => intakeVideo(value), error => error.status === 422);
});
