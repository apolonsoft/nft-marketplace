import { describe, expect, it } from 'vitest';
import {
  addressSchema,
  atomicAmountSchema,
  listingSchema,
  formatValidationError,
  toBigInt,
  ListingState,
} from './index.js';
describe('domain schemas', () => {
  it('validates addresses and amounts', () => {
    expect(addressSchema.parse(`0x${'a'.repeat(40)}`)).toHaveLength(42);
    expect(toBigInt('42')).toBe(42n);
    expect(() => atomicAmountSchema.parse('-1')).toThrow();
  });
  it('normalizes failures', () => {
    const result = listingSchema.safeParse({});
    if (result.success) throw new Error('expected failure');
    expect(formatValidationError(result.error).issues.length).toBeGreaterThan(0);
  });
  it('exposes stable states', () => expect(ListingState.ACTIVE).toBe('ACTIVE'));
});
