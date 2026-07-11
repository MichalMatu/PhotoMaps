from typing import Any

from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.models.photo import Photo
from app.services.photo_uploads import unpublish_photo_media


def nonapproved_photos_with_public_media(session: Session) -> list[Photo]:
    statement = (
        select(Photo)
        .where(Photo.status.in_(("pending", "rejected")))
        .where(
            or_(
                Photo.public_path.is_not(None),
                Photo.thumb_path.is_not(None),
                Photo.audio_public_path.is_not(None),
            )
        )
        .order_by(Photo.status, Photo.created_at, Photo.id)
    )
    return list(session.exec(statement).all())


def run_photo_public_media_cleanup(session: Session, *, apply_changes: bool) -> dict[str, Any]:
    photos = nonapproved_photos_with_public_media(session)
    items: list[dict[str, Any]] = []
    cleared = 0
    errors = 0

    for photo in photos:
        paths = [path for path in (photo.public_path, photo.thumb_path, photo.audio_public_path) if path is not None]
        item: dict[str, Any] = {
            "photo_id": photo.id,
            "status": photo.status,
            "public_paths": paths,
            "applied": False,
        }
        if apply_changes:
            try:
                unpublish_photo_media(photo)
                session.add(photo)
                session.commit()
                item["applied"] = True
                cleared += 1
            except (OSError, SQLAlchemyError, ValueError) as exc:
                session.rollback()
                item["error"] = str(exc)
                errors += 1
        items.append(item)

    return {
        "mode": "apply" if apply_changes else "dry-run",
        "candidate_records": len(photos),
        "cleared_records": cleared,
        "errors": errors,
        "items": items,
    }


def format_photo_public_media_cleanup(report: dict[str, Any]) -> str:
    lines = [
        "PhotoMap non-approved photo media cleanup",
        f"Mode: {report['mode']}",
        f"Candidates: {report['candidate_records']}",
        f"Cleared: {report['cleared_records']}",
        f"Errors: {report['errors']}",
    ]
    for item in report["items"]:
        action = "cleared" if item["applied"] else "candidate"
        if item.get("error"):
            action = f"error: {item['error']}"
        lines.append(f"- {item['photo_id']} ({item['status']}): {action}")
        lines.extend(f"  {path}" for path in item["public_paths"])
    return "\n".join(lines)
