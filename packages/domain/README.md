# @nft-marketplace/domain

Shared NFT marketplace domain models and Zod schemas.

The package exports opaque IDs, chain-aware NFT/collection/ownership/listing
models, stable string state constants, currency and atomic amount helpers, and
normalized validation errors. Amounts are decimal strings on the wire and can
be converted to `bigint` with `toBigInt`.

Import from `@nft-marketplace/domain` or its `./schemas` and `./models`
subpaths. This package must not import application code.
