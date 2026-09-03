import { createConfig } from "@ponder/core";
import { http } from "viem";
import { CreatorCollectionFactoryAbi, CreatorERC721Abi, CreatorERC1155Abi, MarketplaceSettlementAbi, networkManifests } from "@nft-marketplace/contracts";

const network = process.env.PONDER_NETWORK === "base-sepolia" ? "baseSepolia" : "anvil";
const manifestKey = network === "baseSepolia" ? "base-sepolia" : "anvil";
const manifest = networkManifests[manifestKey];
const rpcUrl = network === "baseSepolia" ? process.env.BASE_SEPOLIA_RPC_URL : (process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545");
if (network === "baseSepolia" && !rpcUrl) throw new Error("BASE_SEPOLIA_RPC_URL is required");
const startBlock = Number(process.env.PONDER_START_BLOCK ?? 0);
const factory = (process.env.FACTORY_ADDRESS ?? (manifest.contracts as Record<string, { address: `0x${string}` }>).CreatorCollectionFactory?.address) as `0x${string}` | undefined;
const settlement = (process.env.SETTLEMENT_ADDRESS ?? (manifest.contracts as Record<string, { address: `0x${string}` }>).MarketplaceSettlement?.address) as `0x${string}` | undefined;
if (!factory || !settlement) throw new Error(`Deployment manifest for ${network} must contain factory and settlement addresses`);

export default createConfig({
  database: process.env.DATABASE_URL ? { kind: "postgres", connectionString: process.env.DATABASE_URL } : { kind: "pglite", directory: process.env.PONDER_DATABASE_DIR ?? ".ponder/pglite" },
  networks: { [network]: { chainId: manifest.chainId, transport: http(rpcUrl), pollingInterval: 1_000 } },
  contracts: {
    Factory: { abi: CreatorCollectionFactoryAbi, network: network as "anvil" | "baseSepolia", address: factory, startBlock },
    Settlement: { abi: MarketplaceSettlementAbi, network: network as "anvil" | "baseSepolia", address: settlement, startBlock },
    ERC721: { abi: CreatorERC721Abi, network: network as "anvil" | "baseSepolia", address: [] as `0x${string}`[], startBlock },
    ERC1155: { abi: CreatorERC1155Abi, network: network as "anvil" | "baseSepolia", address: [] as `0x${string}`[], startBlock }
  }
});
