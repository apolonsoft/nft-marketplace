import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import type { ReadResource, ReadSort } from './read.types';
export interface CursorPayload { v: 1; resource: ReadResource; sort: ReadSort; value: string; id: string; }
export const encodeCursor = (payload: CursorPayload) => Buffer.from(JSON.stringify(payload)).toString('base64url');
export function decodeCursor(raw: string, resource: ReadResource, sort: ReadSort): CursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload;
    if (parsed.v !== 1 || parsed.resource !== resource || parsed.sort !== sort || typeof parsed.value !== 'string' || typeof parsed.id !== 'string') throw new Error('cursor mismatch');
    return parsed;
  } catch (cause) {
    throw new AppError(ErrorCode.VALIDATION, 'Invalid pagination cursor', { details: { field: 'cursor' }, cause });
  }
}
