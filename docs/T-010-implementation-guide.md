# T-010 Foundry Contracts Workspace

## Purpose

This guide documents the Foundry bootstrap for `contracts/marketplace`. T-010
establishes reproducible Solidity compilation and local contract-test wiring;
production collection, settlement, governance, deployment, and generated ABI
work belong to T-011 through T-016.

## Prerequisites and dependency setup

Use the repository's pinned Node/Yarn versions, install Foundry with a
date-pinned nightly toolchain, and initialize the pinned OpenZeppelin and Forge
Std submodules:

```sh
git submodule update --init --recursive
cd contracts/marketplace
forge --version
```

When a checkout does not include initialized submodules, install the exact
revisions before building:

```sh
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
forge install foundry-rs/forge-std@v1.9.6 --no-commit
```

Dependencies are mapped by `foundry.toml`; do not edit files under `lib` or
commit Forge outputs. CI should verify the resolved dependency revisions before
compilation.

## Configuration

`foundry.toml` pins Solidity `0.8.24`, disables bytecode/metadata hash variance,
enables the optimizer with 200 runs, and uses Cancun EVM semantics. The default
profile is deterministic and local. `anvil` uses chain ID `31337`. `base-sepolia`
uses chain ID `84532`, the top-level `base_sepolia` RPC endpoint backed by
`BASE_SEPOLIA_RPC_URL`, and the `base_sepolia` Etherscan mapping backed by
`BASESCAN_API_KEY`; credentials must be supplied through the environment and
never committed. Use `--rpc-url base_sepolia` for network commands.

The `ci` profile increases fuzz runs and verbosity. Forge formatting is the
required lint gate; Solhint may be added later, but is not required for this
bootstrap.

## Workspace commands

From the repository root:

```sh
yarn turbo run build --filter=@nft-marketplace/marketplace-contracts
yarn turbo run test --filter=@nft-marketplace/marketplace-contracts
yarn turbo run lint --filter=@nft-marketplace/marketplace-contracts
yarn workspace @nft-marketplace/marketplace-contracts coverage
yarn workspace @nft-marketplace/marketplace-contracts gas
```

The smoke test proves OpenZeppelin remapping, owner initialization, authorized
incrementing, and unauthorized access rejection. `generate` remains a
documented no-op until T-016 owns ABI/client generation.

## Determinism and acceptance checks

Run `forge clean && forge build` twice and compare successful outputs/logs. Run
`forge fmt --check` and `forge test`; then run the affected Turbo commands above.
The acceptance criteria are met when local contract tests execute through
Turborepo and repeated compilation succeeds with the same pinned compiler,
dependency revisions, optimizer, EVM, and metadata settings.

Repository-level validation is:

```sh
yarn format:check
yarn deps:check
yarn lint
yarn typecheck
yarn test
yarn build
```

## Troubleshooting and boundaries

If imports cannot be resolved, initialize the submodules and check the
remapping. If Forge is missing, install the documented toolchain before running
Turbo. Do not add deployment, verification, network manifests, ABI exports, or
application integrations here; those are T-016 responsibilities.
