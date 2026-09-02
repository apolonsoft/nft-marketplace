# @nft-marketplace/marketplace-contracts

Foundry workspace for the marketplace contracts. T-010 provides deterministic
compiler/toolchain configuration, OpenZeppelin remappings, and a small smoke
contract/test. Production marketplace contracts, deployment scripts, and ABI
generation remain owned by later tasks.

See [the T-010 implementation guide](../../docs/T-010-implementation-guide.md)
for setup, profiles, environment variables, and verification commands.

## Install Foundry

Foundry provides the Solidity compiler, Forge test runner, Anvil local node,
and Cast command-line tools. Install it once per development machine:

```sh
curl -L https://foundry.paradigm.xyz | bash
source ~/.zshrc
foundryup
```

For Bash, source `~/.bashrc` instead. Confirm the installation:

```sh
forge --version
cast --version
anvil --version
```

The project expects Solidity `0.8.24` and a date-pinned Foundry nightly. Use
the same Foundry version in local development and CI for deterministic builds.

## Install contract dependencies

From the repository root, install the exact library revisions into this
workspace's `lib/` directory:

```sh
cd contracts/marketplace
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
forge install foundry-rs/forge-std@v1.9.6 --no-commit
```

These dependencies are used by the imports in `src/` and `test/`. The
OpenZeppelin import is resolved by the remapping in `foundry.toml`; Forge Std
is discovered from `lib/forge-std`.

Verify the dependency checkout and compile the workspace:

```sh
test -f lib/openzeppelin-contracts/contracts/access/Ownable.sol
test -f lib/forge-std/src/Test.sol
forge build
forge test
```

Forge outputs (`cache/`, `out/`, and `broadcast/`) are local build artifacts and
must not be committed. Do not place API keys or private keys in this directory.

## Run through the monorepo

From the repository root, the same commands are available through Yarn and
Turborepo:

```sh
yarn workspace @nft-marketplace/marketplace-contracts build
yarn workspace @nft-marketplace/marketplace-contracts test
yarn workspace @nft-marketplace/marketplace-contracts lint
```

See the T-010 guide for Base Sepolia RPC and verification configuration.
