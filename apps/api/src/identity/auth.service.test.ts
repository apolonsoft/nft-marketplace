import { describe, expect, it } from 'vitest';
import { ErrorCode } from '@nft-marketplace/config/errors';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import type { AuthRepository } from './auth.types';
import type { ApiConfig } from '../config/config.service';

const config = {
  nodeEnv: 'test',
  auth: {
    allowedDomains: ['localhost:3000'],
    allowedChainIds: [31337],
    statement: 'Sign in to NFT Marketplace.',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 2592000,
    nonceTtlSeconds: 600,
    issuer: 'issuer',
    audience: 'audience',
    refreshCookieName: 'refresh',
    secureCookies: false,
  },
} as ApiConfig;

const address = '0x0000000000000000000000000000000000000001';
const repository = (): AuthRepository => ({
  createNonce: async () => undefined,
  consumeNonceAndCreateSession: async () => null,
  rotateRefreshToken: async () => ({ status: 'reuse' }),
  getActiveSession: async () => null,
  revokeFamily: async () => undefined,
  getWallet: async () => null,
});

describe('AuthService', () => {
  it('rejects invalid domain and chain before nonce issuance', async () => {
    const service = new AuthService(
      config,
      repository(),
      () => new Date(),
      new TokenService(config),
    );
    await expect(
      service.issueNonce({ address, domain: 'evil.example', chainId: 31337 }),
    ).rejects.toMatchObject({ code: ErrorCode.SIWE_INVALID_DOMAIN });
    await expect(
      service.issueNonce({ address, domain: 'localhost:3000', chainId: 1 }),
    ).rejects.toMatchObject({ code: ErrorCode.SIWE_INVALID_CHAIN });
  });

  it('rejects malformed signed messages', async () => {
    const service = new AuthService(
      config,
      repository(),
      () => new Date(),
      new TokenService(config),
    );
    await expect(service.verify({ message: 'not-siwe', signature: '0x' })).rejects.toMatchObject({
      code: ErrorCode.SIWE_INVALID_SIGNATURE,
    });
  });

  it('surfaces refresh-token family reuse', async () => {
    const service = new AuthService(
      config,
      repository(),
      () => new Date(),
      new TokenService(config),
    );
    await expect(service.refresh('reused-token')).rejects.toMatchObject({
      code: ErrorCode.REFRESH_REUSE,
    });
  });
});
