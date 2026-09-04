import { Injectable } from '@nestjs/common';
import { PrismaService } from '../identity/prisma.service';
import type { PrivacyRepository, ProfileField, ProfileVisibility } from './privacy.types';

const column: Record<ProfileField, string> = {
  displayName: 'displayNameCiphertext',
  email: 'emailCiphertext',
  avatar: 'avatarCiphertext',
  bio: 'bioCiphertext',
};
@Injectable()
export class PrismaPrivacyRepository implements PrivacyRepository {
  constructor(private readonly prisma: PrismaService) {}
  getByAddress(address: string) {
    return this.prisma.walletProfile.findUnique({
      where: { address },
      include: { privacySettings: true },
    });
  }
  getById(id: string) {
    return this.prisma.walletProfile.findUnique({
      where: { id },
      include: { privacySettings: true },
    });
  }
  updatePrivate(id: string, values: Record<string, string | null>) {
    return this.prisma.walletProfile.update({ where: { id }, data: values });
  }
  settings(walletId: string) {
    return this.prisma.profilePrivacySetting.findMany({
      where: { walletId },
      orderBy: { field: 'asc' },
    });
  }
  async setSettings(
    walletId: string,
    values: Array<{ field: ProfileField; visibility: ProfileVisibility }>,
  ) {
    return this.prisma.$transaction(
      values.map((item) =>
        this.prisma.profilePrivacySetting.upsert({
          where: { walletId_field: { walletId, field: item.field.toUpperCase() as never } },
          create: {
            walletId,
            field: item.field.toUpperCase() as never,
            visibility: item.visibility,
          },
          update: { visibility: item.visibility },
        }),
      ),
    );
  }
  consents(walletId: string) {
    return this.prisma.consentGrant.findMany({
      where: { walletId },
      orderBy: { grantedAt: 'desc' },
    });
  }
  async grant(
    walletId: string,
    applicationId: string,
    fields: ProfileField[],
    purpose: string,
    actorWalletId: string,
    requestId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const field of fields) {
        const grant = await tx.consentGrant.upsert({
          where: {
            walletId_applicationId_field_purpose: {
              walletId,
              applicationId,
              field: field.toUpperCase() as never,
              purpose,
            },
          },
          create: {
            walletId,
            applicationId,
            field: field.toUpperCase() as never,
            purpose,
            state: 'GRANTED',
          },
          update: { state: 'GRANTED', revokedAt: null, grantedAt: new Date() },
        });
        await tx.privacyAudit.create({
          data: {
            walletId,
            applicationId,
            actorWalletId,
            action: 'CONSENT_GRANTED',
            field,
            purpose,
            result: 'GRANTED',
            requestId: requestId ?? null,
          },
        });
        results.push(grant);
      }
      return results;
    });
  }
  async revoke(walletId: string, consentId: string, actorWalletId: string, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const grant = await tx.consentGrant.findFirst({ where: { id: consentId, walletId } });
      if (!grant) return;
      await tx.consentGrant.update({
        where: { id: grant.id },
        data: { state: 'REVOKED', revokedAt: new Date() },
      });
      await tx.privacyAudit.create({
        data: {
          walletId,
          applicationId: grant.applicationId,
          actorWalletId,
          action: 'CONSENT_REVOKED',
          field: grant.field,
          purpose: grant.purpose,
          result: 'REVOKED',
          requestId: requestId ?? null,
        },
      });
    });
  }
  async applicationProfile(
    walletId: string,
    applicationId: string,
    fields: ProfileField[],
    purpose: string,
  ) {
    const profile: any = await this.getById(walletId);
    if (!profile) return null;
    const grants = await this.prisma.consentGrant.findMany({
      where: {
        walletId,
        applicationId,
        purpose,
        state: 'GRANTED',
        field: { in: fields.map((field) => field.toUpperCase() as never) },
      },
    });
    const allowed = new Set(grants.map((grant) => String(grant.field).toLowerCase()));
    const result: Record<string, unknown> = { address: profile.address };
    for (const field of fields) if (allowed.has(field)) result[field] = profile[column[field]];
    return result;
  }
  async erase(walletId: string, actorWalletId: string, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.walletProfile.update({
        where: { id: walletId },
        data: {
          displayNameCiphertext: null,
          emailCiphertext: null,
          avatarCiphertext: null,
          bioCiphertext: null,
        },
      });
      await tx.consentGrant.updateMany({
        where: { walletId, state: 'GRANTED' },
        data: { state: 'REVOKED', revokedAt: new Date() },
      });
      await tx.privacyAudit.create({
        data: {
          walletId,
          actorWalletId,
          action: 'PRIVATE_DATA_ERASED',
          result: 'COMPLETED',
          requestId: requestId ?? null,
        },
      });
    });
  }
}
