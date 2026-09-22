#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPECTED_SHA="${1:-}"
PROFILE="${2:-full}"
PYTHON_BIN="${PYTHON:-}"

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
  echo "Mac SHA mismatch: expected=$EXPECTED_SHA actual=$ACTUAL_SHA" >&2
  exit 3
fi

if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
  else
    PYTHON_BIN=python3
  fi
fi

export ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
export CLAIM_TOKEN_SECRET="${CLAIM_TOKEN_SECRET:-distributed-verify-claim-token}"

echo "Mac lane: static/contracts/integration/browser/performance for ${EXPECTED_SHA:0:12}"

# Cross-platform CPU-heavy unit/build work runs on S22. Keep static tooling and
# integration/browser/performance checks on the established Mac environment.
cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m ruff format --check \
  app ../server.py ../scripts/check_schema.py ../scripts/cleanup_orphan_media.py \
  ../scripts/content/import_city.py ../scripts/diagnose_architecture.py \
  ../scripts/diagnose_local_data.py ../scripts/export_place_research.py \
  ../scripts/generate_audit_prompt.py ../scripts/migrate_photo_original_serving.py \
  ../scripts/redact_media_image.py ../scripts/retain_private_originals.py \
  ../scripts/quality/check_frontend_bundle.py ../scripts/quality/css_token_gate.py \
  ../scripts/quality/perf_seed.py ../scripts/quality/perf_smoke.py ../scripts/quality/smoke.py
"$PYTHON_BIN" -m ruff check \
  app ../server.py ../scripts/check_schema.py ../scripts/cleanup_orphan_media.py \
  ../scripts/content/import_city.py ../scripts/diagnose_architecture.py \
  ../scripts/diagnose_local_data.py ../scripts/export_place_research.py \
  ../scripts/generate_audit_prompt.py ../scripts/migrate_photo_original_serving.py \
  ../scripts/redact_media_image.py ../scripts/retain_private_originals.py \
  ../scripts/quality/check_frontend_bundle.py ../scripts/quality/css_token_gate.py \
  ../scripts/quality/perf_seed.py ../scripts/quality/perf_smoke.py ../scripts/quality/smoke.py

cd "$ROOT_DIR"
"$PYTHON_BIN" scripts/check_schema.py
"$PYTHON_BIN" scripts/quality/css_token_gate.py

cd "$ROOT_DIR/frontend"
npm run format:check
npm run lint
npm run knip

cd "$ROOT_DIR"
make api-contract
make smoke
PERF_ITERATIONS="${PERF_ITERATIONS:-2}" make perf-smoke
make e2e

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh scripts/dev/*.sh scripts/quality/*.sh scripts/distributed/*.sh scripts/remote/*.sh
else
  echo "shellcheck not installed on Mac; skipping shell diagnostics."
fi

echo "Mac lane PASS."
