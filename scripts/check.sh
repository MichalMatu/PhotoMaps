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
"$PYTHON_BIN" -m ruff format --check app ../server.py ../scripts/check_schema.py ../scripts/cleanup_orphan_media.py ../scripts/content/import_city.py ../scripts/diagnose_architecture.py ../scripts/diagnose_local_data.py ../scripts/export_place_research.py ../scripts/generate_audit_prompt.py ../scripts/redact_media_image.py ../scripts/retain_private_originals.py ../scripts/quality/check_frontend_bundle.py ../scripts/quality/css_token_gate.py ../scripts/quality/perf_seed.py ../scripts/quality/perf_smoke.py ../scripts/quality/smoke.py
"$PYTHON_BIN" -m ruff check app ../server.py ../scripts/check_schema.py ../scripts/cleanup_orphan_media.py ../scripts/content/import_city.py ../scripts/diagnose_architecture.py ../scripts/diagnose_local_data.py ../scripts/export_place_research.py ../scripts/generate_audit_prompt.py ../scripts/redact_media_image.py ../scripts/retain_private_originals.py ../scripts/quality/check_frontend_bundle.py ../scripts/quality/css_token_gate.py ../scripts/quality/perf_seed.py ../scripts/quality/perf_smoke.py ../scripts/quality/smoke.py
"$PYTHON_BIN" -m coverage run -m pytest
"$PYTHON_BIN" -m coverage report
"$PYTHON_BIN" -m compileall app ../server.py

cd "$ROOT_DIR"
"$PYTHON_BIN" scripts/check_schema.py
"$PYTHON_BIN" scripts/quality/css_token_gate.py
PERF_ITERATIONS="${PERF_ITERATIONS:-2}" "$ROOT_DIR/scripts/quality/perf_smoke.sh"

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
npm run test:e2e -- --project=chromium e2e/visual/admin.spec.ts
MAP_VISUAL_SMOKE_GREP="visual: empty desktop map|visual: map markers, gallery and photo detail|multi-city map shows regional places without a public city filter|visual: mobile memory sheet"
npm run test:e2e -- --project=chromium e2e/visual/map.spec.ts -g "$MAP_VISUAL_SMOKE_GREP"
npm run build
"$PYTHON_BIN" "$ROOT_DIR/scripts/quality/check_frontend_bundle.py"
