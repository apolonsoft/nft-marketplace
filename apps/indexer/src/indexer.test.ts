import { describe, expect, it } from 'vitest';
import { networkManifests } from '@nft-marketplace/contracts';
import { balanceId, eventId } from '@nft-marketplace/database';

describe('indexer configuration', () => {
  it('contains both supported network manifests', () => {
    expect(networkManifests.anvil.chainId).toBe(31337);
    expect(networkManifests['base-sepolia'].chainId).toBe(84532);
  });

  it('uses deterministic event identifiers', () => {
    const id = eventId(31337, `0x${'ab'.repeat(32)}`, 4);
    expect(id).toBe(`31337:0x${'ab'.repeat(32)}:4`);
  });

  it('normalizes balance identity across address casing', () => {
    expect(balanceId('0xABC', 7n, '0xDEF')).toBe('0xabc:7:0xdef');
  });
});
