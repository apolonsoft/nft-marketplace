# @nft-marketplace/api

NestJS REST and GraphQL API. Source is organized by feature under `src/config`,
`src/health`, `src/observability`, and `src/system`, with cross-cutting code in
`src/common`. Local imports are extensionless; `tsx` runs source development
and `esbuild` produces the Node production bundle. See
`../../docs/T-030-implementation-guide.md` for architecture, configuration,
operational endpoints, and verification.
