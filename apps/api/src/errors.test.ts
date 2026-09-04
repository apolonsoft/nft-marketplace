import { NotFoundException } from '@nestjs/common';
import { AppError, ErrorCode } from '@nft-marketplace/config/errors';
import { describe, expect, it } from 'vitest';
import { normalizeError } from './common/errors';

describe('normalizeError', () => {
  it('preserves shared application errors', () => { expect(normalizeError(new AppError(ErrorCode.DEPENDENCY_UNAVAILABLE!, 'down', { retryable: true }), 'request-1')).toEqual({ status: 503, body: { code: ErrorCode.DEPENDENCY_UNAVAILABLE, message: 'down', details: undefined, retryable: true, requestId: 'request-1' } }); });
  it('maps Nest exceptions to shared codes', () => { expect(normalizeError(new NotFoundException(), 'request-2').body.code).toBe(ErrorCode.NOT_FOUND); });
  it('does not leak unknown errors', () => { expect(normalizeError(new Error('secret'), 'request-3').body.message).toBe('Internal server error'); });
});
