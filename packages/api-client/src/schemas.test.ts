import { describe, expect, it } from 'vitest';
import { paginationRequestSchema, pageInfoSchema } from './index.js';
describe('api client contracts', () => {
  it('validates cursor pagination', () => {
    expect(paginationRequestSchema.parse({ after: 'cursor', first: 10 }).first).toBe(10);
    expect(paginationRequestSchema.safeParse({ first: 10, last: 10 }).success).toBe(false);
  });
  it('allows nullable cursors', () =>
    expect(
      pageInfoSchema.parse({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      }).startCursor,
    ).toBeNull());
});
