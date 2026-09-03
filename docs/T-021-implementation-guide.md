# T-021 Canonical Read Models

This guide describes the chain-derived read models built on the T-020 Ponder indexer. Contract line references identify the fields and events consumed by each projection.

## Contract inputs

- `CreatorCollectionFactory.sol:42-56` emits `CollectionDeployed`; collection, creator, implementation, standard, metadata, and royalty fields become the canonical collection row.
- `CreatorCollection.sol:74-77` and `188-194` emit mint, URI, freeze, and collection-URI events. Handlers update token metadata, supply, and frozen flags.
- OpenZeppelin `Transfer` events represent mint, transfer, and burn. A zero `from` means mint; a zero `to` means burn.
- `MarketplaceSettlement.sol:73-94` emits listing creation/cancellation and purchase economics. Listing IDs are stable domain IDs; purchases use chain ID, transaction hash, and log index.
- `MarketplaceSettlement.sol:98` emits withdrawals; currency address zero is the ETH sentinel.

## Canonical tables

`collection`, `token`, `token_balance`, `listing`, `purchase`, `royalty_payment`, `withdrawal`, `activity`, and `transaction_confirmation` are Ponder on-chain tables. Every row carries chain ID, block number/hash, transaction hash, log index, and `PENDING`/`CONFIRMED` status.

`token_balance` is unified: ERC-721 quantities are 0/1 and ERC-1155 quantities are arbitrary positive integers. Rows are keyed by collection, token ID, and owner. Event IDs are deterministic and replay-safe.

## Projection and rollback rules

Handlers record the confirmation row first, then apply the domain projection. `onConflictDoNothing` makes duplicate delivery harmless. Transfer handlers apply from/to deltas and append activity; purchase handlers persist sale and royalty economics. Ponder owns rollback of reverted blocks; reconciliation recomputes affected balances, supplies, and listing quantities from surviving canonical events.

`PONDER_CONFIRMATIONS` controls when rows become confirmed. Unconfirmed rows remain visible as `PENDING` until the configured number of canonical successor blocks exists.

## Verification

```sh
yarn workspace @nft-marketplace/indexer generate
yarn workspace @nft-marketplace/indexer typecheck
yarn workspace @nft-marketplace/indexer test
```

Coverage must include duplicate/out-of-order events, ERC-721 transfers, ERC-1155 partial quantities, purchases, confirmation transitions, and Anvil snapshot/revert recovery.
