# NFT Marketplace Monorepo Implementation Tasks

## Planning Conventions

- Estimates use relative size: `S` = 1-2 days, `M` = 3-5 days, `L` = 1-2 weeks.
- Suggested owners are functional areas, not fixed team assignments.
- Every task must include implementation, tests, documentation, and observability where applicable.
- Required validation: `lint`, `typecheck`, unit tests, integration tests, contract tests, and affected end-to-end tests.

## Phase 0: Repository Foundation

### T-001 - Create Turborepo Monorepo

- Owner: Platform
- Estimate: `M`
- Dependencies: None
- Create the root repository with Yarn Berry, Corepack configuration, workspace declarations, Turborepo configuration, shared scripts, editor settings, and contribution documentation.
- Add workspace folders for `apps`, `packages`, `contracts`, `infra`, and `tooling`.
- Configure consistent Node.js and Yarn versions.
- Add root commands for install, development, build, test, lint, typecheck, generation, and Docker builds.
- Acceptance:
  - A clean checkout installs with `yarn install --immutable`.
  - Turborepo discovers every workspace.
  - Root commands run successfully even when individual apps are still skeletons.
  - No workspace imports another app directly.

### T-002 - Configure Turborepo Task Graph and Caching

- Owner: Platform
- Estimate: `M`
- Dependencies: T-001
- Configure `dev`, `build`, `test`, `lint`, `typecheck`, `generate`, and `docker` pipelines.
- Add dependency ordering for generated contracts and shared packages.
- Configure local cache and optional remote cache environment variables.
- Add affected-workspace execution for CI.
- Acceptance:
  - A package change only rebuilds affected consumers.
  - Cache hits are visible locally and in CI.
  - Generated artifacts run before web, API, or indexer compilation.

### T-003 - Establish Shared Tooling Packages

- Owner: Platform
- Estimate: `M`
- Dependencies: T-001
- Create shared ESLint, TypeScript, Prettier, Vitest, environment-validation, logging, and error-convention packages.
- Define strict compiler settings and import-boundary rules.
- Acceptance:
  - Every TypeScript workspace uses shared configuration.
  - Circular dependencies and undeclared workspace dependencies fail CI.

### T-004 - Create Shared Domain and API Packages

- Owner: Backend
- Estimate: `L`
- Dependencies: T-003
- Define shared enums, entities, pagination, currencies, NFT standards, listing states, transaction states, error codes, report types, and consent models.
- Create common validation schemas used by NestJS, web, workers, and generated clients.
- Define REST and GraphQL naming conventions.
- Acceptance:
  - API and web use the same request, response, and domain types.
  - Invalid input produces consistent validation errors.

### T-005 - Create Shared UI and API Client Packages

- Owner: Frontend
- Estimate: `L`
- Dependencies: T-003, T-004
- Build shared design-system primitives, wallet states, transaction-status components, forms, tables, galleries, and responsive layouts.
- Generate typed REST and GraphQL clients.
- Acceptance:
  - Web imports UI components and clients only through packages.
  - Components have unit and accessibility tests.

## Phase 1: Smart Contracts

### T-010 - Bootstrap Foundry Contracts Workspace

- Owner: Smart Contracts
- Estimate: `M`
- Dependencies: T-001
- Configure Foundry, OpenZeppelin dependencies, formatting, linting, coverage, gas reporting, and Base Sepolia profiles.
- Acceptance:
  - Local contract tests run through Turborepo.
  - Contract compilation is deterministic.

### T-011 - Implement Creator Collection Factory

- Owner: Smart Contracts
- Estimate: `L`
- Dependencies: T-010
- Implement creator-owned ERC-721 and ERC-1155 collection deployment.
- Store creator ownership, collection metadata, standard, royalty recipient, and royalty rate.
- Enforce a royalty rate between 0% and 10%.
- Acceptance:
  - Only factory-approved implementations can be deployed.
  - Creator ownership is correctly assigned.
  - Deployment events contain all indexer-required fields.

### T-012 - Implement ERC-721 Collection

- Owner: Smart Contracts
- Estimate: `M`
- Dependencies: T-011
- Add minting, token URI updates before freeze, token freeze, collection freeze, ERC-2981 royalties, and creator access control.
- Acceptance:
  - Frozen metadata cannot change.
  - Unauthorized users cannot mint or update metadata.
  - ERC-2981 values are correct.

### T-013 - Implement ERC-1155 Collection

- Owner: Smart Contracts
- Estimate: `M`
- Dependencies: T-011
- Add quantity-aware minting, batch minting, URI management, token and collection freeze, supply tracking, and ERC-2981 royalties.
- Acceptance:
  - Supply and balances cannot exceed minted quantities.
  - Partial quantities are represented correctly.

### T-014 - Implement Marketplace Settlement

- Owner: Smart Contracts
- Estimate: `L`
- Dependencies: T-012, T-013
- Implement non-custodial fixed-price listings for ETH and allowlisted USDC.
- Support ERC-721 quantity-one purchases and partial ERC-1155 purchases.
- Add listing creation, cancellation, expiry, approval checks, platform fees, royalty settlement, pull-payment balances, and withdrawals.
- Add pause controls, reentrancy protection, invalid-state checks, and purchase idempotency.
- Acceptance:
  - Seller, creator, and platform allocations sum exactly to the sale amount.
  - Failed transfers revert without consuming a listing.
  - Unsupported currencies and stale listings are rejected.

### T-015 - Implement Upgrade Governance

- Owner: Smart Contracts
- Estimate: `M`
- Dependencies: T-011, T-014
- Configure proxy upgrade authorization for the platform multisig.
- Add admin controls for fees, treasury, payment tokens, pause state, and implementation addresses.
- Acceptance:
  - Single wallets cannot upgrade contracts.
  - Storage-layout compatibility is checked in CI.
  - Governance actions emit auditable events.

### T-016 - Contract Deployment and Artifact Generation

- Owner: Smart Contracts / Platform
- Estimate: `M`
- Dependencies: T-015
- Create deployment scripts, verification scripts, network manifests, ABI exports, typed viem client generation, and address publication to `packages/contracts`.
- Acceptance:
  - Base Sepolia deployment is repeatable.
  - Applications consume generated addresses and ABIs.
  - CI fails if source changes without regenerated artifacts.

## Phase 2: Indexer and Data

### T-020 - Bootstrap Ponder Indexer

- Owner: Blockchain Data
- Estimate: `M`
- Dependencies: T-016
- Configure Ponder for factory, collection, mint, transfer, listing, cancellation, purchase, royalty, withdrawal, and governance events.
- Acceptance:
  - Local Anvil indexing works from a clean database.
  - Base Sepolia configuration is environment-driven.

### T-021 - Build Canonical Read Models

- Owner: Blockchain Data
- Estimate: `L`
- Dependencies: T-020
- Create tables and projections for collections, NFTs, owners, balances, listings, sales, activity, royalties, and transaction confirmations.
- Handle duplicate events, confirmations, and reorg rollback.
- Acceptance:
  - Read models match chain state after transfers and purchases.
  - Reorg tests restore the correct state.

### T-022 - Publish Domain Events

- Owner: Blockchain Data
- Estimate: `M`
- Dependencies: T-021
- Publish normalized events for mint, transfer, listing, cancellation, purchase, withdrawal, moderation, and collection deployment.
- Acceptance:
  - Events include stable IDs, block data, transaction hash, payload version, and deduplication key.
  - Consumers can safely process duplicates.

## Phase 3: NestJS API

### T-030 - Bootstrap NestJS API

- Owner: Backend
- Estimate: `M`
- Dependencies: T-003, T-004
- Create the API app with modular architecture, REST `/api/v1`, GraphQL, OpenAPI, health checks, structured logging, metrics, request IDs, and global error handling.
- Acceptance:
  - REST and GraphQL documentation are generated.
  - Health and readiness endpoints distinguish dependency failures.

### T-031 - Implement SIWE Authentication

- Owner: Identity
- Estimate: `L`
- Dependencies: T-030
- Add nonce issuance, domain and chain validation, signature verification, access tokens, refresh rotation, replay protection, session revocation, and wallet profile creation.
- Acceptance:
  - Invalid domains, chains, nonces, signatures, and expired sessions are rejected.
  - Refresh-token reuse revokes the session family.

### T-032 - Implement Developer Applications and API Keys

- Owner: Backend
- Estimate: `L`
- Dependencies: T-031
- Add application registration, scoped API keys, hashing, rotation, revocation, usage records, quotas, and developer-portal endpoints.
- Acceptance:
  - Raw API keys are never stored.
  - Revoked keys fail immediately.
  - Scope violations return consistent authorization errors.

### T-033 - Implement Profile Consent and Privacy

- Owner: Backend
- Estimate: `M`
- Dependencies: T-031
- Add opt-in profile fields, consent records, application-specific access, privacy settings, and audit history.
- Acceptance:
  - Public chain data remains available.
  - Private profile data requires explicit consent.

### T-034 - Implement Marketplace Read APIs

- Owner: Backend
- Estimate: `L`
- Dependencies: T-021, T-030
- Add REST and GraphQL queries for discovery, search, collections, NFTs, creators, listings, sales, activity, ownership, prices, currencies, and pagination.
- Add filtering, sorting, stale-listing handling, and GraphQL query-complexity limits.
- Acceptance:
  - Results are consistent between REST and GraphQL.
  - Invalid cursors, filters, and excessive queries are rejected safely.

### T-035 - Implement Transaction Intent APIs

- Owner: Backend / Blockchain Integration
- Estimate: `L`
- Dependencies: T-016, T-034
- Build unsigned transaction payloads for minting, approvals, listing, purchase, cancellation, and withdrawals.
- Validate current ownership, balances, approvals, listing state, currency, quantity, chain ID, and expiry.
- Add idempotency keys and intent lifecycle tracking.
- Acceptance:
  - Generated calldata succeeds against local contracts.
  - Expired or already-consumed intents cannot be reused.

### T-036 - Implement Reports, Moderation, and Admin APIs

- Owner: Backend
- Estimate: `M`
- Dependencies: T-032, T-034
- Add user reports, admin wallet allowlist, hide and unhide actions, moderation status, and audit logs.
- Acceptance:
  - Hidden content is excluded from discovery but remains historically queryable.
  - Every administrative action records actor, reason, target, and timestamp.

### T-037 - Implement Webhook Subscriptions and Delivery

- Owner: Backend / Workers
- Estimate: `L`
- Dependencies: T-022, T-032
- Add event subscriptions, per-app signing secrets, HMAC signatures, timestamps, event IDs, retries, replay, dead letters, and delivery history.
- Acceptance:
  - Duplicate deliveries are safely identifiable.
  - Signature verification and replay protection are documented and tested.

## Phase 4: Workers

### T-040 - Bootstrap BullMQ Worker Runtime

- Owner: Platform / Backend
- Estimate: `M`
- Dependencies: T-001, T-003
- Create the worker app, Redis connection, queue registration, job schemas, retry policies, backoff, dead-letter handling, and metrics.
- Acceptance:
  - Workers run independently from API replicas.
  - Failed jobs are retried and eventually quarantined.

### T-041 - Implement Event Processing Workers

- Owner: Backend
- Estimate: `L`
- Dependencies: T-022, T-040
- Process indexer events for search updates, webhook fanout, confirmations, reconciliation, and notification preparation.
- Acceptance:
  - Jobs are idempotent.
  - Duplicate and out-of-order events do not corrupt state.

### T-042 - Implement Media and Metadata Workers

- Owner: Media / Backend
- Estimate: `M`
- Dependencies: T-040
- Process IPFS pinning status, metadata validation, image previews, failed uploads, and retryable storage workflows.
- Acceptance:
  - Unsupported files and oversized uploads are rejected.
  - Failed pins are visible and retryable.

## Phase 5: Next.js Web App

### T-050 - Bootstrap Web Application

- Owner: Frontend
- Estimate: `M`
- Dependencies: T-005, T-030
- Create the gallery-editorial shell, routing, responsive navigation, wallet connectors, API client integration, loading and error states, and transaction-state handling.
- Acceptance:
  - Web uses NestJS APIs for application data.
  - Wallet connection and chain switching work on desktop and mobile layouts.

### T-051 - Build Discovery and Detail Views

- Owner: Frontend
- Estimate: `L`
- Dependencies: T-034, T-050
- Build home, explore, search, collection pages, NFT details, creator profiles, ownership, activity, filters, and pagination.
- Acceptance:
  - Stale listings are visibly unavailable.
  - Keyboard navigation and responsive layouts pass accessibility checks.

### T-052 - Build Creator Workflows

- Owner: Frontend
- Estimate: `L`
- Dependencies: T-035, T-042, T-050
- Build collection creation, image upload, metadata entry, minting, metadata freeze, approval, listing, cancellation, and proceeds-withdrawal flows.
- Acceptance:
  - Every blockchain transaction has pending, success, failure, and retry states.
  - ERC-721 and ERC-1155 flows correctly expose their different quantity behavior.

### T-053 - Build Collector Purchase Workflows

- Owner: Frontend
- Estimate: `M`
- Dependencies: T-035, T-051
- Build ETH and USDC checkout, approval flow, purchase confirmation, ownership refresh, and transaction history.
- Acceptance:
  - Buyers cannot purchase unavailable or stale listings.
  - USDC allowance and insufficient-balance errors are actionable.

### T-054 - Build Developer Portal

- Owner: Frontend
- Estimate: `L`
- Dependencies: T-032, T-037
- Build application registration, API-key management, scopes, usage, webhook subscriptions, secret rotation, delivery history, and documentation links.
- Acceptance:
  - Secrets are shown only once at creation.
  - Revocation and rotation update API access immediately.

## Phase 6: Infrastructure

### T-060 - Dockerize All Runtime Workspaces

- Owner: Platform
- Estimate: `M`
- Dependencies: T-020, T-030, T-040, T-050
- Create production Dockerfiles for web, API, workers, and indexer using workspace-aware builds.
- Acceptance:
  - Each image builds independently.
  - Images run as non-root users with health checks.

### T-061 - Create Local Docker Compose Environment

- Owner: Platform
- Estimate: `M`
- Dependencies: T-060
- Compose PostgreSQL, Redis, Kubo, gateway, Anvil, web, API, workers, and indexer.
- Add database migration, seed, reset, and fixture commands.
- Acceptance:
  - One command starts the complete local stack.
  - One command resets it to deterministic test data.

### T-062 - Create Base Sepolia VPS Deployment

- Owner: Platform / DevOps
- Estimate: `L`
- Dependencies: T-016, T-060, T-061
- Add gateway TLS and WAF configuration, backups, restart policies, environment validation, RPC fallback, monitoring, logs, and deployment scripts.
- Acceptance:
  - Web, API, workers, and indexer can be restarted or upgraded independently.
  - Database and IPFS backup-restore procedures are tested.

## Phase 7: Full Test Program

### T-070 - Unit Test Foundation

- Owner: Quality
- Estimate: `M`
- Dependencies: T-003
- Standardize Vitest setup, coverage thresholds, fixtures, mocks, test-database helpers, and test naming.
- Require unit coverage for shared packages, API modules, workers, indexer transformations, and UI components.
- Acceptance:
  - Coverage thresholds are enforced per workspace.
  - Tests run through Turborepo with affected-workspace support.

### T-071 - Contract Unit, Fuzz, Invariant, and Upgrade Tests

- Owner: Smart Contracts / Quality
- Estimate: `L`
- Dependencies: T-012, T-013, T-014, T-015
- Test access control, minting, freezing, royalties, fees, ETH and USDC settlement, quantities, cancellations, withdrawals, reentrancy, pause state, upgrades, and storage compatibility.
- Add invariants proving balances and allocations cannot exceed valid funds or supplies.
- Acceptance:
  - Foundry tests pass locally and in CI.
  - Coverage, gas, and upgrade checks meet configured thresholds.

### T-072 - Backend Integration Tests

- Owner: Backend / Quality
- Estimate: `L`
- Dependencies: T-031, T-032, T-033, T-034, T-035, T-036, T-037, T-040, T-041, T-042
- Test PostgreSQL repositories, SIWE, API keys, consent, REST, GraphQL, transaction intents, idempotency, queues, webhooks, moderation, and event consumers against real service containers.
- Acceptance:
  - No critical path relies only on mocks.
  - Database migrations run from an empty database.

### T-073 - Indexer Reorg and Event Integration Tests

- Owner: Blockchain Data / Quality
- Estimate: `M`
- Dependencies: T-020, T-021, T-022
- Use Anvil snapshots and reverts to test confirmations, duplicate events, out-of-order events, reorgs, and reconciliation.
- Acceptance:
  - Read models converge to canonical chain state after reorg recovery.

### T-074 - API Contract and Security Tests

- Owner: Quality / Security
- Estimate: `L`
- Dependencies: T-030, T-031, T-032, T-033, T-034, T-035, T-036, T-037
- Validate OpenAPI schemas, GraphQL authorization, query complexity, rate limits, API-key scope isolation, SIWE replay protection, HMAC verification, SSRF protections, upload limits, and sensitive-data redaction.
- Acceptance:
  - Security tests fail builds on high-severity regressions.
  - Public documentation matches runtime behavior.

### T-075 - Local End-to-End Test Suite

- Owner: Quality / Frontend
- Estimate: `L`
- Dependencies: T-050, T-051, T-052, T-053, T-054, T-061
- Use Playwright against ephemeral Docker and Anvil fixtures with deterministic funded wallets.
- Cover creator signup, collection creation, image upload, ERC-721 mint and listing, ERC-1155 mint and listing, ETH purchase, USDC purchase, cancellation, metadata freeze, proceeds withdrawal, reporting, moderation, developer registration, intent use, and webhook verification.
- Acceptance:
  - Suites reset state per run.
  - Tests pass headlessly at desktop and mobile viewports.

### T-076 - Base Sepolia Smoke Suite

- Owner: Quality / DevOps
- Estimate: `M`
- Dependencies: T-062, T-075
- Run scheduled wallet-backed smoke tests against deployed Base Sepolia contracts and services.
- Cover health, SIWE, collection deployment, mint, listing, purchase, indexer confirmation, API reads, and webhook delivery.
- Acceptance:
  - Tests use dedicated funded test wallets.
  - Failed smoke tests produce transaction hashes, logs, and deployment context.

### T-077 - Load, Accessibility, and Resilience Tests

- Owner: Quality / Platform
- Estimate: `L`
- Dependencies: T-072, T-075
- Test API throughput around the initial 100 requests-per-second target, queue-backlog recovery, RPC outage fallback, database restart, worker restart, webhook endpoint failure, and accessibility with automated audits.
- Acceptance:
  - API replicas scale without session loss.
  - Queue and webhook processing recover without duplicate financial effects.
  - Critical web journeys meet accessibility criteria.

## Definition of Done

A release is complete only when:

- All affected Turborepo tasks pass.
- Solidity artifacts are generated and match source.
- Contract unit, fuzz, invariant, and upgrade tests pass.
- API integration and security tests pass.
- Local Playwright end-to-end tests pass against a clean ephemeral stack.
- Base Sepolia smoke tests pass for the deployed commit.
- Docker images build independently.
- OpenAPI, GraphQL, webhook, and developer documentation are updated.
- Operational dashboards, logs, backups, and rollback instructions are available.
