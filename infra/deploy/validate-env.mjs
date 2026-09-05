import { readFileSync, statSync } from 'node:fs';
const path = process.argv[2] ?? '/etc/nft-marketplace/production.env';
const mode = statSync(path).mode & 0o777;
if (mode !== 0o600) throw new Error(`${path} must have mode 0600`);
const values = Object.fromEntries(readFileSync(path, 'utf8').split('\n').filter((line) => line && !line.startsWith('#')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const required = ['DOMAIN', 'ACME_EMAIL', 'DATABASE_URL', 'REDIS_URL', 'BASE_SEPOLIA_RPC_URL_PRIMARY', 'FACTORY_ADDRESS', 'SETTLEMENT_ADDRESS', 'AUTH_ACCESS_PRIVATE_KEY', 'AUTH_ACCESS_PUBLIC_KEY', 'PRIVACY_ENCRYPTION_KEY'];
const missing = required.filter((key) => !values[key]);
if (missing.length) throw new Error(`Missing required deployment variables: ${missing.join(', ')}`);
console.log('Production environment validated');
