import type { DomainEventType } from '@nft-marketplace/domain';
export type WebhookSubscriptionInput = { endpointUrl: string; eventTypes: DomainEventType[] };
export type WebhookSignature = { timestamp: number; signature: string; header: string };
export type WebhookEvent = { id: string; type: DomainEventType; payload: unknown };
