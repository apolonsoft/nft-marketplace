import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookSignature } from './webhook.types';
export const signWebhook = (
  secret: string,
  rawBody: string,
  timestamp = Math.floor(Date.now() / 1000),
): WebhookSignature => {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return { timestamp, signature, header: `t=${timestamp},v1=${signature}` };
};
export const verifyWebhookSignature = (
  secret: string,
  rawBody: string,
  header: string,
  toleranceSeconds = 300,
  now = Math.floor(Date.now() / 1000),
) => {
  const match = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(header);
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > toleranceSeconds) return false;
  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex'),
  );
  const provided = Buffer.from(match[2]!);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};
