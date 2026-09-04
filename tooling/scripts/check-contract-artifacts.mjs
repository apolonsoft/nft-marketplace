import { execFileSync } from 'node:child_process';
execFileSync('yarn', ['workspace', '@nft-marketplace/contracts', 'generate:check'], {
  stdio: 'inherit',
});
