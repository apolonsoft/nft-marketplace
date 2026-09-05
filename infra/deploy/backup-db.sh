#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
OUT=${BACKUP_DIR:-/var/backups/nft-marketplace}/postgres
mkdir -p "$OUT"
pg_dump "$DATABASE_URL" | gzip > "$OUT/marketplace-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
find "$OUT" -type f -mtime +30 -delete
