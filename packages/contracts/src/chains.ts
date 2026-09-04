import type { ChainId } from './types.js';

export const chains = {
  anvil: {
    id: 31337,
    name: 'Anvil',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
} as const satisfies Record<
  string,
  { id: ChainId; name: string; nativeCurrency: { name: string; symbol: string; decimals: number } }
>;

export type SupportedChain = keyof typeof chains;
