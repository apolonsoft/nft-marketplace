import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../identity/prisma.service';
import type { MarketplaceReadRepository, ReadQuery, ReadResource, ReadRow } from './read.types';

@Injectable()
export class PostgresMarketplaceReadRepository implements MarketplaceReadRepository {
  constructor(private readonly prisma: PrismaService) {}
  async query(resource: ReadResource, query: ReadQuery): Promise<ReadRow[]> {
    const conditions: Prisma.Sql[] = [];
    const tables: Record<ReadResource, string> = {
      collections: 'collection',
      nfts: 'token',
      creators: 'collection',
      listings: 'listing',
      sales: 'purchase',
      activity: 'activity',
      ownership: 'token_balance',
      prices: 'listing',
      currencies: 'listing',
    };
    if (query.chainId !== undefined) conditions.push(Prisma.sql`chain_id = ${query.chainId}`);
    if (query.collection)
      conditions.push(Prisma.sql`collection_id = ${query.collection.toLowerCase()}`);
    if (query.creator && resource === 'collections')
      conditions.push(Prisma.sql`creator = ${query.creator.toLowerCase()}`);
    if (query.owner && resource === 'ownership')
      conditions.push(Prisma.sql`owner = ${query.owner.toLowerCase()}`);
    if (query.seller && resource === 'listings')
      conditions.push(Prisma.sql`seller = ${query.seller.toLowerCase()}`);
    if (query.tokenId && ['nfts', 'listings', 'ownership', 'activity'].includes(resource))
      conditions.push(Prisma.sql`token_id = ${BigInt(query.tokenId)}`);
    if (query.q) {
      const search = `%${query.q}%`;
      conditions.push(Prisma.sql`CAST(id AS text) ILIKE ${search}`);
    }
    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>(
      Prisma.sql`SELECT * FROM ${Prisma.raw(tables[resource])} ${where} LIMIT 101`,
    );
    return rows.map((row) => this.normalize(resource, row));
  }
  private normalize(resource: ReadResource, row: Record<string, unknown>): ReadRow {
    const get = (snake: string, camel: string) => row[snake] ?? row[camel];
    const base = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === 'bigint' ? value.toString() : value,
      ]),
    );
    if (resource === 'collections')
      return {
        ...base,
        id: String(row.id),
        address: String(row.id),
        chainId: Number(get('chain_id', 'chainId')),
        creator: String(row.creator),
        standard: Number(row.standard) === 0 ? 'ERC721' : 'ERC1155',
        metadataUri: get('metadata_uri', 'metadataUri') ?? null,
      };
    if (resource === 'nfts')
      return {
        ...base,
        id: String(row.id),
        collectionId: String(get('collection_id', 'collectionId')),
        chainId: Number(get('chain_id', 'chainId')),
        contractAddress: String(get('collection_id', 'collectionId')),
        tokenId: String(get('token_id', 'tokenId')),
        standard: 'ERC721',
        owner: null,
        quantity: String(get('total_supply', 'totalSupply') ?? '1'),
        metadataUri: get('uri', 'uri') ?? null,
        blockNumber: String(get('block_number', 'blockNumber')),
        transactionHash: get('transaction_hash', 'transactionHash') ?? null,
      };
    if (resource === 'listings' || resource === 'prices') {
      const stateCode = Number(row.state);
      const expires = get('expires_at', 'expiresAt');
      const expired =
        expires != null && BigInt(String(expires)) <= BigInt(Math.floor(Date.now() / 1000));
      const stale = stateCode !== 0 || expired;
      return {
        ...base,
        id: String(row.id),
        nftId: `${get('collection_id', 'collectionId')}:${get('token_id', 'tokenId')}`,
        seller: String(row.seller),
        state: stale ? (expired ? 'EXPIRED' : stateCode === 1 ? 'CANCELLED' : 'SOLD') : 'ACTIVE',
        stale,
        unavailableReason: expired
          ? 'Listing expired'
          : stateCode === 1
            ? 'Listing cancelled'
            : stateCode === 2
              ? 'Listing sold'
              : null,
        price: {
          value: String(get('unit_price', 'unitPrice')),
          currencyCode: String(row.currency),
        },
        quantity: String(row.quantity),
        expiresAt: expires == null ? null : new Date(Number(expires) * 1000).toISOString(),
      };
    }
    if (resource === 'creators')
      return {
        ...base,
        id: String(row.creator),
        address: String(row.creator),
        name: String(row.creator),
        collectionId: String(row.id),
      };
    return {
      ...base,
      id: String(row.id),
      chainId: Number(get('chain_id', 'chainId')),
      blockNumber: String(get('block_number', 'blockNumber')),
      transactionHash: String(get('transaction_hash', 'transactionHash')),
    };
  }
}
