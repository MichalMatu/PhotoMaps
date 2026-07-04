#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_BIN="${PYTHON:-python3}"

export BACKEND_PORT="${PERF_BACKEND_PORT:-18110}"
export DEV_DIR="$ROOT_DIR/.dev/perf"
export DATABASE_URL="sqlite:///$DEV_DIR/backend-data/app.db"
export FRONTEND_PORT="${PERF_FRONTEND_PORT:-15110}"
export PERF_API_URL="http://127.0.0.1:$BACKEND_PORT"
export PERF_CITY_ID="${PERF_CITY_ID:-${PERF_SEED_CITY_ID:-wroclaw}}"
export PERF_EXPECT_MIN_GUIDES="${PERF_EXPECT_MIN_GUIDES:-6}"
export PERF_EXPECT_MIN_PLACES="${PERF_EXPECT_MIN_PLACES:-100}"
export PERF_WEB_URL="http://127.0.0.1:$FRONTEND_PORT"
export PHOTOMAP_DATA_DIR="$DEV_DIR/backend-data"
export PHOTOMAP_STORAGE_DIR="$DEV_DIR/storage"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

cleanup() {
  "$ROOT_DIR/scripts/devctl.sh" stop >/dev/null 2>&1 || true
}

trap cleanup EXIT

case "$PHOTOMAP_DATA_DIR:$PHOTOMAP_STORAGE_DIR" in
  "$ROOT_DIR/.dev/perf/backend-data:$ROOT_DIR/.dev/perf/storage")
    rm -rf "$PHOTOMAP_DATA_DIR" "$PHOTOMAP_STORAGE_DIR"
    ;;
  *)
    echo "Refusing to reset perf data outside .dev/perf"
    exit 1
    ;;
esac
mkdir -p "$PHOTOMAP_DATA_DIR" "$PHOTOMAP_STORAGE_DIR/private" "$PHOTOMAP_STORAGE_DIR/public"

"$ROOT_DIR/scripts/devctl.sh" start
"$PYTHON_BIN" "$ROOT_DIR/scripts/quality/perf_seed.py"
"$PYTHON_BIN" "$ROOT_DIR/scripts/quality/perf_smoke.py"
