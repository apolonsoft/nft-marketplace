import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const storage = new AsyncLocalStorage<{ requestId: string }>();
export const currentRequestId = () => storage.getStore()?.requestId;
export function requestContextMiddleware(request: Request, response: Response, next: NextFunction) {
  const incoming = request.header('x-request-id');
  const requestId = incoming && requestIdPattern.test(incoming) ? incoming : randomUUID();
  Object.assign(request, { requestId });
  response.setHeader('x-request-id', requestId);
  storage.run({ requestId }, next);
}
