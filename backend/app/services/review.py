from datetime import UTC, datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place

VISIBLE_REVIEW_STATUSES = {"pending", "approved", "rejected"}
FINAL_REVIEW_STATUSES = {"approved", "rejected"}


def ensure_visible_review_status(status: str) -> None:
    if status not in VISIBLE_REVIEW_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported review status")


def ensure_final_review_status(status: str) -> None:
    if status not in FINAL_REVIEW_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported review status")


def update_review_count(current_count: int, previous_status: str, next_status: str) -> int:
    if previous_status != "approved" and next_status == "approved":
        return current_count + 1
    if previous_status == "approved" and next_status != "approved":
        return max(0, current_count - 1)
    return current_count


def next_cover_photo(session: Session, place_id: str, current_photo_id: str) -> Photo | None:
    statement = (
        select(Photo)
        .where(Photo.place_id == place_id)
        .where(Photo.id != current_photo_id)
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc(), Photo.created_at.desc())
    )
    return session.exec(statement).first()


def review_photo(photo: Photo, place: Place, status: str, session: Session) -> None:
    ensure_final_review_status(status)

    previous_status = photo.status
    photo.status = status
    photo.approved_at = datetime.now(UTC) if status == "approved" else None
    place.photo_count = update_review_count(place.photo_count, previous_status, status)

    if status == "approved" and place.cover_photo_id is None:
        place.cover_photo_id = photo.id
    elif status == "rejected" and place.cover_photo_id == photo.id:
        replacement = next_cover_photo(session, place.id, photo.id)
        place.cover_photo_id = replacement.id if replacement else None

    place.updated_at = datetime.now(UTC)


def apply_photo_deleted(photo: Photo, place: Place, session: Session) -> None:
    if photo.status == "approved":
        place.photo_count = max(0, place.photo_count - 1)
    if place.cover_photo_id == photo.id:
        replacement = next_cover_photo(session, place.id, photo.id)
        place.cover_photo_id = replacement.id if replacement else None
    place.updated_at = datetime.now(UTC)


def review_memory(memory: Memory, place: Place, status: str) -> None:
    ensure_final_review_status(status)

    previous_status = memory.status
    memory.status = status
    memory.approved_at = datetime.now(UTC) if status == "approved" else None
    place.memory_count = update_review_count(place.memory_count, previous_status, status)
    place.updated_at = datetime.now(UTC)


def apply_memory_deleted(memory: Memory, place: Place) -> None:
    if memory.status == "approved":
        place.memory_count = max(0, place.memory_count - 1)
    place.updated_at = datetime.now(UTC)
