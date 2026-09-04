import type { ZodType } from 'zod';
import { formatValidationError } from '@nft-marketplace/domain';
export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  headers?: () => Record<string, string>;
  timeoutMs?: number;
}
export function createApiClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  headers = () => ({}),
  timeoutMs = 15000,
}: ApiClientOptions) {
  if (!baseUrl || typeof fetchImpl !== 'function')
    throw new TypeError('baseUrl and fetchImpl are required');
  const request = async <T>(
    path: string,
    init: RequestInit = {},
    schema?: ZodType<T>,
  ): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(new URL(path, baseUrl), {
        ...init,
        headers: { 'content-type': 'application/json', ...headers(), ...(init.headers ?? {}) },
        signal: init.signal ?? controller.signal,
      });
      const payload: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const error = new Error(
          (payload as { message?: string } | undefined)?.message ??
            `Request failed with ${response.status}`,
        ) as Error & { code?: string; details?: unknown };
        error.code = (payload as { code?: string } | undefined)?.code ?? 'API_REQUEST_FAILED';
        error.details = payload;
        throw error;
      }
      if (!schema) return payload as T;
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        const error = new Error('Response validation failed') as Error &
          ReturnType<typeof formatValidationError>;
        Object.assign(error, formatValidationError(parsed.error));
        throw error;
      }
      return parsed.data;
    } finally {
      clearTimeout(timer);
    }
  };
  return Object.freeze({
    request,
    get: <T>(path: string, schema?: ZodType<T>) => request(path, { method: 'GET' }, schema),
    post: <T>(path: string, body: unknown, schema?: ZodType<T>) =>
      request(path, { method: 'POST', body: JSON.stringify(body) }, schema),
    graphql: <T>(query: string, variables: unknown, schema?: ZodType<T>) =>
      request('/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) }, schema),
  });
}
