#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export BACKEND_PORT="${E2E_BACKEND_PORT:-18080}"
export DEV_DIR="$ROOT_DIR/.dev/e2e"
export E2E_BASE_URL="http://127.0.0.1:${E2E_FRONTEND_PORT:-15174}"
export FRONTEND_PORT="${E2E_FRONTEND_PORT:-15174}"

cleanup() {
  "$ROOT_DIR/scripts/devctl.sh" stop >/dev/null 2>&1 || true
}

trap cleanup EXIT

"$ROOT_DIR/scripts/devctl.sh" start

cd "$ROOT_DIR/frontend" || exit
npm run test:e2e -- --config playwright.config.ts
