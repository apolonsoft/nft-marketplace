import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { AuthRepository, AuthSessionRecord, RefreshRotationResult, WalletProfileRecord } from './auth.types';

const walletRecord = (wallet: { id: string; address: string; createdAt: Date }): WalletProfileRecord => ({
  id: wallet.id,
  address: wallet.address,
  createdAt: wallet.createdAt,
});

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNonce(input: { nonce: string; address: string; domain: string; chainId: number; expiresAt: Date }) {
    await this.prisma.siweNonce.create({ data: input });
  }

  async consumeNonceAndCreateSession(input: {
    nonce: string;
    address: string;
    domain: string;
    chainId: number;
    now: Date;
    sessionExpiresAt: Date;
    refreshToken: { id: string; hash: string; expiresAt: Date };
  }): Promise<AuthSessionRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.siweNonce.updateMany({
        where: {
          nonce: input.nonce,
          address: input.address,
          domain: input.domain,
          chainId: input.chainId,
          consumedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { consumedAt: input.now },
      });
      if (consumed.count !== 1) return null;

      const wallet = await transaction.walletProfile.upsert({
        where: { address: input.address },
        create: { address: input.address },
        update: {},
      });
      const family = await transaction.sessionFamily.create({
        data: {
          walletId: wallet.id,
          expiresAt: input.sessionExpiresAt,
          refreshTokens: {
            create: {
              id: input.refreshToken.id,
              tokenHash: input.refreshToken.hash,
              expiresAt: input.refreshToken.expiresAt,
            },
          },
        },
      });
      return { familyId: family.id, wallet: walletRecord(wallet), expiresAt: family.expiresAt };
    });
  }

  async rotateRefreshToken(input: {
    currentHash: string;
    replacement: { id: string; hash: string; expiresAt: Date };
    now: Date;
  }): Promise<RefreshRotationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.refreshToken.findUnique({
        where: { tokenHash: input.currentHash },
        include: { family: { include: { wallet: true } } },
      });
      if (!current) return { status: 'invalid' } as const;

      const familyExpired = current.family.expiresAt <= input.now;
      const tokenExpired = current.expiresAt <= input.now;
      if (current.family.revokedAt || familyExpired || tokenExpired) return { status: 'expired' } as const;

      if (current.usedAt || current.revokedAt) {
        await this.revokeInTransaction(transaction, current.familyId, input.now, 'refresh-token-reuse');
        return { status: 'reuse' } as const;
      }

      const claimed = await transaction.refreshToken.updateMany({
        where: { id: current.id, usedAt: null, revokedAt: null },
        data: { usedAt: input.now, replacedByTokenId: input.replacement.id },
      });
      if (claimed.count !== 1) {
        await this.revokeInTransaction(transaction, current.familyId, input.now, 'refresh-token-reuse');
        return { status: 'reuse' } as const;
      }

      await transaction.refreshToken.create({
        data: {
          id: input.replacement.id,
          familyId: current.familyId,
          tokenHash: input.replacement.hash,
          expiresAt: input.replacement.expiresAt,
        },
      });
      return {
        status: 'rotated',
        session: {
          familyId: current.family.id,
          expiresAt: current.family.expiresAt,
          wallet: walletRecord(current.family.wallet),
        },
      } as const;
    });
  }

  async getActiveSession(familyId: string, walletId: string, now: Date): Promise<AuthSessionRecord | null> {
    const family = await this.prisma.sessionFamily.findFirst({
      where: { id: familyId, walletId, revokedAt: null, expiresAt: { gt: now } },
      include: { wallet: true },
    });
    return family ? { familyId: family.id, wallet: walletRecord(family.wallet), expiresAt: family.expiresAt } : null;
  }

  async revokeFamily(familyId: string, now: Date, reason: string) {
    await this.prisma.$transaction(async (transaction) => this.revokeInTransaction(transaction, familyId, now, reason));
  }

  async getWallet(walletId: string) {
    const wallet = await this.prisma.walletProfile.findUnique({ where: { id: walletId } });
    return wallet ? walletRecord(wallet) : null;
  }

  private async revokeInTransaction(
    transaction: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    familyId: string,
    now: Date,
    reason: string,
  ) {
    await transaction.sessionFamily.updateMany({
      where: { id: familyId, revokedAt: null },
      data: { revokedAt: now, revokeReason: reason },
    });
    await transaction.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
