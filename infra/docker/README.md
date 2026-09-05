# Docker

Production images are defined in this directory. Build from the repository root:

```sh
docker build -f infra/docker/web.Dockerfile -t nft-marketplace-web .
docker build -f infra/docker/api.Dockerfile -t nft-marketplace-api .
docker build -f infra/docker/workers.Dockerfile -t nft-marketplace-workers .
docker build -f infra/docker/indexer.Dockerfile -t nft-marketplace-indexer .
docker compose -f infra/docker/compose.production-smoke.yml up --build
yarn local:up
yarn local:reset
yarn local:dev
yarn local:dev:watch
```

The production smoke Compose file expects Postgres, Redis, RPC, deployment addresses, and secrets to be supplied through the host environment. For the complete local stack use `yarn local:up`; reset all local state with `yarn local:reset`.

Use `yarn local:dev` for the development-only hot-reload stack. It overlays
`compose.local.yml` with `compose.dev.yml`, bind-mounts the repository, and runs
the web, API, workers, and indexer watch commands. `yarn local:dev:watch` additionally
uses Docker Compose Watch to rebuild app containers when workspace manifests or
`yarn.lock` change. See [the detailed guide](../../docs/local-hot-reload-guide.md).
