# T-054 Developer Portal

The `/developer` route is an application workspace backed by the existing authenticated NestJS developer and webhook APIs. The wallet signs a SIWE message using `/api/v1/auth/nonce` and `/api/v1/auth/verify`; the returned bearer access token is kept only in the active component session and sent with protected requests.

Applications can be created and selected, with tabs for overview, API keys, webhooks, usage, team guidance, and documentation links. API keys use server scope validation and atomic rotation. Plaintext keys are shown once in a transient reveal panel with copy/download/dismiss actions; list responses only contain prefixes and metadata. Revocation and rotation immediately update the list and server-side guard behavior.

Webhook subscriptions require HTTPS endpoints and supported domain event types. Creation and rotation return a one-time secret. Subscription status and secret version are shown; disable is available immediately. Usage is rendered as operational daily rows and a 90-day total. OpenAPI and GraphQL links target the existing API documentation endpoints.

No secrets are persisted in URLs, local storage, logs, or generated artifacts.

Verification: `yarn workspace @nft-marketplace/web typecheck`, `yarn workspace @nft-marketplace/web lint`, `yarn workspace @nft-marketplace/web build`, `yarn workspace @nft-marketplace/api typecheck`, `yarn workspace @nft-marketplace/api lint`, `git diff --check`.
