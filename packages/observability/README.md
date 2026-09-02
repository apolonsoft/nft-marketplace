# @nft-marketplace/observability

Shared structured logging conventions. `createLogger` emits JSON records and
redacts tokens, keys, signatures, cookies, passwords, and other sensitive fields.
The module is dependency-light at the skeleton stage and exposes a browser-safe
entrypoint without server-only imports.
