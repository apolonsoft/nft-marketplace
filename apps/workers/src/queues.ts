import { z } from 'zod';
import type { WorkerConfig } from './config.js';

export const QUEUES = {
  webhook: 'webhook-delivery',
  events: 'event-processing',
  search: 'search-updates',
  confirmations: 'confirmations',
  reconciliation: 'reconciliation',
  notifications: 'notification-preparation',
} as const;
export const MEDIA_QUEUES = {
  ingest: 'media-ingestion',
  metadata: 'metadata-validation',
  preview: 'image-previews',
  pin: 'ipfs-pinning',
  poll: 'ipfs-pin-status',
  retry: 'media-retry',
} as const;
export const deadLetterQueue = (queue: string) => `${queue}.dead-letter`;

export const webhookDeliveryJobSchema = z.object({
  event: z.object({ id: z.string().min(1), type: z.string().min(1), payload: z.unknown() }),
  subscription: z.object({
    id: z.string().min(1),
    endpointUrl: z.string().url(),
    secret: z.string().min(1),
  }),
});
export const domainEventJobSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  payloadVersion: z.number().int().positive(),
  payload: z.unknown(),
  deduplicationKey: z.string().min(1),
  chainId: z.number().int(),
  blockNumber: z.string().regex(/^\d+$/),
  blockHash: z.string(),
  transactionHash: z.string(),
  logIndex: z.number().int().nonnegative(),
});
export type DomainEventJob = z.infer<typeof domainEventJobSchema>;
export const mediaIngestJobSchema = z.object({
  assetId: z.string().min(1),
  sourceUrl: z.string().url(),
  declaredMime: z.string().min(1),
  declaredSize: z.number().int().nonnegative().optional(),
  kind: z.enum(['image', 'metadata']),
});
export const mediaRetryJobSchema = z.object({
  assetId: z.string().min(1),
  operation: z.enum(['ingest', 'metadata', 'preview', 'pin', 'poll']),
});
export type MediaIngestJob = z.infer<typeof mediaIngestJobSchema>;
export type WebhookDeliveryJob = {
  event: { id: string; type: string; payload: unknown };
  subscription: { id: string; endpointUrl: string; secret: string };
};

export const defaultJobOptions = (config: WorkerConfig) => ({
  attempts: config.attempts,
  backoff: { type: 'bounded-exponential' as const, delay: config.backoffBaseMs },
  removeOnComplete: { age: 86_400, count: 10_000 },
  removeOnFail: { age: 604_800, count: 10_000 },
});
