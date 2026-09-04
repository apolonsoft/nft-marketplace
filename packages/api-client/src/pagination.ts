import { z } from 'zod';
import { idSchema } from '@nft-marketplace/domain';
export const cursorSchema = idSchema;
export const paginationRequestSchema = z
  .object({
    after: cursorSchema.nullable().optional(),
    before: cursorSchema.nullable().optional(),
    first: z.number().int().min(1).max(100).optional(),
    last: z.number().int().min(1).max(100).optional(),
  })
  .refine((value) => !(value.first && value.last), 'first and last cannot be combined');
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  startCursor: cursorSchema.nullable(),
  endCursor: cursorSchema.nullable(),
});
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pageInfo: pageInfoSchema,
    totalCount: z.number().int().nonnegative().optional(),
  });
export type PaginationRequest = z.infer<typeof paginationRequestSchema>;
export type PageInfo = z.infer<typeof pageInfoSchema>;
