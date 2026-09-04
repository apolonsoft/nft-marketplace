import { describe, expect, it } from 'vitest';
import { backoffMs, retryableStatus, webhookHeaders } from './webhook-delivery';
describe('webhook delivery', () => {
  it('creates identifiable signed headers', () => {
    const h = webhookHeaders(
      { id: 'event-1', type: 'PURCHASED', payload: { x: 1 } },
      { id: 'sub-1', endpointUrl: 'https://example.com', secret: 'secret' },
      JSON.stringify({ id: 'event-1', type: 'PURCHASED', payload: { x: 1 } }),
      100,
    );
    expect(h['x-webhook-event-id']).toBe('event-1');
    expect(h['x-webhook-delivery-id']).toBe('sub-1:event-1');
    expect(h['x-webhook-signature']).toMatch(/^t=100,v1=/);
  });
  it('classifies retries and backoff', () => {
    expect(retryableStatus(500)).toBe(true);
    expect(retryableStatus(400)).toBe(false);
    expect(backoffMs(3)).toBe(4000);
  });
});
