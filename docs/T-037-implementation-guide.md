# T-037 Webhook Subscriptions and Delivery

## Overview

Webhook subscriptions belong to developer applications and consume the
persisted domain-event outbox produced by the indexer. Applications explicitly
select supported domain event types. Subscription management uses the existing
application OWNER/ADMIN authorization path.

## Subscription and secret lifecycle

Create, list, rotate, disable, delivery-history, and replay endpoints are
available under `/api/v1/developer/applications/:applicationId/webhooks`.
GraphQL exposes the same create and list operations through the shared service.
Endpoint URLs must be HTTPS and event types must be members of the shared
`DomainEventType` union. A new `whsec_` secret is generated during create and
rotation; only that response contains the raw secret. The database stores only
the SHA-256 hash and a monotonically increasing secret version. Rotation
invalidates the previous secret immediately.

## Signature and replay protection

The worker signs the exact request body with HMAC-SHA256 over
`<unix_timestamp>.<raw_body>`. It sends:

```text
X-Webhook-Event-Id: <stable domain event ID>
X-Webhook-Delivery-Id: <unique attempt ID>
X-Webhook-Event-Type: <domain event type>
X-Webhook-Timestamp: <unix timestamp>
X-Webhook-Signature: t=<timestamp>,v1=<hex digest>
```

Consumers should reject timestamps outside a five-minute tolerance, parse only
the `v1` signature, and compare digests in constant time. Duplicate deliveries
are identified by the stable event ID plus subscription ID; delivery IDs are
unique per attempt. Replays retain the original event ID but receive a new
delivery ID, timestamp, and signature.

## Delivery lifecycle

Outbox events are matched to active subscriptions and inserted with a unique
`(subscriptionId,eventId)` key. Delivery attempts are recorded as pending,
delivered, retrying, failed, or dead-lettered. Network errors, timeouts, 408,
429, and 5xx responses retry with bounded exponential backoff for at most ten
attempts. Other 4xx responses are terminal. Exhausted attempts become dead
letters. OWNER/ADMIN application members can replay failed deliveries; replay
creates a linked new attempt.

The worker enforces HTTPS, request timeouts, response-size limits, and SSRF
protections in its production HTTP adapter. Delivery and dead-letter records are
retained for 90 days and should be cleaned by a scheduled worker task.

## Storage and verification

`WebhookSubscription`, `WebhookDelivery`, and `WebhookDeadLetter` are stored in
the API Prisma database. The migration is
`apps/api/prisma/migrations/20260904050000_webhooks/migration.sql`.

```text
rtk yarn workspace @nft-marketplace/api prisma:generate
rtk yarn workspace @nft-marketplace/api typecheck
rtk yarn workspace @nft-marketplace/api test
rtk yarn workspace @nft-marketplace/workers test
```
