import type { DomainEventType } from '@nft-marketplace/domain';
import type { WebhookSubscriptionInput } from './webhook.types';
export interface WebhookRepository {
  create(
    applicationId: string,
    input: WebhookSubscriptionInput,
    secretHash: string,
  ): Promise<unknown>;
  rotate(applicationId: string, id: string, secretHash: string): Promise<unknown>;
  list(applicationId: string): Promise<unknown[]>;
  disable(applicationId: string, id: string): Promise<unknown>;
  deliveries(applicationId: string, id: string): Promise<unknown[]>;
  replay(applicationId: string, deliveryId: string): Promise<unknown>;
  claim(event: { id: string; type: DomainEventType; payload: unknown }): Promise<unknown[]>;
  recordAttempt(input: Record<string, unknown>): Promise<unknown>;
}
