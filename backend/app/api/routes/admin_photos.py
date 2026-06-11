from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.photo import PhotoAdminRead, PhotoReview, PhotoUpdate
from app.schemas.place import PlaceRead
from app.serializers.photo import photo_to_admin_read
from app.serializers.place import place_to_read
from app.services.media.images import delete_stored_image
from app.services.photo_fields import normalize_photo_caption
from app.services.review import (
    apply_photo_deleted,
    ensure_final_review_status,
    ensure_visible_review_status,
)
from app.services.review import (
    review_photo as review_photo_status,
)

router = APIRouter(prefix="/api/admin/photos", tags=["admin photos"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[PhotoAdminRead])
def list_admin_photos(
    status: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[PhotoAdminRead]:
    if status is not None:
        ensure_visible_review_status(status)

    statement = select(Photo).order_by(Photo.created_at.desc())
    if status is not None:
        statement = statement.where(Photo.status == status)

    return [photo_to_admin_read(photo) for photo in session.exec(statement).all()]


@router.post("/{photo_id}/review", response_model=PhotoAdminRead)
def review_photo(
    photo_id: str,
    payload: PhotoReview,
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    ensure_final_review_status(payload.status)

    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    place = session.get(Place, photo.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    review_photo_status(photo, place, payload.status, session)

    session.add(photo)
    session.add(place)
    session.commit()
    session.refresh(photo)
    return photo_to_admin_read(photo)


@router.patch("/{photo_id}", response_model=PhotoAdminRead)
def update_photo(
    photo_id: str,
    payload: PhotoUpdate,
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    photo.caption = normalize_photo_caption(payload.caption)
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo_to_admin_read(photo)


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
    place.updated_at = datetime.now(UTC)
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

    apply_photo_deleted(photo, place, session)
    session.delete(photo)
    session.add(place)
    session.commit()
    delete_stored_image(photo.original_path, photo.public_path, photo.thumb_path)
    return None
