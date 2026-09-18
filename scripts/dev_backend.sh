#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-}"
DATA_DIR="${PHOTOMAP_DATA_DIR:-$ROOT_DIR/backend/data}"
STORAGE_DIR="${PHOTOMAP_STORAGE_DIR:-$ROOT_DIR/backend/storage}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

if [ -z "$PYTHON_BIN" ]; then
  if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
    PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
  else
    PYTHON_BIN=python3
  fi
fi

export ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
export FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174}"

mkdir -p \
  "$DATA_DIR" \
  "$STORAGE_DIR/private" \
  "$STORAGE_DIR/public"

cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m alembic -c alembic.ini upgrade head
exec "$PYTHON_BIN" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --lifespan off
