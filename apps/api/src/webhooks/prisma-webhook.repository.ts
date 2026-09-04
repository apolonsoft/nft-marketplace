import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../identity/prisma.service';
import type { DomainEventType } from '@nft-marketplace/domain';
import type { WebhookRepository } from './webhook.repository';
import type { WebhookSubscriptionInput } from './webhook.types';
@Injectable()
export class PrismaWebhookRepository implements WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(applicationId: string, input: WebhookSubscriptionInput, secretHash: string) {
    return this.prisma.webhookSubscription.create({
      data: {
        applicationId,
        endpointUrl: input.endpointUrl,
        eventTypes: input.eventTypes,
        secretHash,
      },
      select: {
        id: true,
        endpointUrl: true,
        eventTypes: true,
        status: true,
        secretVersion: true,
        createdAt: true,
      },
    });
  }
  async rotate(applicationId: string, id: string, secretHash: string) {
    return this.prisma.webhookSubscription.update({
      where: { id, applicationId },
      data: { secretHash, secretVersion: { increment: 1 }, status: 'ACTIVE' },
      select: { id: true, secretVersion: true, status: true },
    });
  }
  async list(applicationId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { applicationId },
      select: {
        id: true,
        endpointUrl: true,
        eventTypes: true,
        status: true,
        secretVersion: true,
        createdAt: true,
        updatedAt: true,
        lastDeliveredAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async disable(applicationId: string, id: string) {
    return this.prisma.webhookSubscription.update({
      where: { id, applicationId },
      data: { status: 'DISABLED' },
    });
  }
  async deliveries(applicationId: string, id: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { subscriptionId: id, subscription: { applicationId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async replay(applicationId: string, deliveryId: string) {
    const d = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, subscription: { applicationId } },
    });
    if (!d) throw new Error('Delivery not found');
    return this.prisma.webhookDelivery.create({
      data: {
        subscriptionId: d.subscriptionId,
        eventId: `${d.eventId}:replay:${randomUUID()}`,
        eventType: d.eventType,
        payload: d.payload as object,
        originalDeliveryId: d.id,
        status: 'PENDING',
      },
    });
  }
  async claim(event: { id: string; type: DomainEventType; payload: unknown }) {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { status: 'ACTIVE', eventTypes: { has: event.type } },
    });
    const created: unknown[] = [];
    for (const subscription of subscriptions) {
      const delivery = await this.prisma.webhookDelivery.upsert({
        where: { subscriptionId_eventId: { subscriptionId: subscription.id, eventId: event.id } },
        create: {
          subscriptionId: subscription.id,
          eventId: event.id,
          eventType: event.type,
          payload: event.payload as object,
        },
        update: {},
      });
      created.push({ subscription, delivery });
    }
    return created;
  }
  async recordAttempt(input: Record<string, unknown>) {
    return input;
  }
}
