# T-060 Dockerize Runtime Workspaces

## Images

Each image is built independently from the repository root with Node 24 slim, Corepack, immutable Yarn installation, and a workspace build. Dependency manifests are copied before source files to preserve Docker layer caching.

- `web.Dockerfile`: builds Next.js standalone output and runs `apps/web/server.js` on port 3000.
- `api.Dockerfile`: runs the generated Nest bundle `dist/index.js` on port 3001.
- `workers.Dockerfile`: runs `dist/main.js` and exposes worker Prometheus metrics on port 3020.
- `indexer.Dockerfile`: runs Ponder production mode on port 42069 and uses Ponder's `/health` endpoint.

All runtime stages create and select a fixed non-root `app` user. No `.env` files, source secrets, private keys, or development caches are copied; `.dockerignore` excludes them from the build context.

## Commands

```sh
docker build -f infra/docker/web.Dockerfile -t nft-marketplace-web .
docker build -f infra/docker/api.Dockerfile -t nft-marketplace-api .
docker build -f infra/docker/workers.Dockerfile -t nft-marketplace-workers .
docker build -f infra/docker/indexer.Dockerfile -t nft-marketplace-indexer .
docker compose -f infra/docker/compose.production-smoke.yml up --build
```

Compose wires web, API, workers, and indexer as separate services. Postgres, Redis, RPC endpoints, deployment addresses, and credentials are external and must be supplied through environment variables. The API depends on indexer health; workers remain independent from API replicas.

## Health checks

- Web: `GET /` on port 3000.
- API: `GET /health/live` on port 3001; readiness is `GET /health/ready`.
- Workers: metrics HTTP response on port 3020.
- Indexer: Ponder `GET /health` on port 42069.

## Troubleshooting

Use Node 24 and Yarn 4.18.0. If Prisma or API builds fail, verify generated client output and `DATABASE_URL`. Native `sharp` dependencies are supported by Debian slim. If Ponder fails to start, check `PONDER_NETWORK`, RPC URL, deployment manifest addresses, and `PONDER_START_BLOCK`. If a health check fails, inspect `docker compose logs <service>` and confirm the externally supplied dependency URLs are reachable from the container network.
