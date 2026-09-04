# T-032 Developer Applications and API Keys

## Purpose

T-032 extends T-031 wallet authentication with a developer portal. A SIWE wallet
can register applications, delegate access to other wallets, and issue scoped
test or live API keys. The API accepts keys as bearer credentials with `mk_test_`
or `mk_live_` prefixes.

## Data Model

Prisma adds `DeveloperApplication`, `ApplicationMember`,
`ApplicationInvitation`, `ApiKey`, and `ApiUsageDaily`. Applications have an
owner and `OWNER`, `ADMIN`, or `MEMBER` membership. Invitations target a wallet
address, expire after seven days, and are accepted by a SIWE-authenticated
wallet. API keys store only a SHA-256 hash, metadata, environment, scopes, and
revocation/rotation timestamps. Daily usage is aggregated for 90-day portal
reporting; payloads and raw credentials are never retained.

## Portal Endpoints

All portal endpoints require a T-031 bearer access token and are under
`/api/v1/developer`:

- `POST/GET /applications` register and list applications.
- `PATCH/DELETE /applications/:id` update or archive an application.
- `POST /applications/:id/invitations` issue a member invitation.
- `POST /invitations/:token/accept` accept an invitation with the invited wallet.
- `GET/POST /applications/:id/keys` list metadata or create a key.
- `POST /applications/:id/keys/:keyId/rotate` immediately replace a key.
- `DELETE /applications/:id/keys/:keyId` revoke a key immediately.
- `GET /applications/:id/usage` retrieve the recent usage aggregates.

Only owners/admins manage keys and members. Members can view application and
usage data. A raw key is returned exactly once during creation or rotation.

## Enforcement

`ApiKeyGuard` extracts prefixed bearer keys, hashes the complete secret, rejects
missing/revoked/archived keys, checks endpoint-declared scopes, and atomically
increments the UTC-day usage aggregate. Scope failures use `SCOPE_DENIED`; an
application over its default 100,000-request daily quota uses `RATE_LIMITED`.
Rotation revokes the old key in the same transaction, so there is no grace
period. The `RequireScopes` decorator lets future marketplace and webhook
controllers declare `marketplace:read`, `marketplace:write`, or
`webhooks:manage` requirements.

## Migration and Verification

Apply `apps/api/prisma/migrations/20260904010000_developer_apps` after the T-031
migration. Generate the client and run the affected checks:

```sh
yarn workspace @nft-marketplace/api prisma:generate
yarn workspace @nft-marketplace/api prisma:migrate
yarn workspace @nft-marketplace/api typecheck
yarn workspace @nft-marketplace/api test
yarn workspace @nft-marketplace/api build
yarn workspace @nft-marketplace/api generate
```

Tests must assert that raw keys never appear in persisted rows or metadata
responses, revoked keys fail immediately, scope violations use the shared error
shape, quota increments are atomic, and invitation acceptance is wallet-bound.
