export type ReadResource = 'collections' | 'nfts' | 'creators' | 'listings' | 'sales' | 'activity' | 'ownership' | 'prices' | 'currencies';
export type ReadSort = 'createdAt' | 'updatedAt' | 'price' | 'volume' | 'tokenId' | 'name';
export interface ReadQuery { after?: string; before?: string; first?: number; last?: number; chainId?: number; collection?: string; creator?: string; owner?: string; seller?: string; buyer?: string; currency?: string; state?: string; tokenId?: string; minPrice?: string; maxPrice?: string; q?: string; sort?: ReadSort; includeStale?: boolean; includePending?: boolean; }
export interface ReadRow { id: string; [key: string]: unknown; }
export interface ReadPage { items: ReadRow[]; pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null }; totalCount: number; }
export interface MarketplaceReadRepository { query(resource: ReadResource, query: ReadQuery): Promise<ReadRow[]>; }
