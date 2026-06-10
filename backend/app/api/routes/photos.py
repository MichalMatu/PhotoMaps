from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.photo import Photo
from app.schemas.photo import PhotoAdminRead, PhotoRead
from app.services.media.images import store_uploaded_image
from app.services.places import ensure_public_place

router = APIRouter(prefix="/api/places/{place_id}/photos", tags=["photos"])
MAX_PHOTO_CAPTION_LENGTH = 120


def photo_to_read(photo: Photo) -> PhotoRead:
    return PhotoRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        status=photo.status,
        caption=photo.caption,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )


def photo_to_admin_read(photo: Photo) -> PhotoAdminRead:
    return PhotoAdminRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        status=photo.status,
        caption=photo.caption,
        consent_confirmed=photo.consent_confirmed,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )


def normalize_photo_caption(caption: str | None) -> str | None:
    if caption is None:
        return None

    normalized_caption = caption.strip()
    if not normalized_caption:
        return None
    if len(normalized_caption) > MAX_PHOTO_CAPTION_LENGTH:
        raise HTTPException(status_code=422, detail=f"Photo caption must have at most {MAX_PHOTO_CAPTION_LENGTH} characters")
    return normalized_caption


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

    normalized_caption = normalize_photo_caption(caption)
    stored_image = await store_uploaded_image(file, place_id, "photos")
    photo = Photo(
        place_id=place_id,
        original_path=stored_image.original_path,
        public_path=stored_image.public_path,
        thumb_path=stored_image.thumb_path,
        status="pending",
        caption=normalized_caption,
        consent_confirmed=True,
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo_to_read(photo)
