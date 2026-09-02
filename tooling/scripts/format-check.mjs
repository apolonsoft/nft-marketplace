import { readFileSync, readdirSync } from 'node:fs';
const roots = ['apps', 'packages', 'contracts', 'tooling'];
const files = ['package.json', 'turbo.json', ...roots.flatMap((root) => walk(root))].filter((file) => /\.(json|mjs|ts|tsx|md)$/.test(file));
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory() && !['node_modules', '.turbo', 'dist', 'build'].includes(entry.name)) return walk(path);
    return entry.isFile() ? [path] : [];
  });
}
const bad = files.filter((file) => readFileSync(file, 'utf8').split('\n').some((line) => /[ \t]+$/.test(line)));
if (bad.length) { console.error(`Trailing whitespace found in: ${bad.join(', ')}`); process.exit(1); }
console.log(`Formatting check passed for ${files.length} tracked files`);
