# T-036 Reports, Moderation, and Admin APIs

## Overview

T-036 adds authenticated user reports and platform moderation without changing
indexed blockchain history. Moderation state is an API-owned overlay. Public
marketplace discovery filters active hidden subjects; administrators can still
inspect historical target data and moderation history by explicit target ID.

## Authorization and bootstrap

All report submission and personal report reads require a SIWE access token.
Platform-admin endpoints use the `AdminGuard`, which first authenticates the
token and then checks an active `AdminWallet` entry or an address in
`ADMIN_WALLET_ALLOWLIST` (comma-separated, case-insensitive). Existing admins
can add or revoke database entries. Every allowlist mutation requires a reason
and creates an immutable audit row.

## Report workflow

`POST /api/v1/reports` accepts `COLLECTION`, `NFT`, `LISTING`, or `PROFILE`
targets; categories are `SPAM`, `FRAUD`, `COPYRIGHT`, `HARASSMENT`, and `OTHER`.
Descriptions are required and capped at 2,000 characters. Evidence is optional
and must be an HTTP(S) URL no longer than 2,048 characters. Reports are stored
individually, so repeated submissions remain attributable to each reporter.
`GET /api/v1/reports/me` returns only the caller's reports. Admins use
`GET /api/v1/admin/reports` for the queue.

## Moderation and audit APIs

Admins use `PATCH /api/v1/admin/moderation/:targetType/:targetId` with
`VISIBLE`, `HIDDEN`, or `RESOLVED` and a required reason. `GET
/api/v1/admin/moderation/:targetType/:targetId` returns the overlay, reports,
and state history. Allowlist and audit endpoints are under
`/api/v1/admin/allowlist` and `/api/v1/admin/audit`.

Each action records actor wallet, target type and ID, reason, prior status,
new status, and timestamp in append-only `AdminAuditLog` storage. Resolving a
subject also resolves its open reports with the supplied reason.

## Data model and visibility

`AdminWallet` stores active/revoked platform administrators. `UserReport`
stores reporter, target, category, description, evidence, and resolution.
`ModerationSubject` stores the current overlay state and hide/resolve times.
The marketplace read service removes IDs returned by the moderation visibility
lookup for collections, NFTs, listings, and profile/creator resources. Indexed
rows are never deleted or rewritten.

## GraphQL and verification

The moderation resolver exposes authenticated report submission and admin report
queries through the same service as REST. Standard GraphQL error formatting and
query complexity middleware remain in effect.

```text
rtk yarn workspace @nft-marketplace/api prisma:generate
rtk yarn workspace @nft-marketplace/api typecheck
rtk yarn workspace @nft-marketplace/api test src/moderation/moderation.service.spec.ts
rtk yarn format:check
```
