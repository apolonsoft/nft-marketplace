export * from './schemas.js';
export * from './pagination.js';
export * from './client.js';
export * from '@nft-marketplace/domain';
export const marketplaceQuery = (
  resource: string,
  params: Record<string, string | number | boolean | undefined> = {},
) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') query.set(key, String(value));
  return `/api/v1/${resource}${query.size ? `?${query.toString()}` : ''}`;
};
