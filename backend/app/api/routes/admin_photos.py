from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.api.pagination import ADMIN_QUEUE_DEFAULT_LIMIT, ADMIN_QUEUE_MAX_LIMIT
from app.api.redaction import redact_admin_media
from app.db.session import get_session
from app.schemas.contract_types import ReviewStatus
from app.schemas.media_redaction import MediaRedactionPayload, MediaRedactionReport
from app.schemas.photo import PhotoAdminRead, PhotoReview, PhotoUpdate
from app.schemas.place import PlaceAdminRead
from app.serializers.photo import photo_to_admin_read
from app.serializers.place import place_to_admin_read
from app.services.admin_photos import (
    delete_admin_photo,
    delete_admin_photo_audio,
    list_admin_photo_queue,
    replace_admin_photo_audio,
    review_admin_photo,
    set_admin_cover_photo,
    update_admin_photo,
)
from app.services.place_taxonomy import category_ids_by_place_id

router = APIRouter(prefix="/api/admin/photos", tags=["admin photos"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[PhotoAdminRead])
def list_admin_photos(
    status: ReviewStatus | None = Query(default=None),
    limit: int = Query(default=ADMIN_QUEUE_DEFAULT_LIMIT, ge=1, le=ADMIN_QUEUE_MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> list[PhotoAdminRead]:
    photos = list_admin_photo_queue(session, limit=limit, offset=offset, status=status)
    return [photo_to_admin_read(photo) for photo in photos]


@router.post("/{photo_id}/review", response_model=PhotoAdminRead)
def review_photo(
    photo_id: str,
    payload: PhotoReview,
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    return photo_to_admin_read(review_admin_photo(session, photo_id, payload.status))


@router.patch("/{photo_id}", response_model=PhotoAdminRead)
def update_photo(
    photo_id: str,
    payload: PhotoUpdate,
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    return photo_to_admin_read(update_admin_photo(session, photo_id, payload))


@router.put("/{photo_id}/audio", response_model=PhotoAdminRead)
async def replace_photo_audio_attachment(
    photo_id: str,
    audio_file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    return photo_to_admin_read(await replace_admin_photo_audio(session, photo_id, audio_file))


@router.delete("/{photo_id}/audio", response_model=PhotoAdminRead)
def delete_photo_audio_attachment(photo_id: str, session: Session = Depends(get_session)) -> PhotoAdminRead:
    return photo_to_admin_read(delete_admin_photo_audio(session, photo_id))


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
    place = set_admin_cover_photo(session, photo_id)
    return place_to_admin_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))


@router.delete("/{photo_id}", status_code=204)
def delete_photo_route(photo_id: str, session: Session = Depends(get_session)) -> None:
    delete_admin_photo(session, photo_id)
