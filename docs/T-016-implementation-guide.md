# T-016 Contract Deployment and Artifact Generation

## Purpose

T-016 turns the Foundry contracts into deployable, verifiable, application-consumable
artifacts. The implementation supports Anvil (`31337`) and Base Sepolia (`84532`),
keeps secrets in the environment, and makes generated output reproducible.

## Deployment, line by line

`contracts/marketplace/script/Deploy.s.sol` is the canonical deployment transaction:

1. The SPDX and pragma pin licensing and Solidity `0.8.24`, matching `foundry.toml`.
2. Foundry `Script` provides environment reads and broadcast controls.
3. The contract imports the factory, collection implementations, settlement, and
   OpenZeppelin transparent proxy primitives.
4. `Deployment` names every address written to a deployment manifest by callers.
5. `run` reads `PLATFORM_MULTISIG`, `TREASURY_ADDRESS`, and `PLATFORM_FEE_BPS`.
6. `BROADCAST` defaults to false; `DEPLOYER_PRIVATE_KEY` is read only when broadcasting.
7. Implementations are deployed first, with the script contract as temporary owner.
8. Initializer calldata transfers proxy application ownership to the multisig.
9. Transparent proxies are deployed with the implementation, multisig, and initializer.
10. OpenZeppelin 5 creates each proxy's `ProxyAdmin`; its owner is the supplied multisig.
11. Broadcast is stopped before returning the address record.

`contracts/marketplace/scripts/deploy.mjs` selects the Foundry profile, adds `--broadcast`
only when `BROADCAST=true`, and forwards the environment unchanged. This makes dry runs
safe and repeatable while leaving transaction signing to Foundry.

`scripts/verify.mjs` requires an address and fully-qualified contract name, selects the
network profile, and invokes `forge verify-contract`; constructor arguments are optional
through `VERIFY_CONSTRUCTOR_ARGS`.

## Generated package

`packages/contracts/scripts/generate.mjs` locates Forge JSON artifacts by contract name,
extracts only six app/governance ABIs, serializes them as `as const` TypeScript values,
and converts every JSON deployment manifest into typed address maps. Running it twice
with unchanged inputs produces byte-for-byte identical files.

`src/types.ts` defines the supported address, chain, deployment, and manifest shapes.
`src/chains.ts` defines the Anvil and Base Sepolia chain metadata.
`src/clients.ts` returns a `getContract`-compatible `{ address, abi, chainId }` shape;
applications can pass this object to viem without importing Forge output paths.
`src/index.ts` is the stable package entrypoint and exports all generated ABIs and helpers.

## CI freshness

`packages/contracts/scripts/check-generated.mjs` snapshots `src`, regenerates artifacts,
and fails when the regenerated tree differs. The root `generate:check` script delegates
to it, so CI can run `yarn generate:check` and reject source changes with stale ABIs or
addresses. `test-generated.mjs` checks that all six published ABIs and address exports exist.

## Contract interface reference

- `CreatorCollectionFactory`: owner-only implementation approvals; creators call
  `deployCollection`, while `getCollection` and `predictCollectionAddress` are views.
- `CreatorERC721` and `CreatorERC1155`: creator-owned minting, URI, freeze, supply,
  royalty, and transfer interfaces; ERC-1155 accepts quantities and batch arrays.
- `MarketplaceSettlement`: owner governance for fees, treasury, currencies, and pause;
  sellers create/cancel listings, buyers purchase, and payees withdraw pull balances.
- `TransparentUpgradeableProxy`: delegates application calls and reserves admin calls
  for its ProxyAdmin; implementation upgrades do not alter proxy storage.
- `ProxyAdmin`: multisig-owned upgrade authority used for transparent proxy upgrades.

## Operational commands

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/contracts generate
yarn generate:check
FOUNDRY_PROFILE=base-sepolia BROADCAST=true yarn workspace @nft-marketplace/marketplace-contracts deploy
VERIFY_NETWORK=base-sepolia VERIFY_ADDRESS=0x... VERIFY_CONTRACT=src/MarketplaceSettlement.sol:MarketplaceSettlement yarn workspace @nft-marketplace/marketplace-contracts verify
```
