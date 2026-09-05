# T-062 Base Sepolia VPS Deployment

Production deployment assets live under `infra/deploy` and `infra/gateway`. Store values in `/etc/nft-marketplace/production.env` with mode `0600`; run `node infra/deploy/validate-env.mjs` before deployment. `deploy.sh` starts the versioned Compose project, while `upgrade-service.sh web|api|workers|indexer` pulls and recreates only the selected service.

Traefik terminates TLS with ACME, adds security headers, and applies rate limits. The API, workers, and indexer remain independently restartable. Base Sepolia accepts ordered primary and secondary RPC variables; operators can switch the active URL during provider failure without changing the image.

Run `backup-db.sh` daily/full or hourly as scheduled and `backup-ipfs.sh` for Kubo repository snapshots. Retain local snapshots for 30 days and replicate the backup directory to encrypted S3-compatible storage. Restore into isolated services first, verify checksums and health, then cut over explicitly.

Prometheus should scrape API, worker, indexer, and gateway metrics. Container logs should be retained through journald with host rotation. Never commit the production environment file, private keys, TLS state, or backup encryption material.

Verification includes environment validation, Compose config checks, independent service upgrade/rollback, RPC fallback drills, and a database/IPFS backup-restore smoke test.
