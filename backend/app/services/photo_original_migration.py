from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.models.photo import Photo
from app.services.media import images
from app.services.photo_media import private_photo_image_path, public_photo_image_url_for


def run_photo_original_serving_migration(session: Session, *, apply_changes: bool) -> dict[str, Any]:
    photos = list(session.exec(select(Photo).where(Photo.status == "approved").order_by(Photo.id)).all())
    actions: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    candidates: list[tuple[Photo, Path | None, int]] = []
    already_migrated = 0

    for photo in photos:
        target_url = public_photo_image_url_for(photo)
        original_path = private_photo_image_path(photo)
        thumb_path = images.static_public_storage_path(photo.thumb_path)

        if not original_path.is_file():
            issues.append(issue("error", "photo_original_missing", photo, original_path.as_posix()))
            continue
        if thumb_path is None or not thumb_path.is_file():
            issues.append(
                issue(
                    "error",
                    "photo_thumb_missing",
                    photo,
                    thumb_path.as_posix() if thumb_path is not None else str(photo.thumb_path or ""),
                )
            )
            continue

        if photo.public_path == target_url:
            already_migrated += 1
            continue

        legacy_path = images.static_public_storage_path(photo.public_path)
        if legacy_path is None:
            issues.append(issue("error", "photo_public_path_unsupported", photo, str(photo.public_path or "")))
            continue

        reclaimable_bytes = legacy_path.stat().st_size if legacy_path.is_file() and legacy_path != thumb_path else 0
        if not legacy_path.exists():
            issues.append(issue("warning", "legacy_public_derivative_missing", photo, legacy_path.as_posix()))
        candidates.append((photo, legacy_path if legacy_path != thumb_path else None, reclaimable_bytes))
        actions.append(
            {
                "photo_id": photo.id,
                "place_id": photo.place_id,
                "from": photo.public_path,
                "to": target_url,
                "legacy_file": legacy_path.as_posix(),
                "reclaimable_bytes": reclaimable_bytes,
                "applied": False,
                "file_deleted": False,
            }
        )

    db_applied = False
    if apply_changes and candidates and not any(item["severity"] == "error" for item in issues):
        try:
            for photo, _legacy_path, _bytes in candidates:
                photo.public_path = public_photo_image_url_for(photo)
                session.add(photo)
            session.commit()
            db_applied = True
        except SQLAlchemyError as exc:
            session.rollback()
            issues.append(
                {
                    "severity": "error",
                    "code": "database_update_failed",
                    "message": "Photo public URLs could not be migrated.",
                    "detail": str(exc),
                }
            )

        if db_applied:
            actions_by_id = {item["photo_id"]: item for item in actions}
            for photo, legacy_path, _bytes in candidates:
                item = actions_by_id[photo.id]
                item["applied"] = True
                if legacy_path is None or not legacy_path.exists():
                    continue
                try:
                    images.cleanup_paths(legacy_path)
                    item["file_deleted"] = True
                except OSError as exc:
                    issues.append(
                        {
                            "severity": "warning",
                            "code": "legacy_public_derivative_delete_failed",
                            "photo_id": photo.id,
                            "place_id": photo.place_id,
                            "path": legacy_path.as_posix(),
                            "message": str(exc),
                        }
                    )

    issue_counts = {
        severity: sum(1 for item in issues if item["severity"] == severity)
        for severity in ("error", "warning", "info")
    }
    reclaimable_bytes = sum(item["reclaimable_bytes"] for item in actions)
    deleted_bytes = sum(item["reclaimable_bytes"] for item in actions if item["file_deleted"])
    return {
        "mode": "apply" if apply_changes else "dry-run",
        "status": "error" if issue_counts["error"] else "warning" if issue_counts["warning"] else "ok",
        "summary": {
            "approved_photos": len(photos),
            "candidates": len(candidates),
            "already_migrated": already_migrated,
            "db_applied": db_applied,
            "reclaimable_bytes": reclaimable_bytes,
            "deleted_bytes": deleted_bytes,
            "issues": {"total": len(issues), "by_severity": issue_counts},
        },
        "actions": actions,
        "issues": issues,
    }


def issue(severity: str, code: str, photo: Photo, path: str) -> dict[str, Any]:
    return {
        "severity": severity,
        "code": code,
        "photo_id": photo.id,
        "place_id": photo.place_id,
        "path": path,
        "message": code.replace("_", " "),
    }


def format_photo_original_serving_migration(report: dict[str, Any]) -> str:
    summary = report["summary"]
    issues = summary["issues"]["by_severity"]
    mib = 1024 * 1024
    gib = 1024 * mib

    def human(size: int) -> str:
        if size >= gib:
            return f"{size / gib:.2f} GiB"
        if size >= mib:
            return f"{size / mib:.2f} MiB"
        return f"{size} B"

    lines = [
        "PhotoMap approved photo original-serving migration",
        f"Mode: {report['mode']}",
        f"Status: {report['status'].upper()}",
        f"Approved photos: {summary['approved_photos']}",
        f"Candidates: {summary['candidates']}",
        f"Already migrated: {summary['already_migrated']}",
        f"Reclaimable: {human(summary['reclaimable_bytes'])}",
        f"Deleted: {human(summary['deleted_bytes'])}",
        f"Problems: {issues['error']} error, {issues['warning']} warning, {issues['info']} info",
    ]
    if report["issues"]:
        lines.append("")
        lines.append("Problems:")
        for item in report["issues"]:
            target = item.get("photo_id", "database")
            path = item.get("path", "")
            lines.append(f"- [{item['severity'].upper()}] {item['code']} {target} {path}".rstrip())
    return "\n".join(lines)
