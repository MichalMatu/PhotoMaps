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
from app.core.config import (  # noqa: E402
    DATABASE_PATH,
    DATABASE_URL,
    PRIVATE_STORAGE_DIR,
    PUBLIC_STORAGE_DIR,
)
from app.services.local_data_diagnostics import (  # noqa: E402
    format_local_data_diagnostics,
    run_local_data_diagnostics,
    write_diagnostics_json,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check PhotoMap local database and media storage consistency.")
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--output-json", type=Path, help="Write the full JSON report to this path.")
    parser.add_argument(
        "--no-image-check",
        action="store_true",
        help="Check paths and records without opening images.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return a failure code for warnings as well as errors.",
    )
    return parser.parse_args()


def missing_database_report() -> dict:
    return {
        "generated_at": "",
        "status": "error",
        "roots": {
            "database_path": DATABASE_PATH.as_posix(),
            "private_storage_dir": PRIVATE_STORAGE_DIR.as_posix(),
            "public_storage_dir": PUBLIC_STORAGE_DIR.as_posix(),
        },
        "checks": {"images": False},
        "summary": {
            "photos": {
                "records": 0,
                "approved": 0,
                "pending": 0,
                "rejected": 0,
                "unknown_status": 0,
            },
            "memories": {
                "records": 0,
                "approved": 0,
                "pending": 0,
                "rejected": 0,
                "unknown_status": 0,
            },
            "places": {
                "records": 0,
                "published": 0,
                "draft": 0,
                "archived": 0,
                "unknown_status": 0,
            },
            "references": {},
            "public_payloads": {"checked": 0},
            "storage": {
                "private_files": 0,
                "public_files": 0,
                "orphan_private_files": 0,
                "orphan_public_files": 0,
                "orphan_private_empty_dirs": 0,
                "orphan_public_empty_dirs": 0,
                "private_bytes": 0,
                "public_bytes": 0,
            },
            "issues": {
                "total": 1,
                "by_severity": {"error": 1, "warning": 0, "info": 0},
            },
        },
        "issues": [
            {
                "severity": "error",
                "code": "database_missing",
                "target": DATABASE_PATH.as_posix(),
                "message": "PhotoMap database file does not exist.",
            }
        ],
    }


def main() -> int:
    args = parse_args()
    if DATABASE_URL.startswith("sqlite:///") and not DATABASE_PATH.exists():
        report = missing_database_report()
    else:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        with Session(engine) as session:
            report = run_local_data_diagnostics(
                session,
                private_storage_dir=PRIVATE_STORAGE_DIR,
                public_storage_dir=PUBLIC_STORAGE_DIR,
                check_images=not args.no_image_check,
            )

    if args.output_json:
        output_path = args.output_json if args.output_json.is_absolute() else ROOT_DIR / args.output_json
        write_diagnostics_json(output_path, report)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_local_data_diagnostics(report))

    issue_counts = report["summary"]["issues"]["by_severity"]
    if issue_counts["error"] > 0:
        return 1
    if args.strict and (issue_counts["warning"] > 0 or issue_counts["info"] > 0):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
