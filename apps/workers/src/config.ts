const parseEnv = (schema: Record<string, (value: string | undefined) => unknown>, source: NodeJS.ProcessEnv) => {
  const result: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const [key, validate] of Object.entries(schema)) {
    try { result[key] = validate(source[key]); } catch (error) { errors.push(`${key}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (errors.length) throw new Error(`Invalid environment:\n${errors.join('\n')}`);
  return result;
};
const optional = (fallback?: string) => (value: string | undefined) => value ?? fallback;
const required = (name: string) => (value: string | undefined) => { if (!value) throw new Error(`${name} is required`); return value; };

const integer = (name: string, fallback: number) => (value: string | undefined) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

export interface WorkerConfig {
  nodeEnv: string;
  redisUrl: string;
  databaseUrl: string;
  relayIntervalMs: number;
  relayBatchSize: number;
  concurrency: number;
  attempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  metricsPort: number;
  media: { pinEndpoint: string; pinToken?: string; maxImageBytes: number; maxMetadataBytes: number; maxPixels: number; previewMaxDimension: number; sourceTimeoutMs: number; pollIntervalMs: number };
}

export const loadWorkerConfig = (source: NodeJS.ProcessEnv = process.env): WorkerConfig => {
  const nodeEnv = source.NODE_ENV ?? 'development';
  const redisUrl = source.REDIS_URL ?? (nodeEnv === 'production' ? undefined : 'redis://127.0.0.1:6379');
  const values = parseEnv(
    {
      REDIS_URL: nodeEnv === 'production' ? required('REDIS_URL') : optional(redisUrl),
      DATABASE_URL: nodeEnv === 'production' ? required('DATABASE_URL') : optional(source.DATABASE_URL ?? 'postgresql://localhost:5432/nft_marketplace'),
      WORKER_RELAY_INTERVAL_MS: integer('WORKER_RELAY_INTERVAL_MS', 1000),
      WORKER_RELAY_BATCH_SIZE: integer('WORKER_RELAY_BATCH_SIZE', 100),
      WORKER_CONCURRENCY: integer('WORKER_CONCURRENCY', 10),
      WORKER_ATTEMPTS: integer('WORKER_ATTEMPTS', 5),
      WORKER_BACKOFF_BASE_MS: integer('WORKER_BACKOFF_BASE_MS', 1000),
      WORKER_BACKOFF_MAX_MS: integer('WORKER_BACKOFF_MAX_MS', 3_600_000),
      WORKER_METRICS_PORT: integer('WORKER_METRICS_PORT', 3020),
      IPFS_PIN_ENDPOINT: optional(source.IPFS_PIN_ENDPOINT ?? 'http://127.0.0.1:8080/pins'),
      MEDIA_MAX_IMAGE_BYTES: integer('MEDIA_MAX_IMAGE_BYTES', 10 * 1024 * 1024),
      MEDIA_MAX_METADATA_BYTES: integer('MEDIA_MAX_METADATA_BYTES', 1024 * 1024),
      MEDIA_MAX_PIXELS: integer('MEDIA_MAX_PIXELS', 25_000_000),
      MEDIA_PREVIEW_MAX_DIMENSION: integer('MEDIA_PREVIEW_MAX_DIMENSION', 512),
      MEDIA_SOURCE_TIMEOUT_MS: integer('MEDIA_SOURCE_TIMEOUT_MS', 30_000),
      MEDIA_POLL_INTERVAL_MS: integer('MEDIA_POLL_INTERVAL_MS', 60_000),
    },
    source,
  );
  return {
    nodeEnv,
    redisUrl: values.REDIS_URL as string,
    databaseUrl: values.DATABASE_URL as string,
    relayIntervalMs: values.WORKER_RELAY_INTERVAL_MS as number,
    relayBatchSize: values.WORKER_RELAY_BATCH_SIZE as number,
    concurrency: values.WORKER_CONCURRENCY as number,
    attempts: values.WORKER_ATTEMPTS as number,
    backoffBaseMs: values.WORKER_BACKOFF_BASE_MS as number,
    backoffMaxMs: values.WORKER_BACKOFF_MAX_MS as number,
    metricsPort: values.WORKER_METRICS_PORT as number,
    media: { pinEndpoint: values.IPFS_PIN_ENDPOINT as string, ...(source.IPFS_PIN_TOKEN ? { pinToken: source.IPFS_PIN_TOKEN } : {}), maxImageBytes: values.MEDIA_MAX_IMAGE_BYTES as number, maxMetadataBytes: values.MEDIA_MAX_METADATA_BYTES as number, maxPixels: values.MEDIA_MAX_PIXELS as number, previewMaxDimension: values.MEDIA_PREVIEW_MAX_DIMENSION as number, sourceTimeoutMs: values.MEDIA_SOURCE_TIMEOUT_MS as number, pollIntervalMs: values.MEDIA_POLL_INTERVAL_MS as number },
  };
};
