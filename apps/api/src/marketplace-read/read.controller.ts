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
}
