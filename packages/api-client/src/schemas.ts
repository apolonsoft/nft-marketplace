import {
  transactionIntentSchema,
  collectionSchema,
  nftSchema,
  listingSchema,
  reportSchema,
  consentSchema,
  formatValidationError,
} from '@nft-marketplace/domain';
import { paginationRequestSchema, pageInfoSchema, paginatedResponseSchema } from './pagination.js';
export { paginationRequestSchema, pageInfoSchema, paginatedResponseSchema, formatValidationError };
export const collectionResponseSchema = paginatedResponseSchema(collectionSchema);
export const nftResponseSchema = paginatedResponseSchema(nftSchema);
export const listingResponseSchema = paginatedResponseSchema(listingSchema);
export const reportResponseSchema = paginatedResponseSchema(reportSchema);
export const consentResponseSchema = paginatedResponseSchema(consentSchema);
export const transactionIntentResponseSchema = transactionIntentSchema;
