import { z } from 'zod';
import { formatValidationError } from '@nft-marketplace/domain';

export function createApiClient({ baseUrl, fetchImpl = globalThis.fetch, headers = () => ({}), timeoutMs = 15000 } = {}) {
  if (!baseUrl || typeof fetchImpl !== 'function') throw new TypeError('baseUrl and fetchImpl are required');
  const request = async (path, init = {}, schema) => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(new URL(path, baseUrl), { ...init, headers: { 'content-type': 'application/json', ...headers(), ...(init.headers ?? {}) }, signal: init.signal ?? controller.signal });
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) { const error = new Error(payload?.message ?? `Request failed with ${response.status}`); error.code = payload?.code ?? 'API_REQUEST_FAILED'; error.details = payload; throw error; }
      const parsed = schema ? schema.safeParse(payload) : { success: true, data: payload };
      if (!parsed.success) { const error = new Error('Response validation failed'); Object.assign(error, formatValidationError(parsed.error)); throw error; }
      return parsed.data;
    } finally { clearTimeout(timer); }
  };
  return Object.freeze({ request, get: (path, schema) => request(path, { method: 'GET' }, schema), post: (path, body, schema) => request(path, { method: 'POST', body: JSON.stringify(body) }, schema), graphql: (query, variables, schema) => request('/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) }, schema) });
}
