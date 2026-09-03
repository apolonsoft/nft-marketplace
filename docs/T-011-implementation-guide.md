# T-011 Creator Collection Factory

The factory deploys creator-owned ERC-721 and ERC-1155 collection clones using
OpenZeppelin ERC-1167 minimal proxies. Implementations are approved per token
standard by the factory owner. T-015 is responsible for replacing this owner
authority with upgrade governance.

## Deployment flow

`deployCollection` validates addresses, required identity metadata, standard,
implementation approval, and a royalty rate from 0 through 1,000 basis points.
It deploys a deterministic clone, initializes it once with the caller as owner,
stores a `CollectionRecord`, and emits `CollectionDeployed` with all metadata,
royalty, implementation, creator, standard, and salt fields needed by an indexer.

An all-zero salt is converted to a factory-generated nonce salt. A non-zero salt
is unique per creator and standard; reuse reverts.

## Collection initialization

`CreatorERC721` and `CreatorERC1155` expose the same initializer interface. Each
clone stores creator ownership and extended metadata. ERC-2981 default royalties
use the standard 10,000 denominator. Minting, URI mutation, freezing, and supply
rules are intentionally deferred to T-012 and T-013.

## Verification

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/marketplace-contracts lint
```
