#!/usr/bin/env sh
set -eu
SERVICE=${1:?service required}
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
ENV_FILE=${ENV_FILE:-/etc/nft-marketplace/production.env}
node "$ROOT/infra/deploy/validate-env.mjs" "$ENV_FILE"
docker compose --env-file "$ENV_FILE" -f "$ROOT/infra/deploy/compose.base-sepolia.yml" pull "$SERVICE"
docker compose --env-file "$ENV_FILE" -f "$ROOT/infra/deploy/compose.base-sepolia.yml" up -d --no-deps "$SERVICE"
docker compose --env-file "$ENV_FILE" -f "$ROOT/infra/deploy/compose.base-sepolia.yml" ps "$SERVICE"
