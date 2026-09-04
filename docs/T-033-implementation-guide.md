# T-033 Profile Consent and Privacy

## Purpose

T-033 extends the T-031 wallet profile and T-032 application system with
privacy-controlled profile fields. Wallet address, verified chain identities,
indexed ownership, and indexed activity remain public chain data. Display name,
email, avatar reference, and bio are opt-in private fields.

## Storage and Encryption

Private values are stored as versioned AES-256-GCM ciphertext using the
configured `PRIVACY_ENCRYPTION_KEY`. The API decrypts values only after deciding
that the caller is the wallet owner or has valid application consent. Ciphertext,
keys, and plaintext private fields are excluded from logs and error responses.
Production requires an explicit encryption key; key versioning allows future
rotation without changing the public profile contract.

## Visibility and Consent

Each private field has `PRIVATE`, `APPLICATION_CONSENTED`, or `PUBLIC` visibility.
Application access is always least-privilege: the caller must present a T-032
API key with `profile:read`, and the wallet must have an active consent grant for
the same application, field, and purpose. Revoking a grant blocks future reads;
it does not attempt to delete copies already held by an application.

Consent grants use the existing purpose/state conventions and are recorded with
policy version and timestamps. Wallet erasure removes all encrypted private
values and revokes active grants while retaining non-sensitive audit history.

## Endpoints

- `GET /api/v1/profile/:address` exposes public profile/chain identity data.
- `GET/PATCH /api/v1/profile/me` reads or updates the authenticated wallet's fields.
- `GET/PATCH /api/v1/privacy/settings` reads or changes per-field visibility.
- `GET /api/v1/privacy/consents` lists grants.
- `POST /api/v1/privacy/consents` grants application/field/purpose access.
- `DELETE /api/v1/privacy/consents/:id` revokes a grant immediately.
- `POST /api/v1/privacy/erase` erases private values and revokes grants.
- `GET /api/v1/profile/:address/private` is the application-facing, consent-checked read.

## Audit and Verification

`PrivacyAudit` is append-only and records profile updates, visibility changes,
grant/revoke actions, access decisions, and erasure completion with actor,
application, field, purpose, result, policy version, request ID, and timestamp.
Retain audit rows indefinitely and never expose their private payloads.

Apply the migration after T-032 and run:

```sh
yarn workspace @nft-marketplace/api prisma:generate
yarn workspace @nft-marketplace/api prisma:migrate
yarn workspace @nft-marketplace/api typecheck
yarn workspace @nft-marketplace/api test
yarn workspace @nft-marketplace/api build
yarn workspace @nft-marketplace/api generate
```

Tests cover encryption round trips, malformed ciphertext, public-vs-private
visibility, application scope plus consent checks, revocation, erasure, and
audit persistence.
