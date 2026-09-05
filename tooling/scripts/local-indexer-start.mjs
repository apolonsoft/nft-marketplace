import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const path = process.env.LOCAL_DEPLOYMENT_FILE ?? '/shared/run-latest.json';
if (existsSync(path)) {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const transactions = report.transactions ?? [];
  const proxies = transactions.filter((item) => item.contractName === 'TransparentUpgradeableProxy');
  if (proxies[0]?.contractAddress && !process.env.FACTORY_ADDRESS)
    process.env.FACTORY_ADDRESS = proxies[0].contractAddress;
  if (proxies[1]?.contractAddress && !process.env.SETTLEMENT_ADDRESS)
    process.env.SETTLEMENT_ADDRESS = proxies[1].contractAddress;
}
const child = spawn('./node_modules/.bin/ponder', ['start'], { stdio: 'inherit', env: process.env });
child.on('exit', (code, signal) => process.kill(process.pid, signal ?? undefined) || process.exit(code ?? 1));
