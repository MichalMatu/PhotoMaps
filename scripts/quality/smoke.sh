#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_BIN="${PYTHON:-python3}"

export BACKEND_PORT="${SMOKE_BACKEND_PORT:-18100}"
export DEV_DIR="$ROOT_DIR/.dev/smoke"
export FRONTEND_PORT="${SMOKE_FRONTEND_PORT:-15100}"
export SMOKE_API_URL="http://127.0.0.1:$BACKEND_PORT"
export SMOKE_WEB_URL="http://127.0.0.1:$FRONTEND_PORT"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

cleanup() {
  "$ROOT_DIR/scripts/devctl.sh" stop >/dev/null 2>&1 || true
}

trap cleanup EXIT

"$ROOT_DIR/scripts/devctl.sh" start
"$PYTHON_BIN" "$ROOT_DIR/scripts/quality/smoke.py"
