# T-061 Local Docker Compose Environment

## Start and reset

Run `yarn local:up` from the repository root to start the local infrastructure services: PostgreSQL, Redis, Kubo, and Anvil. `yarn local:down` stops these services while preserving volumes, and `yarn local:logs` follows their logs.

## Services

The primary gateway is `http://marketplace.localhost:8088` (or add `127.0.0.1 marketplace.localhost` to `/etc/hosts`). Diagnostic ports are web `3000`, API `3001`, workers metrics `3020`, indexer `42069`, Anvil RPC `8545`, Redis `6379`, Postgres `5432`, and Kubo API `5001`.

Anvil uses deterministic development accounts and persists its Foundry state volume. The deploy service runs the existing Foundry deployment script after Anvil is healthy. Kubo stores its repository in `kubo-data`; workers use its internal API endpoint. Traefik routes the public web entrypoint and keeps stateful services internal.

## Fixtures and safety

`apps/api/prisma/seed-local.sql` is idempotent and creates a fixed local wallet, application, and owner membership. It contains no production credentials. The Anvil private key is a public test key and must never be used outside local development. Environment overrides such as `DATABASE_URL`, `REDIS_URL`, `ANVIL_RPC_URL`, and deployment variables may be supplied through the shell.

## Troubleshooting

Use `yarn local:logs` to inspect startup failures. If API readiness fails, check indexer health and Postgres connectivity. If deployment fails, verify Anvil health and Foundry image access. If Kubo pinning fails, verify the worker can resolve `kubo:5001`. Reset removes all local volumes and is the supported recovery path for stale migrations, queues, media, or chain state.
