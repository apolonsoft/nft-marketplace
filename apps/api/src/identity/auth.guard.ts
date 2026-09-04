import { Inject, Injectable, createParamDecorator } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';

const requestFromContext = (context: ExecutionContext): AuthenticatedRequest =>
  context.getType<'graphql'>() === 'graphql'
    ? GqlExecutionContext.create(context).getContext<{ req: AuthenticatedRequest }>().req
    : context.switchToHttp().getRequest<AuthenticatedRequest>();

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = requestFromContext(context);
    const authorization = request.headers.authorization;
    const value = Array.isArray(authorization) ? authorization[0] : authorization;
    if (typeof value !== 'string' || !value.startsWith('Bearer '))
      throw new AppError(ErrorCode.AUTHENTICATION, 'Bearer access token is required');
    request.user = await this.auth.authenticateAccessToken(value.slice(7));
    return true;
  }
}

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => requestFromContext(context).user,
);
