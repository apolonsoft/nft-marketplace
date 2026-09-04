import { Module } from '@nestjs/common';
import { MarketplaceReadController } from './read.controller';
import { MarketplaceReadResolver } from './read.resolver';
import { MarketplaceReadService } from './read.service';
import { PostgresMarketplaceReadRepository } from './read.repository';
import { GraphqlComplexityMiddleware } from './read.complexity';

@Module({ controllers: [MarketplaceReadController], providers: [MarketplaceReadResolver, MarketplaceReadService, PostgresMarketplaceReadRepository, GraphqlComplexityMiddleware, { provide: 'MARKETPLACE_READ_REPOSITORY', useExisting: PostgresMarketplaceReadRepository }], exports: [MarketplaceReadService] })
export class MarketplaceReadModule {}
