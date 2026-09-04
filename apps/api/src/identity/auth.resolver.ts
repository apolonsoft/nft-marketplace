import { UseGuards } from '@nestjs/common';
import { Resolver, Query } from '@nestjs/graphql';
import { AuthGuard, CurrentPrincipal } from './auth.guard';
import { AuthService } from './auth.service';
import type { AccessPrincipal } from './auth.types';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Query(() => String)
  @UseGuards(AuthGuard)
  async authMe(@CurrentPrincipal() principal: AccessPrincipal) {
    return (await this.auth.me(principal)).address;
  }
}
