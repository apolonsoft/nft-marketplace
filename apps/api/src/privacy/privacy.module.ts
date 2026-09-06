import { Module } from '@nestjs/common';
import { PRIVACY_REPOSITORY } from '../common/developer-tokens';
import { DeveloperModule } from '../developer/developer.module';
import { IdentityModule } from '../identity/identity.module';
import { PrismaService } from '../identity/prisma.service';
import { PrivacyController } from './privacy.controller';
import { PrivacyCrypto } from './privacy.crypto';
import { PrismaPrivacyRepository } from './prisma-privacy.repository';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [DeveloperModule, IdentityModule],
  controllers: [PrivacyController],
  providers: [
    PrismaPrivacyRepository,
    PrivacyCrypto,
    PrivacyService,
    { provide: PRIVACY_REPOSITORY, useExisting: PrismaPrivacyRepository },
  ],
  exports: [PrivacyService],
})
export class PrivacyModule {}
