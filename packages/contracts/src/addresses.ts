import type { Address, ChainId, NetworkManifest } from "./types.js";
import { addresses } from "./generated-addresses.js";

export { addresses };

export function addressOf(chainId: ChainId, contract: string): Address {
  const value = addresses[chainId][contract];
  if (!value) throw new Error(`Missing ${contract} deployment for chain ${chainId}`);
  return value;
}

export function manifestAddresses(manifest: NetworkManifest): Record<string, Address> {
  return Object.fromEntries(Object.entries(manifest.contracts).map(([name, deployment]) => [name, deployment.address]));
}
