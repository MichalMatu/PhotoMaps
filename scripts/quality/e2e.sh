#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export BACKEND_PORT="${E2E_BACKEND_PORT:-18080}"
export DEV_DIR="$ROOT_DIR/.dev/e2e"
export DATABASE_URL="sqlite:///$DEV_DIR/backend-data/app.db"
export E2E_ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
export E2E_API_URL="http://127.0.0.1:$BACKEND_PORT"
export E2E_BASE_URL="http://127.0.0.1:${E2E_FRONTEND_PORT:-15174}"
export FRONTEND_PORT="${E2E_FRONTEND_PORT:-15174}"
export PHOTOMAP_DATA_DIR="$DEV_DIR/backend-data"
export PHOTOMAP_STORAGE_DIR="$DEV_DIR/storage"

cleanup() {
  "$ROOT_DIR/scripts/devctl.sh" stop >/dev/null 2>&1 || true
}

trap cleanup EXIT

case "$PHOTOMAP_DATA_DIR:$PHOTOMAP_STORAGE_DIR" in
  "$ROOT_DIR/.dev/e2e/backend-data:$ROOT_DIR/.dev/e2e/storage")
    rm -rf "$PHOTOMAP_DATA_DIR" "$PHOTOMAP_STORAGE_DIR"
    ;;
  *)
    echo "Refusing to reset e2e data outside .dev/e2e"
    exit 1
    ;;
esac
mkdir -p "$PHOTOMAP_DATA_DIR" "$PHOTOMAP_STORAGE_DIR/private" "$PHOTOMAP_STORAGE_DIR/public"

"$ROOT_DIR/scripts/devctl.sh" start

cd "$ROOT_DIR/frontend" || exit
npm run test:e2e -- --config playwright.config.ts
