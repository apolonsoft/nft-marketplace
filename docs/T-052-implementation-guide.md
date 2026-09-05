# T-052 Creator Workflows

The creator studio is a wallet-scoped, resumable workspace at `/create`. Draft fields are persisted in browser storage under the connected wallet address. The four workflow tabs cover collection metadata, media validation, mint/freeze, and marketplace actions.

Blockchain operations use `POST /api/v1/transaction-intents` when an authenticated API session is available. The response calldata is sent through the connected wallet and rendered through the shared transaction controller. Every operation exposes intent, pending, submitted/confirmed, failed, and retry states. Failed work keeps the draft intact.

ERC-721 quantity is forced to one. ERC-1155 accepts an explicit positive quantity per token ID. Uploads accept JPEG, PNG, WebP, and GIF up to 10 MB in the browser; worker-side validation remains authoritative for MIME sniffing, dimensions, metadata parsing, and pinning.

The API intent model now includes `FREEZE_COLLECTION`, mapped to the collection's `freezeCollection()` method. The Prisma enum is extended by migration `20260905090000_add_freeze_intent`.

Verification: run `yarn workspace @nft-marketplace/web typecheck`, `yarn workspace @nft-marketplace/web lint`, and `yarn workspace @nft-marketplace/api typecheck`.
