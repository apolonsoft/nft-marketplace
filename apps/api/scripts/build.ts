import { build } from 'esbuild';

await build({
  entryPoints: ['dist-tsc/main.js'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: true,
  packages: 'external',
  banner: { js: 'import "reflect-metadata";' },
});
