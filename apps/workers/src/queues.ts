import { z } from 'zod';
import type { WorkerConfig } from './config.js';

export const QUEUES = { webhook: 'webhook-delivery' } as const;
export const deadLetterQueue = (queue: string) => `${queue}.dead-letter`;

export const webhookDeliveryJobSchema = z.object({
  event: z.object({ id: z.string().min(1), type: z.string().min(1), payload: z.unknown() }),
  subscription: z.object({ id: z.string().min(1), endpointUrl: z.string().url(), secret: z.string().min(1) }),
});
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
