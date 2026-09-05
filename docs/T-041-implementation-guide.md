# T-041 Event Processing Workers

## Architecture

The T-041 processor extends the T-040 NestJS/BullMQ runtime. A relay polls the
T-022 `event_outbox` in provenance order, validates each normalized envelope,
enqueues it with `deduplicationKey` as the BullMQ job ID, and acknowledges the
outbox row only after enqueue succeeds. Redis is transport; Postgres is durable
processing state. The worker process remains independent from API replicas.

`packages/database` contains the worker SQL schema contract. The migration creates
processed-event, entity-watermark, search projection, reconciliation-intent, and
notification-intent tables. Deploy the migration against the same Postgres
database that owns `event_outbox` before starting workers.

## Processing contract

`domainEventJobSchema` validates event ID, type, payload version, chain
provenance, deduplication key, and payload. The processor inserts the
deduplication key first; a uniqueness conflict is a successful duplicate no-op.
For a new event, `(chainId, blockNumber, logIndex)` is compared with the entity
watermark. Older events do not overwrite projections and create an
`OUT_OF_ORDER` reconciliation intent. Newer events update the watermark and
upsert a search projection in one transaction.

Every processed event also creates deterministic notification and reconciliation
intents, a webhook fanout intent, and a monotonic confirmation intent. These
records are preparation/fanout boundaries for later delivery adapters. A
subscription-aware adapter can claim fanout intents and enqueue one T-040
delivery job per `subscriptionId:eventId` using the existing webhook schema.

## Configuration

In addition to T-040 settings, workers use `DATABASE_URL`,
`WORKER_RELAY_INTERVAL_MS` (default `1000`), and `WORKER_RELAY_BATCH_SIZE`
(default `100`). Production requires both Redis and Postgres URLs.

## Operations and tests

Metrics include worker job outcomes and domain event outcomes (`processed`,
`duplicate`, `stale`). Structured logs include queue/job identifiers and errors;
secrets are redacted by the shared logger. Retry exhaustion uses the T-040
per-queue dead-letter queue.

Test duplicate/out-of-order envelopes, relay interruption before acknowledgement,
unique job IDs, monotonic watermarks, projection upserts, intent deduplication,
retry/DLQ behavior, and restart recovery with isolated Redis/Postgres services.
