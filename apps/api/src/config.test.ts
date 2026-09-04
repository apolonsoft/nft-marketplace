import { describe, expect, it } from 'vitest';
import { loadApiConfig } from './config/config.service';

describe('loadApiConfig', () => {
  it('uses safe development defaults', () => { expect(loadApiConfig({ NODE_ENV: 'development' })).toMatchObject({ port: 3001, docsEnabled: true }); });
  it('requires production dependencies', () => { expect(() => loadApiConfig({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/); });
  it('rejects invalid positive integers', () => { expect(() => loadApiConfig({ PORT: 'zero' })).toThrow(/PORT/); });
});
