# NFT Marketplace Contracts: Detailed Reference

This document explains the Solidity contracts currently implemented under
`contracts/marketplace/src`. References use source line numbers and group
closely related lines where a literal one-line explanation would repeat the
same rule.

## 1. CollectionTypes.sol

### Lines 1-2: compiler envelope

- Line 1 declares the MIT license.
- Line 2 pins compilation to Solidity `0.8.24`, matching Foundry.

### Lines 4-7: collection standard

`CollectionStandard` is an enum with `ERC721` and `ERC1155` variants. The
factory uses it to select an approved implementation and the marketplace uses it
to interpret quantities and transfer APIs.

### Lines 9-16: collection metadata

`CollectionMetadata` groups collection name, symbol, collection metadata URI,
description, image, and external URL. Passing one struct keeps the factory and
clone initializer consistent.

### Lines 18-25: clone initializer interface

`ICollectionInitializable.initialize` defines the common post-clone setup:
creator ownership, metadata, royalty recipient, and royalty basis points. The
factory can initialize either token standard through this interface.

## 2. CreatorCollection.sol

### Lines 1-12: imports and shared base

The file imports OpenZeppelin ERC-721, ERC-1155, ERC-1155 supply, and ERC-2981
primitives. `CollectionBase` inherits ERC-2981 and the initializer interface so
both standards share ownership, metadata, initialization, and royalties.

### Lines 13-21: shared errors and storage

`AlreadyInitialized` protects clones from takeover; `Unauthorized` protects
creator-only operations; and `InvalidCreator` rejects the zero address.
`owner`, `initialized`, and the six public metadata fields form shared state.

### Lines 23-27: owner modifier

`onlyOwner` compares `msg.sender` with the creator saved during initialization.
Minting, URI mutation, and freeze operations use this gate.

### Lines 29-46: `_initializeBase`

The initializer rejects repeat calls and a zero creator, sets the initialized flag
before writing state, stores the creator and all metadata, and configures the
ERC-2981 default royalty. The implementation constructor marks the standalone
implementation initialized; each clone has independent zeroed storage.

### Lines 48-56: interface support

The shared `supportsInterface` forwards ERC-165 queries to ERC-2981. Concrete
contracts add their ERC-721 or ERC-1155 interface in their own override.

### Lines 59-169: CreatorERC721

`CreatorERC721` stores one URI per token and irreversible token/collection
freeze flags. Single mint validates collection state, recipient, URI, and token
uniqueness, then safely mints and emits `TokenMinted`. Batch mint validates all
entries, rejects duplicate IDs before effects, and then mints/stores/emits in a
second pass. URI reads require existence; URI updates require a mutable token.
Token freeze locks one URI, collection freeze blocks future minting and all URI
updates, while transfers remain enabled.

### Lines 172-208: CreatorERC1155 setup

`CreatorERC1155` inherits `ERC1155Supply`, so `totalSupply(id)` tracks supply
through minting and transfers. It stores per-token URIs and freeze flags, calls
the shared initializer, and sets the inherited collection URI.

### Lines 210-247: ERC-1155 minting

Single and batch minting are creator-only. Quantities must be positive, URIs
nonempty, IDs unused, recipients nonzero, and batch arrays equal and nonempty.
Batch validation completes before `_mintBatch`, preventing partial state changes.
Each mint updates supply, stores metadata, and emits quantity-aware events.

### Lines 249-326: ERC-1155 URI, freezes, and interfaces

`uri(id)` requires positive supply and returns the stored token URI.
`setTokenURI` and `setTokenURIBatch` require existing mutable IDs and reject
empty or duplicate updates. `setCollectionURI` updates collection metadata
while unfrozen. Token and collection freezes are irreversible and affect metadata
and minting, not transfers. The final override exposes ERC-1155, metadata,
ERC-2981, and ERC-165 support.

## 3. CreatorCollectionFactory.sol

### Lines 1-31: setup, errors, records, and storage

The factory uses `Ownable` for implementation administration and `Clones` for
minimal proxies. It rejects invalid addresses/metadata, royalties above 10%,
unsupported standards, unapproved implementations, and reused salts.
`CollectionRecord` stores creator, implementation, standard, metadata, royalty
configuration, and salt. Approval, used-salt, collection-record, and nonce
mappings support deployment and indexing.

### Lines 38-55: events

Implementation approval events audit the approved implementation set.
`CollectionDeployed` includes clone address, creator, implementation, standard,
every metadata field, royalty fields, and final deployment salt.

### Lines 59-66: implementation administration

Owner-only `setImplementation` rejects the zero address, toggles approval for
one standard/implementation pair, and emits the change.

### Lines 68-115: `deployCollection`

Deployment validates addresses, metadata, royalty cap, implementation approval,
and enum value; derives a nonce salt when the caller passes zero; rejects reused
explicit salts; clones deterministically; initializes the clone with the caller
as creator; stores the complete record; and emits the deployment event. The
factory never escrows assets or receives collection ownership.

### Lines 117-164: record storage and prediction

Private helpers write and emit stored records. `getCollection` returns the
complete record. `predictCollectionAddress` mirrors salt derivation and asks
OpenZeppelin Clones for the CREATE2 proxy address.

## 4. MarketplaceSettlement.sol

### Lines 1-19: imports and royalty adapter

Settlement imports OpenZeppelin ownership, ERC-20, SafeERC20, ERC-721, ERC-1155,
ERC-165, pause, and reentrancy primitives. `IERC2981Settlement` reads royalties
without coupling settlement to a concrete collection class.

### Lines 21-43: guards, constants, states, and listing

The contract combines `Ownable`, `Pausable`, and `ReentrancyGuard`.
The platform fee cap is 1000 BPS (10%); `ETH = address(0)` is the native
currency sentinel. A listing stores seller, collection, token ID, standard,
remaining quantity, per-unit price, currency, expiry, and state.

### Lines 45-70: errors and storage

Errors identify invalid configuration, listing state, expiry, ownership,
approval, payment, quantity, replay, allocation, withdrawal, and fee cases.
Storage contains the next listing ID, platform fee, treasury, ERC-20 allowlist,
private listings, per-currency pending balances, and consumed purchase IDs.

### Lines 72-110: events and constructor

Events expose listing creation/cancellation, complete purchase economics, currency
configuration, fee/treasury changes, and withdrawals. The constructor validates
treasury and fee, stores them, emits initial configuration events, and exposes a
payable receive hook so the contract can hold ETH proceeds.

### Lines 112-136: administration

Owner-only functions add/remove nonzero ERC-20 currencies, update the fee within
the cap, update the treasury, and pause/unpause. Pausing blocks listing creation
and purchases while cancellation and withdrawals remain available.

### Lines 138-182: `createListing`

Creation checks nonzero addresses, positive price and quantity, ERC-721 quantity
one, future-or-zero expiry, currency allowlisting, ERC-165 support for the
declared standard, seller ownership/balance, and marketplace approval. It then
assigns a monotonic ID, stores an active listing, and emits `ListingCreated`.
No asset is escrowed.

### Lines 184-191: `cancelListing`

An existing active listing may be cancelled by its seller or the marketplace
owner. Only the state changes; the seller retains custody.

### Lines 193-252: `purchase`

The non-reentrant purchase path rejects consumed purchase IDs, missing/inactive or
expired listings, invalid quantities, delisted currencies, and lost ownership or
approval. It computes sale amount, reads ERC-2981 royalty, floors platform fee,
checks allocation bounds, and assigns the seller remainder. Exact ETH or
SafeERC20 payment is collected, then the asset is safely transferred. ERC-721
listings become sold; ERC-1155 listings decrement and become sold at zero.
Only after successful transfer is the purchase ID consumed and seller, treasury,
and royalty pending balances credited. Any failure reverts all state and payment
changes together.

### Lines 254-273: withdrawals and reads

`withdraw(currency)` requires a nonzero balance, zeros it before the external
transfer, and uses a checked ETH call or SafeERC20 transfer. Reverts restore the
balance. `getListing` and `pendingBalance` expose state for clients/indexers.

### Lines 275-326: validation and payment helpers

`_validateCurrency` always accepts ETH and requires nonzero currencies to be
allowlisted. `_validateCollection` checks ERC-165. `_validateSellerAsset`
checks ERC-721 ownership plus token/operator approval, or ERC-1155 balance plus
operator approval. `_collectPayment` requires exact ETH and zero ETH for
ERC-20 purchases before calling `safeTransferFrom`.

## 5. End-to-end flow

1. The factory deploys and initializes a creator-owned collection clone.
2. The creator mints assets and approves the marketplace operator.
3. The seller creates an active listing without escrow.
4. A buyer submits a unique purchase ID and exact payment.
5. Settlement rechecks asset state, transfers the NFT, and credits seller,
   treasury, and royalty pending balances.
6. ERC-1155 listings remain active while quantity remains; ERC-721 listings sell
   immediately.
7. Each payee withdraws ETH or ERC-20 proceeds independently.

## 6. Test coverage

`MarketplaceSettlement.t.sol` covers ETH ERC-721 settlement, ERC-1155 partial
purchases, exact allocation conservation, USDC, replay protection, unsupported
currencies, pause behavior, expiry, stale ownership, delisted currencies,
cancellation, and withdrawals. `CreatorCollectionFactory.t.sol` covers factory
deployment plus both collection standards, quantities, metadata, and freezes.

## 7. Verification

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/marketplace-contracts lint
forge fmt --check
```

