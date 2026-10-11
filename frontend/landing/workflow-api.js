export async function workflow(action, { body, query = {}, method = body === undefined ? 'GET' : 'POST' } = {}) {
  const url = new URL('/api/workflow', window.location.origin);
  url.search = new URLSearchParams({ action, ...query }).toString();
  let response;
  try {
    response = await fetch(url, {
      method, credentials: 'same-origin', cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': body instanceof Blob ? 'application/octet-stream' : 'application/json' }, body: body instanceof Blob ? body : JSON.stringify(body) })
    });
  } catch { throw new Error('Cannot reach the server. Check your connection and retry. For local use, start this project with npm start.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The workflow API is unavailable. Run npm start locally, or configure the backend functions on the host.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

export async function uploadVideo(file, postcode, uploads, onProgress) {
  let upload = uploads.get(file);
  if (!upload) {
    upload = { ...await workflow('video-start', { body: { name: file.name, type: file.type, size: file.size, postcode, consent: true } }), offset: 0 };
    uploads.set(file, upload);
  }
  while (upload.offset < file.size) {
    const end = Math.min(upload.offset + Math.min(upload.chunkBytes, 1024 * 1024), file.size);
    const result = await workflow('video-upload', { query: { id: upload.id, offset: String(upload.offset) }, body: file.slice(upload.offset, end) });
    upload.offset = result.received;
    onProgress(Math.round(upload.offset / file.size * 100));
  }
  return { id: upload.id };
}
