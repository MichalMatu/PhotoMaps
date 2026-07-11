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
from app.services.photo_privacy_cleanup import (  # noqa: E402
    format_photo_public_media_cleanup,
    run_photo_public_media_cleanup,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove public derivatives from pending and rejected PhotoMap photo records."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Delete public files and clear their database paths. Without this flag the command is a dry run.",
    )
    parser.add_argument("--json", action="store_true", help="Print the JSON report.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        report = run_photo_public_media_cleanup(session, apply_changes=args.apply)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_photo_public_media_cleanup(report))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
