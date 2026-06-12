#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python3}"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

mkdir -p \
  "$ROOT_DIR/backend/data" \
  "$ROOT_DIR/backend/storage/private" \
  "$ROOT_DIR/backend/storage/public"

cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m alembic -c alembic.ini upgrade head
"$PYTHON_BIN" -m ruff format --check app ../scripts/check_schema.py ../scripts/quality/css_token_gate.py
"$PYTHON_BIN" -m ruff check app ../scripts/check_schema.py ../scripts/quality/css_token_gate.py
"$PYTHON_BIN" -m coverage run -m pytest
"$PYTHON_BIN" -m coverage report
"$PYTHON_BIN" -m compileall app

cd "$ROOT_DIR"
"$PYTHON_BIN" scripts/check_schema.py
"$PYTHON_BIN" scripts/quality/css_token_gate.py

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh scripts/dev/*.sh scripts/quality/*.sh
else
  echo "shellcheck not installed; skipping shell script diagnostics."
fi

cd "$ROOT_DIR/frontend"
npm run format:check
npm run lint
npm run knip
npm run test
npm run build
