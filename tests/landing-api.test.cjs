const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');

async function intakePage(t, mime = 'video/mp4') {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { MemoryRouter } from 'react-router-dom';
        import Intake from './frontend/landing/Intake.jsx';
        const root = createRoot(document.getElementById('app'));
        window.mountIntake = () => root.render(React.createElement(MemoryRouter, {}, React.createElement(Intake)));
        window.unmountIntake = () => root.unmount();`,
      resolveDir: path.resolve(__dirname, '..'),
    },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  const dom = new JSDOM('<div id="app"></div>', {
    url: 'https://ocd.example.test/intake',
    runScripts: 'outside-only',
  });

  const { window } = dom;
  const tracks = [];
  const calls = [];
  let permissionError;
  t.after(() => {
    window.unmountIntake?.();
    window.close();
  });

  Object.defineProperty(window, 'isSecureContext', { value: true });

  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: {
      getUserMedia: async () => {
        if (permissionError) throw permissionError;
        const track = {
          stopped: false,
          stop() {
            this.stopped = true;
          },
        };

        tracks.push(track);
        return { getTracks: () => [track] };
      },
    },
  });

  window.HTMLMediaElement.prototype.play = async () => {};

  window.URL.createObjectURL = () => 'blob:private-room-video';
  window.URL.revokeObjectURL = () => {};

  window.MediaRecorder = class {
    static isTypeSupported(type) {
      return type === mime;
    }

    constructor(stream, options) {
      this.stream = stream;
      this.mimeType = options.mimeType;
      this.state = 'inactive';
    }

    start() {
      this.state = 'recording';
    }

    stop() {
      this.state = 'inactive';
      const bytes = new window.Uint8Array(24);
      bytes.set(
        mime === 'video/mp4' ? [102, 116, 121, 112] : [26, 69, 223, 163],
        mime === 'video/mp4' ? 4 : 0,
      );
      this.ondataavailable?.({ data: new window.Blob([bytes], { type: mime }) });

      this.onstop?.();
    }
  };

  window.fetch = async (url, options) => {
    const action = new URL(url).searchParams.get('action');
    calls.push({ action, options });

    const result =
      action === 'area'
        ? { status: 'covered', message: 'Covered' }
        : action === 'video-start'
          ? { id: 'private-room-reference', chunkBytes: 1024 * 1024 }
          : action === 'video-upload'
            ? { received: options.body.size }
            : { id: 'REQ-room', message: 'Received' };

    return { ok: true, headers: { get: () => 'application/json' }, json: async () => result };
  };

  window.eval(bundle.outputFiles[0].text);
  window.mountIntake();
  async function waitFor(check) {
    const deadline = Date.now() + 3000;
    while (!check()) {
      if (Date.now() > deadline) throw new Error('Intake UI did not reach the expected state.');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  await waitFor(() => window.document.querySelector('input[name="postcode"]'));
  const input = window.document.querySelector('input[name="postcode"]');
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(
    input,
    '6027',
  );
  input.dispatchEvent(new window.Event('input', { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 10));
  window.document
    .querySelector('[data-form="landing-area"]')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

  await waitFor(() => window.document.querySelector('.room-video-card'));
  const button = (name) =>
    [...window.document.querySelectorAll('button')].find(
      (item) => item.textContent.trim() === name,
    );
  return {
    window,
    tracks,
    calls,
    waitFor,
    button,
    deny: () => {
      permissionError = new window.DOMException('Denied', 'NotAllowedError');
    },
  };
}

test('in-app MP4 and WebM recordings stay in their room and release the camera', async (t) => {
  for (const mime of ['video/mp4', 'video/webm']) {
    await t.test(mime, async (t) => {
      const page = await intakePage(t, mime);
      assert.equal(page.window.document.querySelectorAll('.room-video-card').length, 4);
      page.button('Record master bedroom').click();
      await page.waitFor(() => page.button('Start recording'));
      page.button('Start recording').click();
      await page.waitFor(() => page.button('Stop and keep video'));
      assert.equal(page.button('Send support request').disabled, true);
      page.button('Stop and keep video').click();
      await page.waitFor(() => page.button('Remove master bedroom video'));
      const preview = page.window.document.querySelector('.landing-video-list video');
      assert.match(preview.closest('.room-video-card').textContent, /Master bedroom/);
      assert.equal(preview.hasAttribute('playsinline'), true);
      assert.equal(
        page.tracks.every((track) => track.stopped),
        true,
      );
      assert.equal(page.button('Send support request').disabled, false);
      page.button('Record bedroom').click();
      await page.waitFor(() => page.button('Start recording'));
      page.button('Cancel recording').click();
      await page.waitFor(() => !page.button('Cancel recording'));
      assert.equal(page.window.document.querySelectorAll('.landing-video-list video').length, 1);
      assert.equal(
        page.tracks.every((track) => track.stopped),
        true,
      );
    });
  }
});

test('denied camera permission leaves room video upload available', async (t) => {
  const page = await intakePage(t);
  page.deny();
  page.button('Record living room').click();
  await page.waitFor(() => page.window.document.querySelector('.room-video-card [role="alert"]'));
  assert.match(
    page.window.document.querySelector('.room-video-card [role="alert"]').textContent,
    /Allow camera and microphone/,
  );
  assert.equal(
    page.window.document.querySelector('.room-video-card input[type="file"]').disabled,
    false,
  );
  assert.equal(page.button('Send support request').disabled, false);
});

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
