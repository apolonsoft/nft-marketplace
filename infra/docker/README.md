# Docker

Production images are defined in this directory. Build from the repository root:

```sh
docker build -f infra/docker/web.Dockerfile -t nft-marketplace-web .
docker build -f infra/docker/api.Dockerfile -t nft-marketplace-api .
docker build -f infra/docker/workers.Dockerfile -t nft-marketplace-workers .
docker build -f infra/docker/indexer.Dockerfile -t nft-marketplace-indexer .
docker compose -f infra/docker/compose.production-smoke.yml up --build
```

The Compose file expects Postgres, Redis, RPC, deployment addresses, and secrets to be supplied through the host environment. It does not provision stateful dependencies.
