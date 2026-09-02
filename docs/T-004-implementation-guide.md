# T-004 Shared Domain and API Packages

## Purpose

This guide explains how to implement T-004, **Create Shared Domain and API Packages**, for the NFT marketplace monorepo. It is intended for human contributors and delegated implementation agents.

`IMPLEMENTATION_PLAN.md` remains the authoritative task and dependency map. T-004 depends on T-003, so confirm that the shared configuration and observability foundations are available before changing domain or API packages.

The task is complete when the API and web consume the same request, response, and domain types, and invalid input produces the same normalized validation errors across consumers.

## Boundaries and Ownership

Keep the implementation inside the shared package layer:

- `packages/domain` owns business entities, enums, value objects, and reusable validation schemas.
- `packages/api-client` owns transport contracts, pagination, filters, and REST/GraphQL naming conventions.
- `packages/config` owns the existing `AppError` contract and shared error infrastructure from T-003.
- `apps/api`, `apps/web`, `apps/workers`, and `apps/indexer` consume packages; they do not define duplicate domain contracts.

Do not implement endpoint modules, database projections, OpenAPI/GraphQL code generation, or framework-specific adapters that belong to T-005, T-021, T-030, or later tasks. Do not import application code from a package.

## Step 1: Define Domain Primitives

Start with small, reusable value contracts. Use opaque string-compatible IDs so the package does not impose UUIDs on database or blockchain identifiers. Add schemas and inferred types for:

- entity IDs, wallet addresses, contract addresses, transaction hashes, and opaque cursors;
- chain IDs, token IDs, quantities, and non-negative integer values;
- currency codes, symbols, decimal places, and active/inactive metadata;
- monetary amounts represented as atomic decimal strings.

Never represent marketplace money as floating-point numbers. Provide explicit helpers for converting validated atomic strings to `bigint` in domain code and back to transport strings without loss of precision.

Use checksum-aware address validation where applicable. Keep blockchain identity separate from display labels and URLs.

For public fields, use `null` only when absence is intentional. Optional request fields are omitted; do not serialize `undefined` as a wire value.

## Step 2: Define Enums and State Models

Represent finite states as stable string values exposed through both runtime constants and TypeScript literal unions. Define the shared values required by the plan:

- NFT standards: ERC-721 and ERC-1155;
- listing lifecycle states, including active, cancelled, expired, sold, and invalid/stale states as required by later settlement logic;
- transaction lifecycle states, including intent, pending, submitted, confirmed, failed, and expired;
- report types and moderation/report statuses;
- consent purposes and consent states;
- common sort and filter values.

Keep the serialized strings stable and descriptive. Do not use numeric enums; generated clients and persisted records must remain readable and compatible across languages.

## Step 3: Define Blockchain-Aware Entities

Add shared entity contracts for collections, NFTs, ownership, balances, listings, and transaction intents. Include canonical blockchain fields where they are part of identity or validation:

- chain ID;
- checksum contract address;
- token ID and NFT standard;
- owner address and quantity/balance;
- block number and transaction hash when an on-chain reference is required.

These are domain contracts, not complete Ponder/indexer read-model projections. Reorg metadata, confirmation policies, and event deduplication fields stay with indexer tasks unless a field is required by a shared API request or response.

## Step 4: Add Zod Schemas

Use Zod as the single runtime schema authoring library. For every public schema:

1. Define the Zod schema in `packages/domain` or `packages/api-client`.
2. Export its inferred TypeScript type from the same module.
3. Add focused valid and invalid parsing tests.
4. Reuse the schema in API, web, workers, indexer, and future generated-client adapters instead of writing equivalent validators.

Cover core primitives, entities, pagination, currencies, amounts, filters, reports, consent, and transaction intents. Parsing must be deterministic, side-effect free, and safe in both Node and browser bundles.

## Step 5: Extend Error Conventions

T-003 already provides `ErrorCode`, `AppError`, and JSON serialization. Extend that catalog without changing the existing serialization shape. Add domain codes for ownership, approvals, stale chain state, unsupported currencies, transaction intents, collection/NFT authorization, frozen metadata, listing state, quantity, balance, consent, and webhook validation.

Normalize all schema failures to this transport-compatible shape:

```text
{
  code: "VALIDATION_ERROR",
  message: "Request validation failed",
  issues: [
    { path: ["field"], message: "Invalid value", rule: "schema-rule" }
  ]
}
```

Preserve stable error codes, safe messages, optional details, retryability, and causes. Framework adapters may change the outer HTTP or GraphQL representation, but the code and issue semantics must remain consistent.

## Step 6: Define API Transport Contracts

Keep transport contracts in `packages/api-client` while importing domain types from `packages/domain`.

### Pagination

Use cursor-first pagination for public REST and GraphQL contracts:

- requests use opaque `after`/`before` cursors and `first`/`last` limits;
- responses expose `pageInfo` with `hasNextPage`, `hasPreviousPage`, `startCursor`, and `endCursor`;
- total counts are optional and must not be required for normal traversal;
- do not introduce offset pagination into the public contract.

### REST

- version resources under `/api/v1`;
- use plural kebab-case resource paths;
- use camelCase JSON fields;
- map shared error codes to the API's consistent error response;
- keep request schemas separate from response schemas when their optionality differs.

### GraphQL

- use PascalCase type names;
- use camelCase fields and arguments;
- use typed object payloads for mutations;
- use native GraphQL `errors` rather than wrapping every operation in a custom envelope;
- put the shared error code in `errors.extensions.code` and preserve normalized issue details where supported.

## Step 7: Establish Public Exports

Provide package root barrel exports and stable feature subpaths. At minimum, expose domain models, schemas, pagination, and API contracts without requiring consumers to import internal file paths.

Use imports shaped like:

```ts
import { ListingState, listingSchema } from '@nft-marketplace/domain';
import { pageInfoSchema, type CollectionResponse } from '@nft-marketplace/api-client';
```

The API and web must import these shared definitions directly. Future generated REST and GraphQL clients should build on the same inferred request and response types rather than generating parallel domain interfaces.

## Step 8: Add Tests

Use focused Vitest contract tests. Cover:

- valid and invalid IDs, addresses, chain IDs, token IDs, quantities, amounts, currencies, and cursors;
- NFT, collection, ownership, balance, listing, transaction, report, and consent invariants;
- stable enum values and rejection of unsupported states;
- REST and GraphQL naming and pagination mappings;
- explicit-null versus omitted-undefined serialization;
- normalized validation issue paths and rules;
- extension of T-003 error codes and compatibility with `AppError.toJSON()`;
- representative API/web imports proving both consumers use the same inferred contracts.

Add dependency-boundary checks proving shared packages do not import apps and browser-facing contracts do not import server-only modules.

## Step 9: Verify and Handoff

Run the relevant checks from the repository root:

```sh
yarn deps:check
yarn format:check
yarn lint
yarn typecheck
yarn test
yarn build
yarn generate
yarn docker
```

Run the affected-workspace command for the changed package range. Confirm that all prerequisite T-003 checks pass, generated artifacts are not manually edited, and no unrelated application implementation is included.

The handoff must name T-004, list completed acceptance criteria, summarize the schema and contract tests, and include every command run. Report expected placeholder warnings separately from failures.

## Decisions and Assumptions

- `packages/domain` owns business models and validation; `packages/api-client` owns transport contracts and API conventions.
- Zod is the sole schema authoring/runtime validation library for this task.
- Public pagination is cursor-first; offset pagination is deferred.
- Amounts use atomic decimal strings on the wire and bigint helpers in domain code.
- IDs are opaque strings, and finite states use string literal unions.
- REST uses versioned plural kebab-case resources; GraphQL uses PascalCase types and camelCase fields/arguments.
- GraphQL uses native errors with shared error codes in extensions.
- Optional values are omitted; `null` is explicit and intentional.
- T-004 extends T-003's error catalog and preserves the existing `AppError` contract.
- Core marketplace primitives are included now; endpoint-specific DTOs, generated clients, and framework modules remain with later tasks.
