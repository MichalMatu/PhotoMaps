#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPECTED_SHA="${1:-}"
PROFILE="${2:-full}"

if [[ -z "$EXPECTED_SHA" ]]; then
  echo "Expected SHA is required." >&2
  exit 2
fi
if [[ "$PROFILE" != "full" ]]; then
  echo "Unsupported profile: $PROFILE" >&2
  exit 2
fi

cd "$ROOT_DIR"
ACTUAL_SHA="$(git rev-parse --verify HEAD)"
if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
  echo "S22 SHA mismatch: expected=$EXPECTED_SHA actual=$ACTUAL_SHA" >&2
  exit 3
fi

if command -v python3 >/dev/null 2>&1; then
  SYSTEM_PYTHON="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  SYSTEM_PYTHON="$(command -v python)"
else
  echo "Python is not installed on the S22 Termux host." >&2
  exit 4
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm is not installed on the S22 Termux host." >&2
  exit 4
fi

VENV="$ROOT_DIR/.dev/distributed-s22/venv"
if [[ ! -x "$VENV/bin/python" ]]; then
  "$SYSTEM_PYTHON" -m venv "$VENV"
fi
PYTHON_BIN="$VENV/bin/python"

# Keep the phone lane portable: install only dependencies needed for runtime,
# pytest/coverage and frontend unit/build work. Ruff, Schemathesis, browser E2E
# and performance checks stay on the Mac lane. .dev and node_modules are
# ignored, so dependency caches survive exact-SHA checkout refreshes.
"$PYTHON_BIN" -m pip install --disable-pip-version-check \
  -r "$ROOT_DIR/backend/requirements-s22-v1.txt"
(
  cd "$ROOT_DIR/frontend"
  npm ci --prefer-offline --no-audit --no-fund
)

DATA_DIR="$ROOT_DIR/.dev/distributed-s22/backend-data"
STORAGE_DIR="$ROOT_DIR/.dev/distributed-s22/storage"
rm -rf "$DATA_DIR" "$STORAGE_DIR"
mkdir -p "$DATA_DIR" "$STORAGE_DIR/private" "$STORAGE_DIR/public"
export PHOTOMAP_DATA_DIR="$DATA_DIR"
export PHOTOMAP_STORAGE_DIR="$STORAGE_DIR"
export ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
export CLAIM_TOKEN_SECRET="${CLAIM_TOKEN_SECRET:-distributed-verify-claim-token}"

echo "S22 lane: backend tests + frontend unit/build for ${EXPECTED_SHA:0:12}"

cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m alembic -c alembic.ini upgrade head
"$PYTHON_BIN" -m coverage run -m pytest app/tests --ignore=app/tests/contracts
"$PYTHON_BIN" -m coverage report
"$PYTHON_BIN" -m compileall app ../server.py

cd "$ROOT_DIR/frontend"
npm run test
npm run build
"$PYTHON_BIN" "$ROOT_DIR/scripts/quality/check_frontend_bundle.py"

echo "S22 lane PASS."
