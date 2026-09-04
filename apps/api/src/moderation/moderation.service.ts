import { Inject, Injectable } from '@nestjs/common';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import type { AccessPrincipal } from '../identity/auth.types';
import type {
  ModerationRepository,
  ModerationStatus,
  ModerationTargetType,
  ReportInput,
} from './moderation.types';
@Injectable()
export class ModerationService {
  constructor(@Inject('MODERATION_REPOSITORY') private readonly repo: ModerationRepository) {}
  private target(input: ReportInput) {
    if (
      !['COLLECTION', 'NFT', 'LISTING', 'PROFILE'].includes(input.targetType) ||
      !input.targetId?.trim()
    )
      throw new AppError(ErrorCode.VALIDATION, 'A valid moderation target is required');
    if (!['SPAM', 'FRAUD', 'COPYRIGHT', 'HARASSMENT', 'OTHER'].includes(input.category))
      throw new AppError(ErrorCode.VALIDATION, 'Invalid report category');
    if (!input.description?.trim() || input.description.length > 2000)
      throw new AppError(
        ErrorCode.VALIDATION,
        'Report description must be between 1 and 2000 characters',
      );
    if (
      input.evidenceUrl &&
      (input.evidenceUrl.length > 2048 || !/^https?:\/\//i.test(input.evidenceUrl))
    )
      throw new AppError(ErrorCode.VALIDATION, 'Evidence URL must be an HTTP(S) URL');
  }
  async report(p: AccessPrincipal, input: ReportInput) {
    this.target(input);
    return this.repo.createReport(p.walletId, input);
  }
  reports(p: AccessPrincipal, filters: Record<string, unknown> = {}, admin = false) {
    return this.repo.listReports(p.walletId, admin, filters);
  }
  async moderate(
    p: AccessPrincipal,
    targetType: ModerationTargetType,
    targetId: string,
    status: ModerationStatus,
    reason: string,
  ) {
    if (!reason?.trim() || reason.length > 1000)
      throw new AppError(ErrorCode.VALIDATION, 'A moderation reason is required');
    if (!['HIDDEN', 'VISIBLE', 'RESOLVED'].includes(status))
      throw new AppError(ErrorCode.VALIDATION, 'Invalid moderation status');
    return this.repo.moderate(p.walletId, targetType, targetId, status, reason);
  }
  detail(targetType: ModerationTargetType, targetId: string) {
    return this.repo.getModeration(targetType, targetId);
  }
  admins() {
    return this.repo.listAdmins();
  }
  addAdmin(p: AccessPrincipal, address: string) {
    if (!/^0x[a-f0-9]{40}$/i.test(address))
      throw new AppError(ErrorCode.VALIDATION, 'Invalid admin wallet address');
    return this.repo.addAdmin(p.walletId, address);
  }
  revokeAdmin(p: AccessPrincipal, walletId: string, reason: string) {
    if (!reason?.trim()) throw new AppError(ErrorCode.VALIDATION, 'A reason is required');
    return this.repo.revokeAdmin(p.walletId, walletId, reason);
  }
  audit(filters: Record<string, unknown> = {}) {
    return this.repo.audit(filters);
  }
}
