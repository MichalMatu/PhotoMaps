#!/usr/bin/env bash
set -euo pipefail

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

REPO_ROOT=${PHOTOMAP_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}

printf 'repo=%s\n' "$REPO_ROOT"
printf 'python=%s\n' "$(python --version 2>&1)"
printf 'node=%s\n' "$(node --version)"
printf 'npm=%s\n' "$(npm --version)"
printf 'dependency_key=%s\n' "$(cat "$PHOTOMAP_OFFLINE_DIR/meta/dependency-key.txt")"

python - <<'PY'
import fastapi
import pytest
import ruff
import schemathesis
print("python_dependencies=ok")
PY

for executable in \
  "$REPO_ROOT/frontend/node_modules/.bin/vite" \
  "$REPO_ROOT/frontend/node_modules/.bin/vitest" \
  "$REPO_ROOT/frontend/node_modules/.bin/playwright"; do
  if [[ ! -x "$executable" ]]; then
    echo "Missing frontend executable: $executable" >&2
    exit 3
  fi
done

if ! find "$PLAYWRIGHT_BROWSERS_PATH" -type f \( -name chrome -o -name headless_shell \) -print -quit | grep -q .; then
  echo "Playwright Chromium executable not found under $PLAYWRIGHT_BROWSERS_PATH" >&2
  exit 4
fi

if [[ -f "$REPO_ROOT/.sandbox-snapshot/git-sha.txt" ]]; then
  printf 'source_snapshot_sha=%s\n' "$(cat "$REPO_ROOT/.sandbox-snapshot/git-sha.txt")"
else
  printf 'source_snapshot_sha=not-embedded (normal git checkout)\n'
fi

(
  cd "$REPO_ROOT/backend"
  python -m compileall -q app ../server.py
)

printf 'sandbox_doctor=ok\n'
