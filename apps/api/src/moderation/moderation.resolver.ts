import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentPrincipal } from '../identity/auth.guard';
import type { AccessPrincipal } from '../identity/auth.types';
import { AdminGuard } from './admin.guard';
import { ModerationService } from './moderation.service';
@Resolver()
export class ModerationResolver {
  constructor(private readonly service: ModerationService) {}
  @Mutation(() => String) @UseGuards(AuthGuard) report(
    @CurrentPrincipal() p: AccessPrincipal,
    @Args('input') input: string,
  ) {
    return this.service.report(p, JSON.parse(input));
  }
  @Query(() => String) @UseGuards(AdminGuard) adminReports(@CurrentPrincipal() p: AccessPrincipal) {
    return JSON.stringify(this.service.reports(p, {}, true));
  }
}
