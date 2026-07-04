from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.api.pagination import ADMIN_QUEUE_DEFAULT_LIMIT, ADMIN_QUEUE_MAX_LIMIT
from app.api.redaction import redact_admin_media
from app.db.session import get_session
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.contract_types import ReviewStatus
from app.schemas.media_redaction import MediaRedactionPayload, MediaRedactionReport
from app.schemas.photo import PhotoAdminRead, PhotoReview, PhotoUpdate
from app.schemas.place import PlaceAdminRead
from app.serializers.photo import photo_to_admin_read
from app.serializers.place import place_to_admin_read
from app.services.photo_fields import (
    normalize_photo_attribution,
    normalize_photo_caption,
    normalize_photo_description_blocks,
)
from app.services.photo_uploads import delete_photo_audio, delete_photo_files, replace_photo_audio
from app.services.place_taxonomy import category_ids_by_place_id
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
    status: ReviewStatus | None = Query(default=None),
    limit: int = Query(default=ADMIN_QUEUE_DEFAULT_LIMIT, ge=1, le=ADMIN_QUEUE_MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> list[PhotoAdminRead]:
    if status is not None:
        ensure_visible_review_status(status)

    statement = select(Photo).join(Place, Photo.place_id == Place.id).order_by(Photo.created_at.desc())
    if status is not None:
        statement = statement.where(Photo.status == status)

    return [photo_to_admin_read(photo) for photo in session.exec(statement.offset(offset).limit(limit)).all()]


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

    provided_fields = payload.model_fields_set
    if "caption" in provided_fields:
        photo.caption = normalize_photo_caption(payload.caption)
    if "description_blocks" in provided_fields:
        photo.description_blocks = normalize_photo_description_blocks(payload.description_blocks)

    attribution_fields = {
        "attribution_author",
        "attribution_license",
        "attribution_license_url",
        "attribution_source_url",
    }
    if provided_fields & attribution_fields:
        next_attribution_author = (
            payload.attribution_author if "attribution_author" in provided_fields else photo.attribution_author
        )
        next_attribution_license = (
            payload.attribution_license if "attribution_license" in provided_fields else photo.attribution_license
        )
        next_attribution_license_url = (
            payload.attribution_license_url
            if "attribution_license_url" in provided_fields
            else photo.attribution_license_url
        )
        next_attribution_source_url = (
            payload.attribution_source_url
            if "attribution_source_url" in provided_fields
            else photo.attribution_source_url
        )
        attribution = normalize_photo_attribution(
            attribution_author=next_attribution_author,
            attribution_license=next_attribution_license,
            attribution_license_url=next_attribution_license_url,
            attribution_source_url=next_attribution_source_url,
        )
        photo.attribution_author = attribution["attribution_author"]
        photo.attribution_source_url = attribution["attribution_source_url"]
        photo.attribution_license = attribution["attribution_license"]
        photo.attribution_license_url = attribution["attribution_license_url"]
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo_to_admin_read(photo)


@router.put("/{photo_id}/audio", response_model=PhotoAdminRead)
async def replace_photo_audio_attachment(
    photo_id: str,
    audio_file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    return photo_to_admin_read(await replace_photo_audio(photo, audio_file, session))


@router.delete("/{photo_id}/audio", response_model=PhotoAdminRead)
def delete_photo_audio_attachment(photo_id: str, session: Session = Depends(get_session)) -> PhotoAdminRead:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    return photo_to_admin_read(delete_photo_audio(photo, session))


@router.post("/{photo_id}/redaction", response_model=MediaRedactionReport)
def redact_photo(
    photo_id: str,
    payload: MediaRedactionPayload,
    session: Session = Depends(get_session),
) -> MediaRedactionReport:
    report = redact_admin_media("photo", photo_id, payload, session)
    return report


@router.post("/{photo_id}/cover", response_model=PlaceAdminRead)
def set_cover_photo(photo_id: str, session: Session = Depends(get_session)) -> PlaceAdminRead:
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
    return place_to_admin_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))


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
    delete_photo_files(photo)
    return None
