# Base Sepolia VPS deployment

Store production values in `/etc/nft-marketplace/production.env` with mode `0600`.
Run `./infra/deploy/deploy.sh` to validate the environment and start the versioned
Compose project. Upgrade one service with `./infra/deploy/upgrade-service.sh api`
or `web`, `workers`, and `indexer`. Database and Kubo snapshots are created by
`backup-db.sh` and `backup-ipfs.sh`.
