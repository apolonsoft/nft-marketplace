export interface StructuredLogger {
  readonly level: string;
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}
export function createLogger(options?: { service?: string; level?: string; sink?: Console }): StructuredLogger;
export function redact<T>(value: T): T;
