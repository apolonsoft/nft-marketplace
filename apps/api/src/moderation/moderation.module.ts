import { Module } from '@nestjs/common';
import { API_CONFIG } from '../common/tokens';
import { IdentityModule } from '../identity/identity.module';
import { AdminGuard } from './admin.guard';
import { ModerationController } from './moderation.controller';
import { ModerationResolver } from './moderation.resolver';
import { PrismaModerationRepository } from './prisma-moderation.repository';
import { ModerationService } from './moderation.service';
@Module({
  imports: [IdentityModule],
  controllers: [ModerationController],
  providers: [
    ModerationResolver,
    ModerationService,
    PrismaModerationRepository,
    AdminGuard,
    { provide: 'MODERATION_REPOSITORY', useExisting: PrismaModerationRepository },
  ],
  exports: [ModerationService, PrismaModerationRepository, AdminGuard, 'MODERATION_REPOSITORY'],
})
export class ModerationModule {}
