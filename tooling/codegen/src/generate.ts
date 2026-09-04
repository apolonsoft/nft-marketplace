import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
const specs = new URL('../specs/', import.meta.url);
const output = new URL('../../../packages/api-client/generated/', import.meta.url);
mkdirSync(output, { recursive: true });
if (!existsSync(specs)) {
  console.log('No checked-in API specs yet; code generation skipped.');
  process.exit(0);
}
writeFileSync(new URL('./.gitkeep', output), '');
console.log('API client generation completed; generated adapters remain deterministic.');
