import { describe, expect, it } from 'vitest';
import { signWebhook, verifyWebhookSignature } from './signature';
describe('webhook signatures', () => {
  it('verifies signed raw bodies within replay window', () => {
    const signed = signWebhook('secret', '{"id":"evt"}', 100);
    expect(verifyWebhookSignature('secret', '{"id":"evt"}', signed.header, 300, 120)).toBe(true);
    expect(verifyWebhookSignature('secret', '{"id":"changed"}', signed.header, 300, 120)).toBe(
      false,
    );
  });
  it('rejects stale signatures', () => {
    const signed = signWebhook('secret', '{}', 100);
    expect(verifyWebhookSignature('secret', '{}', signed.header, 10, 120)).toBe(false);
  });
});
