from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.place import Place
from app.schemas.photo import PhotoAdminRead
from app.serializers.photo import photo_to_admin_read
from app.services.photo_uploads import create_photo_from_upload

router = APIRouter(
    prefix="/api/admin/places/{place_id}/photos",
    tags=["admin photos"],
    dependencies=[Depends(require_admin_token)],
)


@router.post("", response_model=PhotoAdminRead, status_code=201)
async def upload_admin_place_photo(
    place_id: str,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    session: Session = Depends(get_session),
) -> PhotoAdminRead:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    photo = await create_photo_from_upload(
        caption=caption,
        consent_confirmed=True,
        file=file,
        place_id=place.id,
        session=session,
        source="editorial",
    )
    return photo_to_admin_read(photo)
