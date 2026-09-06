#!/usr/bin/env bash
set -euo pipefail

PROFILE=${1:-check}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)

if [[ -z "${PHOTOMAP_SANDBOX_ROOT:-}" ]]; then
  DEFAULT_ENV=/mnt/data/photomap-sandbox/env.sh
  if [[ -f "$DEFAULT_ENV" ]]; then
    # shellcheck disable=SC1091
    source "$DEFAULT_ENV"
  else
    echo "PHOTOMAP_SANDBOX_ROOT is not set. Source the generated env.sh first." >&2
    exit 2
  fi
fi

case "$PROFILE" in
  backend)
    mkdir -p \
      "$REPO_ROOT/backend/data" \
      "$REPO_ROOT/backend/storage/private" \
      "$REPO_ROOT/backend/storage/public"
    cd "$REPO_ROOT/backend"
    python -m alembic -c alembic.ini upgrade head
    python -m ruff format --check app ../server.py
    python -m ruff check app ../server.py
    python -m coverage run -m pytest
    python -m coverage report
    python -m compileall app ../server.py
    ;;
  frontend)
    cd "$REPO_ROOT/frontend"
    npm run format:check
    npm run lint
    npm run knip
    npm run test
    npm run build
    ;;
  check)
    cd "$REPO_ROOT"
    make check
    ;;
  quality)
    cd "$REPO_ROOT"
    make quality
    ;;
  *)
    echo "Unknown profile: $PROFILE" >&2
    echo "Expected one of: backend, frontend, check, quality" >&2
    exit 2
    ;;
esac
