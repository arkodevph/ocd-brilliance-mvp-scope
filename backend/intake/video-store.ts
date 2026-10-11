import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
const { WorkflowError, clean } = require('../../lib/intake-domain.cjs');

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEOS = 5;
export const CHUNK_BYTES = 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export interface ServiceVideo {
  id: string;
  name: string;
  type: string;
  size: number;
}
interface Upload extends ServiceVideo {
  complete: boolean;
  expires: number;
}
let writes: Promise<unknown> = Promise.resolve();

function directory() {
  if (process.env.VERCEL)
    throw new WorkflowError(
      503,
      'Large video uploads need durable file storage before hosted use. Text intake is still available.',
    );
  return path.join(
    process.env.WORKFLOW_DATA_DIR || path.resolve(__dirname, '../../.local'),
    'intake-videos',
  );
}
function file(id: string, suffix: string) {
  if (!/^[a-f0-9]{48}$/.test(id)) throw new WorkflowError(422, 'Invalid video reference.');
  return path.join(directory(), id + suffix);
}
async function upload(id: string): Promise<Upload> {
  try {
    return JSON.parse(await fs.readFile(file(id, '.json'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new WorkflowError(404, 'Video upload not found.');
    throw error;
  }
}
export async function startVideo(
  input: Record<string, unknown>,
): Promise<ServiceVideo & { chunkBytes: number }> {
  if (
    !VIDEO_TYPES.includes(String(input.type)) ||
    !Number.isSafeInteger(input.size) ||
    Number(input.size) < 12 ||
    Number(input.size) > MAX_VIDEO_BYTES
  ) {
    throw new WorkflowError(422, 'Choose an MP4, MOV or WebM video of up to 100 MB.');
  }
  const item: Upload = {
    id: crypto.randomBytes(24).toString('hex'),
    name: clean(input.name, 120) || 'Service video',
    type: String(input.type),
    size: Number(input.size),
    complete: false,
    expires: Date.now() + 24 * 60 * 60 * 1000,
  };
  await fs.mkdir(directory(), { recursive: true, mode: 0o700 });
  await fs.writeFile(file(item.id, '.part'), '', { mode: 0o600, flag: 'wx' });
  await fs.writeFile(file(item.id, '.json'), JSON.stringify(item), {
    mode: 0o600,
    flag: 'wx',
  });
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
    chunkBytes: CHUNK_BYTES,
  };
}
export async function appendVideo(req: Request, id: string, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new WorkflowError(422, 'Invalid upload offset.');
  const chunks: Buffer[] = [];
  let size = 0;
  if (Buffer.isBuffer(req.body)) {
    size = req.body.length;
    chunks.push(req.body);
  } else
    for await (const chunk of req) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > CHUNK_BYTES) throw new WorkflowError(413, 'Upload chunks must be at most 1 MB.');
      chunks.push(bytes);
    }
  if (!size || size > CHUNK_BYTES)
    throw new WorkflowError(413, 'Send a video chunk of up to 1 MB.');
  const bytes = Buffer.concat(chunks);
  const operation = writes.then(async () => {
    const item = await upload(id);
    if (item.expires < Date.now())
      throw new WorkflowError(410, 'This upload expired. Select the video again.');
    if (offset + size > item.size) throw new WorkflowError(422, 'Video exceeds its declared size.');
    const target = file(id, item.complete ? '.video' : '.part');
    const current = (await fs.stat(target)).size;
    if (offset < current && offset + size <= current) {
      const handle = await fs.open(target, 'r');
      try {
        const previous = Buffer.alloc(size);
        await handle.read(previous, 0, size, offset);
        if (!previous.equals(bytes))
          throw new WorkflowError(409, 'Upload retry contains different data.');
      } finally {
        await handle.close();
      }
      return { received: current, complete: item.complete };
    }
    if (offset !== current || item.complete)
      throw new WorkflowError(409, 'Video upload offset changed.');
    await fs.appendFile(target, bytes);
    const received = current + size;
    if (received === item.size) {
      const handle = await fs.open(target, 'r');
      const header = Buffer.alloc(12);
      try {
        await handle.read(header, 0, 12, 0);
      } finally {
        await handle.close();
      }
      const valid =
        item.type === 'video/webm'
          ? header.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'))
          : header.subarray(4, 8).toString() === 'ftyp';
      if (!valid) throw new WorkflowError(422, 'This file is not a supported video.');
      await fs.rename(target, file(id, '.video'));
      item.complete = true;
      await fs.writeFile(file(id, '.json'), JSON.stringify(item), {
        mode: 0o600,
      });
    }
    return { received, complete: item.complete };
  });
  writes = operation.catch(() => {});
  return operation;
}
export async function resolveServiceVideos(value: unknown): Promise<ServiceVideo[]> {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_VIDEOS)
    throw new WorkflowError(422, 'Attach up to 5 service videos.');
  const ids = value.map((item) => (typeof item?.id === 'string' ? item.id : ''));
  if (new Set(ids).size !== ids.length)
    throw new WorkflowError(422, 'Attach each video only once.');
  const result: ServiceVideo[] = [];
  for (const id of ids) {
    const item = await upload(id);
    if (!item.complete)
      throw new WorkflowError(422, 'Finish uploading each video before sending intake.');
    result.push({
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size,
    });
  }
  return result;
}
export async function streamVideo(req: Request, res: Response, video: ServiceVideo) {
  const item = await upload(video.id);
  if (!item.complete) throw new WorkflowError(404, 'Video is not available.');
  let start = 0,
    end = item.size - 1,
    status = 200;
  if (req.headers.range) {
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!range || (!range[1] && !range[2])) {
      res.writeHead(416, { 'Content-Range': `bytes */${item.size}` });
      res.end();
      return;
    }
    start = range[1] ? Number(range[1]) : Math.max(0, item.size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
    if (start > end || start >= item.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${item.size}` });
      res.end();
      return;
    }
    status = 206;
  }
  res.writeHead(status, {
    'Content-Type': item.type,
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${item.size}` } : {}),
  });
  const stream = createReadStream(file(video.id, '.video'), { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}
