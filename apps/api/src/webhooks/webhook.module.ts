import { Module } from '@nestjs/common';
import { DeveloperModule } from '../developer/developer.module';
import { IdentityModule } from '../identity/identity.module';
import { PrismaWebhookRepository } from './prisma-webhook.repository';
import { WebhookController } from './webhook.controller';
import { WebhookResolver } from './webhook.resolver';
import { WebhookService } from './webhook.service';
@Module({
  imports: [IdentityModule, DeveloperModule],
  controllers: [WebhookController],
  providers: [
    WebhookResolver,
    WebhookService,
    PrismaWebhookRepository,
    { provide: 'WEBHOOK_REPOSITORY', useExisting: PrismaWebhookRepository },
  ],
  exports: [WebhookService, 'WEBHOOK_REPOSITORY'],
})
export class WebhookModule {}
