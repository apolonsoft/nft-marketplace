# T-050 Web Application

## Application shell

`apps/web` is a Next.js App Router application. The root layout provides the
responsive FRAME navigation, shared UI styles, wallet providers, loading/error
boundaries, and the content shell. Public pages are server-rendered and obtain
marketplace data through `@nft-marketplace/api-client`; browser code does not
import API, indexer, worker, or database modules.

Routes currently include `/`, `/explore`, `/collections`,
`/collections/[slug]`, `/nft/[id]`, `/creators`, `/creators/[address]`,
`/activity`, `/checkout`, `/account`, and `/developer`. Pages whose owning
feature is not implemented yet show explicit empty states while preserving the
route boundary and navigation contract.

## API integration

`NEXT_PUBLIC_API_BASE_URL` configures the NestJS API (default development value
is `http://127.0.0.1:3001`). `lib/api.ts` uses the shared client and GraphQL
request method with response parsing and a user-safe error state. API data is
never loaded directly from Postgres, Ponder, or worker storage.

## Wallets and transactions

`wagmi` and `viem` configure injected wallets plus optional WalletConnect on
Anvil (`31337`) and Base Sepolia (`84532`). `NEXT_PUBLIC_ACTIVE_CHAIN_ID`
selects the active target, defaulting to Base Sepolia. The wallet control maps
connection, rejection, disconnection, and wrong-network states to the shared
`WalletState` contract and requests a chain switch when needed.

The SIWE boundary is represented by an auth context and API-client header hook;
nonce issuance, message signing, cookies, and refresh are owned by T-031. The
transaction controller maps operations to the shared `TransactionState` values,
retains hashes/errors, and exposes confirm, expire, retry, and reset actions for
future checkout and marketplace mutations.

## Responsive/accessibility behavior

Desktop navigation is horizontal; mobile navigation becomes a keyboard-accessible
menu. Gallery cards preserve a fixed aspect ratio, controls have visible focus
states and accessible labels, and route content uses semantic headings and
landmarks. Loading, empty, error, and not-found states are explicit and do not
shift surrounding layout unexpectedly.

## Commands

Use `yarn workspace @nft-marketplace/web dev`, `build`, `typecheck`, `lint`, and
`test`. The production build is independent of API runtime replicas; configure
the API base URL and optional WalletConnect project ID at deployment time.
