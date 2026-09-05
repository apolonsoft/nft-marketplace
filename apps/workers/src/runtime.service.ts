import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { createLogger } from '@nft-marketplace/observability';
import { loadWorkerConfig, type WorkerConfig } from './config.js';
import { backoffMs, deliver } from './webhook-delivery.js';
import { defaultJobOptions, deadLetterQueue, QUEUES, webhookDeliveryJobSchema, type WebhookDeliveryJob } from './queues.js';
import type { WorkerMetrics } from './metrics.js';

@Injectable()
export class WorkerRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly config: WorkerConfig = loadWorkerConfig();
  private readonly logger = createLogger({ service: 'workers' });
  private readonly connection = { url: this.config.redisUrl, maxRetriesPerRequest: null as null };
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  constructor(private readonly metrics: WorkerMetrics) {}

  async onModuleInit() {
    const queue = new Queue(QUEUES.webhook, { connection: this.connection, defaultJobOptions: defaultJobOptions(this.config) });
    const dlq = new Queue(deadLetterQueue(QUEUES.webhook), { connection: this.connection });
    this.queues.set(QUEUES.webhook, queue).set(deadLetterQueue(QUEUES.webhook), dlq);
    const worker = new Worker(QUEUES.webhook, async (job) => this.processWebhook(job), { connection: this.connection, concurrency: this.config.concurrency, settings: { backoffStrategy: (attemptsMade: number) => backoffMs(attemptsMade + 1, this.config.backoffBaseMs, this.config.backoffMaxMs) } });
    worker.on('active', (job) => this.metrics.jobs.inc({ queue: job.queueName, job: job.name, outcome: 'started' }));
    worker.on('completed', (job) => this.metrics.jobs.inc({ queue: job.queueName, job: job.name, outcome: 'completed' }));
    worker.on('failed', (job, error) => void this.onFailed(job, error));
    worker.on('error', (error) => this.logger.error('Worker error', { error: error.message }));
    this.workers.push(worker);
    this.metrics.ready.set(1);
    this.logger.info('Worker runtime started', { queues: [...this.queues.keys()], concurrency: this.config.concurrency });
  }

  private async processWebhook(job: Job): Promise<void> {
    const started = process.hrtime.bigint();
    const parsed = webhookDeliveryJobSchema.safeParse(job.data);
    if (!parsed.success) throw new Error(`Invalid webhook job: ${parsed.error.message}`);
    try {
      const result = await deliver(parsed.data.event as WebhookDeliveryJob['event'], parsed.data.subscription);
      if (!result.ok && result.retryable) throw new Error(`Retryable webhook response: ${result.status ?? 'network error'}`);
      if (!result.ok) throw new Error(`Terminal webhook response: ${result.status}`);
    } finally {
      this.metrics.duration.observe({ queue: job.queueName, job: job.name }, Number(process.hrtime.bigint() - started) / 1e9);
    }
  }

  private async onFailed(job: Job | undefined, error: Error) {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
      if (job) this.metrics.jobs.inc({ queue: job.queueName, job: job.name, outcome: 'retry' });
      return;
    }
    const dlq = this.queues.get(deadLetterQueue(job.queueName));
    if (!dlq) return;
    await dlq.add('quarantined', { sourceQueue: job.queueName, sourceJobId: job.id, jobName: job.name, attempts: job.attemptsMade, failedAt: new Date().toISOString(), error: error.message, payload: job.data }, { jobId: `${job.queueName}:${job.id}`, removeOnComplete: { age: 604_800 } });
    this.metrics.jobs.inc({ queue: job.queueName, job: job.name, outcome: 'quarantined' });
    this.logger.error('Job quarantined', { queue: job.queueName, jobId: job.id, attempts: job.attemptsMade, error: error.message });
  }

  async onModuleDestroy() {
    this.metrics.ready.set(0);
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
