#!/usr/bin/env python3
from __future__ import annotations

# ruff: noqa: E402, I001

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from sqlmodel import Session, create_engine

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import (
    DATABASE_PATH,
    DATABASE_URL,
    PRIVATE_STORAGE_DIR,
    PUBLIC_STORAGE_DIR,
)  # noqa: E402
from app.services.local_data_diagnostics import (
    run_local_data_diagnostics,
    write_diagnostics_json,
)  # noqa: E402
from app.services.orphan_media_cleanup import (  # noqa: E402
    apply_orphan_actions,
    cleanup_empty_parent_dirs,
    default_orphan_codes,
    orphan_actions_from_diagnostics,
)

ORPHAN_CODES = default_orphan_codes(PRIVATE_STORAGE_DIR, PUBLIC_STORAGE_DIR)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove orphaned PhotoMap media files reported by diagnostics.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run",
        action="store_true",
        help="List orphaned media files without deleting them.",
    )
    mode.add_argument("--apply", action="store_true", help="Delete orphaned media files.")
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--output-json", type=Path, help="Write the full JSON report to this path.")
    parser.add_argument(
        "--no-image-check",
        action="store_true",
        help="Skip opening image files during diagnostics.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return a failure code for warnings as well as errors.",
    )
    return parser.parse_args()


def missing_database_report() -> dict[str, Any]:
    return {
        "generated_at": "",
        "mode": "dry-run",
        "status": "error",
        "actions": [],
        "diagnostics": {
            "status": "error",
            "roots": {
                "database_path": DATABASE_PATH.as_posix(),
                "private_storage_dir": PRIVATE_STORAGE_DIR.as_posix(),
                "public_storage_dir": PUBLIC_STORAGE_DIR.as_posix(),
            },
            "summary": {
                "issues": {
                    "total": 1,
                    "by_severity": {"error": 1, "warning": 0, "info": 0},
                }
            },
            "issues": [
                {
                    "severity": "error",
                    "code": "database_missing",
                    "target": DATABASE_PATH.as_posix(),
                    "message": "PhotoMap database file does not exist.",
                }
            ],
        },
    }


def run_diagnostics(*, check_images: bool) -> dict[str, Any]:
    if DATABASE_URL.startswith("sqlite:///") and not DATABASE_PATH.exists():
        return missing_database_report()["diagnostics"]

    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        return run_local_data_diagnostics(
            session,
            private_storage_dir=PRIVATE_STORAGE_DIR,
            public_storage_dir=PUBLIC_STORAGE_DIR,
            check_images=check_images,
        )


def cleanup_report(*, apply_changes: bool, check_images: bool) -> dict[str, Any]:
    before = run_diagnostics(check_images=check_images)
    actions = orphan_actions_from_diagnostics(before, orphan_codes=ORPHAN_CODES)
    error_count = before["summary"]["issues"]["by_severity"]["error"]
    after = None

    if apply_changes and error_count == 0:
        apply_orphan_actions(actions)
        cleanup_empty_parent_dirs(
            actions,
            private_storage_dir=PRIVATE_STORAGE_DIR,
            public_storage_dir=PUBLIC_STORAGE_DIR,
        )
        after = run_diagnostics(check_images=check_images)

    effective_diagnostics = after or before
    return {
        "mode": "apply" if apply_changes else "dry-run",
        "status": effective_diagnostics["status"],
        "actions": actions,
        "diagnostics": effective_diagnostics,
        "diagnostics_before": before if after else None,
    }


def format_cleanup_report(report: dict[str, Any]) -> str:
    actions = report["actions"]
    applied = sum(1 for action in actions if action.get("applied"))
    lines = [
        f"PhotoMap orphan media cleanup ({report['mode']})",
        f"Status: {str(report['status']).upper()}",
        f"Orphan files: {len(actions)}",
        f"Deleted: {applied}",
    ]
    if actions:
        lines.append("")
        lines.append("Actions:")
        for action in actions:
            status = action.get("status", "planned")
            lines.append(f"- [{status}] {action['storage']}:{action['relative_path']}")
    if report["diagnostics"]["summary"]["issues"]["by_severity"]["error"] > 0:
        lines.append("")
        lines.append("Cleanup was not applied because diagnostics reported errors.")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    report = cleanup_report(apply_changes=bool(args.apply), check_images=not args.no_image_check)

    if args.output_json:
        output_path = args.output_json if args.output_json.is_absolute() else ROOT_DIR / args.output_json
        write_diagnostics_json(output_path, report)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_cleanup_report(report))

    issue_counts = report["diagnostics"]["summary"]["issues"]["by_severity"]
    if issue_counts["error"] > 0:
        return 1
    if args.strict and (issue_counts["warning"] > 0 or issue_counts["info"] > 0):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
