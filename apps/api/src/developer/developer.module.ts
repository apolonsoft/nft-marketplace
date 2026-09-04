import { Module } from '@nestjs/common';
import { DEVELOPER_REPOSITORY } from '../common/developer-tokens';
import { IdentityModule } from '../identity/identity.module';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { PrismaDeveloperRepository } from './prisma-developer.repository';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [IdentityModule],
  controllers: [DeveloperController],
  providers: [
    DeveloperService,
    PrismaDeveloperRepository,
    ApiKeyGuard,
    { provide: DEVELOPER_REPOSITORY, useExisting: PrismaDeveloperRepository },
  ],
  exports: [DeveloperService, DEVELOPER_REPOSITORY, ApiKeyGuard],
})
export class DeveloperModule {}
