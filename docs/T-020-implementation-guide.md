# T-020 Bootstrap Ponder Indexer

## Architecture

`apps/indexer/ponder.config.ts` selects Anvil or Base Sepolia from `PONDER_NETWORK`,
loads addresses from `@nft-marketplace/contracts`, validates the RPC and deployment
manifest, and selects SQLite (`.ponder`) locally or Postgres from `DATABASE_URL`.
`ponder.schema.ts` declares normalized on-chain entities. Every table carries block,
transaction, and log provenance so later confirmation and reorg tasks can reconcile data.

## Line-by-line configuration

1. Imports Ponder config, viem transport, and generated contract ABIs/manifests.
2. Selects `base-sepolia` only when explicitly requested; all other runs are Anvil.
3. Resolves RPC URLs from environment variables and rejects missing Base Sepolia RPC.
4. Reads the start block override and resolves factory/settlement addresses from either
   `FACTORY_ADDRESS`/`SETTLEMENT_ADDRESS` or the selected deployment manifest.
5. Registers factory and settlement sources with generated ABIs and the selected start block.
6. Reserves standard-specific collection source definitions for clone addresses discovered
   from `CollectionDeployed`; deployments can feed those addresses through generated manifests.
7. Chooses PGlite (SQLite-compatible local storage) for clean local databases and Postgres
   for hosted deployments.

## Schema and handlers

Collections are created from `CollectionDeployed`, with creator, implementation,
standard, metadata, and royalty fields. Listings, cancellations, purchases, royalties,
withdrawals, and governance events are keyed by listing IDs or transaction/log IDs.
Balances and activity tables provide the normalized foundation for T-021 projections.
`onConflictDoNothing` makes replayed logs idempotent. Event IDs combine transaction hash
and log index, while domain IDs use collection and listing identifiers. ERC-1155 quantity
deltas, zero-address mint/burn semantics, and dynamic clone transfer handlers are isolated
behind the collection source boundary so they can be enabled with the exact Ponder runtime
API selected by the deployment environment without changing the persisted schema.

## Commands

```sh
yarn workspace @nft-marketplace/indexer generate
yarn workspace @nft-marketplace/indexer typecheck
yarn workspace @nft-marketplace/indexer test
PONDER_NETWORK=anvil yarn workspace @nft-marketplace/indexer dev
PONDER_NETWORK=base-sepolia BASE_SEPOLIA_RPC_URL=... DATABASE_URL=... yarn workspace @nft-marketplace/indexer dev
```
