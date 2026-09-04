import { Injectable } from '@nestjs/common';
import { PrismaService } from '../identity/prisma.service';
import type {
  ModerationRepository,
  ModerationStatus,
  ModerationTargetType,
  ReportInput,
} from './moderation.types';

@Injectable()
export class PrismaModerationRepository implements ModerationRepository {
  constructor(private readonly prisma: PrismaService) {}
  async isAdmin(walletId: string, address: string) {
    const wallet = await this.prisma.walletProfile.findUnique({ where: { id: walletId } });
    const configured = (process.env.ADMIN_WALLET_ALLOWLIST ?? '')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    return Boolean(
      wallet &&
      (configured.includes(address.toLowerCase()) ||
        (await this.prisma.adminWallet.findFirst({ where: { walletId, status: 'ACTIVE' } }))),
    );
  }
  async addAdmin(actorWalletId: string, address: string) {
    const wallet = await this.prisma.walletProfile.findUnique({
      where: { address: address.toLowerCase() },
    });
    if (!wallet) throw new Error('Wallet profile not found');
    const entry = await this.prisma.adminWallet.upsert({
      where: { walletId: wallet.id },
      create: { walletId: wallet.id },
      update: { status: 'ACTIVE', revokedAt: null },
    });
    await this.prisma.adminAuditLog.create({
      data: {
        actorWalletId,
        action: 'ADMIN_ALLOWLIST_ADD',
        targetType: 'PROFILE',
        targetId: wallet.id,
        reason: 'Allowlisted administrator',
        newStatus: 'ACTIVE',
      },
    });
    return entry;
  }
  async listAdmins() {
    return this.prisma.adminWallet.findMany({
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async revokeAdmin(actorWalletId: string, walletId: string, reason: string) {
    const entry = await this.prisma.adminWallet.update({
      where: { walletId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await this.prisma.adminAuditLog.create({
      data: {
        actorWalletId,
        action: 'ADMIN_ALLOWLIST_REVOKE',
        targetType: 'PROFILE',
        targetId: walletId,
        reason,
        previousStatus: 'ACTIVE',
        newStatus: 'REVOKED',
      },
    });
    return entry;
  }
  async createReport(walletId: string, input: ReportInput) {
    return this.prisma.$transaction(async (tx) => {
      await tx.moderationSubject.upsert({
        where: { targetType_targetId: { targetType: input.targetType, targetId: input.targetId } },
        create: { targetType: input.targetType, targetId: input.targetId },
        update: {},
      });
      return tx.userReport.create({
        data: {
          reporterWalletId: walletId,
          targetType: input.targetType,
          targetId: input.targetId,
          category: input.category,
          description: input.description,
          ...(input.evidenceUrl ? { evidenceUrl: input.evidenceUrl } : {}),
        },
      });
    });
  }
  async listReports(walletId: string, admin: boolean, filters: Record<string, unknown>) {
    return this.prisma.userReport.findMany({
      where: {
        ...(admin ? {} : { reporterWalletId: walletId }),
        ...(filters.targetType ? { targetType: filters.targetType as any } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async moderate(
    actorWalletId: string,
    targetType: ModerationTargetType,
    targetId: string,
    status: ModerationStatus,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.moderationSubject.findUnique({
        where: { targetType_targetId: { targetType, targetId } },
      });
      const subject = await tx.moderationSubject.upsert({
        where: { targetType_targetId: { targetType, targetId } },
        create: {
          targetType,
          targetId,
          status,
          hiddenAt: status === 'HIDDEN' ? new Date() : null,
          resolvedAt: status === 'RESOLVED' ? new Date() : null,
        },
        update: {
          status,
          hiddenAt: status === 'HIDDEN' ? new Date() : null,
          resolvedAt: status === 'RESOLVED' ? new Date() : null,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorWalletId,
          action: `MODERATION_${status}`,
          targetType,
          targetId,
          reason,
          previousStatus: current?.status ?? null,
          newStatus: status,
        },
      });
      if (status === 'RESOLVED')
        await tx.userReport.updateMany({
          where: { targetType, targetId, status: 'OPEN' },
          data: { status: 'RESOLVED', resolutionReason: reason, resolvedAt: new Date() },
        });
      return subject;
    });
  }
  async getModeration(targetType: ModerationTargetType, targetId: string) {
    const subject = await this.prisma.moderationSubject.findUnique({
      where: { targetType_targetId: { targetType, targetId } },
    });
    if (!subject) return null;
    const [reports, auditLogs] = await Promise.all([
      this.prisma.userReport.findMany({
        where: { targetType, targetId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAuditLog.findMany({
        where: { targetType, targetId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { ...subject, reports, auditLogs };
  }
  async audit(filters: Record<string, unknown>) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        ...(filters.action ? { action: String(filters.action) } : {}),
        ...(filters.targetId ? { targetId: String(filters.targetId) } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async hiddenIds(targetType: ModerationTargetType | 'profiles', ids: string[]) {
    if (!ids.length || targetType === 'profiles') return [];
    const rows = await this.prisma.moderationSubject.findMany({
      where: { targetType, targetId: { in: ids }, status: 'HIDDEN' },
      select: { targetId: true },
    });
    return rows.map((x) => x.targetId);
  }
}
