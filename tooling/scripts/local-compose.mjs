import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const file = resolve(root, 'infra/docker/compose.local.yml');
const compose = (args) =>
  execFileSync('docker', ['compose', '-f', file, ...args], { cwd: root, stdio: 'inherit' });
const command = process.argv[2] ?? 'up';
if (command === 'up') compose(['up', '-d', '--build']);
else if (command === 'down') compose(['down']);
else if (command === 'logs') compose(['logs', '-f']);
else throw new Error(`Unknown local compose command: ${command}`);
