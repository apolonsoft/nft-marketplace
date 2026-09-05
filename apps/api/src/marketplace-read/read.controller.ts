import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketplaceReadService } from './read.service';
import type { ReadQuery, ReadResource } from './read.types';

@ApiTags('marketplace-read')
@Controller('/api/v1')
export class MarketplaceReadController {
  constructor(private readonly service: MarketplaceReadService) {}
  @Get('discover') discover(@Query() query: ReadQuery) {
    return this.service.discover(query);
  }
  @Get('search') search(@Query() query: ReadQuery & { resource?: ReadResource }) {
    return this.service.search(query);
  }
  @Get(':resource') resource(@Param('resource') resource: ReadResource, @Query() query: ReadQuery) {
    return this.service.page(resource, query);
  }

  @Get('purchase-preflight/:listingId')
  async purchasePreflight(
    @Param('listingId') listingId: string,
    @Query('quantity') quantity = '1',
  ) {
    const page = await this.service.page('listings', { includeStale: true, first: 100 });
    const listing = page.items.find((item) => item.id === listingId);
    if (!listing) return { available: false, reason: 'Listing not found' };
    const requested = BigInt(quantity);
    const available =
      listing.stale !== true &&
      requested > 0n &&
      requested <= BigInt(String(listing.quantity ?? 0));
    return {
      available,
      ...(available
        ? {}
        : { reason: listing.unavailableReason ?? 'Requested quantity is unavailable' }),
      listing,
    };
  }
}
