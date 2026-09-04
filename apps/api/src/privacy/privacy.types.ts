export const PROFILE_FIELDS = ['displayName', 'email', 'avatar', 'bio'] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];
export type ProfileVisibility = 'PRIVATE' | 'APPLICATION_CONSENTED' | 'PUBLIC';
export interface PrivacyRepository {
  getByAddress(address: string): Promise<any | null>;
  getById(id: string): Promise<any | null>;
  updatePrivate(id: string, values: Record<string, string | null>): Promise<any>;
  settings(walletId: string): Promise<any[]>;
  setSettings(walletId: string, values: Array<{ field: ProfileField; visibility: ProfileVisibility }>): Promise<any[]>;
  consents(walletId: string): Promise<any[]>;
  grant(walletId: string, applicationId: string, fields: ProfileField[], purpose: string, actorWalletId: string, requestId?: string): Promise<any[]>;
  revoke(walletId: string, consentId: string, actorWalletId: string, requestId?: string): Promise<void>;
  applicationProfile(walletId: string, applicationId: string, fields: ProfileField[], purpose: string): Promise<any | null>;
  erase(walletId: string, actorWalletId: string, requestId?: string): Promise<void>;
}
