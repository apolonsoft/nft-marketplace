# @nft-marketplace/indexer

# @nft-marketplace/indexer

Ponder indexer for factory, dynamically discovered collections, marketplace settlement,
royalties, withdrawals, transfers, and governance events. It publishes canonical
chain-derived data and contains no public API or authentication logic.

Local Anvil uses SQLite by default:

```sh
PONDER_NETWORK=anvil yarn workspace @nft-marketplace/indexer dev
```

Base Sepolia requires `BASE_SEPOLIA_RPC_URL`, `DATABASE_URL`, and populated deployment
manifest addresses. `PONDER_START_BLOCK` overrides the manifest/default start block and
`PONDER_CONFIRMATIONS` is available to hosted deployments.

See [the T-020 implementation guide](../../docs/T-020-implementation-guide.md).
