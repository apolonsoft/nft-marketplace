# Contributing

## Task Workflow

Work from a task in `IMPLEMENTATION_PLAN.md`, confirm its dependencies are complete, and keep changes within that task's stated scope. Preserve unrelated user changes and report the acceptance checks executed with each handoff.

## Naming

- Internal packages use the `@nft-marketplace/*` scope.
- Application directories use short runtime names under `apps/`.
- Shared packages describe a reusable capability rather than an application feature.
- Use lowercase kebab-case for new workspace directory names.

## Workspace Boundaries

- Apps may depend on packages.
- Packages may depend on other packages when the dependency is explicit.
- Packages must never depend on apps.
- Apps must never import implementation code from another app.
- Generated contract, REST, and GraphQL clients belong in their owning shared package.

## Required Checks

Run the checks relevant to the changed workspaces. The stable root command contract is:

```sh
yarn lint
yarn typecheck
yarn test
yarn build
yarn generate
yarn docker
```

T-001 commands are successful placeholders. Later tasks must replace placeholder commands rather than bypassing the root interface.

## Generated and Secret Data

Do not commit dependency archives, local infrastructure data, environment secrets, private keys, or raw API keys. Do not manually edit generated artifacts after their generation tasks are introduced.
