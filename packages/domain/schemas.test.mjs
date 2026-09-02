import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressSchema, atomicAmountSchema, listingSchema, formatValidationError, toBigInt, ListingState } from './index.mjs';

test('validates addresses and atomic amounts', () => {
  assert.equal(addressSchema.parse(`0x${'a'.repeat(40)}`).length, 42);
  assert.equal(toBigInt('42'), 42n);
  assert.throws(() => atomicAmountSchema.parse('-1'));
});
test('normalizes schema failures', () => {
  const result = listingSchema.safeParse({});
  assert.equal(result.success, false);
  assert.equal(formatValidationError(result.error).code, 'VALIDATION_ERROR');
  assert.ok(formatValidationError(result.error).issues.length > 0);
});
test('exposes stable listing states', () => assert.equal(ListingState.ACTIVE, 'ACTIVE'));
