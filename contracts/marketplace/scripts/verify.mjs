import { execFileSync } from 'node:child_process';
const profile = process.env.FOUNDRY_PROFILE ?? 'base-sepolia';
const address = process.env.VERIFY_ADDRESS;
const contract = process.env.VERIFY_CONTRACT;
if (!address || !contract) throw new Error('VERIFY_ADDRESS and VERIFY_CONTRACT are required');
const args = ['verify-contract', '--profile', profile, '--chain', profile, address, contract];
if (process.env.VERIFY_CONSTRUCTOR_ARGS)
  args.push('--constructor-args', process.env.VERIFY_CONSTRUCTOR_ARGS);
execFileSync('forge', args, {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  env: process.env,
});
