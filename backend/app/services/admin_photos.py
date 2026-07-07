from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile
from sqlmodel import Session, select

from app.models.photo import Photo
from app.models.place import Place
from app.schemas.photo import PhotoUpdate
from app.services.photo_fields import (
    normalize_photo_attribution,
    normalize_photo_caption,
    normalize_photo_description_blocks,
)
from app.services.photo_uploads import delete_photo_audio, delete_photo_files, replace_photo_audio
from app.services.review import (
    apply_photo_deleted,
    ensure_final_review_status,
    ensure_visible_review_status,
)
from app.services.review import (
    review_photo as apply_photo_review,
)

PHOTO_ATTRIBUTION_FIELDS = {
    "attribution_author",
    "attribution_license",
    "attribution_license_url",
    "attribution_source_url",
}


def get_admin_photo(session: Session, photo_id: str) -> Photo:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


def get_photo_place(session: Session, photo: Photo) -> Place:
    place = session.get(Place, photo.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


def list_admin_photo_queue(
    session: Session,
    *,
    limit: int,
    offset: int,
    status: str | None,
) -> list[Photo]:
    if status is not None:
        ensure_visible_review_status(status)

    statement = select(Photo).join(Place, Photo.place_id == Place.id).order_by(Photo.created_at.desc())
    if status is not None:
        statement = statement.where(Photo.status == status)

    return list(session.exec(statement.offset(offset).limit(limit)).all())


def review_admin_photo(session: Session, photo_id: str, status: str) -> Photo:
    ensure_final_review_status(status)

    photo = get_admin_photo(session, photo_id)
    place = get_photo_place(session, photo)

    apply_photo_review(photo, place, status, session)

    session.add(photo)
    session.add(place)
    session.commit()
    session.refresh(photo)
    return photo


def update_admin_photo(session: Session, photo_id: str, payload: PhotoUpdate) -> Photo:
    photo = get_admin_photo(session, photo_id)
    provided_fields = payload.model_fields_set

    if "caption" in provided_fields:
        photo.caption = normalize_photo_caption(payload.caption)
    if "description_blocks" in provided_fields:
        photo.description_blocks = normalize_photo_description_blocks(payload.description_blocks)
    if provided_fields & PHOTO_ATTRIBUTION_FIELDS:
        next_attribution = normalize_photo_attribution(
            attribution_author=payload.attribution_author
            if "attribution_author" in provided_fields
            else photo.attribution_author,
            attribution_license=payload.attribution_license
            if "attribution_license" in provided_fields
            else photo.attribution_license,
            attribution_license_url=payload.attribution_license_url
            if "attribution_license_url" in provided_fields
            else photo.attribution_license_url,
            attribution_source_url=payload.attribution_source_url
            if "attribution_source_url" in provided_fields
            else photo.attribution_source_url,
        )
        photo.attribution_author = next_attribution["attribution_author"]
        photo.attribution_source_url = next_attribution["attribution_source_url"]
        photo.attribution_license = next_attribution["attribution_license"]
        photo.attribution_license_url = next_attribution["attribution_license_url"]

    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo


async def replace_admin_photo_audio(session: Session, photo_id: str, audio_file: UploadFile) -> Photo:
    return await replace_photo_audio(get_admin_photo(session, photo_id), audio_file, session)


def delete_admin_photo_audio(session: Session, photo_id: str) -> Photo:
    return delete_photo_audio(get_admin_photo(session, photo_id), session)


def set_admin_cover_photo(session: Session, photo_id: str) -> Place:
    photo = get_admin_photo(session, photo_id)
    if photo.status != "approved":
        raise HTTPException(status_code=422, detail="Only approved photos can be used as cover")

    place = get_photo_place(session, photo)
    place.cover_photo_id = photo.id
    place.updated_at = datetime.now(UTC)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place


def delete_admin_photo(session: Session, photo_id: str) -> None:
    photo = get_admin_photo(session, photo_id)
    place = get_photo_place(session, photo)

    apply_photo_deleted(photo, place, session)
    session.delete(photo)
    session.add(place)
    session.commit()
    delete_photo_files(photo)
