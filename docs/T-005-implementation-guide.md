# T-005 Shared UI and API Client Implementation Guide

## Purpose

T-005 builds the reusable browser layer for the marketplace. `packages/ui` owns
React components and CSS-variable design tokens. `packages/api-client` owns
typed REST/GraphQL transport helpers and generated-client boundaries.
`IMPLEMENTATION_PLAN.md` is authoritative, and T-003/T-004 must be complete
before implementation starts.

## Step 1: UI package foundation

Keep the package browser-safe and independent of Next.js. Use React APIs
compatible with React 18 and 19. Export components from the package root and
keep styles in a package stylesheet. Use CSS custom properties for tokens so
consumers can theme the design system without a utility-CSS runtime.

## Step 2: Build the component surface

Implement primitives first: buttons, inputs, selects, fields, forms, focusable
overlays, and layout primitives. Then add tables, galleries, cards, pagination,
wallet-state components, transaction-status components, loading/error/empty
states, and responsive marketplace composites. Components must support semantic
HTML, accessible names, keyboard operation, focus-visible states, and stable
loading/disabled/error behavior.

## Step 3: Define state contracts

Use stable string constants and literal-compatible values for disconnected,
connecting, connected, wrong-network, rejected, signing, intent, pending,
submitted, confirmed, failed, and expired states. Render state changes through
`role="status"` and expose actions as real buttons.

## Step 4: Implement API transport

Use the T-004 schemas and pagination contracts. `createApiClient` accepts a base
URL, fetch implementation, headers provider, timeout, and optional abort signal.
It must normalize non-2xx responses and schema failures without reading global
secrets or storing mutable authentication state. GraphQL uses typed variables,
native GraphQL errors, and shared error codes in extensions.

## Step 5: Keep generation deterministic

Checked-in OpenAPI/GraphQL specs belong in `tooling/codegen/specs`. Generation
writes only to `packages/api-client/generated`; generated files are never edited
manually. Before T-030 provides real specs, the generator exits successfully
with a clear no-op message.

## Step 6: Integrate web imports

`apps/web` depends on `@nft-marketplace/ui` and `@nft-marketplace/api-client`.
Web code imports components and contracts only from those packages, never from
another app or server-only package. Full page composition remains T-050 scope.

## Step 7: Verify

Run focused component/client tests, accessibility assertions for representative
components, deterministic generation twice, and the root checks:

```sh
yarn install --immutable
yarn deps:check
yarn format:check
yarn lint
yarn typecheck
yarn test
yarn build
yarn generate
yarn docker
```

Report T-005 acceptance criteria, tests, commands, generated outputs, and any
expected placeholder warnings in the handoff.

## Decisions

- React 18/19-compatible headless components.
- CSS variables and package styles, not Tailwind or CSS-in-JS.
- Testing Library/axe-compatible accessibility checks; visual snapshots are deferred.
- Injectable transport hooks instead of a global auth singleton.
- Checked-in codegen specs with deterministic generated output.
