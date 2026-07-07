from __future__ import annotations

import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

from app.schemas.contract_types import (
    CategoryStatus,
    CityStatus,
    GuideStatus,
    PhotoRole,
    PhotoSource,
    PlaceStatus,
    ReportStatus,
    ReportTargetType,
    ReviewStatus,
)

IssueList = list[dict[str, Any]]

PHOTO_STATUSES = set(ReviewStatus.__args__)
PHOTO_ROLES = set(PhotoRole.__args__)
PHOTO_SOURCES = set(PhotoSource.__args__)
PLACE_STATUSES = set(PlaceStatus.__args__)
CATEGORY_STATUSES = set(CategoryStatus.__args__)
CITY_STATUSES = set(CityStatus.__args__)
GUIDE_STATUSES = set(GuideStatus.__args__)
REPORT_STATUSES = set(ReportStatus.__args__)
REPORT_TARGET_TYPES = set(ReportTargetType.__args__)

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
PRIVATE_PAYLOAD_KEYS = {"audio_original_path", "original_path"}


def now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def add_issue(
    issues: IssueList,
    severity: str,
    code: str,
    target: str,
    message: str,
    **extra: Any,
) -> None:
    item: dict[str, Any] = {
        "severity": severity,
        "code": code,
        "target": target,
        "message": message,
    }
    item.update({key: value for key, value in extra.items() if value is not None})
    issues.append(item)


def safe_relative_path(value: Any) -> str | None:
    text = str(value or "").replace("\\", "/").strip()
    if not text or text.startswith("/"):
        return None
    parts = text.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        return None
    return "/".join(parts)


def safe_child(root: Path, relative_path: str) -> Path:
    root_resolved = root.resolve()
    child = (root / relative_path).resolve()
    if root_resolved != child and root_resolved not in child.parents:
        raise ValueError("Storage path escapes configured root")
    return child


def public_relative_path(value: Any) -> str | None:
    text = str(value or "").replace("\\", "/").strip()
    if not text.startswith("/media/"):
        return None
    return safe_relative_path(text.removeprefix("/media/"))


def is_coord(value: Any, minimum: float, maximum: float) -> bool:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(number) and minimum <= number <= maximum


def image_info(path: Path, issues: IssueList, target: str) -> dict[str, Any] | None:
    if path.suffix.lower() not in IMAGE_SUFFIXES:
        return None
    try:
        with Image.open(path) as image:
            return {"format": str(image.format or ""), "width": image.width, "height": image.height}
    except (OSError, UnidentifiedImageError) as exc:
        add_issue(issues, "error", "image_unreadable", target, f"Image cannot be read: {exc}", path=path.as_posix())
        return None


def storage_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(path for path in root.rglob("*") if path.is_file())


def storage_empty_dirs(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(
        (path for path in root.rglob("*") if path.is_dir() and not any(path.iterdir())),
        key=lambda path: len(path.parts),
        reverse=True,
    )


def total_bytes(paths: list[Path]) -> int:
    total = 0
    for path in paths:
        try:
            total += path.stat().st_size
        except OSError:
            continue
    return total
