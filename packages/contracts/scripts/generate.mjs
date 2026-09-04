import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const packageRoot = resolve(new URL('..', import.meta.url).pathname);
const root = resolve(packageRoot, '../..');
const forgeRoot = join(root, 'contracts', 'marketplace');
const out = join(forgeRoot, 'out');
const outputRoot = process.env.OUTPUT_ROOT ? resolve(process.env.OUTPUT_ROOT) : packageRoot;
const abiDir = join(outputRoot, 'src', 'abis');
const manifestDir = join(packageRoot, 'deployments');
const published = [
  'CreatorCollectionFactory',
  'CreatorERC721',
  'CreatorERC1155',
  'MarketplaceSettlement',
  'TransparentUpgradeableProxy',
  'ProxyAdmin',
];

if (!existsSync(out)) execFileSync('forge', ['build'], { cwd: forgeRoot, stdio: 'inherit' });
mkdirSync(abiDir, { recursive: true });
for (const name of published) {
  const source = readdirSync(out, { withFileTypes: true })
    .map((entry) => entry.name)
    .find((entry) => existsSync(join(out, entry, `${name}.json`)));
  if (!source) throw new Error(`Forge artifact not found: ${name}`);
  const artifact = JSON.parse(readFileSync(join(out, source, `${name}.json`), 'utf8'));
  const abi = JSON.stringify(artifact.abi, null, 2);
  writeFileSync(join(abiDir, `${name}.ts`), `export const ${name}Abi = ${abi} as const;\n`);
}
const manifests = {};
for (const file of readdirSync(manifestDir, { withFileTypes: true }))
  if (file.isFile() && file.name.endsWith('.json'))
    manifests[file.name.replace('.json', '')] = JSON.parse(
      readFileSync(join(manifestDir, file.name), 'utf8'),
    );
writeFileSync(
  join(outputRoot, 'src', 'generated-addresses.ts'),
  `import type { Address, ChainId, NetworkManifest } from "./types.js";\nexport const networkManifests = ${JSON.stringify(manifests, null, 2)} as const satisfies Record<string, NetworkManifest>;\nexport const addresses: Record<ChainId, Partial<Record<string, Address>>> = Object.fromEntries(Object.values(networkManifests).map((manifest) => [manifest.chainId, Object.fromEntries(Object.entries(manifest.contracts as Record<string, { address: Address }>).map(([name, deployment]) => [name, deployment.address]))])) as Record<ChainId, Partial<Record<string, Address>>>;\n`,
);
