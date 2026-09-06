import { Module } from '@nestjs/common';
import { MarketplaceReadController } from './read.controller';
import { MarketplaceReadResolver } from './read.resolver';
import { MarketplaceReadService } from './read.service';
import { PostgresMarketplaceReadRepository } from './read.repository';
import { GraphqlComplexityMiddleware } from './read.complexity';
import { ModerationModule } from '../moderation/moderation.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  controllers: [MarketplaceReadController],
  imports: [ModerationModule, IdentityModule],
  providers: [
    MarketplaceReadResolver,
    MarketplaceReadService,
    PostgresMarketplaceReadRepository,
    GraphqlComplexityMiddleware,
    { provide: 'MARKETPLACE_READ_REPOSITORY', useExisting: PostgresMarketplaceReadRepository },
    { provide: 'MODERATION_VISIBILITY', useExisting: 'MODERATION_REPOSITORY' },
  ],
  exports: [MarketplaceReadService],
})
export class MarketplaceReadModule {}
