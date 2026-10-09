window.OCD_DOCUMENTS = {
  async extract(file) {
    if (!file || file.size > 2 * 1024 * 1024) throw new Error('Choose a PDF, PNG or JPEG of at most 2 MB.');
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PDF, PNG or JPEG.');
    const buffer = await file.arrayBuffer();
    let worker;
    const recognize = async image => {
      worker ||= await Tesseract.createWorker('eng', 1, { workerPath: '/vendor/tesseract.js/dist/worker.min.js', corePath: '/vendor/tesseract.js-core', langPath: '/vendor/@tesseract.js-data/eng/4.0.0_best_int', workerBlobURL: false });
      return (await worker.recognize(image)).data.text;
    };
    let text = '';
    let pdf;
    let loadingTask;
    try {
      if (file.type === 'application/pdf') {
        const pdfjs = await import('/vendor/pdfjs-dist/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs-dist/build/pdf.worker.mjs';
        loadingTask = pdfjs.getDocument({ data: buffer, isEvalSupported: false, cMapUrl: '/vendor/pdfjs-dist/cmaps/', cMapPacked: true, standardFontDataUrl: '/vendor/pdfjs-dist/standard_fonts/' });
        pdf = await loadingTask.promise;
        if (pdf.numPages > 20) throw new Error('Use a document of at most 20 pages.');
        for (let number = 1; number <= pdf.numPages; number++) {
          const page = await pdf.getPage(number);
          const content = await page.getTextContent();
          let pageText = content.items.map(item => (item.str || '') + (item.hasEOL ? '\n' : ' ')).join('');
          if (!pageText.trim()) {
            const viewport = page.getViewport({ scale: 1.5 });
            if (viewport.width * viewport.height > 16000000) throw new Error('The scanned page is too large to process.');
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            pageText = await recognize(canvas);
          }
          text += pageText + '\n';
          if (text.length > 12000) throw new Error('Extract a smaller document; text is limited to 12,000 characters.');
        }
      } else {
        const bitmap = await createImageBitmap(file);
        try {
          if (bitmap.width * bitmap.height > 16000000) throw new Error('The image is too large to process.');
          text = await recognize(file);
        } finally { bitmap.close(); }
      }
      if (!text.trim() || text.length > 12000) throw new Error('No usable text found, or text exceeds 12,000 characters.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      return { text: text.trim(), originalDocument: { name: file.name, type: file.type, data } };
    } finally { await worker?.terminate(); await loadingTask?.destroy(); }
  }
};

async function renderOriginalPdf(element) {
  element.dataset.rendering = 'true';
  let loadingTask;
  try {
    const pdfjs = await import('/vendor/pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs-dist/build/pdf.worker.mjs';
    loadingTask = pdfjs.getDocument({ data: Uint8Array.from(atob(element.dataset.documentPdf), char => char.charCodeAt(0)), isEvalSupported: false, cMapUrl: '/vendor/pdfjs-dist/cmaps/', cMapPacked: true, standardFontDataUrl: '/vendor/pdfjs-dist/standard_fonts/' });
    const pdf = await loadingTask.promise;
    element.replaceChildren();
    for (let number = 1; number <= Math.min(pdf.numPages, 20); number++) {
      if (!element.isConnected) break;
      const page = await pdf.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min((element.clientWidth || 400) / base.width, 1600 / base.height, 1.5) });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      canvas.style.maxWidth = '100%'; canvas.setAttribute('aria-label', `Original PDF page ${number}`);
      element.append(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
    element.dataset.rendered = 'true';
  } catch (error) {
    element.textContent = `Original PDF could not be displayed: ${error.message}`;
  } finally { await loadingTask?.destroy(); }
}
const previewOriginals = () => document.querySelectorAll('[data-document-pdf]:not([data-rendering])').forEach(renderOriginalPdf);
new MutationObserver(previewOriginals).observe(document.body, { childList: true, subtree: true });
previewOriginals();
