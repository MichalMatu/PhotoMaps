from __future__ import annotations

import shutil
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlmodel import Session, select

from app.models.memory import Memory
from app.models.photo import Photo
from app.services.media import images

DEFAULT_APPROVED_RETENTION_DAYS = 30
DEFAULT_REJECTED_RETENTION_DAYS = 0


@dataclass(frozen=True)
class MediaRetentionTarget:
    id: str
    kind: str
    model: Photo | Memory
    place_id: str
    status: str
    original_path: str
    public_path: str
    thumb_path: str
    created_at: datetime
    approved_at: datetime | None


def run_private_original_retention(
    session: Session,
    *,
    apply_changes: bool,
    approved_retention_days: int = DEFAULT_APPROVED_RETENTION_DAYS,
    rejected_retention_days: int = DEFAULT_REJECTED_RETENTION_DAYS,
    now: datetime | None = None,
) -> dict[str, Any]:
    current_time = now or datetime.now(UTC)
    actions: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []

    for target in retention_targets(session):
        if target.status == "approved":
            if target.approved_at is None:
                issues.append(
                    issue("warning", "approved_missing_approved_at", target, "Approved media has no approved_at.")
                )
                continue
            if as_utc(target.approved_at) > current_time - timedelta(days=approved_retention_days):
                continue
            actions.append(retain_approved_original(target, apply_changes, issues))
        elif target.status == "rejected":
            if as_utc(target.created_at) > current_time - timedelta(days=rejected_retention_days):
                continue
            action_item = remove_rejected_original(target, apply_changes, issues)
            if action_item is not None:
                actions.append(action_item)

    if apply_changes:
        session.commit()

    issue_counts = {
        "error": sum(1 for item in issues if item["severity"] == "error"),
        "warning": sum(1 for item in issues if item["severity"] == "warning"),
        "info": sum(1 for item in issues if item["severity"] == "info"),
    }
    return {
        "generated_at": current_time.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "mode": "apply" if apply_changes else "dry-run",
        "status": "error" if issue_counts["error"] else "warning" if issue_counts["warning"] else "ok",
        "retention_days": {
            "approved": approved_retention_days,
            "rejected": rejected_retention_days,
        },
        "summary": {
            "actions": {
                "approved_replaced": sum(1 for item in actions if item["action"] == "replace_approved_original"),
                "rejected_removed": sum(1 for item in actions if item["action"] == "remove_rejected_original"),
                "already_retained": sum(
                    1 for item in actions if item["action"] == "approved_original_already_retained"
                ),
                "total": len(actions),
            },
            "issues": {"total": len(issues), "by_severity": issue_counts},
        },
        "actions": actions,
        "issues": issues,
    }


def retention_targets(session: Session) -> list[MediaRetentionTarget]:
    photos = [
        MediaRetentionTarget(
            id=photo.id,
            kind="photo",
            model=photo,
            place_id=photo.place_id,
            status=photo.status,
            original_path=photo.original_path,
            public_path=photo.public_path,
            thumb_path=photo.thumb_path,
            created_at=photo.created_at,
            approved_at=photo.approved_at,
        )
        for photo in session.exec(select(Photo).where(Photo.status.in_(["approved", "rejected"]))).all()
    ]
    memories = [
        MediaRetentionTarget(
            id=memory.id,
            kind="memory",
            model=memory,
            place_id=memory.place_id,
            status=memory.status,
            original_path=memory.original_path,
            public_path=memory.public_path,
            thumb_path=memory.thumb_path,
            created_at=memory.created_at,
            approved_at=memory.approved_at,
        )
        for memory in session.exec(select(Memory).where(Memory.status.in_(["approved", "rejected"]))).all()
    ]
    return [*photos, *memories]


def retain_approved_original(
    target: MediaRetentionTarget,
    apply_changes: bool,
    issues: list[dict[str, Any]],
) -> dict[str, Any]:
    private_path = images.storage_path(images.PRIVATE_STORAGE_DIR, target.original_path)
    public_path = images.public_storage_path(target.public_path)
    replacement_path = retained_private_path(target)
    replacement_relative = images.private_reference(replacement_path)

    if target.original_path == replacement_relative and replacement_path.exists():
        return action("approved_original_already_retained", target, replacement_relative, applied=False)

    if not private_path.exists():
        issues.append(issue("warning", "approved_original_missing", target, "Private original is missing."))
    if not public_path.exists():
        issues.append(issue("error", "approved_public_derivative_missing", target, "Public derivative is missing."))
        return action("replace_approved_original", target, replacement_relative, applied=False)

    if apply_changes:
        replacement_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(public_path, replacement_path)
        if private_path != replacement_path:
            private_path.unlink(missing_ok=True)
        target.model.original_path = replacement_relative

    return action("replace_approved_original", target, replacement_relative, applied=apply_changes)


def remove_rejected_original(
    target: MediaRetentionTarget,
    apply_changes: bool,
    issues: list[dict[str, Any]],
) -> dict[str, Any] | None:
    try:
        private_path = images.storage_path(images.PRIVATE_STORAGE_DIR, target.original_path)
    except ValueError:
        issues.append(issue("error", "rejected_original_path_unsafe", target, "Private original path is unsafe."))
        return None
    if not private_path.exists():
        return None
    if apply_changes:
        private_path.unlink(missing_ok=True)
    return action("remove_rejected_original", target, target.original_path, applied=apply_changes)


def retained_private_path(target: MediaRetentionTarget) -> Path:
    public_relative = target.public_path.removeprefix("/media/")
    suffix = Path(public_relative).suffix or ".jpg"
    media_dir = "photos" if target.kind == "photo" else "memories"
    return images.storage_path(
        images.PRIVATE_STORAGE_DIR, f"{media_dir}/{target.place_id}/{target.id}-retained{suffix}"
    )


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def action(name: str, target: MediaRetentionTarget, path: str, *, applied: bool) -> dict[str, Any]:
    return {
        "action": name,
        "applied": applied,
        "kind": target.kind,
        "id": target.id,
        "place_id": target.place_id,
        "path": path,
    }


def issue(severity: str, code: str, target: MediaRetentionTarget, message: str) -> dict[str, Any]:
    return {
        "severity": severity,
        "code": code,
        "kind": target.kind,
        "id": target.id,
        "place_id": target.place_id,
        "message": message,
    }


def format_private_original_retention(report: dict[str, Any]) -> str:
    actions = report["summary"]["actions"]
    issues = report["summary"]["issues"]["by_severity"]
    lines = [
        "PhotoMap private original retention",
        f"Mode: {report['mode']}",
        f"Status: {report['status'].upper()}",
        (
            "Actions: "
            f"{actions['approved_replaced']} approved replacement, "
            f"{actions['rejected_removed']} rejected removal, "
            f"{actions['already_retained']} already retained"
        ),
        f"Problems: {issues['error']} error, {issues['warning']} warning, {issues['info']} info",
    ]
    if report["actions"]:
        lines.append("")
        lines.append("Action list:")
        for item in report["actions"]:
            marker = "applied" if item["applied"] else "planned"
            lines.append(f"- [{marker}] {item['action']} {item['kind']}:{item['id']} {item['path']}")
    if report["issues"]:
        lines.append("")
        lines.append("Problem list:")
        for item in report["issues"]:
            lines.append(
                f"- [{item['severity'].upper()}] {item['code']} {item['kind']}:{item['id']} - {item['message']}"
            )
    return "\n".join(lines)
