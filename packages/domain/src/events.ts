import { z } from 'zod';
import { addressSchema, chainIdSchema, hashSchema, idSchema, tokenIdSchema } from './schemas.js';

export const domainEventTypeSchema = z.enum([
  'COLLECTION_DEPLOYED',
  'MINTED',
  'TRANSFERRED',
  'LISTING_CREATED',
  'LISTING_CANCELLED',
  'PURCHASED',
  'WITHDRAWN',
  'MODERATION_CHANGED',
]);
export type DomainEventType = z.infer<typeof domainEventTypeSchema>;
const provenanceSchema = z.object({
  eventId: idSchema,
  eventType: domainEventTypeSchema,
  payloadVersion: z.literal(1),
  chainId: chainIdSchema,
  blockNumber: z.string().regex(/^\d+$/),
  blockHash: hashSchema,
  transactionHash: hashSchema,
  transactionIndex: z.number().int().nonnegative().nullable(),
  logIndex: z.number().int().nonnegative(),
  deduplicationKey: idSchema,
});
export const eventPayloadSchemas = {
  COLLECTION_DEPLOYED: z.object({
    collection: addressSchema,
    creator: addressSchema,
    implementation: addressSchema,
    standard: z.enum(['ERC721', 'ERC1155']),
    name: z.string().min(1),
    symbol: z.string(),
    metadataUri: z.string().min(1),
    royaltyRecipient: addressSchema,
    royaltyBps: z.number().int().nonnegative(),
  }),
  MINTED: z.object({
    collection: addressSchema,
    tokenId: tokenIdSchema,
    recipient: addressSchema,
    quantity: tokenIdSchema,
    tokenUri: z.string().nullable(),
  }),
  TRANSFERRED: z.object({
    collection: addressSchema,
    tokenId: tokenIdSchema,
    from: addressSchema,
    to: addressSchema,
    quantity: tokenIdSchema,
    standard: z.enum(['ERC721', 'ERC1155']),
  }),
  LISTING_CREATED: z.object({
    listingId: tokenIdSchema,
    seller: addressSchema,
    collection: addressSchema,
    tokenId: tokenIdSchema,
    standard: z.enum(['ERC721', 'ERC1155']),
    quantity: tokenIdSchema,
    unitPrice: tokenIdSchema,
    currency: addressSchema,
    expiresAt: tokenIdSchema.nullable(),
  }),
  LISTING_CANCELLED: z.object({ listingId: tokenIdSchema }),
  PURCHASED: z.object({
    listingId: tokenIdSchema,
    purchaseId: idSchema,
    buyer: addressSchema,
    quantity: tokenIdSchema,
    saleAmount: tokenIdSchema,
    platformFee: tokenIdSchema,
    royaltyAmount: tokenIdSchema,
    royaltyRecipient: addressSchema.nullable(),
    currency: addressSchema,
  }),
  WITHDRAWN: z.object({ payee: addressSchema, currency: addressSchema, amount: tokenIdSchema }),
  MODERATION_CHANGED: z.object({
    moderationId: idSchema,
    subjectId: idSchema,
    status: z.string().min(1),
    actorId: idSchema.nullable(),
    reason: z.string().nullable(),
  }),
} as const;
export const createDomainEventSchema = <T extends DomainEventType>(eventType: T) =>
  provenanceSchema.extend({
    eventType: z.literal(eventType),
    payload: eventPayloadSchemas[eventType],
  });
export type DomainEvent = {
  [T in DomainEventType]: z.infer<ReturnType<typeof createDomainEventSchema<T>>>;
}[DomainEventType];
export const createModerationEventPayload = (input: {
  moderationId: string;
  subjectId: string;
  status: string;
  actorId?: string | null;
  reason?: string | null;
}) => ({
  moderationId: idSchema.parse(input.moderationId),
  subjectId: idSchema.parse(input.subjectId),
  status: input.status,
  actorId: input.actorId ?? null,
  reason: input.reason ?? null,
});
