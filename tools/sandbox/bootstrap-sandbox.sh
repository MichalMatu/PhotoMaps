#!/usr/bin/env bash
set -euo pipefail

ROOT=${1:-/mnt/data/photomap-sandbox}
OFFLINE_DIR=${2:-${PHOTOMAP_OFFLINE_DIR:-}}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)

if [[ -z "$OFFLINE_DIR" ]]; then
  echo "Offline dependency directory is required." >&2
  echo "Usage: $0 <sandbox-root> <extracted-offline-pack>" >&2
  exit 2
fi

for required in \
  "$OFFLINE_DIR/python-wheelhouse" \
  "$OFFLINE_DIR/npm-cache" \
  "$OFFLINE_DIR/ms-playwright" \
  "$OFFLINE_DIR/meta/dependency-key.txt"; do
  if [[ ! -e "$required" ]]; then
    echo "Missing offline-pack component: $required" >&2
    exit 3
  fi
done

PYTHON_BIN=${PYTHON_BIN:-python3}
NODE_BIN=${NODE_BIN:-node}

python_version=$($PYTHON_BIN -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
if [[ "$python_version" != "3.13" ]]; then
  echo "Sandbox pack requires Python 3.13; found $python_version" >&2
  exit 4
fi

node_major=$($NODE_BIN -p 'process.versions.node.split(".")[0]')
if [[ "$node_major" != "22" ]]; then
  echo "Sandbox pack requires Node 22; found $($NODE_BIN --version)" >&2
  exit 5
fi

mkdir -p "$ROOT"/{logs,tmp,npm-cache}

if [[ ! -x "$ROOT/venv/bin/python" ]]; then
  "$PYTHON_BIN" -m venv "$ROOT/venv"
fi

"$ROOT/venv/bin/python" -m pip install \
  --disable-pip-version-check \
  --no-index \
  --find-links "$OFFLINE_DIR/python-wheelhouse" \
  -r "$REPO_ROOT/backend/requirements.txt"

rm -rf "$ROOT/npm-cache"
mkdir -p "$ROOT/npm-cache"
cp -a "$OFFLINE_DIR/npm-cache/." "$ROOT/npm-cache/"

(
  cd "$REPO_ROOT/frontend"
  npm ci --offline --cache "$ROOT/npm-cache" --prefer-offline
)

cat > "$ROOT/env.sh" <<ENV
export PHOTOMAP_SANDBOX_ROOT="$ROOT"
export PHOTOMAP_REPO_ROOT="$REPO_ROOT"
export PHOTOMAP_OFFLINE_DIR="$OFFLINE_DIR"
export VIRTUAL_ENV="$ROOT/venv"
export PYTHON="$ROOT/venv/bin/python"
export NPM_CONFIG_CACHE="$ROOT/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$OFFLINE_DIR/ms-playwright"
export TMPDIR="$ROOT/tmp"
export CI=1
export PATH="$ROOT/venv/bin:\$PATH"
ENV

printf 'PhotoMap sandbox prepared at %s\n' "$ROOT"
printf 'Dependency key: %s\n' "$(cat "$OFFLINE_DIR/meta/dependency-key.txt")"
printf 'Next: source %s/env.sh && tools/sandbox/sandbox-doctor.sh\n' "$ROOT"
