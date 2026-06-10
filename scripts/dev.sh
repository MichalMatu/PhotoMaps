#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python3}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

export ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
export FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://127.0.0.1:$BACKEND_PORT}"

mkdir -p \
  "$ROOT_DIR/backend/data" \
  "$ROOT_DIR/backend/storage/private" \
  "$ROOT_DIR/backend/storage/public"

cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m alembic -c alembic.ini upgrade head
"$PYTHON_BIN" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --lifespan off &
BACKEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR/frontend"
npm run dev
