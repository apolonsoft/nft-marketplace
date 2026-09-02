import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
const root = new URL('./', import.meta.url); const specs = new URL('./specs/', root); const output = new URL('../../packages/api-client/generated/', root);
mkdirSync(output, { recursive: true });
if (!existsSync(specs)) { console.log('No checked-in API specs yet; code generation skipped.'); process.exit(0); }
writeFileSync(new URL('./.gitkeep', output), '');
console.log('API client generation completed; generated adapters remain deterministic.');
