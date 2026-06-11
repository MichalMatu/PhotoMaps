#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +"%Y%m%d-%H%M%S")"
BACKUP_DIR="$ROOT_DIR/backups/local-$STAMP"

mkdir -p "$BACKUP_DIR"

if [ -f "$ROOT_DIR/backend/data/app.db" ]; then
  mkdir -p "$BACKUP_DIR/backend/data"
  cp "$ROOT_DIR/backend/data/app.db" "$BACKUP_DIR/backend/data/app.db"
else
  echo "No backend/data/app.db found; skipping database copy."
fi

if [ -d "$ROOT_DIR/backend/storage" ]; then
  mkdir -p "$BACKUP_DIR/backend"
  cp -R "$ROOT_DIR/backend/storage" "$BACKUP_DIR/backend/storage"
else
  echo "No backend/storage found; skipping media storage copy."
fi

echo "Local backup created at $BACKUP_DIR"
