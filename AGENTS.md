@/home/ahmad/.codex/RTK.md

# NFT Marketplace Repository Guide

These instructions apply to the entire NFT marketplace monorepo. Nested
`AGENTS.md` files may add narrower guidance for a workspace, but they must not
weaken the security, dependency-direction, scope, or verification requirements
in this file.

## Source of Truth and Task Scope

- `IMPLEMENTATION_PLAN.md` is the authoritative task and dependency map.
- Work on one explicitly requested task ID at a time.
- Before implementation, confirm that every prerequisite task is complete.
- Keep edits within the selected task's scope and acceptance criteria.
- Preserve existing user changes and avoid unrelated refactors or metadata churn.
- In implementation handoffs, report the task ID, completed acceptance criteria,
  tests and validation performed, and commands run.
- Do not rewrite `IMPLEMENTATION_PLAN.md` unless explicitly requested.
- These rules apply equally to human-directed and delegated coding agents.

## Workspace Boundaries

- `apps/web`: Next.js client.
- `apps/api`: NestJS REST and GraphQL API.
- `apps/workers`: NestJS/BullMQ workers.
- `apps/indexer`: Ponder indexer.
- `contracts/marketplace`: Foundry contracts.
- `packages/*`: shared packages only.
- `infra/*` and `tooling/*`: operations and repository automation.

Dependency direction is strict:

- Apps may import shared packages.
- Packages must not import apps.
- Apps must not import other apps.
- Browser code must not import server-only packages, credentials, wallet
  private keys, or other secrets.

## Standard Commands

Use the root Yarn and Turborepo contract defined by `package.json` and
`turbo.json`:

```text
yarn lint
yarn typecheck
yarn test
yarn build
yarn generate
```

Run affected workspaces when the task or CI context permits, for example:

```text
yarn turbo run lint typecheck test build generate --filter=<workspace>...
```

Use the repository's declared package manager and immutable install contract
for setup (`yarn install --immutable`). Do not invent workspace scripts or
assume a scaffolded application exists before its implementation task.

## Testing and Verification

Tests must be proportional to the change and its blast radius:

- Use Vitest for TypeScript unit and integration tests.
- Use Foundry for contract unit, fuzz, invariant, and upgrade tests.
- Use Playwright for application and API end-to-end tests.
- Run relevant lint, typecheck, build, and generated-artifact checks.
- Run affected end-to-end tests and all prerequisite validation required by the
  task's acceptance criteria.

## Generated Artifacts

- Never manually edit generated ABIs, contract clients, OpenAPI clients, or
  GraphQL clients.
- Regenerate artifacts through the repository's `yarn generate` or owning
  workspace command.
- Commit generated outputs only when the owning task explicitly requires them.
- When source changes require generated output, verify that regeneration is
  deterministic and include the generated-artifact check in the handoff.

## Blockchain and Security

- Never store wallet private keys, raw API keys, or other secrets in the
  repository, source files, logs, fixtures, or generated output.
- Treat indexed blockchain state as authoritative for marketplace ownership and
  settlement.
- Preserve SIWE replay protection, API scopes, webhook signature validation, and
  transaction-intent validation.
- Do not deploy contracts, run migrations, or perform destructive operations
  unless explicitly requested for the selected task.

## Nested Guides

Specialized guides may be added later for contracts, frontend, backend,
indexer, and infrastructure after those workspaces are scaffolded. Nested rules
refine this guide for their workspace; they must continue to satisfy all root
security and verification requirements.
