import { describe, expect, it } from 'vitest';
import { PrivacyCrypto } from './privacy.crypto';
import type { ApiConfig } from '../config/config.service';

const config = {
  privacy: { encryptionKey: 'a-development-key-that-is-long', keyVersion: 'v1' },
} as ApiConfig;
describe('PrivacyCrypto', () => {
  it('encrypts and decrypts private values without storing plaintext', () => {
    const crypto = new PrivacyCrypto(config);
    const encrypted = crypto.encrypt('ada@example.com');
    expect(encrypted).not.toContain('ada@example.com');
    expect(crypto.decrypt(encrypted)).toBe('ada@example.com');
  });
  it('rejects malformed ciphertext', () =>
    expect(() => new PrivacyCrypto(config).decrypt('bad')).toThrow());
});
