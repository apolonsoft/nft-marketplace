# T-040 Worker Runtime

## Purpose

`apps/workers` is an independently deployable NestJS application context. It owns BullMQ workers and Redis connections and does not import or run the API application. API replicas can scale independently from worker replicas.

## Runtime

Start development workers with `yarn workspace @nft-marketplace/workers dev`. The process bootstraps `WorkerModule`, registers the `webhook-delivery` queue, and listens for Prometheus metrics on `WORKER_METRICS_PORT` (default `3020`). `SIGTERM` and `SIGINT` close BullMQ workers, queues, and Redis before exit.

## Configuration

`REDIS_URL` is required in production and defaults to `redis://127.0.0.1:6379` outside production. `WORKER_CONCURRENCY` defaults to `10`; `WORKER_ATTEMPTS` to `5`; `WORKER_BACKOFF_BASE_MS` to `1000`; `WORKER_BACKOFF_MAX_MS` to `3600000`; and `WORKER_METRICS_PORT` to `3020`. Values must be positive integers where applicable.

## Queues and jobs

The initial queue is `webhook-delivery`. Its payload contains an event (`id`, `type`, `payload`) and a subscription (`id`, `endpointUrl`, `secret`) validated with Zod before processing. Queue defaults retain completed jobs for one day and failed jobs for seven days, with bounded counts. T-041 and T-042 should register additional processors using the same runtime and contracts.

## Retry and quarantine

Retryable webhook failures are network errors, HTTP 408, HTTP 429, and HTTP 5xx responses. BullMQ retries up to `WORKER_ATTEMPTS` using exponential backoff starting at `WORKER_BACKOFF_BASE_MS`; the existing `backoffMs` helper documents the bounded backoff contract. Non-retryable responses and invalid payloads fail terminally. After the final attempt, the job is copied to `<queue>.dead-letter` with source identifiers, attempts, timestamp, error classification, and payload. The deterministic DLQ job ID prevents duplicate quarantine records.

## Metrics and operations

`GET /metrics` exposes worker readiness, job outcomes, and processing duration through `prom-client`. Labels are limited to queue, job, and outcome to avoid unbounded cardinality. Structured logs record startup, worker errors, retries, and quarantine events; sensitive values are redacted by the shared logger.

## Verification

Run `yarn turbo run lint typecheck test build --filter=@nft-marketplace/workers...` and the repository formatting/dependency checks. Integration tests should use an isolated Redis instance and verify success, retry, terminal failure, DLQ idempotency, metrics, and graceful shutdown.
