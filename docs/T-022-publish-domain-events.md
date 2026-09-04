# T-022 Publish Domain Events

## Contract

The indexer writes one normalized event to `event_outbox` for each supported
canonical source log. Every envelope has a deterministic `eventId` and
`deduplicationKey` in the form `chainId:lowercase(transactionHash):logIndex`,
block number/hash, transaction hash, transaction index when available, and
`payloadVersion: 1`. Payloads are typed and validated by
`@nft-marketplace/domain`.

Supported event types are `COLLECTION_DEPLOYED`, `MINTED`, `TRANSFERRED`,
`LISTING_CREATED`, `LISTING_CANCELLED`, `PURCHASED`, `WITHDRAWN`, and
`MODERATION_CHANGED`. Zero-address transfers are normalized as mints.

## Delivery

The outbox is durable and idempotent. Inserts use the deterministic event ID,
so replayed logs cannot create duplicate rows. Consumers use the outbox
repository to claim and acknowledge rows and must tolerate at-least-once
delivery by deduplicating on `deduplicationKey`.

Malformed events are quarantined by the owning ingestion boundary and do not
prevent later logs from being processed. Reorg rollback follows T-021's
canonical projection rollback and recreates the same IDs on replay.

## Verification

Run `yarn workspace @nft-marketplace/domain typecheck`,
`yarn workspace @nft-marketplace/domain test`,
`yarn workspace @nft-marketplace/indexer generate`, and
`yarn workspace @nft-marketplace/indexer typecheck`.
