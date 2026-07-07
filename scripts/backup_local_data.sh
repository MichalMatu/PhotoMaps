#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +"%Y%m%d-%H%M%S")"
BACKUP_DIR="$ROOT_DIR/backups/local-$STAMP"
BACKUP_WORK_DIR="$ROOT_DIR/backups/.local-$STAMP.tmp"
PYTHON_BIN="${PYTHON:-python3}"
MODE="dry-run"
PRINT_JSON="false"
OUTPUT_JSON=""
STRICT="false"
KEEP_BACKUPS="${PHOTOMAP_BACKUP_KEEP:-1}"
PRUNE_BACKUPS="true"
BACKUP_FINALIZED="false"

if [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      MODE="dry-run"
      ;;
    --apply)
      MODE="apply"
      ;;
    --json)
      PRINT_JSON="true"
      ;;
    --output-json)
      if [ "$#" -lt 2 ]; then
        echo "--output-json requires a path" >&2
        exit 2
      fi
      OUTPUT_JSON="$2"
      shift
      ;;
    --strict)
      STRICT="true"
      ;;
    --keep-backups)
      if [ "$#" -lt 2 ]; then
        echo "--keep-backups requires a positive integer" >&2
        exit 2
      fi
      KEEP_BACKUPS="$2"
      shift
      ;;
    --no-prune)
      PRUNE_BACKUPS="false"
      ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/backup_local_data.sh [--dry-run|--apply] [--json] [--output-json PATH] [--strict] [--keep-backups N|--no-prune]

Runs local data diagnostics before backing up backend/data/app.db and backend/storage.
Default mode is --dry-run.
After a successful --apply backup, older backups/local-* directories are pruned.
By default the script keeps the newest 1 backup. Override with --keep-backups N
or PHOTOMAP_BACKUP_KEEP=N. Use --no-prune to keep all backups for one run.
Storage backup reuses unchanged files from the newest existing local backup via
hard links when possible, then synchronizes the directory to the current state.
Empty storage directories are pruned from the finalized backup.
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
  shift
done

if ! [[ "$KEEP_BACKUPS" =~ ^[1-9][0-9]*$ ]]; then
  echo "--keep-backups must be a positive integer" >&2
  exit 2
fi

if [ "$MODE" = "apply" ]; then
  rm -rf "$BACKUP_WORK_DIR"
  mkdir -p "$BACKUP_WORK_DIR"
  cleanup_partial_backup() {
    if [ "$BACKUP_FINALIZED" != "true" ]; then
      rm -rf "$BACKUP_WORK_DIR"
    fi
  }
  trap cleanup_partial_backup EXIT INT TERM
  DIAGNOSTICS_OUTPUT="$BACKUP_WORK_DIR/local-data-diagnostics.json"
else
  DIAGNOSTICS_OUTPUT="$(mktemp)"
fi

DIAGNOSTIC_ARGS=(--output-json "$DIAGNOSTICS_OUTPUT")
if [ "$STRICT" = "true" ]; then
  DIAGNOSTIC_ARGS+=(--strict)
fi

if ! "$PYTHON_BIN" "$ROOT_DIR/scripts/diagnose_local_data.py" "${DIAGNOSTIC_ARGS[@]}" >/dev/null; then
  echo "Local backup blocked because local data diagnostics found errors."
  echo "Diagnostics report: $DIAGNOSTICS_OUTPUT"
  exit 1
fi

if [ "$MODE" = "apply" ]; then
  if [ -f "$ROOT_DIR/backend/data/app.db" ]; then
    mkdir -p "$BACKUP_WORK_DIR/backend/data"
    cp "$ROOT_DIR/backend/data/app.db" "$BACKUP_WORK_DIR/backend/data/app.db"
  else
    echo "No backend/data/app.db found; skipping database copy."
  fi

  if [ -d "$ROOT_DIR/backend/storage" ]; then
    mkdir -p "$BACKUP_WORK_DIR/backend"
    LATEST_STORAGE_SOURCE="$("$PYTHON_BIN" - "$ROOT_DIR/backups" <<'PY'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
pattern = re.compile(r"^local-\d{8}-\d{6}$")
for backup in sorted(
    [path for path in root.iterdir() if path.is_dir() and pattern.match(path.name)],
    key=lambda path: path.name,
    reverse=True,
):
    storage = backup / "backend" / "storage"
    if storage.is_dir():
        print(storage)
        break
PY
)"
    if [ -n "$LATEST_STORAGE_SOURCE" ]; then
      cp -al "$LATEST_STORAGE_SOURCE" "$BACKUP_WORK_DIR/backend/storage"
    fi
    mkdir -p "$BACKUP_WORK_DIR/backend/storage"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete "$ROOT_DIR/backend/storage/" "$BACKUP_WORK_DIR/backend/storage/"
    else
      rm -rf "$BACKUP_WORK_DIR/backend/storage"
      cp -R "$ROOT_DIR/backend/storage" "$BACKUP_WORK_DIR/backend/storage"
    fi
    find "$BACKUP_WORK_DIR/backend/storage" -mindepth 1 -depth -type d -empty -delete
  else
    echo "No backend/storage found; skipping media storage copy."
  fi
  mv "$BACKUP_WORK_DIR" "$BACKUP_DIR"
  BACKUP_FINALIZED="true"
  DIAGNOSTICS_OUTPUT="$BACKUP_DIR/local-data-diagnostics.json"
  MESSAGE="Local backup created at $BACKUP_DIR"
else
  MESSAGE="Local backup dry-run passed. Backup target would be $BACKUP_DIR"
fi

PRUNE_REPORT_JSON="$("$PYTHON_BIN" - "$MODE" "$ROOT_DIR/backups" "$BACKUP_DIR" "$KEEP_BACKUPS" "$PRUNE_BACKUPS" <<'PY'
import json
import re
import shutil
import sys
from pathlib import Path

mode, backups_root, backup_dir, keep_backups, prune_backups = sys.argv[1:6]
root = Path(backups_root)
current = Path(backup_dir)
keep = int(keep_backups)
enabled = prune_backups == "true"
pattern = re.compile(r"^local-\d{8}-\d{6}$")

existing = []
if root.exists():
    existing = sorted(
        [path for path in root.iterdir() if path.is_dir() and pattern.match(path.name)],
        key=lambda path: path.name,
    )

candidates = list(existing)
if mode == "dry-run" and pattern.match(current.name):
    candidates.append(current)
    candidates = sorted({path.name: path for path in candidates}.values(), key=lambda path: path.name)

protected = {path.name for path in candidates[-keep:]}
to_prune = [path for path in existing if path.name not in protected]
deleted = []

if enabled and mode == "apply":
    for path in to_prune:
        shutil.rmtree(path)
        deleted.append(str(path))

print(
    json.dumps(
        {
            "enabled": enabled,
            "keep": keep,
            "deleted": deleted,
            "would_delete": [str(path) for path in to_prune],
        },
        ensure_ascii=False,
    )
)
PY
)"

PRUNED_COUNT="$("$PYTHON_BIN" -c 'import json,sys; print(len(json.loads(sys.stdin.read())["deleted"]))' <<<"$PRUNE_REPORT_JSON")"
if [ "$MODE" = "apply" ] && [ "$PRUNE_BACKUPS" = "true" ] && [ "$PRUNED_COUNT" -gt 0 ]; then
  MESSAGE="$MESSAGE; pruned $PRUNED_COUNT older local backup(s)"
fi

REPORT_JSON="$("$PYTHON_BIN" - "$MODE" "$BACKUP_DIR" "$DIAGNOSTICS_OUTPUT" "$MESSAGE" "$PRUNE_REPORT_JSON" <<'PY'
import json
import sys
from pathlib import Path

mode, backup_dir, diagnostics_output, message, prune_report_json = sys.argv[1:6]
diagnostics = json.loads(Path(diagnostics_output).read_text())
print(
    json.dumps(
        {
            "mode": mode,
            "status": "ok",
            "backup_dir": backup_dir,
            "diagnostics": diagnostics,
            "backup_prune": json.loads(prune_report_json),
            "message": message,
        },
        ensure_ascii=False,
        indent=2,
    )
)
PY
)"

if [ -n "$OUTPUT_JSON" ]; then
  OUTPUT_PATH="$OUTPUT_JSON"
  if [[ "$OUTPUT_PATH" != /* ]]; then
    OUTPUT_PATH="$ROOT_DIR/$OUTPUT_PATH"
  fi
  mkdir -p "$(dirname "$OUTPUT_PATH")"
  printf '%s\n' "$REPORT_JSON" > "$OUTPUT_PATH"
fi

if [ "$PRINT_JSON" = "true" ]; then
  printf '%s\n' "$REPORT_JSON"
else
  echo "$MESSAGE"
  echo "Diagnostics report: $DIAGNOSTICS_OUTPUT"
fi
