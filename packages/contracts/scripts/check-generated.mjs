import {
  mkdtempSync,
  cpSync,
  existsSync,
  readdirSync,
  rmSync,
  statSync,
  readFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const packageRoot = resolve(new URL('..', import.meta.url).pathname);
const temp = mkdtempSync(join(tmpdir(), 'contracts-generated-'));
try {
  const expected = join(temp, 'generated');
  cpSync(join(packageRoot, 'src'), expected, { recursive: true });
  execFileSync('node', [join(packageRoot, 'scripts', 'generate.mjs')], {
    cwd: packageRoot,
    stdio: 'inherit',
    env: { ...process.env, OUTPUT_ROOT: temp },
  });
  const files = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? files(join(dir, entry.name)).map((f) => join(entry.name, f))
        : [entry.name],
    );
  for (const file of files(join(temp, 'src'))) {
    const expectedFile = join(expected, file);
    const actualFile = join(temp, 'src', file);
    if (
      !existsSync(expectedFile) ||
      readFileSync(expectedFile, 'utf8') !== readFileSync(actualFile, 'utf8')
    )
      throw new Error(`Generated artifact is stale: ${file}`);
  }
} catch (error) {
  if (error.status === 1) throw error;
  throw error;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
