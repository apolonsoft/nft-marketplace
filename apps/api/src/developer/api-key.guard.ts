import { Inject, Injectable, SetMetadata } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { DEVELOPER_REPOSITORY } from '../common/developer-tokens';
import type { DeveloperPrincipal, DeveloperRepository } from './developer.types';

export const REQUIRED_SCOPES = 'developer:required-scopes';
export const RequireScopes = (...scopes: string[]) => SetMetadata(REQUIRED_SCOPES, scopes);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @Inject(DEVELOPER_REPOSITORY) private readonly repository: DeveloperRepository) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; developer?: DeveloperPrincipal; route?: { path?: string } }>();
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer mk_test_') && !auth?.startsWith('Bearer mk_live_')) throw new AppError(ErrorCode.AUTHENTICATION, 'Developer API key is required');
    const raw = auth.slice(7);
    const key = await this.repository.findKey(this.hash(raw));
    if (!key || key.revokedAt || key.status !== 'ACTIVE') throw new AppError(ErrorCode.AUTHENTICATION, 'API key is invalid or revoked');
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES, [context.getHandler(), context.getClass()]) ?? [];
    const scopes: string[] = key.scopes as string[];
    const availableScopes = new Set(scopes.map((value) => String(value)));
    for (const scope of required) {
      if (scope === undefined) throw new AppError(ErrorCode.SCOPE_DENIED, 'API key scope is insufficient');
      if (!availableScopes.has(scope)) throw new AppError(ErrorCode.SCOPE_DENIED, 'API key scope is insufficient');
    }
    const result = await this.repository.consumeQuota({ applicationId: key.applicationId, keyId: key.id, endpointGroup: request.route?.path ?? context.getClass().name ?? 'unknown', statusClass: '2xx', day: this.utcDay(new Date()), quota: key.dailyQuota });
    if (!result.allowed) throw new AppError(ErrorCode.RATE_LIMITED, 'Application daily quota exceeded', { details: { quota: key.dailyQuota, used: result.used } });
    request.developer = { keyId: key.id, applicationId: key.applicationId, environment: key.environment, scopes: key.scopes };
    return true;
  }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private utcDay(now: Date) { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); }
}
