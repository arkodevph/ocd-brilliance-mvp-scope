const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 650 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
      userAgent:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(process.env.OCD_CAPTURE_URL || 'http://127.0.0.1:8047', {
      waitUntil: 'domcontentloaded',
    });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('h1').waitFor();
    const dir = path.join(__dirname, 'public/screens');
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'public.png') });
    if (errors.length) throw new Error(JSON.stringify(errors));
    console.log('Captured public landing screen with no page errors.');
  } finally {
    await browser.close();
  }
})();
