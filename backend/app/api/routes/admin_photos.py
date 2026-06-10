from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.place import PlaceRead
from app.schemas.photo import PhotoAdminRead, PhotoReview
from app.api.routes.photos import photo_to_read
from app.api.routes.places import place_to_read
from app.services.media.images import delete_stored_image

router = APIRouter(prefix="/api/admin/photos", tags=["admin photos"])

VISIBLE_REVIEW_STATUSES = {"pending", "approved", "rejected"}
FINAL_REVIEW_STATUSES = {"approved", "rejected"}


def update_place_photo_count(place: Place, previous_status: str, next_status: str) -> None:
    if previous_status != "approved" and next_status == "approved":
        place.photo_count += 1
    elif previous_status == "approved" and next_status != "approved":
        place.photo_count = max(0, place.photo_count - 1)


def next_cover_photo(session: Session, place_id: str, current_photo_id: str) -> Photo | None:
    statement = (
        select(Photo)
        .where(Photo.place_id == place_id)
        .where(Photo.id != current_photo_id)
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc(), Photo.created_at.desc())
    )
    return session.exec(statement).first()


@router.get("", response_model=list[PhotoAdminRead])
def list_admin_photos(
    status: str | None = Query(default=None),
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


@router.post("/{photo_id}/cover", response_model=PlaceRead)
def set_cover_photo(photo_id: str, session: Session = Depends(get_session)) -> PlaceRead:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.status != "approved":
        raise HTTPException(status_code=422, detail="Only approved photos can be used as cover")

    place = session.get(Place, photo.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    place.cover_photo_id = photo.id
    place.updated_at = datetime.now(timezone.utc)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place_to_read(place)


@router.delete("/{photo_id}", status_code=204)
def delete_photo(photo_id: str, session: Session = Depends(get_session)) -> None:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    place = session.get(Place, photo.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    if photo.status == "approved":
        place.photo_count = max(0, place.photo_count - 1)
    if place.cover_photo_id == photo.id:
        replacement = next_cover_photo(session, place.id, photo.id)
        place.cover_photo_id = replacement.id if replacement else None

    place.updated_at = datetime.now(timezone.utc)
    session.delete(photo)
    session.add(place)
    session.commit()
    delete_stored_image(photo.original_path, photo.public_path, photo.thumb_path)
    return None
