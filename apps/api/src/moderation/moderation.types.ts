export type ModerationTargetType = 'COLLECTION' | 'NFT' | 'LISTING' | 'PROFILE';
export type ReportCategory = 'SPAM' | 'FRAUD' | 'COPYRIGHT' | 'HARASSMENT' | 'OTHER';
export type ReportStatus = 'OPEN' | 'RESOLVED';
export type ModerationStatus = 'VISIBLE' | 'HIDDEN' | 'RESOLVED';
export interface ReportInput {
  targetType: ModerationTargetType;
  targetId: string;
  category: ReportCategory;
  description: string;
  evidenceUrl?: string;
}
export interface ModerationRepository {
  isAdmin(walletId: string, address: string): Promise<boolean>;
  addAdmin(actorWalletId: string, address: string): Promise<unknown>;
  listAdmins(): Promise<unknown[]>;
  revokeAdmin(actorWalletId: string, walletId: string, reason: string): Promise<unknown>;
  createReport(walletId: string, input: ReportInput): Promise<unknown>;
  listReports(
    walletId: string,
    admin: boolean,
    filters: Record<string, unknown>,
  ): Promise<unknown[]>;
  moderate(
    actorWalletId: string,
    targetType: ModerationTargetType,
    targetId: string,
    status: ModerationStatus,
    reason: string,
  ): Promise<unknown>;
  getModeration(targetType: ModerationTargetType, targetId: string): Promise<unknown | null>;
  audit(filters: Record<string, unknown>): Promise<unknown[]>;
  hiddenIds(targetType: ModerationTargetType | 'profiles', ids: string[]): Promise<string[]>;
}
