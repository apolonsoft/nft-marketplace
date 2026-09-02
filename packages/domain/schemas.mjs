import { z } from 'zod';
import { ErrorCode } from '@nft-marketplace/config/errors';

export const idSchema = z.string().trim().min(1).max(256);
export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'must be a 20-byte hex address');
export const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'must be a 32-byte hex hash');
export const chainIdSchema = z.number().int().positive();
export const tokenIdSchema = z.string().regex(/^(0|[1-9][0-9]*)$/, 'must be a non-negative integer string');
export const quantitySchema = z.string().regex(/^(0|[1-9][0-9]*)$/, 'must be a non-negative integer string');
export const atomicAmountSchema = z.string().regex(/^(0|[1-9][0-9]*)$/, 'must be a non-negative atomic amount');
export const currencyCodeSchema = z.string().regex(/^[A-Z0-9]{2,10}$/);

export const NFTStandard = Object.freeze({ ERC721: 'ERC721', ERC1155: 'ERC1155' });
export const ListingState = Object.freeze({ ACTIVE: 'ACTIVE', CANCELLED: 'CANCELLED', EXPIRED: 'EXPIRED', SOLD: 'SOLD', STALE: 'STALE' });
export const TransactionState = Object.freeze({ INTENT: 'INTENT', PENDING: 'PENDING', SUBMITTED: 'SUBMITTED', CONFIRMED: 'CONFIRMED', FAILED: 'FAILED', EXPIRED: 'EXPIRED' });
export const ReportType = Object.freeze({ COPYRIGHT: 'COPYRIGHT', FRAUD: 'FRAUD', ABUSE: 'ABUSE', OTHER: 'OTHER' });
export const ReportStatus = Object.freeze({ OPEN: 'OPEN', REVIEWING: 'REVIEWING', RESOLVED: 'RESOLVED', DISMISSED: 'DISMISSED' });
export const ConsentPurpose = Object.freeze({ PROFILE: 'PROFILE', MARKETING: 'MARKETING', APPLICATION: 'APPLICATION' });
export const ConsentState = Object.freeze({ GRANTED: 'GRANTED', REVOKED: 'REVOKED' });

const enumSchema = (values) => z.enum(Object.values(values));
export const nftStandardSchema = enumSchema(NFTStandard);
export const listingStateSchema = enumSchema(ListingState);
export const transactionStateSchema = enumSchema(TransactionState);
export const reportTypeSchema = enumSchema(ReportType);
export const reportStatusSchema = enumSchema(ReportStatus);
export const consentPurposeSchema = enumSchema(ConsentPurpose);
export const consentStateSchema = enumSchema(ConsentState);

export const currencySchema = z.object({ code: currencyCodeSchema, name: z.string().min(1), symbol: z.string().min(1), decimalPlaces: z.number().int().min(0).max(255), isActive: z.boolean() });
export const amountSchema = z.object({ value: atomicAmountSchema, currencyCode: currencyCodeSchema });
export const collectionSchema = z.object({ id: idSchema, chainId: chainIdSchema, address: addressSchema, name: z.string().min(1), standard: nftStandardSchema, creator: addressSchema, metadataUri: z.string().url().nullable() });
export const nftSchema = z.object({ id: idSchema, collectionId: idSchema, chainId: chainIdSchema, contractAddress: addressSchema, tokenId: tokenIdSchema, standard: nftStandardSchema, owner: addressSchema.nullable(), quantity: quantitySchema, metadataUri: z.string().url().nullable(), blockNumber: z.string().regex(/^[0-9]+$/).nullable(), transactionHash: hashSchema.nullable() });
export const listingSchema = z.object({ id: idSchema, nftId: idSchema, seller: addressSchema, state: listingStateSchema, price: amountSchema, quantity: quantitySchema, expiresAt: z.string().datetime().nullable() });
export const transactionIntentSchema = z.object({ id: idSchema, state: transactionStateSchema, chainId: chainIdSchema, from: addressSchema, to: addressSchema, data: z.string().regex(/^0x[0-9a-fA-F]*$/), value: atomicAmountSchema, expiresAt: z.string().datetime() });
export const reportSchema = z.object({ id: idSchema, type: reportTypeSchema, status: reportStatusSchema, reporter: addressSchema, subjectId: idSchema, reason: z.string().min(1).max(2000) });
export const consentSchema = z.object({ id: idSchema, subjectId: idSchema, purpose: consentPurposeSchema, state: consentStateSchema, grantedAt: z.string().datetime().nullable(), revokedAt: z.string().datetime().nullable() });

export function formatValidationError(error) {
  return { code: ErrorCode.VALIDATION, message: 'Request validation failed', issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message, rule: issue.code })) };
}

export const toBigInt = (amount) => BigInt(atomicAmountSchema.parse(amount));
export const fromBigInt = (amount) => atomicAmountSchema.parse(BigInt(amount).toString());
