import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginationRequestSchema, pageInfoSchema } from './index.mjs';

test('accepts cursor pagination and rejects mixed directions', () => {
  assert.equal(paginationRequestSchema.parse({ after: 'cursor', first: 10 }).first, 10);
  assert.equal(paginationRequestSchema.safeParse({ first: 10, last: 10 }).success, false);
});
test('supports explicit nullable page cursors', () => assert.equal(pageInfoSchema.parse({ hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }).startCursor, null));
