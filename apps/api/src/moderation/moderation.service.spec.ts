import { describe, expect, it, vi } from 'vitest';
import { ModerationService } from './moderation.service';

const principal = {
  walletId: 'wallet-1',
  address: '0x0000000000000000000000000000000000000001',
  sessionFamilyId: 'family',
} as any;
describe('ModerationService', () => {
  it('validates and creates reports', async () => {
    const repo = { createReport: vi.fn(async () => ({ id: 'r1' })) } as any;
    const service = new ModerationService(repo);
    await expect(
      service.report(principal, {
        targetType: 'NFT',
        targetId: 'n1',
        category: 'SPAM',
        description: 'spam',
        evidenceUrl: 'https://example.com/evidence',
      }),
    ).resolves.toEqual({ id: 'r1' });
    expect(repo.createReport).toHaveBeenCalledWith(
      'wallet-1',
      expect.objectContaining({ targetId: 'n1' }),
    );
  });
  it('requires reasons for moderation actions', async () => {
    const service = new ModerationService({} as any);
    await expect(service.moderate(principal, 'LISTING', 'l1', 'HIDDEN', '')).rejects.toThrow(
      'reason',
    );
  });
  it('rejects invalid evidence URLs', async () => {
    const service = new ModerationService({} as any);
    await expect(
      service.report(principal, {
        targetType: 'PROFILE',
        targetId: 'p1',
        category: 'OTHER',
        description: 'x',
        evidenceUrl: 'javascript:bad',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
