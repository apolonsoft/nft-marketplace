import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { decodeCursor, encodeCursor } from './cursor';
import type {
  MarketplaceReadRepository,
  ReadPage,
  ReadQuery,
  ReadResource,
  ReadRow,
  ReadSort,
  ModerationVisibility,
} from './read.types';

const resources: ReadResource[] = [
  'collections',
  'nfts',
  'creators',
  'listings',
  'sales',
  'activity',
  'ownership',
  'prices',
  'currencies',
];
const sorts: ReadSort[] = ['createdAt', 'updatedAt', 'price', 'volume', 'tokenId', 'name'];
const allowedStates = ['ACTIVE', 'CANCELLED', 'EXPIRED', 'SOLD', 'STALE'];
const asString = (value: unknown) => (value === undefined || value === null ? '' : String(value));

@Injectable()
export class MarketplaceReadService {
  constructor(
    @Inject('MARKETPLACE_READ_REPOSITORY') private readonly repository: MarketplaceReadRepository,
    @Optional() @Inject('MODERATION_VISIBILITY') private readonly moderation?: ModerationVisibility,
  ) {}

  async page(resource: ReadResource, input: ReadQuery = {}): Promise<ReadPage> {
    if (!resources.includes(resource))
      throw new AppError(ErrorCode.VALIDATION, 'Unsupported marketplace resource');
    const sort = input.sort ?? 'createdAt';
    if (!sorts.includes(sort)) throw new AppError(ErrorCode.VALIDATION, 'Unsupported sort field');
    if (input.first !== undefined && input.last !== undefined)
      throw new AppError(ErrorCode.VALIDATION, 'first and last cannot be combined');
    const limit = input.first ?? input.last ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new AppError(ErrorCode.VALIDATION, 'Page size must be between 1 and 100');
    if (input.includePending)
      throw new AppError(ErrorCode.FORBIDDEN, 'Pending indexer data is internal-only');
    if (input.state && !allowedStates.includes(input.state))
      throw new AppError(ErrorCode.VALIDATION, 'Unsupported listing state');
    if (input.q && input.q.length > 200)
      throw new AppError(ErrorCode.VALIDATION, 'Search query is too long');
    if (input.minPrice && input.maxPrice && BigInt(input.minPrice) > BigInt(input.maxPrice))
      throw new AppError(ErrorCode.VALIDATION, 'Invalid price range');
    if (input.after) decodeCursor(input.after, resource, sort);
    if (input.before) decodeCursor(input.before, resource, sort);
    let rows = await this.repository.query(resource, input);
    if (this.moderation && ['collections', 'nfts', 'listings', 'creators'].includes(resource)) {
      const hidden = new Set(
        await this.moderation.hiddenIds(
          resource === 'creators' ? ('profiles' as ReadResource) : resource,
          rows.map((row) => row.id),
        ),
      );
      rows = rows.filter((row) => !hidden.has(row.id));
    }
    rows = rows.filter(
      (row) => input.includeStale || !(row.stale === true || row.state === 'STALE'),
    );
    rows.sort((a, b) => {
      const av = asString(a[sort]);
      const bv = asString(b[sort]);
      return av === bv
        ? asString(a.id).localeCompare(asString(b.id))
        : av.localeCompare(bv, undefined, { numeric: true });
    });
    const totalCount = rows.length;
    if (input.after) {
      const cursor = decodeCursor(input.after, resource, sort);
      const index = rows.findIndex((row) => row.id === cursor.id);
      rows = index >= 0 ? rows.slice(index + 1) : [];
    }
    if (input.before) {
      const cursor = decodeCursor(input.before, resource, sort);
      const index = rows.findIndex((row) => row.id === cursor.id);
      rows = index >= 0 ? rows.slice(0, index) : [];
    }
    const hasPreviousPage = Boolean(input.after || input.before);
    const hasNextPage = rows.length > limit;
    const items = rows.slice(0, limit);
    const cursorFor = (row: ReadRow) =>
      encodeCursor({ v: 1, resource, sort, value: asString(row[sort]), id: row.id });
    return {
      items,
      totalCount,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor: items[0] ? cursorFor(items[0]) : null,
        endCursor: items.at(-1) ? cursorFor(items.at(-1)!) : null,
      },
    };
  }

  discover(input: ReadQuery = {}) {
    return Promise.all(
      ['collections', 'nfts', 'listings', 'creators', 'activity'].map(
        async (resource) => [resource, await this.page(resource as ReadResource, input)] as const,
      ),
    ).then((entries) => Object.fromEntries(entries));
  }
  search(input: ReadQuery & { resource?: ReadResource } = {}) {
    return this.page(input.resource ?? 'nfts', input);
  }
}
