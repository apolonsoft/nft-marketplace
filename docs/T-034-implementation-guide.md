# T-034 Marketplace Read APIs

## Purpose

T-034 provides read-only marketplace discovery through REST and GraphQL on top
of T-021's canonical Ponder read models. Both transports call the same service,
repository, filter validation, stale-listing policy, and cursor implementation.

## Resources and Pagination

The API exposes collections, NFTs, creators, listings, sales, activity,
ownership, prices, currencies, `/discover`, and `/search` under `/api/v1`.
Pagination is cursor-first with opaque versioned base64url cursors containing the
resource, sort, sort value, and entity ID. Invalid, mismatched, or tampered
cursors return `VALIDATION_ERROR`; page sizes are limited to 100.

Filters and sorts are allowlisted. Prices and quantities remain atomic decimal
strings, and currency responses include code/address, symbol, decimals, and
active status. PostgreSQL is the intended indexed text-search backend.

## Listing and Confirmation Policy

Expired, cancelled, sold, or ownership-inconsistent listings are stale and are
excluded by default. Public callers may request `includeStale` to inspect them
with their stale status. Confirmed indexer rows are returned by default;
`includePending` is rejected for public callers and reserved for internal
reconciliation tooling.

## GraphQL Safety

GraphQL requests are checked before execution against a static depth and weighted
field budget. Nested list fields add cost, and oversized queries return a
normalized validation response. List arguments remain capped at 100.

## Verification

```sh
yarn workspace @nft-marketplace/api typecheck
yarn workspace @nft-marketplace/api test
yarn workspace @nft-marketplace/api build
yarn workspace @nft-marketplace/api generate
```

Tests cover REST/GraphQL service consistency, cursor validation, filter/sort
validation, stale exclusion, pending rejection, atomic value mapping, and query
complexity rejection.
