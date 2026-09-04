import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { AuthGuard } from '../identity/auth.guard';
import type { AuthenticatedRequest } from '../identity/auth.types';
import type { ModerationRepository } from './moderation.types';
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthGuard,
    @Inject('MODERATION_REPOSITORY') private readonly repo: ModerationRepository,
  ) {}
  async canActivate(context: ExecutionContext) {
    await this.auth.canActivate(context);
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user || !(await this.repo.isAdmin(req.user.walletId, req.user.address)))
      throw new AppError(ErrorCode.FORBIDDEN, 'Platform administrator access required');
    return true;
  }
}
