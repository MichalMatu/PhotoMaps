from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.photo import PhotoAdminRead, PhotoReview
from app.api.routes.photos import photo_to_read

router = APIRouter(prefix="/api/admin/photos", tags=["admin photos"])

VISIBLE_REVIEW_STATUSES = {"pending", "approved", "rejected"}
FINAL_REVIEW_STATUSES = {"approved", "rejected"}


def update_place_photo_count(place: Place, previous_status: str, next_status: str) -> None:
    if previous_status != "approved" and next_status == "approved":
        place.photo_count += 1
    elif previous_status == "approved" and next_status != "approved":
        place.photo_count = max(0, place.photo_count - 1)


@router.get("", response_model=list[PhotoAdminRead])
def list_admin_photos(
    status: str | None = Query(default="pending"),
    session: Session = Depends(get_session),
) -> list[PhotoAdminRead]:
    if status is not None and status not in VISIBLE_REVIEW_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported photo status")

    statement = select(Photo).order_by(Photo.created_at.desc())
    if status is not None:
        statement = statement.where(Photo.status == status)

    return [photo_to_read(photo) for photo in session.exec(statement).all()]


@router.post("/{photo_id}/review", response_model=PhotoAdminRead)
def review_photo(
    photo_id: str,
    payload: PhotoReview,
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    if payload.status not in FINAL_REVIEW_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported review status")

    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    place = session.get(Place, photo.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    previous_status = photo.status
    photo.status = payload.status
    photo.approved_at = datetime.now(timezone.utc) if payload.status == "approved" else None
    update_place_photo_count(place, previous_status, payload.status)

    if payload.status == "approved" and place.cover_photo_id is None:
        place.cover_photo_id = photo.id
    elif payload.status == "rejected" and place.cover_photo_id == photo.id:
        place.cover_photo_id = None

    place.updated_at = datetime.now(timezone.utc)
    session.add(photo)
    session.add(place)
    session.commit()
    session.refresh(photo)
    return photo_to_read(photo)
