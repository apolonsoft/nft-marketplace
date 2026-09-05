# T-053 Collector Purchase Workflows

## Workflow

`/checkout?listingId=<id>` loads the canonical listing through the purchase-preflight endpoint. The endpoint includes stale rows so the UI can explain why an item is unavailable. Expired, cancelled, sold, stale, missing, or over-quantity listings cannot submit a wallet transaction.

ERC-721 quantity is fixed at one. ERC-1155 quantity is an input bounded by the listing quantity. ETH purchases send native value through the existing `PURCHASE` intent. USDC purchases use the configured token address, first submit an exact amount ERC-20 approval to the settlement spender, then submit `PURCHASE` with zero native value.

The shared transaction controller renders pending, submitted, confirmed, failed, and retry states. Purchase confirmations show the transaction hash. Account history reads indexed sales for the connected wallet and is intentionally tolerant of indexing delay.

## API and safety

`GET /api/v1/purchase-preflight/:listingId?quantity=N` re-reads listings with stale entries included and returns `{ available, reason, listing }`. `APPROVE_CURRENCY` is an authenticated transaction-intent operation that encodes ERC-20 `approve(spender, amount)`. Existing `PURCHASE` intents remain the source of truth for settlement calldata and idempotency.

USDC configuration is supplied through `NEXT_PUBLIC_USDC_ADDRESS` for the active chain; deployments should provide the matching chain-specific value. No private keys or secrets are stored in the browser.

## Verification

Run `yarn workspace @nft-marketplace/web typecheck`, `yarn workspace @nft-marketplace/web lint`, `yarn workspace @nft-marketplace/web build`, `yarn workspace @nft-marketplace/api typecheck`, `yarn workspace @nft-marketplace/api lint`, and `git diff --check`.
