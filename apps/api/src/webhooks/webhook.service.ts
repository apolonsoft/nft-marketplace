import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import type { DomainEventType } from '@nft-marketplace/domain';
import { DeveloperService } from '../developer/developer.service';
import type { AccessPrincipal } from '../identity/auth.types';
import type { WebhookRepository } from './webhook.repository';
import type { WebhookSubscriptionInput } from './webhook.types';
@Injectable()
export class WebhookService {
  constructor(
    @Inject('WEBHOOK_REPOSITORY') private readonly repo: WebhookRepository,
    private readonly developer: DeveloperService,
  ) {}
  private validate(input: WebhookSubscriptionInput) {
    if (!/^https:\/\//i.test(input.endpointUrl) || input.endpointUrl.length > 2048)
      throw new AppError(ErrorCode.VALIDATION, 'Webhook endpoint must be an HTTPS URL');
    if (
      !input.eventTypes?.length ||
      input.eventTypes.some(
        (x) =>
          ![
            'COLLECTION_DEPLOYED',
            'MINTED',
            'TRANSFERRED',
            'LISTING_CREATED',
            'LISTING_CANCELLED',
            'PURCHASED',
            'WITHDRAWN',
            'MODERATION_CHANGED',
          ].includes(x),
      )
    )
      throw new AppError(ErrorCode.VALIDATION, 'Invalid webhook event types');
  }
  async create(p: AccessPrincipal, applicationId: string, input: WebhookSubscriptionInput) {
    await this.developer.getAccess(applicationId, p.walletId, ['OWNER', 'ADMIN']);
    this.validate(input);
    const secret = `whsec_${randomBytes(32).toString('base64url')}`;
    const result = await this.repo.create(applicationId, input, this.hash(secret));
    return { result, secret };
  }
  async rotate(p: AccessPrincipal, applicationId: string, id: string) {
    await this.developer.getAccess(applicationId, p.walletId, ['OWNER', 'ADMIN']);
    const secret = `whsec_${randomBytes(32).toString('base64url')}`;
    const result = await this.repo.rotate(applicationId, id, this.hash(secret));
    return { result, secret };
  }
  async list(p: AccessPrincipal, applicationId: string) {
    await this.developer.getAccess(applicationId, p.walletId);
    return this.repo.list(applicationId);
  }
  async disable(p: AccessPrincipal, applicationId: string, id: string) {
    await this.developer.getAccess(applicationId, p.walletId, ['OWNER', 'ADMIN']);
    return this.repo.disable(applicationId, id);
  }
  async deliveries(p: AccessPrincipal, applicationId: string, id: string) {
    await this.developer.getAccess(applicationId, p.walletId);
    return this.repo.deliveries(applicationId, id);
  }
  async replay(p: AccessPrincipal, applicationId: string, deliveryId: string) {
    await this.developer.getAccess(applicationId, p.walletId, ['OWNER', 'ADMIN']);
    return this.repo.replay(applicationId, deliveryId);
  }
  hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
