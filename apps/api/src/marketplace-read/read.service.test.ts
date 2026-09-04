import { describe, expect, it } from 'vitest';
import { MarketplaceReadService } from './read.service';
import type { MarketplaceReadRepository } from './read.types';

const repo: MarketplaceReadRepository = { query: async () => [
  { id: 'a', createdAt: '1', stale: false, state: 'ACTIVE' },
  { id: 'b', createdAt: '2', stale: true, state: 'STALE' },
] };
describe('MarketplaceReadService', () => {
  it('filters stale rows and encodes opaque cursors', async () => {
    const service = new MarketplaceReadService(repo);
    const page = await service.page('listings', { first: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.pageInfo.endCursor).toBeTruthy();
    await expect(service.page('listings', { after: 'bad' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('rejects pending data and invalid ranges', async () => {
    const service = new MarketplaceReadService(repo);
    await expect(service.page('nfts', { includePending: true })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.page('nfts', { minPrice: '10', maxPrice: '1' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
