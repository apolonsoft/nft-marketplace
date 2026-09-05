# T-051 Discovery and Detail Views

## API read path

The marketplace read API queries canonical indexer tables through the
`PostgresMarketplaceReadRepository`. Resource names are whitelisted and query
values are bound through Prisma SQL fragments. Results are normalized to the
shared collection, NFT, listing, ownership, activity, and pagination contracts.
Listings derive `STALE`, `EXPIRED`, `CANCELLED`, or `SOLD` presentation state
from canonical state and expiry. Default reads exclude stale rows; callers may
request them with `includeStale=true`.

## Web discovery

The Next.js app uses the NestJS REST read routes through the shared API client.
Explore controls synchronize search and sort values to the URL, debounce text
search by 300 ms, and reset cursor parameters whenever filters change. Cursor
pagination uses `after`/`before` and accessible previous/next buttons.

## Detail views

NFT and collection routes expose keyboard-operable Overview, Ownership, Activity,
and Listings tabs. Creator, ownership, and activity route boundaries preserve
the same API/loading/error contracts while their owning read projections mature.
Stale listings remain visible for history/context, show an unavailable label,
and never expose an active purchase action.

## Accessibility and verification

Use semantic headings, labeled controls, visible focus styles, tab roles, arrow
key navigation, responsive single-column mobile layouts, and stable image aspect
ratios. Verify API/resource mappings, stale classification, URL query behavior,
pagination, empty/error states, keyboard flows, and axe scans at desktop/mobile
viewports.
