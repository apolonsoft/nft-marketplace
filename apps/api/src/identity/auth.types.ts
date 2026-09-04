export interface WalletProfileRecord {
  id: string;
  address: string;
  createdAt: Date;
}

export interface AuthSessionRecord {
  familyId: string;
  wallet: WalletProfileRecord;
  expiresAt: Date;
}

export interface RefreshTokenMaterial {
  id: string;
  hash: string;
  expiresAt: Date;
}

export type RefreshRotationResult =
  | { status: 'rotated'; session: AuthSessionRecord }
  | { status: 'reuse' }
  | { status: 'expired' }
  | { status: 'invalid' };

export interface AuthRepository {
  createNonce(input: { nonce: string; address: string; domain: string; chainId: number; expiresAt: Date }): Promise<void>;
  consumeNonceAndCreateSession(input: {
    nonce: string;
    address: string;
    domain: string;
    chainId: number;
    now: Date;
    sessionExpiresAt: Date;
    refreshToken: RefreshTokenMaterial;
  }): Promise<AuthSessionRecord | null>;
  rotateRefreshToken(input: { currentHash: string; replacement: RefreshTokenMaterial; now: Date }): Promise<RefreshRotationResult>;
  getActiveSession(familyId: string, walletId: string, now: Date): Promise<AuthSessionRecord | null>;
  revokeFamily(familyId: string, now: Date, reason: string): Promise<void>;
  getWallet(walletId: string): Promise<WalletProfileRecord | null>;
}

export interface AccessPrincipal {
  walletId: string;
  address: string;
  sessionFamilyId: string;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AccessPrincipal;
}
