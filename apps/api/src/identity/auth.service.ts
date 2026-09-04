import { Inject, Injectable } from '@nestjs/common';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from 'viem/siwe';
import { getAddress, isAddress, verifyMessage, type Address, type Hex } from 'viem';
import { API_CONFIG, AUTH_CLOCK, AUTH_REPOSITORY } from '../common/tokens';
import type { ApiConfig } from '../config/config.service';
import type { AccessPrincipal, AuthRepository } from './auth.types';
import { TokenService } from './token.service';

export interface NonceRequest {
  address: string;
  domain: string;
  chainId: number;
}
export interface VerifyRequest {
  message: string;
  signature: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(API_CONFIG) private readonly config: ApiConfig,
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(AUTH_CLOCK) private readonly clock: () => Date,
    private readonly tokens: TokenService,
  ) {}

  async issueNonce(input: NonceRequest) {
    const address = this.normalizeAddress(input.address);
    this.assertDomain(input.domain);
    this.assertChain(input.chainId);
    const now = this.clock();
    const nonce = generateSiweNonce();
    const expiresAt = new Date(now.getTime() + this.config.auth.nonceTtlSeconds * 1000);
    await this.repository.createNonce({
      nonce,
      address,
      domain: input.domain,
      chainId: input.chainId,
      expiresAt,
    });
    return {
      nonce,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      statement: this.config.auth.statement,
    };
  }

  async verify(input: VerifyRequest) {
    const parsed = parseSiweMessage(input.message);
    if (
      !parsed.address ||
      !parsed.domain ||
      !parsed.chainId ||
      !parsed.nonce ||
      !parsed.uri ||
      !parsed.issuedAt ||
      parsed.version !== '1'
    ) {
      throw new AppError(ErrorCode.SIWE_INVALID_SIGNATURE, 'Invalid SIWE message');
    }
    const address = this.normalizeAddress(parsed.address);
    this.assertDomain(parsed.domain);
    this.assertChain(parsed.chainId);
    this.assertMessageUri(parsed.uri, parsed.domain);
    if (parsed.statement !== this.config.auth.statement)
      throw new AppError(ErrorCode.SIWE_INVALID_SIGNATURE, 'Invalid SIWE statement');

    const now = this.clock();
    if (
      !validateSiweMessage({
        address: address as Address,
        domain: parsed.domain,
        nonce: parsed.nonce,
        message: parsed,
        time: now,
      })
    ) {
      throw new AppError(ErrorCode.SIWE_INVALID_SIGNATURE, 'Invalid or expired SIWE message');
    }
    const valid = await verifyMessage({
      address: address as Address,
      message: input.message,
      signature: input.signature as Hex,
    }).catch(() => false);
    if (!valid) throw new AppError(ErrorCode.SIWE_INVALID_SIGNATURE, 'Invalid SIWE signature');

    const refresh = this.tokens.issueRefreshToken(now);
    const session = await this.repository.consumeNonceAndCreateSession({
      nonce: parsed.nonce,
      address,
      domain: parsed.domain,
      chainId: parsed.chainId,
      now,
      sessionExpiresAt: refresh.material.expiresAt,
      refreshToken: refresh.material,
    });
    if (!session)
      throw new AppError(
        ErrorCode.SIWE_INVALID_NONCE,
        'Nonce is invalid, expired, or already used',
      );
    return this.authenticationResult(
      session.wallet.id,
      session.wallet.address,
      session.familyId,
      refresh.raw,
      now,
    );
  }

  async refresh(rawToken: string) {
    if (!rawToken) throw new AppError(ErrorCode.SESSION_EXPIRED, 'Refresh session is missing');
    const now = this.clock();
    const replacement = this.tokens.issueRefreshToken(now);
    const result = await this.repository.rotateRefreshToken({
      currentHash: this.tokens.hashRefreshToken(rawToken),
      replacement: replacement.material,
      now,
    });
    if (result.status === 'reuse')
      throw new AppError(ErrorCode.REFRESH_REUSE, 'Refresh-token reuse detected; session revoked');
    if (result.status !== 'rotated')
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Refresh session is expired or invalid');
    return this.authenticationResult(
      result.session.wallet.id,
      result.session.wallet.address,
      result.session.familyId,
      replacement.raw,
      now,
    );
  }

  async authenticateAccessToken(token: string): Promise<AccessPrincipal> {
    const principal = await this.tokens.verifyAccessToken(token);
    const session = await this.repository.getActiveSession(
      principal.sessionFamilyId,
      principal.walletId,
      this.clock(),
    );
    if (!session || session.wallet.address !== principal.address)
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Session is expired or revoked');
    return principal;
  }

  async revoke(principal: AccessPrincipal) {
    await this.repository.revokeFamily(principal.sessionFamilyId, this.clock(), 'user-revoked');
  }

  async me(principal: AccessPrincipal) {
    const wallet = await this.repository.getWallet(principal.walletId);
    if (!wallet) throw new AppError(ErrorCode.SESSION_EXPIRED, 'Wallet profile no longer exists');
    return { id: wallet.id, address: wallet.address, createdAt: wallet.createdAt.toISOString() };
  }

  private async authenticationResult(
    walletId: string,
    address: string,
    familyId: string,
    refreshToken: string,
    now: Date,
  ) {
    const accessToken = await this.tokens.issueAccessToken(
      { walletId, address, sessionFamilyId: familyId },
      now,
    );
    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: this.config.auth.accessTokenTtlSeconds,
      refreshToken,
      wallet: { id: walletId, address },
    };
  }

  private normalizeAddress(address: string) {
    if (!isAddress(address, { strict: false }))
      throw new AppError(ErrorCode.VALIDATION, 'Invalid wallet address');
    return getAddress(address);
  }

  private assertDomain(domain: string) {
    if (!this.config.auth.allowedDomains.includes(domain))
      throw new AppError(ErrorCode.SIWE_INVALID_DOMAIN, 'SIWE domain is not allowed');
  }

  private assertChain(chainId: number) {
    if (!Number.isInteger(chainId) || !this.config.auth.allowedChainIds.includes(chainId))
      throw new AppError(ErrorCode.SIWE_INVALID_CHAIN, 'SIWE chain is not allowed');
  }

  private assertMessageUri(uri: string, domain: string) {
    try {
      const parsed = new URL(uri);
      const validProtocol =
        this.config.nodeEnv === 'production'
          ? parsed.protocol === 'https:'
          : ['http:', 'https:'].includes(parsed.protocol);
      if (!validProtocol || parsed.host !== domain) throw new Error('URI origin mismatch');
    } catch (cause) {
      throw new AppError(
        ErrorCode.SIWE_INVALID_DOMAIN,
        'SIWE URI does not match the allowed domain',
        { cause },
      );
    }
  }
}
