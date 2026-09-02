  # NFT Marketplace Platform Monorepo
  ## Summary
  
  Create a Yarn Berry workspace managed by Turborepo containing all marketplace code:
  
  - Next.js web application
  - NestJS public API
  - NestJS background workers
  - Ponder blockchain indexer
  - Solidity/Foundry smart contracts
  - Shared TypeScript packages
  - Docker, local development, and deployment configuration
  
  Each runtime remains independently deployable, while shared contracts, schemas, UI, validation, and configuration stay versioned together.
  
  ## Repository Structure
  
  apps/
    web/                 # Next.js marketplace UI
    api/                 # NestJS REST + GraphQL API
    workers/             # NestJS/BullMQ background workers
    indexer/             # Ponder blockchain indexer
  
  packages/
    contracts/           # Generated ABIs, addresses, typed clients
    domain/              # Shared entities, enums, DTOs, validation
    api-client/          # Typed REST and GraphQL client helpers
    ui/                  # Shared design-system components
    config/              # ESLint, TypeScript, Prettier, environment helpers
    observability/       # Logging, tracing, metrics conventions
    database/             # Prisma schema/client and shared database utilities
  
  contracts/
    marketplace/         # Foundry project, Solidity contracts, deployment scripts
    script/               # Testnet deployment and verification scripts
    test/                 # Unit, fuzz, invariant, and upgrade tests
  
  infra/
    docker/               # Dockerfiles and Compose files
    gateway/              # Reverse proxy/WAF configuration
    postgres/
    redis/
    ipfs/
    deploy/               # VPS deployment scripts and operational manifests
  
  tooling/
    codegen/              # ABI, GraphQL, OpenAPI, and client generation
    scripts/              # Repository automation
  
  ## Workspace and Build Conventions
  
  - Use Yarn Berry workspaces with a committed lockfile and Corepack-pinned Yarn version.
  - Use Turborepo task pipelines for:
      - dev
      - build
      - test
      - lint
      - typecheck
      - generate
      - docker
  
  - Configure task dependencies so generated contract artifacts and shared packages build before consumers.
  - Enable local caching and optional remote Turborepo caching through environment configuration.
  - Keep strict dependency boundaries:
      - apps may consume packages
      - packages may not import from apps
      - workers and indexer may share domain and database packages
      - web may not directly access server-only database or secret packages
  
  - Add root scripts that execute affected workspaces consistently for local development and CI.
  
  ## Contracts and Generated Artifacts
  
  - Keep Solidity in a dedicated Foundry project inside the monorepo.
  - Contract deployment produces:
      - ABI files
      - deployed addresses by network
      - chain metadata
      - typed viem/wagmi clients
  
  - Publish generated output to packages/contracts.
  - Require artifact generation and validation before web/API/indexer builds.
  - Store Base Sepolia addresses in generated network manifests rather than hardcoding them in applications.
  - Add a CI check that fails when Solidity source changes without regenerated artifacts.
  - Keep contract deployment as a coordinated release step; application services can deploy independently afterward.
  
  ## Application Boundaries
  
  ### Web
  
  - Consume the NestJS API and generated contract clients.
  - Handle wallet connection and user transaction signing.
  - Never access PostgreSQL, Redis, IPFS credentials, or private server configuration directly.
  
  ### API
  
  - Own REST /api/v1 and versioned GraphQL interfaces.
  - Implement SIWE sessions, developer applications, API keys, consent, profiles, transaction intents, reports, moderation, and webhook management.
  - Read indexed blockchain data through shared database/read-model packages.
  - Publish domain events to Redis/BullMQ or the event integration layer.
  
  ### Workers
  
  - Process durable jobs for webhook delivery, metadata processing, search updates, notifications, retries, reconciliation, and reorg recovery.
  - Scale independently from the API.
  - Share domain schemas and database primitives but remain a separate runtime.
  
  ### Indexer
  
  - Keep Ponder as the canonical blockchain event ingestion service.
  - Persist indexed chain state and emit normalized domain events.
  - Handle confirmations, duplicate events, and reorg recovery.
  - Avoid placing application authentication or public API logic in the indexer.
  
  ## Environment and Secrets
  
  - Each application owns a typed environment schema.
  - Separate:
      - public browser configuration
      - API configuration
      - worker configuration
      - indexer configuration
      - contract deployment configuration
  
  - Validate environment variables at process startup.
  - Keep local development defaults in .env.example files per app.
  - Do not expose RPC credentials, database URLs, API signing keys, webhook secrets, or IPFS admin credentials to the web bundle.
  - Leave the secret-manager implementation behind deployment adapters so the single-VPS setup can later move to an external secret manager.
  
  ## Deployment
  
  Build independent deployables for:
  
  - web
  - API
  - workers
  - indexer
  
  Use Docker Compose for the initial single-VPS deployment, with separate containers/processes for PostgreSQL, Redis, Kubo IPFS, gateway, and the four application runtimes.
  
  The monorepo must support later migration to separate hosts or orchestration without changing application package boundaries.
  
  ## CI/CD
  
  Keep CI vendor-neutral at the script level while providing a reference pipeline that can run in GitHub Actions, GitLab CI, or another runner.
  
  Required pipeline stages:
  
  - install with frozen Yarn lockfile
  - determine affected workspaces
  - lint and typecheck
  - unit and integration tests
  - Foundry contract tests and gas checks
  - generate and validate artifacts
  - build affected Docker images
  - run migration checks
  - publish deployable artifacts
  - deploy web/API/workers/indexer independently
  - run coordinated contract deployment only through an explicit protected workflow
  
  ## Testing
  
  - Verify workspace dependency ordering and artifact generation from a clean checkout.
  - Test shared package consumers across web, API, workers, and indexer.
  - Run contract tests before API intent integration tests.
  - Run API OpenAPI and GraphQL contract tests.
  - Run end-to-end tests with Docker Compose services.
  - Test that an application can use the public API without importing internal app code.
  - Test independent Docker builds for each deployable runtime.
  - Add CI checks for circular dependencies, undeclared workspace dependencies, stale generated artifacts, and incompatible database migrations.
  
  ## Assumptions
  
  - Yarn Berry is the package manager.
  - The monorepo includes contracts and infrastructure from the first release.
  - REST and GraphQL are both public API interfaces.
  - Ponder remains the blockchain indexer.
  - API, workers, indexer, and web deploy independently.
  - Contracts and generated artifacts are released in coordinated deployments.
  - Turborepo uses local caching with optional remote caching.
  - CI scripts remain vendor-neutral.
  - Shared packages contain domain, UI, configuration, database primitives, generated clients, and observability utilities, but feature ownership remains inside the relevant application.
