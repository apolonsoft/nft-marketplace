import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { createLogger } from '@nft-marketplace/observability';
import { loadWorkerConfig, type WorkerConfig } from './config.js';
import { backoffMs, deliver } from './webhook-delivery.js';
import { defaultJobOptions, deadLetterQueue, QUEUES, MEDIA_QUEUES, webhookDeliveryJobSchema, domainEventJobSchema, mediaIngestJobSchema, type WebhookDeliveryJob } from './queues.js';
import type { WorkerMetrics } from './metrics.js';
import { EventStore } from './event-processing.js';
import { MediaStore, IpfsPinningClient } from './media.js';
import { Pool } from 'pg';

@Injectable()
export class WorkerRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly config: WorkerConfig = loadWorkerConfig();
  private readonly logger = createLogger({ service: 'workers' });
  private readonly connection = { url: this.config.redisUrl, maxRetriesPerRequest: null as null };
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];
  private readonly eventStore = new EventStore(this.config.databaseUrl);
  private readonly mediaStore = new MediaStore(new Pool({ connectionString: this.config.databaseUrl }));
  private readonly ipfs = new IpfsPinningClient(this.config);
  private relayTimer?: ReturnType<typeof setInterval>;

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
    const eventQueue = new Queue(QUEUES.events, { connection: this.connection, defaultJobOptions: defaultJobOptions(this.config) });
    this.queues.set(QUEUES.events, eventQueue).set(deadLetterQueue(QUEUES.events), new Queue(deadLetterQueue(QUEUES.events), { connection: this.connection }));
    const eventWorker = new Worker(QUEUES.events, async (job) => {
      const outcome = await this.eventStore.process(job.data, { duplicate: () => this.metrics.events.inc({ outcome: 'duplicate' }), stale: () => this.metrics.events.inc({ outcome: 'stale' }), processed: () => this.metrics.events.inc({ outcome: 'processed' }) });
    }, { connection: this.connection, concurrency: this.config.concurrency, settings: { backoffStrategy: (attemptsMade: number) => backoffMs(attemptsMade + 1, this.config.backoffBaseMs, this.config.backoffMaxMs) } });
    this.workers.push(eventWorker);
    await this.eventStore.migrate();
    await this.mediaStore.migrate();
    for (const queueName of Object.values(MEDIA_QUEUES)) this.queues.set(queueName, new Queue(queueName, { connection: this.connection, defaultJobOptions: defaultJobOptions(this.config) }));
    for (const queueName of Object.values(MEDIA_QUEUES)) this.queues.set(deadLetterQueue(queueName), new Queue(deadLetterQueue(queueName), { connection: this.connection }));
    const ingestQueue = this.queues.get(MEDIA_QUEUES.ingest)!;
    const mediaWorker = new Worker(MEDIA_QUEUES.ingest, async (job) => {
      const result = await this.mediaStore.ingest(job.data, this.config);
      await this.queues.get(MEDIA_QUEUES.preview)!.add('preview', { assetId: result.job.assetId, body: result.body.toString('base64'), checksum: result.checksum }, { jobId: `${result.job.assetId}:preview` });
      await this.queues.get(MEDIA_QUEUES.pin)!.add('pin', { assetId: result.job.assetId, body: result.body.toString('base64'), checksum: result.checksum }, { jobId: `${result.job.assetId}:pin` });
    }, { connection: this.connection, concurrency: this.config.concurrency });
    const previewWorker = new Worker(MEDIA_QUEUES.preview, async (job) => { const data = job.data as { assetId: string; body: string; checksum: string }; await this.mediaStore.preview(data.assetId, Buffer.from(data.body, 'base64'), data.checksum, this.config); }, { connection: this.connection, concurrency: this.config.concurrency });
    const pinWorker = new Worker(MEDIA_QUEUES.pin, async (job) => { const data = job.data as { assetId: string; body: string; checksum: string }; const result = await this.ipfs.pin(Buffer.from(data.body, 'base64'), data.assetId); await this.mediaStore.status(data.assetId, { status: result.status === 'pinned' ? 'PINNED' : 'PINNING', provider_id: result.id ?? null, cid: result.cid ?? null, attempts: job.attemptsMade + 1 }); }, { connection: this.connection, concurrency: this.config.concurrency });
    this.workers.push(mediaWorker, previewWorker, pinWorker);
    void ingestQueue;
    this.relayTimer = setInterval(() => void this.relay(eventQueue), this.config.relayIntervalMs);
    this.metrics.ready.set(1);
    this.logger.info('Worker runtime started', { queues: [...this.queues.keys()], concurrency: this.config.concurrency });
  }

  private async relay(queue: Queue) {
    const result = await this.eventStore.pool.query('SELECT id,event_type,payload_version,payload,deduplication_key,chain_id,block_number,block_hash,transaction_hash,log_index FROM event_outbox WHERE published_at IS NULL ORDER BY block_number,log_index LIMIT $1', [this.config.relayBatchSize]);
    for (const row of result.rows) {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      const event = domainEventJobSchema.parse({ eventId: row.id, eventType: row.event_type, payloadVersion: row.payload_version, payload, deduplicationKey: row.deduplication_key, chainId: row.chain_id, blockNumber: String(row.block_number), blockHash: row.block_hash, transactionHash: row.transaction_hash, logIndex: row.log_index });
      await queue.add(event.eventType, event, { jobId: event.deduplicationKey });
      await this.eventStore.pool.query('UPDATE event_outbox SET published_at=$1 WHERE id=$2 AND published_at IS NULL', [Date.now(), row.id]);
    }
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
    if (this.relayTimer) clearInterval(this.relayTimer);
    this.metrics.ready.set(0);
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    await this.eventStore.close();
    await this.mediaStore.close();
  }
}
