import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const mode = process.argv.includes('--write') ? '--write' : '--check';
const patterns = [
  '**/*.{js,mjs,cjs,ts,tsx,json,md,yml,yaml,css}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/.next/**',
  '!**/generated/**',
  '!**/artifacts/**',
  '!contracts/marketplace/lib/**',
  '!packages/contracts/src/abis/**',
  '!packages/contracts/src/generated-addresses.ts',
  '!packages/contracts/deployments/**',
];
const result = spawnSync(
  fileURLToPath(new URL('../../node_modules/.bin/prettier', import.meta.url)),
  [
    mode,
    '--config',
    fileURLToPath(new URL('../../packages/config/prettier.config.mjs', import.meta.url)),
    ...patterns,
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
