#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python3}"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m alembic -c alembic.ini upgrade head
"$PYTHON_BIN" -m ruff check app
"$PYTHON_BIN" -m pytest
"$PYTHON_BIN" -m compileall app

cd "$ROOT_DIR"
"$PYTHON_BIN" scripts/check_schema.py

cd "$ROOT_DIR/frontend"
npm run lint
npm run test
npm run build
