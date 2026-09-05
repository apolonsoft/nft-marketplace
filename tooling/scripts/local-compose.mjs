import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const file = resolve(root, 'infra/docker/compose.local.yml');
const compose = (...args) => execFileSync('docker', ['compose', '-f', file, ...args], { cwd: root, stdio: 'inherit' });
const seed = () => execFileSync('docker', ['compose', '-f', file, 'exec', '-T', 'postgres', 'psql', '-U', 'marketplace', '-d', 'nft_marketplace', '-f', '/dev/stdin'], { cwd: root, input: readFileSync(resolve(root, 'apps/api/prisma/seed-local.sql')), stdio: ['pipe', 'inherit', 'inherit'] });
const command = process.argv[2] ?? 'up';
if (command === 'up') compose('up', '-d', '--build');
else if (command === 'down') compose('down');
else if (command === 'logs') compose('logs', '-f');
else if (command === 'migrate') compose('run', '--rm', 'api', './node_modules/.bin/prisma', 'migrate', 'deploy');
else if (command === 'seed') seed();
else if (command === 'reset') { compose('down', '-v', '--remove-orphans'); compose('up', '-d', '--build'); compose('run', '--rm', 'api', './node_modules/.bin/prisma', 'migrate', 'deploy'); seed(); }
else throw new Error(`Unknown local compose command: ${command}`);
