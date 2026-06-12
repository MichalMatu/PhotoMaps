from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.photo import Photo
from app.schemas.photo import PhotoRead
from app.serializers.photo import photo_to_read
from app.services.photo_uploads import create_photo_from_upload
from app.services.places import ensure_public_place

router = APIRouter(prefix="/api/places/{place_id}/photos", tags=["photos"])


@router.get("", response_model=list[PhotoRead])
def list_place_photos(place_id: str, session: Session = Depends(get_session)) -> list[PhotoRead]:
    place = ensure_public_place(place_id, session)
    statement = (
        select(Photo)
        .where(Photo.place_id == place_id)
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc())
    )
    photos = list(session.exec(statement).all())
    if place.cover_photo_id is not None:
        photos.sort(key=lambda photo: photo.id != place.cover_photo_id)
    return [photo_to_read(photo) for photo in photos]


@router.post("", response_model=PhotoRead, status_code=201)
async def upload_place_photo(
    place_id: str,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    consent_confirmed: bool = Form(...),
    session: Session = Depends(get_session),
) -> PhotoRead:
    ensure_public_place(place_id, session)
    if not consent_confirmed:
        raise HTTPException(status_code=422, detail="Publication consent is required")

    photo = await create_photo_from_upload(
        caption=caption,
        consent_confirmed=True,
        file=file,
        place_id=place_id,
        session=session,
        source="user_upload",
    )
    return photo_to_read(photo)
