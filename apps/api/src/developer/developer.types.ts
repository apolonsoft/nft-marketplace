export const DEVELOPER_SCOPES = ['marketplace:read', 'marketplace:write', 'webhooks:manage'] as const;
export type DeveloperScope = typeof DEVELOPER_SCOPES[number];
export type DeveloperRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type KeyEnvironment = 'TEST' | 'LIVE';
export interface DeveloperPrincipal { keyId: string; applicationId: string; environment: KeyEnvironment; scopes: string[]; }
export interface DeveloperRepository {
  createApplication(ownerWalletId: string, input: { name: string; slug: string; description?: string; dailyQuota?: number }): Promise<unknown>;
  listApplications(walletId: string): Promise<unknown[]>;
  getApplicationAccess(applicationId: string, walletId: string, roles?: DeveloperRole[]): Promise<unknown | null>;
  updateApplication(applicationId: string, input: { name?: string; description?: string; dailyQuota?: number }): Promise<unknown>;
  archiveApplication(applicationId: string): Promise<void>;
  createKey(applicationId: string, input: { environment: KeyEnvironment; name: string; prefix: string; secretHash: string; scopes: string[] }): Promise<{ id: string; createdAt: Date }>;
  listKeys(applicationId: string): Promise<unknown[]>;
  revokeKey(applicationId: string, keyId: string): Promise<void>;
  rotateKey(applicationId: string, keyId: string, input: { prefix: string; secretHash: string; scopes: string[]; name: string; environment: KeyEnvironment }): Promise<{ id: string; createdAt: Date }>;
  findKey(secretHash: string): Promise<{ id: string; applicationId: string; environment: KeyEnvironment; scopes: string[]; revokedAt: Date | null; status: string; dailyQuota: number } | null>;
  consumeQuota(input: { applicationId: string; keyId: string; endpointGroup: string; statusClass: string; day: Date; quota: number }): Promise<{ allowed: boolean; used: number }>;
  usage(applicationId: string, from: Date, to: Date): Promise<unknown[]>;
  createInvitation(applicationId: string, walletAddress: string, role: DeveloperRole, tokenHash: string, expiresAt: Date): Promise<unknown>;
  acceptInvitation(tokenHash: string, walletId: string, walletAddress: string, now: Date): Promise<unknown>;
}
