# Local Container Hot Reload

This workflow is for local development only. Production Dockerfiles, the production
smoke Compose file, and VPS deployment files are not changed by it.

## Start the stack

From the repository root:

```sh
yarn local:dev
```

This builds `infra/docker/dev.Dockerfile`, starts the infrastructure from
`compose.local.yml`, and replaces only web, API, workers, and indexer with development
containers. The containers expose web on `3000`, API on `3001`, worker metrics on
`3020`, and indexer on `42069`.

Use `yarn local:dev:logs` to follow logs and `yarn local:dev:down` to stop the stack.
The existing `yarn local:up` command remains the production-image local stack.

## How reload works

The development image installs the complete Yarn workspace graph once. Compose then
bind-mounts the repository at `/workspace` and mounts a named volume over
`/workspace/node_modules`, preserving Linux container dependencies instead of using
host-installed modules. Each app runs its existing watcher:

- Web: `next dev`
- API: `tsx watch src/main.ts`
- Workers: `tsx watch src/main.ts`
- Indexer: `ponder dev`

Changes under `apps/` and `packages/` are therefore visible immediately. Polling is
enabled for Docker Desktop and network filesystems through `CHOKIDAR_USEPOLLING` and
`WATCHPACK_POLLING`.

Run `yarn local:dev:watch` when Docker Compose watch support is available. It watches
root and workspace manifests and rebuilds the affected development containers when
`package.json` or `yarn.lock` changes. Ordinary source changes do not rebuild images.

## Contracts and generated artifacts

Contract edits are intentionally explicit: regenerate artifacts, redeploy the Anvil
contracts, then reset or restart the indexer and dependent data. Use the repository's
existing generation and local reset commands rather than expecting a chain state or
ABI change to be safely hot-reloaded.

## Troubleshooting

- If a watcher misses edits, confirm Docker Desktop file sharing and keep polling
  enabled. Restart with `yarn local:dev:down && yarn local:dev`.
- If dependencies are stale after a manifest change, run `yarn local:dev:watch` or
  rebuild with `docker compose -f infra/docker/compose.local.yml -f infra/docker/compose.dev.yml build`.
- If Prisma output is missing, run `yarn local:migrate` and regenerate through the API
  workspace command.
- If Ponder retains stale generated state, stop the dev stack and remove only the
  `dev-indexer-cache` volume before restarting.
- Do not place production secrets in the repository. The development bind mount can
  expose local files to containers, so keep `.env` files local and use development
  values only.

## Verification

Edit one source file in each app and a shared package, then confirm only the relevant
watcher reloads. Verify `http://localhost:3000`, `http://localhost:3001`, the worker
metrics endpoint at `http://localhost:3020/metrics`, and the indexer health endpoint at
`http://localhost:42069/health` remain reachable.
