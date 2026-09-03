import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname);
const names = ["CreatorCollectionFactory", "CreatorERC721", "CreatorERC1155", "MarketplaceSettlement", "TransparentUpgradeableProxy", "ProxyAdmin"];
for (const name of names) if (!existsSync(join(root, "src", "abis", `${name}.ts`))) throw new Error(`Missing generated ABI: ${name}`);
if (!existsSync(join(root, "src", "generated-addresses.ts"))) throw new Error("Missing generated addresses");
console.log(`Validated ${names.length} contract ABIs and generated addresses`);
