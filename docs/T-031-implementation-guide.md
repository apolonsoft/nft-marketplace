# T-031 SIWE Authentication

## Purpose

T-031 adds wallet-based authentication to the NestJS API created by T-030. The
flow follows EIP-4361 (Sign-In with Ethereum), creates a durable wallet profile,
and issues a short-lived access token plus a rotating refresh-token cookie.

## Configuration

`SIWE_ALLOWED_DOMAINS` and `SIWE_ALLOWED_CHAIN_IDS` are comma-separated exact
allowlists. Nonces expire after 10 minutes by default. Access tokens expire after
15 minutes; refresh-token families expire after 30 days. Production requires
`AUTH_ACCESS_PRIVATE_KEY` and `AUTH_ACCESS_PUBLIC_KEY` in PEM form, plus the
database and indexer URLs from T-030. Refresh cookies are `HttpOnly`, `Secure`
in production, `SameSite=Strict`, and scoped to `/api/v1/auth`.

## Request Flow

1. `POST /api/v1/auth/nonce` validates the requested address, domain, and chain,
   then stores a random nonce bound to all three values.
2. The client builds and signs an EIP-4361 message containing that nonce.
3. `POST /api/v1/auth/verify` parses and validates the message, checks the URI,
   configured statement, timestamps, chain, domain, and signature, then atomically
   consumes the nonce and upserts the wallet profile.
4. Verification returns a bearer access token and sets the refresh token cookie.
5. `POST /api/v1/auth/refresh` hashes the cookie, atomically marks the current
   token used, and creates its replacement. Reuse of a used/revoked token revokes
   every token in the session family.
6. `POST /api/v1/auth/revoke` revokes the current family. `GET /api/v1/auth/me`
   requires a valid bearer token and active family.

## Persistence and Security Invariants

Prisma owns four PostgreSQL tables: `WalletProfile`, `SiweNonce`,
`SessionFamily`, and `RefreshToken`. Raw refresh tokens are never persisted.
Nonce consumption and refresh rotation use conditional updates inside database
transactions, so concurrent requests cannot authenticate twice or rotate the
same token twice. Access-token verification also checks the persisted session
family, allowing revocation to take effect before token expiry.

## Verification

```sh
yarn install
yarn workspace @nft-marketplace/api prisma:generate
yarn workspace @nft-marketplace/api typecheck
yarn workspace @nft-marketplace/api test
yarn workspace @nft-marketplace/api build
yarn workspace @nft-marketplace/api generate
```

The migration is `apps/api/prisma/migrations/20260904000000_siwe_auth` and is
applied with `yarn workspace @nft-marketplace/api prisma:migrate` against the
configured PostgreSQL database.
