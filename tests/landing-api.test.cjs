const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const { build } = require('esbuild');

test('landing upload uses backend references, resumes failed chunks and reports missing APIs', async () => {
  const bundle = await build({
    entryPoints: [path.join(__dirname, '../frontend/landing/workflow-api.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
  });
  const calls = [];
  let fail = true;
  const context = {
    module: { exports: {} },
    URL,
    URLSearchParams,
    Blob,
    window: { location: { origin: 'http://localhost' } },
    fetch: async (url, options) => {
      calls.push({
        action: url.searchParams.get('action'),
        offset: url.searchParams.get('offset'),
        options,
      });
      if (
        url.searchParams.get('action') === 'video-upload' &&
        Number(url.searchParams.get('offset')) > 0 &&
        fail
      ) {
        fail = false;
        throw new Error('offline');
      }
      const data =
        url.searchParams.get('action') === 'video-start'
          ? { id: 'private-reference', chunkBytes: 1024 * 1024 }
          : {
              received: Number(url.searchParams.get('offset')) + options.body.size,
            };
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => data,
      };
    },
  };
  vm.runInNewContext(bundle.outputFiles[0].text, context);
  const { workflow, uploadVideo } = context.module.exports;
  const file = new Blob([new Uint8Array(1024 * 1024 + 12)], {
    type: 'video/mp4',
  });
  file.name = 'needs.mp4';
  const uploads = new Map();
  await assert.rejects(
    uploadVideo(file, '6026', uploads, () => {}),
    /Cannot reach the server/,
  );
  const reference = await uploadVideo(file, '6026', uploads, () => {});
  assert.equal(reference.id, 'private-reference');
  assert.equal(uploads.get(file).offset, file.size);
  assert.equal(calls.filter((call) => call.action === 'video-start').length, 1);
  assert.deepEqual(
    calls.filter((call) => call.action === 'video-upload').map((call) => call.offset),
    ['0', '1048576', '1048576'],
  );
  await workflow('intake', { body: { serviceVideos: [reference] } });
  assert.deepEqual(JSON.parse(calls.at(-1).options.body).serviceVideos, [
    { id: 'private-reference' },
  ]);
  assert.equal(calls.at(-1).options.credentials, 'same-origin');
  context.fetch = async () => ({ headers: { get: () => 'text/html' } });
  await assert.rejects(workflow('session'), /workflow API is unavailable/);
});
