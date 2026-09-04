import { Query, Resolver, Args } from '@nestjs/graphql';
import { MarketplaceReadService } from './read.service';
import type { ReadQuery, ReadResource } from './read.types';

@Resolver()
export class MarketplaceReadResolver {
  constructor(private readonly service: MarketplaceReadService) {}
  @Query(() => String) async marketplace(@Args('resource', { type: () => String }) named: string, @Args('query', { nullable: true }) query?: string) { const parsed = query ? JSON.parse(query) as ReadQuery : {}; return JSON.stringify(await this.service.page(named as ReadResource, parsed)); }
  @Query(() => String) async discovery(@Args('query', { nullable: true }) query?: string) { return JSON.stringify(await this.service.discover(query ? JSON.parse(query) as ReadQuery : {})); }
  @Query(() => String) async search(@Args('query', { nullable: true }) query?: string) { return JSON.stringify(await this.service.search(query ? JSON.parse(query) as ReadQuery : {})); }
}
