export declare const ErrorCode: Readonly<Record<string, string> & {
  VALIDATION: string;
  AUTHENTICATION: string;
  FORBIDDEN: string;
  NOT_FOUND: string;
  CONFLICT: string;
  RATE_LIMITED: string;
  DEPENDENCY_UNAVAILABLE: string;
  INTERNAL: string;
  SIWE_INVALID_DOMAIN: string;
  SIWE_INVALID_CHAIN: string;
  SIWE_INVALID_NONCE: string;
  SIWE_INVALID_SIGNATURE: string;
  SESSION_EXPIRED: string;
  REFRESH_REUSE: string;
}>;
export declare class AppError extends Error {
  code: string;
  details?: unknown;
  retryable: boolean;
  constructor(code: string, message: string, options?: { cause?: unknown; details?: unknown; retryable?: boolean });
  toJSON(): { code: string; message: string; details?: unknown; retryable: boolean };
}
