import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { WebhookService } from './webhook.service';
@Resolver()
@UseGuards(AuthGuard)
export class WebhookResolver {
  constructor(private readonly service: WebhookService) {}
  @Mutation(() => String) async createWebhook(
    @CurrentPrincipal() p: AccessPrincipal,
    @Args('applicationId') app: string,
    @Args('input') input: string,
  ) {
    return JSON.stringify(await this.service.create(p, app, JSON.parse(input)));
  }
  @Query(() => String) async webhooks(
    @CurrentPrincipal() p: AccessPrincipal,
    @Args('applicationId') app: string,
  ) {
    return JSON.stringify(await this.service.list(p, app));
  }
}
