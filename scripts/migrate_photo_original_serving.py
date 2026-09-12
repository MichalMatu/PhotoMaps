#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sqlmodel import Session, create_engine

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import DATABASE_URL  # noqa: E402
from app.services.photo_original_migration import (  # noqa: E402
    format_photo_original_serving_migration,
    run_photo_original_serving_migration,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate approved photos to original-serving public URLs.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Preview DB/file changes without applying them.")
    mode.add_argument("--apply", action="store_true", help="Update photo URLs and remove legacy full derivatives.")
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--output-json", type=Path, help="Write the full JSON report to this path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        report = run_photo_original_serving_migration(session, apply_changes=bool(args.apply))

    if args.output_json:
        output_path = args.output_json if args.output_json.is_absolute() else ROOT_DIR / args.output_json
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_photo_original_serving_migration(report))

    return 1 if report["summary"]["issues"]["by_severity"]["error"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
