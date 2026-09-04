# T-015 Upgrade Governance: Implementation Guide

## Scope

T-015 adds governance controls around the existing collection factory and
marketplace settlement contracts. The implementation preserves direct deployments
for compatibility with the earlier task tests, while exposing one-time
`initialize` functions for transparent-proxy deployments.

Creator ERC-721 and ERC-1155 collection clones remain immutable. The factory owner
controls which new implementation addresses may be cloned, so future collection
versions are introduced by approving a new implementation rather than upgrading
already-created creator collections.

## Factory governance

`CreatorCollectionFactory` stores a `governanceInitialized` flag. Its existing
constructor sets that flag for direct deployments. A proxy starts with zeroed
storage, so the proxy calls:

```solidity
initialize(address platformMultisig)
```

The initializer rejects repeat calls and the zero address, marks governance
initialized, transfers application ownership to the multisig, and emits
`GovernanceInitialized`.

After initialization, `setImplementation` is the governed administration entry
point. Only the multisig can approve or revoke an ERC-721 or ERC-1155 implementation.
The existing `ImplementationApprovalUpdated` event remains the audit record.
Collection deployment, metadata validation, royalty validation, deterministic salts,
clone initialization, collection records, and deployment events are unchanged.

## Settlement governance

`MarketplaceSettlement` adds the same `governanceInitialized` guard. Its direct
constructor remains usable for existing deployments and marks the guard initialized.
A transparent proxy calls:

```solidity
initialize(address platformMultisig, address initialTreasury, uint256 initialFeeBps)
```

The initializer validates both addresses and the 10% fee cap, transfers application
ownership to the multisig, stores treasury and fee values, and emits
`GovernanceInitialized`, `TreasuryUpdated`, and `PlatformFeeUpdated`.

All existing settlement administration remains owner-only and therefore multisig-only:

- `setPlatformFeeBps` changes the capped platform fee.
- `setTreasury` changes the platform allocation recipient.
- `setCurrency` adds or removes an ERC-20 payment token.
- `pause` and `unpause` control listing creation and purchases.

Listings, purchases, royalties, pull balances, withdrawals, replay protection, and
partial ERC-1155 settlement retain their T-014 behavior.

## Transparent proxy flow

OpenZeppelin `TransparentUpgradeableProxy` is deployed with an implementation,
a proxy-admin owner, and encoded initialization data. In OpenZeppelin Contracts 5,
the proxy creates its own `ProxyAdmin`; the supplied multisig becomes that
ProxyAdmin's owner.

The multisig therefore controls two layers:

1. ProxyAdmin ownership controls implementation upgrades.
2. Proxy application ownership controls fees, treasury, currencies, pause state,
   and factory implementation approvals.

An individual multisig signer cannot upgrade alone. The test fixture requires both
signers to approve the exact target and calldata hash before one signer can execute.
Production deployments are expected to use a Safe-compatible multisig.

Upgrades use `ProxyAdmin.upgradeAndCall`, allowing a new implementation to run an
atomic initialization or reinitializer call. Existing state remains in the proxy
storage; the implementation contract's own storage is irrelevant to proxy state.

## Storage compatibility

The contract package exposes:

```sh
yarn workspace @nft-marketplace/marketplace-contracts storage:check
```

The command asks Forge for storage layouts of `CreatorCollectionFactory` and
`MarketplaceSettlement`. CI must treat this command as a required check and
compare the generated layouts against reviewed baselines before accepting a new
implementation.

Safe upgrades may append storage only. They must not reorder existing variables,
change variable types, insert fields before existing mappings, or alter inherited
storage assumptions. Any future V2 implementation must include an upgrade test
that preserves collection records, listings, balances, currencies, fees, treasury,
pause state, and consumed purchase IDs.

## Events and audit records

Governance actions emit:

- `GovernanceInitialized(multisig)`.
- OpenZeppelin `OwnershipTransferred` when application ownership changes.
- `ImplementationApprovalUpdated` for collection implementation addresses.
- `PlatformFeeUpdated`, `TreasuryUpdated`, and `CurrencyUpdated`.
- OpenZeppelin `Paused` and `Unpaused`.
- OpenZeppelin `Upgraded` for successful proxy upgrades.
- `ProxyDeployed(proxy, implementation, multisig)` from the governance test
  fixture/deployment helper when used.

## Verification

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/marketplace-contracts storage:check
yarn workspace @nft-marketplace/marketplace-contracts lint
forge fmt --check
```

The governance suite verifies implementation initialization locks, proxy ownership,
multisig administration, single-signer upgrade rejection, threshold upgrade-and-call,
and state preservation.
