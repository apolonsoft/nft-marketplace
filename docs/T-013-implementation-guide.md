# T-013 ERC-1155 Collection: Implementation Guide

## Scope and dependency

T-013 completes `CreatorERC1155` in `contracts/marketplace/src/CreatorCollection.sol`.
T-011 remains responsible for clone deployment, creator ownership, collection metadata,
and default ERC-2981 royalty initialization. Transfers remain standard OpenZeppelin
ERC-1155 transfers and are not restricted by metadata freezes.

## Supply and minting

The collection inherits OpenZeppelin `ERC1155Supply`. `totalSupply(id)` is the
authoritative supply for each token ID. A creator can mint an ID only once, with a
strictly positive quantity and non-empty per-token URI. The quantity is assigned to
the recipient and becomes that ID's total supply. Batch minting validates every entry,
rejects empty arrays, zero quantities, duplicate IDs, existing IDs, invalid recipients,
and unequal array lengths before changing state.

Example: minting ID 7 with quantity 10 gives the recipient balance 10. Transferring
3 units leaves the sender with 7 and gives the recipient 3; total supply remains 10.

## URI management

Each minted ID stores its own URI. `uri(id)` requires a positive total supply and
returns that URI. `setTokenURI` and `setTokenURIBatch` are creator-only and require
existing, unfrozen IDs. `setCollectionURI` updates the collection-level metadata URI
and the inherited ERC-1155 base URI while the collection is mutable.

## Freeze behavior

`freezeToken(id)` permanently prevents URI changes for one minted ID. 
`freezeCollection()` permanently prevents all future minting and all URI changes,
including collection URI changes. Repeated freeze calls revert. Neither freeze mode
blocks transfers, balance reads, supply reads, or royalty reads.

## Errors and events

The implementation exposes explicit errors for invalid recipients, quantities, URIs,
missing or already minted IDs, frozen state, repeated freezes, and array mismatches.
Mint events include recipient, token ID, quantity, and URI. URI updates and freeze
operations emit dedicated events; standard ERC-1155 transfer/mint events are also
emitted by OpenZeppelin.

## Royalties and interfaces

`CollectionBase` initializes the ERC-2981 default royalty through the factory-provided
recipient and basis points. T-013 adds no royalty mutators. Interface detection
continues to expose ERC-1155, ERC-2981, and ERC-165 support.

## Verification

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/marketplace-contracts lint
```
