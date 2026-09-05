import { describe, expect, it } from 'vitest';
import { walletLabel } from './format';
describe('web formatting', () => {
  it('shortens wallet addresses', () =>
    expect(walletLabel('0x1234567890abcdef')).toBe('0x1234...cdef'));
  it('handles disconnected wallets', () => expect(walletLabel()).toBe('Connect wallet'));
});
