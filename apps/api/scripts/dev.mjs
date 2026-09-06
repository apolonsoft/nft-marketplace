import { spawn, spawnSync } from 'node:child_process';

const run = (command, args, options = {}) => spawn(command, args, { stdio: 'inherit', ...options });

const initial = spawnSync('tsc', ['-p', 'tsconfig.dev.json'], {
  stdio: 'inherit',
});
if (initial.status !== 0) process.exit(initial.status ?? 1);

const compiler = run('tsc', ['-p', 'tsconfig.dev.json', '--watch', '--preserveWatchOutput']);
const server = run('tsx', ['watch', 'dist-dev/main.js']);

const shutdown = (signal) => {
  compiler.kill(signal);
  server.kill(signal);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('exit', (code, signal) => {
  compiler.kill('SIGTERM');
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
