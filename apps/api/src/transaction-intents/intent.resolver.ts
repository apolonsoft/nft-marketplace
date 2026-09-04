import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { TransactionIntentService } from './intent.service';
@Resolver()
@UseGuards(AuthGuard)
export class TransactionIntentResolver {
  constructor(private readonly service: TransactionIntentService) {}
  @Mutation(() => String) async createTransactionIntent(
    @CurrentPrincipal() p: AccessPrincipal,
    @Args('input', { type: () => String }) input: string,
  ) {
    return JSON.stringify(await this.service.create(p, JSON.parse(input)));
  }
  @Query(() => String) async transactionIntent(
    @CurrentPrincipal() p: AccessPrincipal,
    @Args('id') id: string,
  ) {
    return JSON.stringify(await this.service.get(p, id));
  }
}
