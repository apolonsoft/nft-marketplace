import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const readOption = (name) => {
  const index = args.findIndex((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index === -1) return undefined;
  const arg = args[index];
  return arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[index + 1];
};

const base = readOption('base') ?? process.env.TURBO_BASE ?? 'HEAD^';
const head = readOption('head') ?? process.env.TURBO_HEAD ?? 'HEAD';

const turboArgs = [
  'turbo',
  'run',
  'generate',
  'build',
  'lint',
  'typecheck',
  'test',
  `--filter=...[${base}...${head}]`,
  '--summarize'
];

console.log(`Running affected tasks for ${base}...${head}`);
const result = spawnSync('yarn', turboArgs, { stdio: 'inherit' });
process.exit(result.status ?? 1);
