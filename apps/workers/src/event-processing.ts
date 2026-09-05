import { Pool, type PoolClient } from 'pg';
import { workerSchemaSql } from '@nft-marketplace/database';
import { createDomainEventSchema, type DomainEventType } from '@nft-marketplace/domain';
import { domainEventJobSchema, type DomainEventJob } from './queues.js';

export type EventProcessorMetrics = { duplicate: () => void; stale: () => void; processed: () => void };

const rank = (event: DomainEventJob) => [event.chainId, BigInt(event.blockNumber), event.logIndex];
const newer = (a: DomainEventJob, b: { chain_id: number; block_number: string; log_index: number }) => {
  const x = rank(a); const y: [number, bigint, number] = [b.chain_id, BigInt(b.block_number), b.log_index];
  return (x[0] ?? 0) > y[0] || (x[0] === y[0] && ((x[1] ?? 0n) > y[1] || (x[1] === y[1] && (x[2] ?? 0) > y[2])));
};

export class EventStore {
  readonly pool: Pool;
  constructor(databaseUrl: string) { this.pool = new Pool({ connectionString: databaseUrl }); }
  async migrate() { await this.pool.query(workerSchemaSql); }
  async close() { await this.pool.end(); }
  async process(eventInput: unknown, metrics?: EventProcessorMetrics) {
    const event = domainEventJobSchema.parse(eventInput);
    createDomainEventSchema(event.eventType as DomainEventType).parse({ ...event, eventId: event.eventId, payload: event.payload });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query('INSERT INTO worker_processed_events(deduplication_key,event_id,event_type) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [event.deduplicationKey, event.eventId, event.eventType]);
      if (!inserted.rowCount) { await client.query('ROLLBACK'); metrics?.duplicate(); return 'duplicate' as const; }
      const entityKey = this.entityKey(event);
      const prior = await client.query('SELECT chain_id, block_number::text, log_index FROM worker_entity_watermarks WHERE entity_key=$1 FOR UPDATE', [entityKey]);
      if (prior.rowCount && !newer(event, prior.rows[0])) {
        await this.reconcile(client, event, entityKey, 'OUT_OF_ORDER');
        await client.query('COMMIT'); metrics?.stale(); return 'stale' as const;
      }
      await client.query('INSERT INTO worker_entity_watermarks(entity_key,chain_id,block_number,log_index,event_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(entity_key) DO UPDATE SET chain_id=EXCLUDED.chain_id,block_number=EXCLUDED.block_number,log_index=EXCLUDED.log_index,event_id=EXCLUDED.event_id', [entityKey, event.chainId, event.blockNumber, event.logIndex, event.eventId]);
      await client.query('INSERT INTO worker_search_projection(entity_key,entity_type,data,chain_id,block_number,log_index) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(entity_key) DO UPDATE SET data=EXCLUDED.data,chain_id=EXCLUDED.chain_id,block_number=EXCLUDED.block_number,log_index=EXCLUDED.log_index,updated_at=now()', [entityKey, event.eventType, JSON.stringify(event.payload), event.chainId, event.blockNumber, event.logIndex]);
      await client.query('INSERT INTO worker_notification_intents(intent_key,recipient_key,event_id,event_type,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [`${event.eventType}:${event.eventId}`, null, event.eventId, event.eventType, JSON.stringify(event.payload)]);
      await client.query('INSERT INTO worker_webhook_fanout_intents(intent_key,event_id,event_type,payload) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [`${event.eventId}:webhook`, event.eventId, event.eventType, JSON.stringify(event.payload)]);
      await client.query('INSERT INTO worker_confirmation_intents(event_id,chain_id,block_number,log_index) VALUES($1,$2,$3,$4) ON CONFLICT(event_id) DO UPDATE SET status=CASE WHEN worker_confirmation_intents.status=\'CONFIRMED\' THEN \'CONFIRMED\' ELSE worker_confirmation_intents.status END, updated_at=now()', [event.eventId, event.chainId, event.blockNumber, event.logIndex]);
      await client.query('INSERT INTO worker_reconciliation_intents(intent_key,entity_key,event_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [`reconcile:${event.eventId}`, entityKey, event.eventId, 'EVENT_PROCESSED']);
      await client.query('COMMIT'); metrics?.processed(); return 'processed' as const;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  private entityKey(event: DomainEventJob) { const p = event.payload as Record<string, unknown>; return String(p.collection ?? p.listingId ?? p.purchaseId ?? p.moderationId ?? event.eventId).toLowerCase(); }
  private async reconcile(client: PoolClient, event: DomainEventJob, entityKey: string, reason: string) { await client.query('INSERT INTO worker_reconciliation_intents(intent_key,entity_key,event_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [`reconcile:${event.eventId}`, entityKey, event.eventId, reason]); }
}
