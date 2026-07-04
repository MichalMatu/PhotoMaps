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
from app.services.private_original_retention import (  # noqa: E402
    DEFAULT_APPROVED_RETENTION_DAYS,
    DEFAULT_REJECTED_RETENTION_DAYS,
    format_private_original_retention,
    run_private_original_retention,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply PhotoMap private original retention rules.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Preview retention actions without changing files or DB.")
    mode.add_argument("--apply", action="store_true", help="Apply retention actions to files and DB.")
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--output-json", type=Path, help="Write the full JSON report to this path.")
    parser.add_argument("--strict", action="store_true", help="Return a failure code for warnings as well as errors.")
    parser.add_argument(
        "--approved-days",
        type=int,
        default=DEFAULT_APPROVED_RETENTION_DAYS,
        help="Replace approved private originals after this many days.",
    )
    parser.add_argument(
        "--rejected-days",
        type=int,
        default=DEFAULT_REJECTED_RETENTION_DAYS,
        help="Remove rejected private originals after this many days.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        report = run_private_original_retention(
            session,
            apply_changes=bool(args.apply),
            approved_retention_days=args.approved_days,
            rejected_retention_days=args.rejected_days,
        )

    if args.output_json:
        output_path = args.output_json if args.output_json.is_absolute() else ROOT_DIR / args.output_json
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_private_original_retention(report))

    issue_counts = report["summary"]["issues"]["by_severity"]
    if issue_counts["error"] > 0:
        return 1
    if args.strict and (issue_counts["warning"] > 0 or issue_counts["info"] > 0):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
