const path = require('node:path');

// Runs inside our application worker. Source bytes stay in private evidence storage.
async function extractEvidence(bytes, type) {
  if (type === 'text/plain') return { text: bytes.toString('utf8').slice(0, 12000), method: 'Original text', warnings: bytes.length > 12000 ? ['Text excerpt: check the complete original.'] : [] };
  const { createWorker } = require('tesseract.js');
  let worker, document, loadingTask;
  const warnings = [];
  async function recognize(image) {
    worker ||= await createWorker('eng', 1, {
      langPath: path.dirname(require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz')),
      gzip: true, cacheMethod: 'none', logger: () => {},
    });
    return (await worker.recognize(image)).data.text;
  }
  try {
    if (type !== 'application/pdf') return { text: (await recognize(bytes)).slice(0, 12000), method: 'Image OCR', warnings: ['Check OCR names, dates and numbers against the original.'] };
    const canvas = require('@napi-rs/canvas');
    globalThis.DOMMatrix ||= canvas.DOMMatrix;
    globalThis.Path2D ||= canvas.Path2D;
    globalThis.ImageData ||= canvas.ImageData;
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true, maxImageSize:16000000 });
    document = await loadingTask.promise;
    if (document.numPages > 8) throw new Error('Automatic extraction supports up to eight pages. Review a smaller document in Intake.');
    let text = '', scanned = false;
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number), content = await page.getTextContent();
      let pageText = content.items.map(item => `${item.str || ''}${item.hasEOL ? '\n' : ' '}`).join('');
      if (!pageText.trim()) {
        const viewport = page.getViewport({ scale: 1.5 });
        if (viewport.width * viewport.height > 16000000) throw new Error('Scanned page is too large for automatic extraction.');
        const image = canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvasContext: image.getContext('2d'), canvas: image, viewport }).promise;
        pageText = await recognize(image.toBuffer('image/png')); scanned = true;
      }
      text += `${pageText}\n`;
      if (text.length > 12000) { warnings.push('Extracted text is an excerpt; check the complete original.'); break; }
    }
    if (scanned) warnings.push('Check OCR names, dates and numbers against the original.');
    return { text: text.trim().slice(0, 12000), method: scanned ? 'PDF and scanned-page OCR' : 'PDF text', warnings };
  } finally { await worker?.terminate(); await loadingTask?.destroy(); }
}
module.exports = { extractEvidence };
