import type { Address, ChainId } from './types.js';
import { addressOf } from './addresses.js';

export interface ContractClientConfig<TAbi extends readonly unknown[] = readonly unknown[]> {
  readonly address: Address;
  readonly abi: TAbi;
  readonly chainId: ChainId;
}

export function contractConfig<TAbi extends readonly unknown[]>(
  chainId: ChainId,
  name: string,
  abi: TAbi,
): ContractClientConfig<TAbi> {
  return { address: addressOf(chainId, name), abi, chainId };
}
