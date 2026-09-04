# T-030 Bootstrap NestJS API

## Purpose and boundaries

T-030 turns `apps/api` into the deployable NestJS boundary for later backend features. It provides transport, documentation, health, observability, correlation, and error infrastructure only. Authentication, marketplace queries, transaction intents, moderation, and webhooks remain owned by later tasks.

The application uses Express. Operational endpoints remain at the root, public REST resources use `/api/v1`, and code-first Apollo GraphQL is served at `/graphql`. The app consumes shared packages and never imports another application.

## Step 1: Bootstrap and configuration

`AppModule` composes global configuration, GraphQL, health, observability, and the minimal system module. Runtime startup and documentation generation share `createApplication`, ensuring they use the same module graph. Source is organized by feature under `src/config`, `src/health`, `src/observability`, `src/system`, with cross-cutting code under `src/common`; each feature has separate module, controller, and service/resolver files.

Configuration is validated before startup. Development has local defaults; production requires explicit dependency URLs.

| Variable | Development default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `PORT` | `3001` | API listen port |
| `DATABASE_URL` | local PostgreSQL URL | Database readiness target |
| `INDEXER_HEALTH_URL` | local indexer health URL | Indexer freshness source |
| `INDEXER_MAX_STALENESS_MS` | `60000` | Maximum indexed-data age |
| `DEPENDENCY_TIMEOUT_MS` | `2000` | Per-probe timeout |
| `API_DOCS_ENABLED` | enabled outside production | Interactive docs switch |
| `LOG_LEVEL` | `info` | Structured logger level |

## Step 2: Transports and generated documentation

`/api/v1/system` is the REST bootstrap smoke route. Apollo exposes the bootstrap `apiVersion` query. Swagger UI is mounted at `/docs`, with JSON at `/docs/openapi.json`, when docs are enabled. GraphQL Playground follows the same setting. Production disables interactive documentation unless explicitly enabled.

`yarn workspace @nft-marketplace/api generate` initializes the module graph without listening and writes `generated/openapi.json` and `generated/schema.graphql`. Generated files must not be edited manually. Local API imports are extensionless; `tsx` resolves them for development, tests, and generation, while `esbuild` bundles them into `dist/index.js` for the Node production runtime. TypeScript is used for validation (`typecheck`/`build`).

Use `yarn workspace @nft-marketplace/api start:dev` for hot-reloaded source development. Run `yarn workspace @nft-marketplace/api build` before `yarn workspace @nft-marketplace/api start:prod`; `start:prod` executes the existing bundle only and fails fast when `dist/index.js` is absent.

## Step 3: Request correlation and logging

Every HTTP request accepts `x-request-id` when it contains 1-128 safe ASCII identifier characters; otherwise the API generates a UUID. The ID is returned in the response header, stored in async request context, and included in logs and error bodies.

`ApiLogger` adapts Nest logging to `@nft-marketplace/observability`. The shared logger recursively redacts fields whose names indicate credentials, tokens, cookies, signatures, passwords, private material, or API keys.

## Step 4: Global errors

The global filter normalizes shared `AppError`, Nest HTTP exceptions, and unknown failures. REST uses `{ code, message, details, retryable, requestId }`. GraphQL retains native GraphQL errors and places the same fields in `errors[].extensions`. Unknown failures use a generic message and never expose stacks or causes.

## Step 5: Health and readiness

`GET /health/live` checks process liveness only. It remains successful during downstream outages.

`GET /health/ready` checks database connectivity and indexer freshness and returns `200` only when both pass. Connection refusal, non-success indexer responses, stale timestamps, malformed responses, and timeouts return `503` with individual check details. Probes are injectable so later tasks can replace the initial TCP/HTTP implementations with owning repositories without changing the endpoint contract.

## Step 6: Metrics and shutdown

`GET /metrics` exposes Prometheus text. Default process metrics use the `api_` prefix. HTTP metrics are `api_http_requests_total` and `api_http_request_duration_seconds`, labeled by method, route template, and status only.

Nest shutdown hooks are enabled. Future database and queue modules must attach bounded cleanup through Nest lifecycle hooks.

## Verification

```sh
yarn workspace @nft-marketplace/api generate
yarn workspace @nft-marketplace/api typecheck
yarn workspace @nft-marketplace/api test
yarn workspace @nft-marketplace/api build
yarn lint
```

Tests cover configuration failures, request IDs, shared error mapping, dependency readiness, REST, GraphQL, metrics, and OpenAPI. The handoff must name T-030, report generated artifacts and health failure behavior, and list every command executed.
