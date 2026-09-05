#!/usr/bin/env sh
set -eu
OUT=${BACKUP_DIR:-/var/backups/nft-marketplace}/ipfs
mkdir -p "$OUT"
tar -C "${KUBO_REPO:-/var/lib/kubo}" -czf "$OUT/kubo-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" .
find "$OUT" -type f -mtime +30 -delete
