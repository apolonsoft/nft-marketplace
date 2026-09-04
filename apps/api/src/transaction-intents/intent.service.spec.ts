import { describe, expect, it, vi } from 'vitest';
import { TransactionIntentService } from './intent.service';

const principal = {
  walletId: 'wallet-1',
  address: '0x0000000000000000000000000000000000000001',
  sessionFamilyId: 'family',
} as any;
const config = { auth: { allowedChainIds: [31337] } } as any;
const repo = {
  create: vi.fn(async (_w: string, _i: any, _h: string, r: any) => ({ ...r, id: 'intent-1' })),
  find: vi.fn(),
  updateStatus: vi.fn(),
  consume: vi.fn(),
} as any;

describe('TransactionIntentService', () => {
  it('encodes ERC721 mint calldata', async () => {
    const service = new TransactionIntentService(repo, config);
    const result = await service.create(principal, {
      operation: 'MINT',
      chainId: 31337,
      idempotencyKey: 'a',
      to: '0x0000000000000000000000000000000000000002',
      standard: 721,
      tokenId: '7',
      tokenURI: 'ipfs://token',
    } as any);
    expect(result.data.startsWith('0x')).toBe(true);
    expect(result.value).toBe('0');
  });
  it('uses zero value for ERC20 purchase', async () => {
    const service = new TransactionIntentService(repo, config);
    const result = await service.create(principal, {
      operation: 'PURCHASE',
      chainId: 31337,
      idempotencyKey: 'b',
      to: '0x0000000000000000000000000000000000000002',
      listingId: '1',
      quantity: '1',
      currency: '0x0000000000000000000000000000000000000003',
      totalValue: '10',
    } as any);
    expect(result.value).toBe('0');
  });
  it('rejects unsupported chains', async () => {
    const service = new TransactionIntentService(repo, config);
    await expect(
      service.create(principal, {
        operation: 'WITHDRAW',
        chainId: 1,
        idempotencyKey: 'c',
        to: '0x0000000000000000000000000000000000000002',
        currency: '0x0000000000000000000000000000000000000000',
      } as any),
    ).rejects.toThrow('Unsupported chain');
  });
});
