# NFT Marketplace

Monorepo for the NFT marketplace web application, public API, background workers, blockchain indexer, smart contracts, shared packages, and operational tooling.

## Prerequisites

- Node.js `24.12.0` (see `.nvmrc`)
- Corepack enabled
- Git

## Install

```sh
corepack enable
yarn install --immutable
```

The repository pins Yarn `4.18.0` through the root `packageManager` field and uses the Yarn `node-modules` linker.

## Commands

```sh
yarn dev
yarn build
yarn test
yarn lint
yarn typecheck
yarn generate
yarn docker
yarn workspaces:list
yarn local:up
yarn local:dev
yarn local:dev:watch
yarn local:dev:down
yarn local:dev:logs
yarn local:down
yarn local:logs
yarn local:migrate
yarn local:seed
yarn local:reset
```

The `local:*` commands manage the complete Docker Compose development stack. Use
`yarn local:up` to build and start PostgreSQL, Redis, Kubo, Anvil, the contract
deployment step, Traefik, web, API, workers, and indexer. Apply database migrations
with `yarn local:migrate`, load deterministic fixtures with `yarn local:seed`, and
use `yarn local:reset` to remove local volumes, recreate the stack, migrate, and seed
from a clean state. `yarn local:down` stops the stack while preserving volumes, and
`yarn local:logs` follows service logs.

For hot reload, use `yarn local:dev`. It runs web, API, workers, and indexer from a
development image with the repository mounted into the containers; edits to apps and
shared packages are picked up by their native watchers. Use `yarn local:dev:watch`
to let Docker Compose rebuild affected containers when `package.json` or `yarn.lock`
changes. Stop and inspect this stack with `yarn local:dev:down` and
`yarn local:dev:logs`. Contract changes require explicit artifact generation,
Anvil redeployment, and an indexer/data reset; they are not silently applied to a
running chain.

See [the local Compose implementation guide](docs/T-061-implementation-guide.md)
for service ports, environment overrides, deterministic Anvil accounts, and
troubleshooting.

## Repository Layout

- `apps/web`: Next.js marketplace client.
- `apps/api`: NestJS REST and GraphQL API.
- `apps/workers`: NestJS and BullMQ background workers.
- `apps/indexer`: Ponder blockchain indexer.
- `packages/*`: shared TypeScript packages and generated artifacts.
- `contracts/marketplace`: Solidity and Foundry workspace.
- `infra/*`: container, gateway, and deployment configuration.
- `tooling/*`: code generation and repository automation.

## Dependency Boundaries

- Applications may import shared packages.
- Shared packages must not import applications.
- Applications must not import other applications.
- Browser code must not import server-only packages, credentials, or environment secrets.

See `CONTRIBUTING.md` for naming and contribution rules and `IMPLEMENTATION_PLAN.md` for task ownership and dependencies.
