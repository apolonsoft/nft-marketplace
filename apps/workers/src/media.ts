import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { Pool } from 'pg';
import { workerSchemaSql } from '@nft-marketplace/database';
import type { WorkerConfig } from './config.js';
import { mediaIngestJobSchema, type MediaIngestJob } from './queues.js';

const MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/json']);
const sniff = (bytes: Buffer): string | undefined => {
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (bytes.subarray(0, 3).toString() === 'GIF') return 'image/gif';
  return undefined;
};

export const validateMetadata = (body: Buffer) => { const value: unknown = JSON.parse(body.toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Metadata must be a JSON object'); return value; };

export class MediaStore {
  constructor(readonly pool: Pool) {}
  async migrate() { await this.pool.query(workerSchemaSql); }
  async close() { await this.pool.end(); }
  async upsert(job: MediaIngestJob) { await this.pool.query('INSERT INTO worker_media_assets(asset_id,source_url,declared_mime,kind) VALUES($1,$2,$3,$4) ON CONFLICT(asset_id) DO NOTHING', [job.assetId, job.sourceUrl, job.declaredMime, job.kind]); }
  async status(assetId: string, values: Record<string, unknown>) { const keys = Object.keys(values); if (!keys.length) return; const set = keys.map((key, index) => `${key}=$${index + 2}`).join(','); await this.pool.query(`UPDATE worker_media_assets SET ${set}, updated_at=now() WHERE asset_id=$1`, [assetId, ...keys.map((key) => values[key])]); }
  async ingest(input: unknown, config: WorkerConfig) {
    const job = mediaIngestJobSchema.parse(input); await this.upsert(job);
    const response = await fetch(job.sourceUrl, { signal: AbortSignal.timeout(config.media.sourceTimeoutMs), redirect: 'error' });
    if (!response.ok || !response.body) throw new Error(`Source fetch failed: ${response.status}`);
    const max = job.kind === 'image' ? config.media.maxImageBytes : config.media.maxMetadataBytes;
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of response.body as AsyncIterable<Uint8Array>) { size += chunk.byteLength; if (size > max) throw new Error(`Media exceeds ${max} bytes`); chunks.push(Buffer.from(chunk)); }
    const body = Buffer.concat(chunks); const actualMime = sniff(body) ?? (job.kind === 'metadata' && MIME.has(job.declaredMime) ? 'application/json' : undefined);
    if (!MIME.has(job.declaredMime) || (job.kind === 'image' && actualMime !== job.declaredMime)) throw new Error('Unsupported or mismatched media type');
    if (job.kind === 'metadata') validateMetadata(body);
    const checksum = createHash('sha256').update(body).digest('hex');
    await this.status(job.assetId, { actual_mime: actualMime, byte_size: size, checksum, status: 'VALIDATED' });
    return { job, body, actualMime, checksum };
  }
  async preview(assetId: string, body: Buffer, checksum: string, config: WorkerConfig) {
    const image = sharp(body, { limitInputPixels: config.media.maxPixels }); const info = await image.metadata();
    if (!info.width || !info.height || info.width * info.height > config.media.maxPixels) throw new Error('Image dimensions exceed limit');
    const output = await image.rotate().resize({ width: config.media.previewMaxDimension, height: config.media.previewMaxDimension, fit: 'inside' }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    await this.pool.query('INSERT INTO worker_media_previews(preview_key,asset_id,mime_type,byte_size,width,height,checksum) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(preview_key) DO NOTHING', [`${assetId}:${checksum}:preview`, assetId, 'image/webp', output.data.length, output.info.width, output.info.height, createHash('sha256').update(output.data).digest('hex')]);
    return output.data;
  }
}

export class IpfsPinningClient {
  constructor(private readonly config: WorkerConfig) {}
  async pin(body: Buffer, filename: string) { const response = await fetch(this.config.media.pinEndpoint, { method: 'POST', headers: { 'content-type': 'application/octet-stream', 'x-filename': filename, ...(this.config.media.pinToken ? { authorization: `Bearer ${this.config.media.pinToken}` } : {}) }, body }); if (!response.ok) throw new Error(`IPFS pin failed: ${response.status}`); return (await response.json()) as { id?: string; cid?: string; status?: string }; }
}
