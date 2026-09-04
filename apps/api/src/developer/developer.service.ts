import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { DEVELOPER_REPOSITORY } from '../common/developer-tokens';
import type { DeveloperRepository, DeveloperRole, DeveloperScope, KeyEnvironment } from './developer.types';
import { DEVELOPER_SCOPES } from './developer.types';

@Injectable()
export class DeveloperService {
  constructor(@Inject(DEVELOPER_REPOSITORY) private readonly repository: DeveloperRepository) {}
  createApplication(walletId: string, input: { name: string; slug: string; description?: string; dailyQuota?: number }) { return this.repository.createApplication(walletId, input); }
  listApplications(walletId: string) { return this.repository.listApplications(walletId); }
  async getAccess(applicationId: string, walletId: string, roles?: DeveloperRole[]) { const access = await this.repository.getApplicationAccess(applicationId, walletId, roles); if (!access) throw new AppError(ErrorCode.FORBIDDEN, 'Application access denied'); return access as { application: { id: string } }; }
  updateApplication(applicationId: string, input: { name?: string; description?: string; dailyQuota?: number }) { return this.repository.updateApplication(applicationId, input); }
  archiveApplication(applicationId: string) { return this.repository.archiveApplication(applicationId); }
  async issueKey(applicationId: string, input: { environment: KeyEnvironment; name: string; scopes: string[] }) {
    this.validateScopes(input.scopes);
    const raw = `${input.environment === 'LIVE' ? 'mk_live_' : 'mk_test_'}${randomBytes(32).toString('base64url')}`;
    const record = await this.repository.createKey(applicationId, { ...input, prefix: raw.slice(0, 8), secretHash: this.hash(raw) });
    return { id: record.id, key: raw, environment: input.environment, name: input.name, scopes: input.scopes, createdAt: record.createdAt };
  }
  listKeys(applicationId: string) { return this.repository.listKeys(applicationId); }
  revokeKey(applicationId: string, keyId: string) { return this.repository.revokeKey(applicationId, keyId); }
  async rotateKey(applicationId: string, keyId: string, input: { environment: KeyEnvironment; name: string; scopes: string[] }) {
    this.validateScopes(input.scopes);
    const raw = `${input.environment === 'LIVE' ? 'mk_live_' : 'mk_test_'}${randomBytes(32).toString('base64url')}`;
    const record = await this.repository.rotateKey(applicationId, keyId, { ...input, prefix: raw.slice(0, 8), secretHash: this.hash(raw) });
    return { id: record.id, key: raw, environment: input.environment, name: input.name, scopes: input.scopes, createdAt: record.createdAt };
  }
  usage(applicationId: string, from: Date, to: Date) { return this.repository.usage(applicationId, from, to); }
  async invite(applicationId: string, walletAddress: string, role: DeveloperRole = 'MEMBER') { const token = randomBytes(32).toString('base64url'); await this.repository.createInvitation(applicationId, walletAddress, role, this.hash(token), new Date(Date.now() + 7 * 86400000)); return { token, expiresIn: 7 * 86400, walletAddress, role }; }
  async acceptInvitation(token: string, walletId: string, walletAddress: string) { const result = await this.repository.acceptInvitation(this.hash(token), walletId, walletAddress, new Date()); if (!result) throw new AppError(ErrorCode.FORBIDDEN, 'Invitation is invalid, expired, or addressed to another wallet'); return result; }
  hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  validateScopes(scopes: string[]) { if (!scopes.length || scopes.some((scope) => !(DEVELOPER_SCOPES as readonly string[]).includes(scope))) throw new AppError(ErrorCode.VALIDATION, 'Invalid API-key scopes'); }
}
