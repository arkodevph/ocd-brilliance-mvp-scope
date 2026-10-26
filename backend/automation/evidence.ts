import crypto from 'node:crypto';
import { AutomationStore } from './store';
import { AutomationError, string, type StoredFile } from './types';
const { extractEvidence } = require('../../lib/evidence-extraction.cjs');

export class EvidenceFiles {
  constructor(readonly store: AutomationStore) {}
  async save(jobId: string, name: string, type: string, bytes: Buffer, source: string): Promise<StoredFile> {
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new AutomationError(413, 'Evidence files must be between 1 byte and 5 MB.');
    name = string(name, 200).replace(/[\x00-\x1f/\\]/g, '_');
    if (!name) throw new AutomationError(422, 'Supply the original file name.');
    const signatures: Record<string, boolean> = {
      'application/pdf': bytes.subarray(0, 5).toString() === '%PDF-',
      'image/png': bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
      'image/jpeg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      'text/plain': !bytes.includes(0) && !bytes.toString('utf8').includes('\uFFFD'),
    };
    if (!signatures[type]) throw new AutomationError(422, 'Use a valid PDF, PNG, JPEG or UTF-8 text file.');
    if (type === 'image/png' && (bytes.length < 24 || !bytes.readUInt32BE(16) || !bytes.readUInt32BE(20) || bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > 16000000)) throw new AutomationError(413, 'Use an image with at most 16 million pixels.');
    if (type === 'image/jpeg') {
      let offset=2, dimensions=false;
      while (offset+8<bytes.length && offset<256000) {
        if(bytes[offset]!==255)break;
        const marker=bytes[offset+1], length=bytes.readUInt16BE(offset+2);
        if([0xc0,0xc1,0xc2].includes(marker)) { const height=bytes.readUInt16BE(offset+5),width=bytes.readUInt16BE(offset+7);dimensions=width>0&&height>0&&width*height<=16000000;break; }
        if(length<2)break;offset+=length+2;
      }
      if(!dimensions)throw new AutomationError(413, 'Use a JPEG with verified dimensions of at most 16 million pixels.');
    }
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const id = crypto.createHash('sha256').update(jobId).update(sha256).digest('hex');
    const file: StoredFile = { id, jobId, name, type, size: bytes.length, sha256, createdAt: new Date().toISOString(), source: string(source, 1000) };
    const state = await this.store.read();
    if (!state.jobs.some(j => j.id === jobId)) throw new AutomationError(404, 'Source case not found.');
    if (state.files?.some(f => f.id === id)) return state.files.find(f => f.id === id)!;
    await this.store.saveFile(id, bytes);
    return this.store.mutate(current => {
      current.files ||= [];
      const existing = current.files.find(f => f.id === id); if (existing) return structuredClone(existing);
      if (current.files.length >= 1000) throw new AutomationError(503, 'Archive retained evidence before importing more files.');
      current.files.push(file); return structuredClone(file);
    });
  }
  async get(id: string): Promise<{ file: StoredFile; bytes: Buffer }> {
    const file = (await this.store.read()).files?.find(f => f.id === id);
    if (!file) throw new AutomationError(404, 'Evidence file not found.');
    const bytes = await this.store.readFile(id);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new AutomationError(409, 'The original evidence failed its integrity check.');
    return { file, bytes };
  }
  async extract(id: string): Promise<StoredFile> {
    const { file, bytes } = await this.get(id);
    if (file.extraction) return file;
    let text = '', method = '';
    try {
      const result = await extractEvidence(bytes, file.type);
      text = result.text; method = `${result.method}${result.warnings.length ? `; ${result.warnings.join(' ')}` : ''}`;
    } catch (_) { method = 'Automatic extraction unavailable. Review the original file in Intake.'; }
    return this.store.mutate(state => {
      const item = state.files!.find(f => f.id === id)!;
      item.text = text; item.extraction = method; return structuredClone(item);
    });
  }
}
