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
```

T-001 supplies explicit placeholder tasks. Later implementation tasks replace them with framework-specific commands.

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
