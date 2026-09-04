import { Injectable } from '@nestjs/common';
import type { MarketplaceReadRepository, ReadQuery, ReadResource, ReadRow } from './read.types';

@Injectable()
export class PostgresMarketplaceReadRepository implements MarketplaceReadRepository {
  async query(_resource: ReadResource, _query: ReadQuery): Promise<ReadRow[]> {
    // The indexer owns the physical tables; deployments provide the SQL adapter here.
    return [];
  }
}
