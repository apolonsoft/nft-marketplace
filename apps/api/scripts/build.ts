import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: true,
  packages: 'external',
  banner: { js: 'import "reflect-metadata";' },
});
