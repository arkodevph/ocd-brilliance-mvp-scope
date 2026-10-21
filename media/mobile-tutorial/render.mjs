import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill, renderMedia, openBrowser } from '@remotion/renderer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const scenes = JSON.parse(await fs.readFile(path.join(root, 'src/scenes.json'), 'utf8'));
const browserExecutable = process.env.CHROME_PATH || undefined;
const serveUrl = await bundle({
  entryPoint: path.join(root, 'src/index.jsx'),
  publicDir: path.join(root, 'public'),
  webpackOverride: (config) => config,
});
const inputProps = { brand: 'OCD BRILLIANCE' };
const browser = await openBrowser('chrome', { browserExecutable });
try {
  const composition = await selectComposition({
    serveUrl,
    id: 'OCDMobileTutorial',
    inputProps,
    puppeteerInstance: browser,
  });
  if (process.argv.includes('--stills')) {
    const frames = [
      0,
      ...scenes.map((s) => s.from + Math.min(Math.round(s.frames * 0.6), s.frames - 1)),
      composition.durationInFrames - 1,
    ];
    for (let i = 0; i < frames.length; i++) {
      const output = path.join(root, 'out', `frame-${String(i).padStart(2, '0')}.png`);
      await renderStill({
        composition,
        serveUrl,
        inputProps,
        frame: frames[i],
        output,
        puppeteerInstance: browser,
        scale: 0.5,
      });
      console.log('STILL', frames[i], path.basename(output));
    }
  } else {
    let printed = -1;
    await renderMedia({
      composition,
      serveUrl,
      inputProps,
      outputLocation: path.join(root, 'out/ocd-mobile-tutorial.mp4'),
      codec: 'h264',
      crf: 19,
      pixelFormat: 'yuv420p',
      audioCodec: 'aac',
      concurrency: Number(process.env.VIDEO_CONCURRENCY || 4),
      puppeteerInstance: browser,
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const part = Math.floor(progress * 20);
        if (part !== printed) {
          printed = part;
          console.log(
            `PROGRESS ${Math.round(progress * 100)}% rendered=${renderedFrames} encoded=${encodedFrames}`,
          );
        }
      },
    });
    console.log('VIDEO', path.join(root, 'out/ocd-mobile-tutorial.mp4'));
  }
} finally {
  await browser.close({ silent: true });
}
