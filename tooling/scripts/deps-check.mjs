import { readFileSync, readdirSync, statSync } from 'node:fs';
const manifests = ['apps', 'packages'].flatMap((root) => readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => `${root}/${entry.name}/package.json`));
const names = new Map(manifests.map((file) => [JSON.parse(readFileSync(file, 'utf8')).name, file]));
const errors = [];
for (const file of manifests) {
  const pkg = JSON.parse(readFileSync(file, 'utf8')); const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const dep of Object.keys(deps)) {
    if (!names.has(dep)) continue;
    const isApp = file.startsWith('apps/'); const targetIsApp = names.get(dep).startsWith('apps/');
    if ((!isApp && targetIsApp) || (isApp && targetIsApp)) errors.push(`${file}: forbidden dependency ${dep}`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const sourceFiles = ['apps', 'packages'].flatMap((root) => walk(root));
const graph = new Map(sourceFiles.map((file) => [file, []]));
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  for (const specifier of text.matchAll(/(?:from|import)\s*['"](\.[^'"]+)['"]/g)) {
    const target = resolveSource(file, specifier[1]);
    if (target && graph.has(target)) graph.get(file).push(target);
  }
}
const visiting = new Set(); const visited = new Set();
function visit(file, trail = []) {
  if (visiting.has(file)) errors.push(`circular import: ${[...trail, file].join(' -> ')}`);
  if (visited.has(file)) return;
  visiting.add(file); for (const target of graph.get(file) ?? []) visit(target, [...trail, file]);
  visiting.delete(file); visited.add(file);
}
for (const file of sourceFiles) visit(file);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Dependency boundary and cycle check passed for ${manifests.length} workspaces`);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory() && !['node_modules', '.turbo', 'dist', 'build'].includes(entry.name)) return walk(path);
    return entry.isFile() && /\.(mjs|ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}
function resolveSource(file, specifier) {
  const base = file.slice(0, file.lastIndexOf('/')) + '/' + specifier;
  for (const candidate of [base, `${base}.mjs`, `${base}.ts`, `${base}.tsx`, `${base}/index.mjs`, `${base}/index.ts`]) {
    try { if (statSync(candidate).isFile()) return candidate; } catch { /* unresolved imports are handled by workspace tooling */ }
  }
  return undefined;
}
