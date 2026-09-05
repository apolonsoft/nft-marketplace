# T-042 Media and Metadata Workers

## Workflow

Media work is processed independently by `apps/workers` through BullMQ queues:
`media-ingestion`, `metadata-validation`, `image-previews`, `ipfs-pinning`,
`ipfs-pin-status`, and `media-retry`. Jobs contain an asset ID, authenticated or
signed source URL, declared MIME type, optional declared size, and media kind.
Deterministic asset/operation IDs make retries and duplicate deliveries safe.

Ingestion streams the source URL with redirects disabled and a timeout. Images
are limited to 10 MiB by default; JSON metadata to 1 MiB. JPEG, PNG, WebP, GIF,
and JSON are supported. Unsupported MIME types, MIME/header mismatches,
malformed JSON, and oversized payloads are rejected before pinning.

## Image previews

`sharp` decodes images with a 25 megapixel default limit, normalizes orientation,
strips source metadata, and generates a deterministic WebP thumbnail no larger
than 512 px in either dimension. Preview rows contain dimensions, bytes, and a
content checksum. Duplicate preview jobs use `ON CONFLICT DO NOTHING`.

## IPFS and status

`IpfsPinningClient` posts validated bytes to the configured HTTP pinning endpoint
using an optional bearer token. Asset rows persist validation status, checksum,
attempt count, provider request ID, CID, errors, and retry timestamps. Network,
timeout, rate-limit, and 5xx failures are retryable through T-040 backoff and
dead-letter handling. Authentication, invalid-content, unsupported-response, and
validation failures are terminal. The `ipfs-pin-status` and `media-retry` queues
are reserved for asynchronous provider polling and manual retry commands.

## Configuration and operations

Required production settings are `REDIS_URL`, `DATABASE_URL`, and
`IPFS_PIN_ENDPOINT`; optional `IPFS_PIN_TOKEN` supplies provider authentication.
Limits and timeouts are configurable with `MEDIA_MAX_IMAGE_BYTES`,
`MEDIA_MAX_METADATA_BYTES`, `MEDIA_MAX_PIXELS`,
`MEDIA_PREVIEW_MAX_DIMENSION`, `MEDIA_SOURCE_TIMEOUT_MS`, and
`MEDIA_POLL_INTERVAL_MS`.

Worker metrics and structured logs expose accepted/rejected assets, preview and
pin outcomes, attempts, CIDs/provider IDs, and dead-letter events. Secrets and
tokens are redacted. Operators can inspect `worker_media_assets`, retry a failed
asset by enqueueing its deterministic operation key, and monitor DLQs.

## Verification

Use isolated Redis/Postgres and mocked HTTP providers to test unsupported and
oversized input rejection, malformed metadata, image pixel limits, duplicate
jobs, deterministic previews, transient pin retries, asynchronous pin status,
terminal failures, manual retry, and worker restart recovery.
