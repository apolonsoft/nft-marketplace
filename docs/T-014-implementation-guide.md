# T-014 Marketplace Settlement: Implementation Guide

## Scope and dependency

`MarketplaceSettlement` is a non-custodial fixed-price marketplace for the
`CreatorERC721` and `CreatorERC1155` collections delivered by T-012 and T-013.
Listings do not escrow assets. The seller must own the asset and approve the
marketplace both when creating the listing and immediately before purchase.

## Configuration

The contract is `Ownable`, `Pausable`, and `ReentrancyGuard` protected. The owner
configures a treasury, a platform fee up to 10% (1000 BPS), and an allowlist of
nonzero ERC-20 payment addresses. `address(0)` is ETH and is always supported.
Pausing blocks listing creation and purchases but leaves cancellation and withdrawals
available for recovery.

## Listing lifecycle

`createListing` assigns a monotonic listing ID and stores seller, collection, token ID,
standard, remaining quantity, per-unit price, currency, expiry, and active state.
ERC-721 listings must have quantity one. ERC-1155 listings require a positive quantity.
An expiry of zero means no expiry; otherwise the timestamp must be in the future.
Creation validates ERC-165 support, current ownership/balance, and operator approval.

The seller or marketplace owner can cancel an active listing. A cancelled or sold listing
cannot be purchased. Expired listings reject purchases without being mutated during reads.

## Purchase flow

`purchase(listingId, purchaseId, quantity)` requires an active, non-expired listing,
positive quantity within the remaining amount, valid current ownership/balance and
approval, and an unused global purchase ID. ERC-721 quantity is always one. ERC-1155
remaining quantity is decremented atomically and the listing becomes sold at zero.

ETH requires exact `msg.value == unitPrice * quantity`. ERC-20 purchases require zero
ETH and use `SafeERC20.safeTransferFrom`. Payment and asset transfer are executed in one
transaction, so a failed transfer reverts the whole purchase and does not consume the
listing or purchase ID.

## Settlement arithmetic

For `saleAmount = unitPrice * quantity`:

```text
platformFee = floor(saleAmount * platformFeeBps / 10_000)
royalty = floor(royaltyInfo(tokenId, saleAmount).amount)
seller = saleAmount - platformFee - royalty
```

If fee plus royalty exceeds the sale amount, settlement reverts. The seller, treasury,
and royalty recipient (when nonzero) are credited to `pending[currency][account]`; the
three allocations sum exactly to the sale amount.

## Pull payments

`withdraw(currency)` zeroes the caller's pending balance before attempting an ETH call or
ERC-20 transfer. Reentrancy protection prevents nested withdrawals. A failed transfer
reverts the transaction, preserving the pending balance. `pendingBalance` exposes the
current amount for indexers and clients.

## Replay and security controls

Purchase IDs are globally consumed only after successful payment and asset transfer.
Duplicate IDs revert. Invalid standards, unsupported currencies, stale listings,
ownership loss, missing approvals, invalid quantities/prices, incorrect ETH values,
and inactive listing states all revert before settlement. `nonReentrant` protects
purchase and withdrawal paths.

## Verification

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/marketplace-contracts lint
```
