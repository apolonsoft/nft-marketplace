# @nft-marketplace/config

Shared TypeScript, ESLint, Prettier, Vitest, environment, and error conventions.

Use `tsconfig/node` for NodeNext server and package code, `tsconfig/browser` for
Next.js/browser code, and the `vitest/node` or `vitest/browser` presets for tests.
Environment schemas are parsed with `parseEnv`; browser bundles must use only
explicit values passed through `asPublicEnv`. This package must not depend on an
application.
