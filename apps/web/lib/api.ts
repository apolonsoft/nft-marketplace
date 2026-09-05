import { createApiClient, marketplaceQuery } from '@nft-marketplace/api-client';
import { z } from 'zod';
import type { GalleryItem } from '../components/gallery';

const itemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string().optional(),
    title: z.string().optional(),
    image: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    creator: z.string().optional(),
    price: z.string().optional(),
  })
  .passthrough();
const responseSchema = z.object({
  items: z.array(z.unknown()),
  pageInfo: z.unknown(),
  totalCount: z.number().optional(),
});

export async function fetchExplore(
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<{
  items: GalleryItem[];
  pageInfo?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount?: number;
  error?: string;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
  const client = createApiClient({ baseUrl });
  try {
    const response = await client.get(marketplaceQuery('search', params), responseSchema);
    const items = z.array(itemSchema).safeParse(response.items);
    return {
      items: items.success
        ? items.data.map((item) => ({
            id: item.id,
            name: item.name ?? item.title ?? `NFT ${item.id}`,
            ...(item.image !== undefined || item.imageUrl !== undefined
              ? { image: item.image ?? item.imageUrl ?? null }
              : {}),
            ...(item.creator ? { creator: item.creator } : {}),
            ...(item.price ? { price: item.price } : {}),
            ...(typeof item.stale === 'boolean'
              ? {
                  stale: item.stale,
                  unavailableReason:
                    typeof item.unavailableReason === 'string' ? item.unavailableReason : null,
                }
              : {}),
          }))
        : [],
      pageInfo: response.pageInfo as {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
      },
      ...(response.totalCount === undefined ? {} : { totalCount: response.totalCount }),
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Unable to load marketplace',
    };
  }
}
