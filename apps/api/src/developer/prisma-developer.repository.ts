import { Injectable } from '@nestjs/common';
import { PrismaService } from '../identity/prisma.service';
import type { DeveloperRepository, DeveloperRole, KeyEnvironment } from './developer.types';

@Injectable()
export class PrismaDeveloperRepository implements DeveloperRepository {
  constructor(private readonly prisma: PrismaService) {}
  async createApplication(
    ownerWalletId: string,
    input: { name: string; slug: string; description?: string; dailyQuota?: number },
  ) {
    return this.prisma.developerApplication.create({
      data: {
        ...input,
        ownerWalletId,
        members: { create: { walletId: ownerWalletId, role: 'OWNER' } },
      },
    });
  }
  async listApplications(walletId: string) {
    return this.prisma.developerApplication.findMany({
      where: { members: { some: { walletId, acceptedAt: { gte: new Date(0) } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async getApplicationAccess(applicationId: string, walletId: string, roles?: DeveloperRole[]) {
    return this.prisma.applicationMember.findFirst({
      where: {
        applicationId,
        walletId,
        acceptedAt: { gte: new Date(0) },
        ...(roles ? { role: { in: roles } } : {}),
      },
      include: { application: true },
    });
  }
  async updateApplication(
    applicationId: string,
    input: { name?: string; description?: string; dailyQuota?: number },
  ) {
    return this.prisma.developerApplication.update({ where: { id: applicationId }, data: input });
  }
  async archiveApplication(applicationId: string) {
    await this.prisma.developerApplication.update({
      where: { id: applicationId },
      data: { status: 'ARCHIVED' },
    });
  }
  async createKey(
    applicationId: string,
    input: {
      environment: KeyEnvironment;
      name: string;
      prefix: string;
      secretHash: string;
      scopes: string[];
    },
  ) {
    return this.prisma.apiKey.create({ data: { applicationId, ...input } });
  }
  async listKeys(applicationId: string) {
    return this.prisma.apiKey.findMany({
      where: { applicationId },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
        rotatedAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async revokeKey(applicationId: string, keyId: string) {
    await this.prisma.apiKey.updateMany({
      where: { id: keyId, applicationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  async rotateKey(
    applicationId: string,
    keyId: string,
    input: {
      prefix: string;
      secretHash: string;
      scopes: string[];
      name: string;
      environment: KeyEnvironment;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.apiKey.findFirstOrThrow({ where: { id: keyId, applicationId } });
      const replacement = await tx.apiKey.create({ data: { applicationId, ...input } });
      await tx.apiKey.update({
        where: { id: old.id },
        data: { revokedAt: new Date(), rotatedAt: new Date(), replacedByKeyId: replacement.id },
      });
      return replacement;
    });
  }
  async findKey(secretHash: string) {
    return this.prisma.apiKey
      .findUnique({
        where: { secretHash },
        include: { application: { select: { dailyQuota: true, status: true } } },
      })
      .then(
        (key) =>
          key && {
            id: key.id,
            applicationId: key.applicationId,
            environment: key.environment,
            scopes: key.scopes,
            revokedAt: key.revokedAt,
            status: key.application.status,
            dailyQuota: key.application.dailyQuota,
          },
      );
  }
  async consumeQuota(input: {
    applicationId: string;
    keyId: string;
    endpointGroup: string;
    statusClass: string;
    day: Date;
    quota: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const total = await tx.apiUsageDaily.aggregate({
        where: { applicationId: input.applicationId, day: input.day },
        _sum: { requestCount: true },
      });
      const used = total._sum.requestCount ?? 0;
      if (used >= input.quota) return { allowed: false, used };
      await tx.apiUsageDaily.upsert({
        where: {
          applicationId_keyId_day_endpointGroup_statusClass: {
            applicationId: input.applicationId,
            keyId: input.keyId,
            day: input.day,
            endpointGroup: input.endpointGroup,
            statusClass: input.statusClass,
          },
        },
        create: {
          applicationId: input.applicationId,
          keyId: input.keyId,
          day: input.day,
          endpointGroup: input.endpointGroup,
          statusClass: input.statusClass,
          requestCount: 1,
        },
        update: { requestCount: { increment: 1 } },
      });
      await tx.apiKey.update({ where: { id: input.keyId }, data: { lastUsedAt: new Date() } });
      return { allowed: true, used: used + 1 };
    });
  }
  async usage(applicationId: string, from: Date, to: Date) {
    return this.prisma.apiUsageDaily.findMany({
      where: { applicationId, day: { gte: from, lte: to } },
      orderBy: { day: 'desc' },
    });
  }
  async createInvitation(
    applicationId: string,
    walletAddress: string,
    role: DeveloperRole,
    tokenHash: string,
    expiresAt: Date,
  ) {
    return this.prisma.applicationInvitation.create({
      data: { applicationId, walletAddress, role, tokenHash, expiresAt },
    });
  }
  async acceptInvitation(tokenHash: string, walletId: string, walletAddress: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.applicationInvitation.findUnique({ where: { tokenHash } });
      if (
        !invite ||
        invite.revokedAt ||
        invite.acceptedAt ||
        invite.expiresAt <= now ||
        invite.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
      )
        return null;
      await tx.applicationInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: now },
      });
      return tx.applicationMember.upsert({
        where: { applicationId_walletId: { applicationId: invite.applicationId, walletId } },
        create: { applicationId: invite.applicationId, walletId, role: invite.role },
        update: { role: invite.role, acceptedAt: now },
      });
    });
  }
}
