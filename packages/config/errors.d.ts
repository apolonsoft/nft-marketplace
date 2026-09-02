export declare const ErrorCode: Readonly<Record<string, string> & { VALIDATION: string }>;
export declare class AppError extends Error {
  code: string;
  details?: unknown;
  retryable: boolean;
  constructor(code: string, message: string, options?: { cause?: unknown; details?: unknown; retryable?: boolean });
  toJSON(): { code: string; message: string; details?: unknown; retryable: boolean };
}
