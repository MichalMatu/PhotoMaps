from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.place import Place
from app.schemas.contract_types import ReviewStatus
from app.schemas.photo import PhotoAdminRead
from app.serializers.photo import photo_to_admin_read
from app.services.admin_photos import AdminPhotoAudioFilter
from app.services.admin_photos import list_admin_place_photos as list_admin_place_photo_records
from app.services.photo_fields import photo_description_blocks_from_form
from app.services.photo_uploads import create_editorial_photo_from_upload

router = APIRouter(
    prefix="/api/admin/places/{place_id}/photos",
    tags=["admin photos"],
    dependencies=[Depends(require_admin_token)],
)


@router.get("", response_model=list[PhotoAdminRead])
def list_admin_place_photos(
    place_id: str,
    status: ReviewStatus | None = Query(default=None),
    query: str | None = Query(default=None),
    audio: AdminPhotoAudioFilter = Query(default="all"),
    session: Session = Depends(get_session),
) -> list[PhotoAdminRead]:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    photos = list_admin_place_photo_records(session, place_id=place.id, status=status, query=query, audio=audio)
    return [photo_to_admin_read(photo) for photo in photos]


@router.post("", response_model=PhotoAdminRead, status_code=201)
async def upload_admin_place_photo(
    place_id: str,
    file: UploadFile = File(...),
    audio_file: UploadFile | None = File(default=None),
    caption: str | None = Form(default=None),
    description_blocks: str | None = Form(default=None),
    attribution_author: str | None = Form(default=None),
    attribution_source_url: str | None = Form(default=None),
    attribution_license: str | None = Form(default=None),
    attribution_license_url: str | None = Form(default=None),
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    photo = await create_editorial_photo_from_upload(
        audio_file=audio_file,
        attribution_author=attribution_author,
        attribution_license=attribution_license,
        attribution_license_url=attribution_license_url,
        attribution_source_url=attribution_source_url,
        caption=caption,
        description_blocks=photo_description_blocks_from_form(description_blocks),
        file=file,
        place_id=place.id,
        session=session,
    )
    return photo_to_admin_read(photo)
