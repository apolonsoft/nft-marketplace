import { generateKeyPairSync, randomBytes, randomUUID, createHash } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { API_CONFIG } from '../common/tokens';
import type { ApiConfig } from '../config/config.service';
import type { AccessPrincipal, RefreshTokenMaterial } from './auth.types';

interface AccessKeys {
  privateKey: CryptoKey | KeyObject;
  publicKey: CryptoKey | KeyObject;
}

@Injectable()
export class TokenService {
  private readonly keys: Promise<AccessKeys>;

  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {
    this.keys = this.loadKeys();
  }

  async issueAccessToken(principal: AccessPrincipal, now: Date) {
    const { privateKey } = await this.keys;
    return new SignJWT({
      address: principal.address,
      sid: principal.sessionFamilyId,
      typ: 'access',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setSubject(principal.walletId)
      .setIssuer(this.config.auth.issuer)
      .setAudience(this.config.auth.audience)
      .setJti(randomUUID())
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(now.getTime() / 1000) + this.config.auth.accessTokenTtlSeconds)
      .sign(privateKey);
  }

  async verifyAccessToken(token: string): Promise<AccessPrincipal> {
    try {
      const { publicKey } = await this.keys;
      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.auth.issuer,
        audience: this.config.auth.audience,
      });
      if (
        payload.typ !== 'access' ||
        typeof payload.sub !== 'string' ||
        typeof payload.address !== 'string' ||
        typeof payload.sid !== 'string'
      )
        throw new Error('Invalid access claims');
      return { walletId: payload.sub, address: payload.address, sessionFamilyId: payload.sid };
    } catch (cause) {
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Session is expired or invalid', { cause });
    }
  }

  issueRefreshToken(now: Date): { raw: string; material: RefreshTokenMaterial } {
    const id = randomUUID();
    const raw = `${id}.${randomBytes(32).toString('base64url')}`;
    return {
      raw,
      material: {
        id,
        hash: this.hashRefreshToken(raw),
        expiresAt: new Date(now.getTime() + this.config.auth.refreshTokenTtlSeconds * 1000),
      },
    };
  }

  hashRefreshToken(token: string) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private async loadKeys(): Promise<AccessKeys> {
    if (this.config.auth.privateKey && this.config.auth.publicKey) {
      return {
        privateKey: await importPKCS8(this.config.auth.privateKey, 'RS256'),
        publicKey: await importSPKI(this.config.auth.publicKey, 'RS256'),
      };
    }
    const generated = generateKeyPairSync('rsa', { modulusLength: 2048 });
    return { privateKey: generated.privateKey, publicKey: generated.publicKey };
  }
}
