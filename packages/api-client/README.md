# @nft-marketplace/api-client

Shared REST and GraphQL transport contracts for the marketplace.

T-004 provides cursor-first pagination schemas, typed page information, and
transport re-exports of domain schemas. Public REST resources use `/api/v1`,
plural kebab-case paths, and camelCase JSON; GraphQL uses PascalCase types and
camelCase fields and arguments. Generated clients and endpoint-specific DTOs
remain owned by T-005 and later API tasks.

Import from `@nft-marketplace/api-client` or the `./pagination` and `./schemas`
subpaths. Generated clients must not be edited manually.
