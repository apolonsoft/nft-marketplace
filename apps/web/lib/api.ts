import { createApiClient } from '@nft-marketplace/api-client';
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
const responseSchema = z.object({ data: z.unknown().optional() }).passthrough();
const query = `query Explore { search(query: "{}") }`;

export async function fetchExplore(): Promise<{ items: GalleryItem[]; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
  const client = createApiClient({ baseUrl });
  try {
    const response = await client.graphql(query, {}, responseSchema);
    const raw = response.data as Record<string, unknown> | undefined;
    const search = raw?.search;
    const parsed = typeof search === 'string' ? (JSON.parse(search) as unknown) : search;
    const source = Array.isArray(parsed)
      ? parsed
      : ((parsed as { data?: unknown[] } | undefined)?.data ?? []);
    const items = z.array(itemSchema).safeParse(source);
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
          }))
        : [],
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Unable to load marketplace',
    };
  }
}
