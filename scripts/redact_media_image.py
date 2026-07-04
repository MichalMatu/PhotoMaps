#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import UnidentifiedImageError
from sqlmodel import Session, create_engine

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import DATABASE_URL  # noqa: E402
from app.services.media.redaction import (  # noqa: E402
    format_redaction_report,
    parse_redaction_polygon,
    parse_redaction_region,
    redact_media_image,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manually redact a PhotoMap media image.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview redaction without changing image files.",
    )
    mode.add_argument("--apply", action="store_true", help="Apply redaction to image files.")
    parser.add_argument(
        "--kind",
        choices=["photo", "memory"],
        required=True,
        help="Media kind to redact.",
    )
    parser.add_argument("--id", required=True, help="Media record ID.")
    parser.add_argument(
        "--rect",
        action="append",
        help="Normalized redaction rectangle: left,top,right,bottom with values from 0 to 1.",
    )
    parser.add_argument(
        "--polygon",
        action="append",
        help="Normalized redaction polygon points: x1,y1,x2,y2,x3,y3,... with values from 0 to 1.",
    )
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--output-json", type=Path, help="Write the full JSON report to this path.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return a failure code for warnings as well as errors.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        shapes = [parse_redaction_region(value) for value in (args.rect or [])]
        shapes.extend(parse_redaction_polygon(value) for value in (args.polygon or []))
        if not shapes:
            raise ValueError("At least one --rect or --polygon is required")
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        with Session(engine) as session:
            report = redact_media_image(
                session,
                kind=args.kind,
                media_id=args.id,
                shapes=shapes,
                apply_changes=bool(args.apply),
            )
    except (OSError, UnidentifiedImageError, ValueError) as exc:
        report = error_report(args.kind, args.id, bool(args.apply), str(exc))

    if args.output_json:
        output_path = args.output_json if args.output_json.is_absolute() else ROOT_DIR / args.output_json
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_redaction_report(report))

    issue_counts = report["summary"]["issues"]["by_severity"]
    if issue_counts["error"] > 0:
        return 1
    if args.strict and (issue_counts["warning"] > 0 or issue_counts["info"] > 0):
        return 1
    return 0


def error_report(kind: str, media_id: str, apply_changes: bool, message: str) -> dict:
    return {
        "mode": "apply" if apply_changes else "dry-run",
        "status": "error",
        "kind": kind,
        "id": media_id,
        "summary": {
            "actions": {"total": 0, "applied": 0},
            "issues": {
                "total": 1,
                "by_severity": {"error": 1, "warning": 0, "info": 0},
            },
        },
        "actions": [],
        "issues": [{"severity": "error", "code": "redaction_failed", "message": message}],
    }


if __name__ == "__main__":
    raise SystemExit(main())
