import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const profile = process.env.FOUNDRY_PROFILE ?? 'anvil';
const marketplaceRoot = resolve(new URL('..', import.meta.url).pathname);
const manifest = join(
  resolve(marketplaceRoot, '../..'),
  'packages',
  'contracts',
  'deployments',
  `${profile === 'base-sepolia' ? 'base-sepolia' : 'anvil'}.json`,
);
if (process.env.BROADCAST === 'true' && process.env.REDEPLOY !== 'true' && existsSync(manifest)) {
  const existing = JSON.parse(readFileSync(manifest, 'utf8'));
  if (Object.keys(existing.contracts ?? {}).length > 0)
    throw new Error(
      `Deployment manifest already contains contracts. Set REDEPLOY=true to intentionally deploy a new set: ${manifest}`,
    );
}
const args = ['script', 'script/Deploy.s.sol:Deploy', '--profile', profile];
if (process.env.BROADCAST === 'true') args.push('--broadcast');
if (process.env.VERBOSE === 'true') args.push('-vvvv');
execFileSync('forge', args, {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  env: process.env,
});
