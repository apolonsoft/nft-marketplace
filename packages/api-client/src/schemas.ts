import {
  transactionIntentSchema,
  collectionSchema,
  nftSchema,
  listingSchema,
  reportSchema,
  consentSchema,
  formatValidationError,
} from '@nft-marketplace/domain';
import { z, type ZodTypeAny } from 'zod';
import { paginationRequestSchema, pageInfoSchema, paginatedResponseSchema } from './pagination.js';
export { paginationRequestSchema, pageInfoSchema, paginatedResponseSchema, formatValidationError };
export const collectionResponseSchema = paginatedResponseSchema(collectionSchema);
export const nftResponseSchema = paginatedResponseSchema(nftSchema);
export const listingResponseSchema = paginatedResponseSchema(listingSchema);
export const reportResponseSchema = paginatedResponseSchema(reportSchema);
export const consentResponseSchema = paginatedResponseSchema(consentSchema);
export const transactionIntentResponseSchema = transactionIntentSchema;
export const readPageSchema = <T extends ZodTypeAny>(item: T) =>
  paginatedResponseSchema(item).extend({ totalCount: z.number().int().nonnegative().optional() });
export const readRowSchema = z.object({ id: z.string() }).passthrough();
export const listingReadSchema = listingSchema.extend({
  stale: z.boolean().optional(),
  unavailableReason: z.string().nullable().optional(),
});
