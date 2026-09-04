# T-035 Transaction Intent APIs

## Scope and assumptions

This implementation serves SIWE-authenticated wallets only. A wallet can read,
update, and consume intents created for its own wallet profile. The supported
chains are the configured SIWE chain IDs (by default Anvil `31337`; Base Sepolia
`84532` can be enabled with `SIWE_ALLOWED_CHAIN_IDS`). Contract addresses come
from the contracts package; deployments with empty manifests must provide an
operation-specific `to` or `contractAddress`.

## API surface

- `POST /api/v1/transaction-intents` creates an unsigned intent.
- `GET /api/v1/transaction-intents/:id` returns the unsigned transaction and
  current lifecycle state.
- `PATCH /api/v1/transaction-intents/:id/status` advances state and records a
  transaction hash for submission or confirmation.
- `POST /api/v1/transaction-intents/:id/consume` atomically marks a confirmed
  intent consumed.
- GraphQL exposes `createTransactionIntent(input: String)` and
  `transactionIntent(id: String)` using the same service and authorization.

The response contains `chainId`, `to`, ABI-encoded `data`, decimal-string
`value`, optional gas hint, intent ID, expiry, and status.

## Supported operations

`DEPLOY_COLLECTION`, `MINT`, `MINT_BATCH`, `APPROVE`,
`SET_APPROVAL_FOR_ALL`, `CREATE_LISTING`, `PURCHASE`, `CANCEL_LISTING`, and
`WITHDRAW` map directly to the generated factory, ERC-721/ERC-1155, and
settlement ABIs. Numeric arguments are converted to `bigint` before encoding.
Purchase uses the settlement `purchase(listingId,purchaseId,quantity)` method.
Native ETH purchases carry the exact requested `value`; ERC-20 purchases carry
zero value and require a separate ERC-20 approval intent in the client flow.

## Validation and replay protection

Creation rejects unsupported chains, malformed idempotency keys, and expiry
outside 30 seconds to one hour. The normalized request is SHA-256 hashed. A
repeat request with the same wallet and idempotency key returns the original
intent; reusing that key with a different payload returns a conflict. Database
uniqueness on `(walletId, idempotencyKey)` closes concurrent races.

The repository enforces wallet ownership on every read and mutation. Expired
created intents are moved to `EXPIRED`; expired, failed, and consumed intents
cannot be reused. Lifecycle transitions are constrained to:

`CREATED -> SUBMITTED|FAILED|EXPIRED`,
`SUBMITTED -> CONFIRMED|FAILED|EXPIRED`, and
`CONFIRMED -> CONSUMED`.

Submission and confirmation require a transaction hash. Consume is only valid
after confirmation and is persisted with a timestamp.

## Data model and migration

`TransactionIntent` stores the operation, chain, request hash, calldata, value,
optional gas hint, expiry, lifecycle timestamps, transaction hash, and failure
metadata. The migration is
`apps/api/prisma/migrations/20260904030000_transaction_intents/migration.sql`.
Run Prisma generation after schema changes.

## Verification

```text
rtk yarn workspace @nft-marketplace/api prisma:generate
rtk yarn workspace @nft-marketplace/api typecheck
rtk yarn workspace @nft-marketplace/api test
```

For contract-level verification, submit the returned `to`, `data`, and `value`
through a wallet on the selected chain and confirm the intent only after the
receipt is mined.
