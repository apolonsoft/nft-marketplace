# Code Generation

Repository-owned deterministic generation for OpenAPI and GraphQL clients.

Checked-in specifications belong under `tooling/codegen/specs/`; generated
outputs belong under `packages/api-client/generated/`. The generator is safe to
run before T-030 publishes real API schemas and must never require manual edits.
