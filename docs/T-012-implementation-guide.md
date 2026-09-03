# T-012 ERC-721 Collection: Detailed Contract Reference

This document explains the T-012 implementation from the source files, line by
line or in tightly related line groups. T-012 extends the clone-based contracts
created by T-011. The factory still deploys and initializes clones; this task
adds ERC-721 minting, per-token metadata, freeze controls, and tests.

## 1. Shared definitions: `CollectionTypes.sol`

- Lines 1-2 declare the MIT license and require Solidity compiler version `0.8.24`.
- Lines 4-7 define `CollectionStandard`; `ERC721` is value zero and `ERC1155` is value one.
- Lines 9-16 define `CollectionMetadata`: name, symbol, collection URI, description, image, and external URL.
- Lines 18-24 define `ICollectionInitializable.initialize`. Minimal proxy constructors do not execute, so the factory calls this function after cloning. `calldata` avoids an unnecessary memory copy and `uint96` matches ERC-2981 storage.

## 2. Shared behavior: `CollectionBase` in `CreatorCollection.sol`

- Lines 1-7 set the license/compiler and import OpenZeppelin ERC-721, ERC-1155, ERC-2981, and shared types.
- Line 9 declares the abstract common base used by both token standards.
- Lines 10-12 define custom errors for repeated initialization, unauthorized access, and a zero creator.
- Lines 14-21 define public owner, initialization flag, and six collection metadata fields. Public variables generate read-only getters.
- Lines 23-26 define `onlyOwner`; only the creator stored by T-011 may execute the protected function body.
- Lines 28-33 declare the shared internal initializer.
- Line 34 rejects a second initialization, protecting clones from takeover.
- Line 35 rejects the zero creator address.
- Line 36 sets the initialized flag before other effects.
- Line 37 stores the creator as owner.
- Lines 38-43 copy all metadata into storage.
- Line 44 configures default ERC-2981 royalties. The factory enforces the 0-1000 basis-point policy before initialization.
- Lines 47-49 forward ERC-165 checks to ERC-2981; concrete contracts add their standard interface checks.

## 3. `CreatorERC721`: errors, state, and events

- Line 52 declares the concrete ERC-721 clone implementation.
- Lines 53-61 define errors for invalid recipients/URIs, duplicate or missing IDs, frozen state, repeated freezes, and unequal batch arrays. `TokenDoesNotExist` is reserved for explicit missing-token errors; OpenZeppelin's standard ownership error is used by current reads.
- Line 63 stores a private URI per token ID.
- Line 64 exposes each token's irreversible freeze flag.
- Line 65 exposes the irreversible collection-wide freeze flag.
- Lines 67-70 declare custom mint, URI-update, token-freeze, and collection-freeze events. `_safeMint` also emits standard ERC-721 `Transfer`.

## 4. Constructor and initialization

- Lines 72-74 initialize the standalone implementation with empty placeholders and set its `initialized` flag. This prevents direct implementation initialization; clones have separate zeroed storage.
- Lines 76-83 expose the clone initializer and delegate ownership, metadata, and royalty setup to `_initializeBase`.
- Lines 85-87 override `name()` to return initialized `collectionName` instead of the empty constructor placeholder.
- Lines 89-91 do the same for `symbol()`.
- Lines 93-95 resolve multiple inheritance and preserve ERC-721, ERC-165, and ERC-2981 interface support.

## 5. Single mint: lines 97-105

- Line 97 declares creator-only `mint` with recipient, explicit token ID, and URI.
- Line 98 rejects minting after collection freeze.
- Line 99 rejects the zero recipient.
- Line 100 rejects an empty URI.
- Line 101 checks `_ownerOf` without reverting; a non-zero owner means the ID already exists.
- Line 102 calls `_safeMint`, updating ownership and invoking a receiver hook for contract recipients.
- Line 103 stores the URI.
- Line 104 emits `TokenMinted`.

## 6. Batch mint: lines 107-123

- Line 107 declares creator-only batch minting.
- Lines 108-110 validate collection state, recipient, and equal array lengths.
- Lines 111-117 perform a validation-only pass: every URI is non-empty, every ID is unused on-chain, and IDs are unique within the batch. A failure reverts before any mint.
- Lines 118-122 perform the effects pass, safely minting, storing URIs, and emitting one event per token.
- The nested duplicate check is O(n²), chosen for simple deterministic validation in this task.

## 7. URI read and update: lines 125-135

- Lines 125-128 override `tokenURI`; `_requireOwned` reverts for a nonexistent token and the stored URI is returned.
- Line 130 declares creator-only `setTokenURI`.
- Line 131 requires an existing, unfrozen token in an unfrozen collection.
- Line 132 rejects an empty replacement URI.
- Line 133 stores the replacement URI.
- Line 134 emits `TokenURIUpdated`.

## 8. Freeze controls: lines 137-154

- Lines 137-142 implement creator-only `freezeToken`. The token must exist and not already be frozen; then the flag is set permanently and an event is emitted.
- Lines 144-148 implement creator-only `freezeCollection`. A repeated call reverts; otherwise the global flag is set permanently and an event is emitted.
- Lines 150-154 implement `_requireMutableToken`: require existence, reject collection freeze, then reject token freeze.
- A collection freeze blocks all later minting and URI updates, including for tokens not individually frozen. Transfers, balances, `ownerOf`, and `royaltyInfo` remain available.

## 9. ERC-1155 compatibility: lines 157-179

T-012 does not add ERC-1155 minting or freezing; those belong to T-013.

- Lines 157-160 retain the T-011 implementation and lock direct initialization.
- Lines 162-170 retain shared initialization and set the collection URI.
- Lines 172-174 return the collection URI for every token ID.
- Lines 176-178 preserve ERC-1155 and ERC-2981 interface support.

## 10. Test additions in `CreatorCollectionFactory.t.sol`

- Lines 77-88 define `_deploy721`, deploying a fresh clone with the approved T-011 implementation.
- Lines 90-99 verify creator minting, ownership, initial URI, and URI updates.
- Lines 101-111 verify an unrelated address cannot mint or update metadata.
- Lines 113-130 verify token freeze blocks that token's update, collection freeze blocks later minting and updates, and transfers still work afterward.
- Lines 132-149 verify batch minting and unequal-array rejection.
- Lines 151-153 provide a fixed non-creator address for authorization and transfer assertions.
- Earlier tests in the same file continue to verify T-011 deployment events, creator assignment, implementation approval, and ERC-2981 values.

## 11. State flow and boundaries

1. T-011 deploys and initializes a clone with creator, collection metadata, and royalties.
2. The creator calls `mint` or `mintBatch`; each token receives ownership and a non-empty URI.
3. Before freezing, the creator may replace a URI with `setTokenURI`.
4. `freezeToken` locks one token's URI permanently.
5. `freezeCollection` permanently blocks future minting and URI changes.
6. Transfers and royalty reads remain available in every freeze state.

Minting/freeze for ERC-1155, marketplace settlement, and governance are outside T-012 and belong to later tasks.

## Verification commands

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/marketplace-contracts lint
```
