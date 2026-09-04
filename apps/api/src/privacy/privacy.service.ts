import { Inject, Injectable } from '@nestjs/common';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { currentRequestId } from '../common/request-context';
import { PrivacyCrypto } from './privacy.crypto';
import { DEVELOPER_REPOSITORY, PRIVACY_REPOSITORY } from '../common/developer-tokens';
import type { DeveloperRepository } from '../developer/developer.types';
import type { PrivacyRepository, ProfileField, ProfileVisibility } from './privacy.types';
import { PROFILE_FIELDS } from './privacy.types';

@Injectable()
export class PrivacyService {
  constructor(
    @Inject(PRIVACY_REPOSITORY) private readonly repo: PrivacyRepository,
    private readonly crypto: PrivacyCrypto,
    @Inject(DEVELOPER_REPOSITORY) private readonly developer: DeveloperRepository,
  ) {}
  async publicProfile(address: string) {
    const profile = await this.repo.getByAddress(address);
    if (!profile) throw new AppError(ErrorCode.NOT_FOUND, 'Profile not found');
    return { address: profile.address, createdAt: profile.createdAt };
  }
  async ownProfile(walletId: string) {
    const profile = await this.repo.getById(walletId);
    if (!profile) throw new AppError(ErrorCode.NOT_FOUND, 'Profile not found');
    return this.decrypt(profile);
  }
  async update(walletId: string, input: Partial<Record<ProfileField, string | null>>) {
    const values: Record<string, string | null> = {};
    for (const field of PROFILE_FIELDS)
      if (field in input) values[`${field}Ciphertext`] = this.crypto.encrypt(input[field] ?? null);
    const updated = await this.repo.updatePrivate(walletId, values);
    return this.decrypt(updated);
  }
  settings(walletId: string) {
    return this.repo.settings(walletId);
  }
  setSettings(
    walletId: string,
    values: Array<{ field: ProfileField; visibility: ProfileVisibility }>,
  ) {
    return this.repo.setSettings(walletId, values);
  }
  consents(walletId: string) {
    return this.repo.consents(walletId);
  }
  async grant(
    walletId: string,
    applicationId: string,
    fields: ProfileField[],
    purpose: string,
    actorWalletId: string,
  ) {
    await this.developer.getApplicationAccess?.(applicationId, actorWalletId);
    return this.repo.grant(
      walletId,
      applicationId,
      fields,
      purpose,
      actorWalletId,
      currentRequestId(),
    );
  }
  revoke(walletId: string, consentId: string, actorWalletId: string) {
    return this.repo.revoke(walletId, consentId, actorWalletId, currentRequestId());
  }
  async applicationProfile(
    address: string,
    applicationId: string,
    fields: ProfileField[],
    purpose: string,
  ) {
    const profile = await this.repo.getByAddress(address);
    if (!profile) throw new AppError(ErrorCode.NOT_FOUND, 'Profile not found');
    const result = await this.repo.applicationProfile(profile.id, applicationId, fields, purpose);
    if (!result) throw new AppError(ErrorCode.NOT_FOUND, 'Profile not found');
    for (const field of fields)
      if (typeof result[field] === 'string')
        result[field] = this.crypto.decrypt(result[field] as string);
    return result;
  }
  erase(walletId: string, actorWalletId: string) {
    return this.repo.erase(walletId, actorWalletId, currentRequestId());
  }
  private decrypt(profile: any) {
    const result: Record<string, unknown> = {
      address: profile.address,
      createdAt: profile.createdAt,
    };
    for (const field of PROFILE_FIELDS)
      result[field] = this.crypto.decrypt(profile[`${field}Ciphertext`] ?? null);
    return result;
  }
}
