#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -f "$ROOT_DIR/backend/data/app.db"
rm -rf "$ROOT_DIR/backend/storage/private" "$ROOT_DIR/backend/storage/public"
mkdir -p "$ROOT_DIR/backend/data" "$ROOT_DIR/backend/storage/private" "$ROOT_DIR/backend/storage/public"

echo "Local dev database and media storage were reset."
