import { Injectable } from '@nestjs/common';

export interface ApiConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  indexerHealthUrl: string;
  indexerMaxStalenessMs: number;
  dependencyTimeoutMs: number;
  docsEnabled: boolean;
  logLevel: string;
  auth: {
    allowedDomains: string[];
    allowedChainIds: number[];
    statement: string;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    nonceTtlSeconds: number;
    issuer: string;
    audience: string;
    privateKey?: string;
    publicKey?: string;
    refreshCookieName: string;
    secureCookies: boolean;
  };
  privacy: { encryptionKey: string; keyVersion: string };
}
const positiveInteger = (value: string | undefined, fallback: number, name: string) => { const parsed = Number(value ?? fallback); if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`); return parsed; };
const booleanValue = (value: string | undefined, fallback: boolean) => value === undefined ? fallback : value === 'true';
const list = (value: string | undefined, fallback: string) => (value ?? fallback).split(',').map((item) => item.trim()).filter(Boolean);
const chainIds = (value: string | undefined) => list(value, '31337').map((item) => positiveInteger(item, 31337, 'SIWE_ALLOWED_CHAIN_IDS'));
const key = (value: string | undefined) => value?.replaceAll('\\n', '\n');
@Injectable()
export class ConfigService {
  load(source: NodeJS.ProcessEnv = process.env): ApiConfig {
    const nodeEnv = source.NODE_ENV ?? 'development';
    const privateKey = key(source.AUTH_ACCESS_PRIVATE_KEY);
    const publicKey = key(source.AUTH_ACCESS_PUBLIC_KEY);
    const privacyKey = source.PRIVACY_ENCRYPTION_KEY ?? (nodeEnv === 'production' ? undefined : 'development-only-key-change-me');
    if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be development, test, or production');
    if (nodeEnv === 'production' && (!source.DATABASE_URL || !source.INDEXER_HEALTH_URL)) throw new Error('DATABASE_URL and INDEXER_HEALTH_URL are required in production');
    if (nodeEnv === 'production' && (!source.AUTH_ACCESS_PRIVATE_KEY || !source.AUTH_ACCESS_PUBLIC_KEY)) throw new Error('AUTH_ACCESS_PRIVATE_KEY and AUTH_ACCESS_PUBLIC_KEY are required in production');
    if (!privacyKey || privacyKey.length < 16) throw new Error('PRIVACY_ENCRYPTION_KEY must be at least 16 characters');
    return {
      nodeEnv: nodeEnv as ApiConfig['nodeEnv'],
      port: positiveInteger(source.PORT, 3001, 'PORT'),
      databaseUrl: source.DATABASE_URL ?? 'postgresql://localhost:5432/nft_marketplace',
      indexerHealthUrl: source.INDEXER_HEALTH_URL ?? 'http://127.0.0.1:42069/health',
      indexerMaxStalenessMs: positiveInteger(source.INDEXER_MAX_STALENESS_MS, 60_000, 'INDEXER_MAX_STALENESS_MS'),
      dependencyTimeoutMs: positiveInteger(source.DEPENDENCY_TIMEOUT_MS, 2_000, 'DEPENDENCY_TIMEOUT_MS'),
      docsEnabled: booleanValue(source.API_DOCS_ENABLED, nodeEnv !== 'production'),
      logLevel: source.LOG_LEVEL ?? 'info',
      auth: {
        allowedDomains: list(source.SIWE_ALLOWED_DOMAINS, 'localhost:3000'),
        allowedChainIds: chainIds(source.SIWE_ALLOWED_CHAIN_IDS),
        statement: source.SIWE_STATEMENT ?? 'Sign in to NFT Marketplace.',
        accessTokenTtlSeconds: positiveInteger(source.AUTH_ACCESS_TOKEN_TTL_SECONDS, 900, 'AUTH_ACCESS_TOKEN_TTL_SECONDS'),
        refreshTokenTtlSeconds: positiveInteger(source.AUTH_REFRESH_TOKEN_TTL_SECONDS, 2_592_000, 'AUTH_REFRESH_TOKEN_TTL_SECONDS'),
        nonceTtlSeconds: positiveInteger(source.SIWE_NONCE_TTL_SECONDS, 600, 'SIWE_NONCE_TTL_SECONDS'),
        issuer: source.AUTH_TOKEN_ISSUER ?? 'nft-marketplace-api',
        audience: source.AUTH_TOKEN_AUDIENCE ?? 'nft-marketplace',
        ...(privateKey ? { privateKey } : {}),
        ...(publicKey ? { publicKey } : {}),
        refreshCookieName: source.AUTH_REFRESH_COOKIE_NAME ?? 'nft_refresh',
        secureCookies: booleanValue(source.AUTH_SECURE_COOKIES, nodeEnv === 'production'),
      },
      privacy: { encryptionKey: privacyKey, keyVersion: source.PRIVACY_KEY_VERSION ?? 'v1' },
    };
  }
}
export const loadApiConfig = (source: NodeJS.ProcessEnv = process.env) => new ConfigService().load(source);
