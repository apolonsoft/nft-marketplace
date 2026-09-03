import type { Address, ChainId, NetworkManifest } from "./types.js";
export const networkManifests = {
  "anvil": {
    "chainId": 31337,
    "name": "Anvil",
    "contracts": {},
    "config": {
      "multisig": "0x0000000000000000000000000000000000000000",
      "treasury": "0x0000000000000000000000000000000000000000",
      "platformFeeBps": 0
    }
  },
  "base-sepolia": {
    "chainId": 84532,
    "name": "Base Sepolia",
    "contracts": {},
    "config": {
      "multisig": "0x0000000000000000000000000000000000000000",
      "treasury": "0x0000000000000000000000000000000000000000",
      "platformFeeBps": 0
    }
  }
} as const satisfies Record<string, NetworkManifest>;
export const addresses: Record<ChainId, Partial<Record<string, Address>>> = Object.fromEntries(Object.values(networkManifests).map((manifest) => [manifest.chainId, Object.fromEntries(Object.entries(manifest.contracts as Record<string, { address: Address }>).map(([name, deployment]) => [name, deployment.address]))])) as Record<ChainId, Partial<Record<string, Address>>>;
