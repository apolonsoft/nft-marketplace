import { createHmac } from 'node:crypto';
export type DeliveryEvent = { id: string; type: string; payload: unknown };
export type DeliverySubscription = { id: string; endpointUrl: string; secret: string };
export const webhookHeaders = (
  event: DeliveryEvent,
  subscription: DeliverySubscription,
  rawBody: string,
  timestamp = Math.floor(Date.now() / 1000),
) => ({
  'content-type': 'application/json',
  'x-webhook-event-id': event.id,
  'x-webhook-delivery-id': `${subscription.id}:${event.id}`,
  'x-webhook-event-type': event.type,
  'x-webhook-timestamp': String(timestamp),
  'x-webhook-signature': `t=${timestamp},v1=${createHmac('sha256', subscription.secret).update(`${timestamp}.${rawBody}`).digest('hex')}`,
});
export const retryableStatus = (status?: number) =>
  status === undefined || status === 408 || status === 429 || status >= 500;
export const backoffMs = (attempt: number, base = 1000, max = 3600000) =>
  Math.min(max, base * 2 ** Math.max(0, attempt - 1));
export async function deliver(
  event: DeliveryEvent,
  subscription: DeliverySubscription,
  fetcher: typeof fetch = fetch,
) {
  const rawBody = JSON.stringify({ id: event.id, type: event.type, payload: event.payload });
  const response = await fetcher(subscription.endpointUrl, {
    method: 'POST',
    headers: webhookHeaders(event, subscription, rawBody),
    body: rawBody,
    signal: AbortSignal.timeout(10000),
  });
  return {
    ok: response.ok,
    status: response.status,
    retryable: !response.ok && retryableStatus(response.status),
  };
}
