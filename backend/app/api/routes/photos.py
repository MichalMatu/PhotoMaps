from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.photo import PhotoRead
from app.services.media.images import store_uploaded_image

router = APIRouter(prefix="/api/places/{place_id}/photos", tags=["photos"])


def ensure_public_place(place_id: str, session: Session) -> Place:
    place = session.get(Place, place_id)
    if place is None or place.status != "published" or place.is_chain:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


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


@router.get("", response_model=list[PhotoRead])
def list_place_photos(place_id: str, session: Session = Depends(get_session)) -> list[PhotoRead]:
    ensure_public_place(place_id, session)
    statement = (
        select(Photo)
        .where(Photo.place_id == place_id)
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc())
    )
    return [photo_to_read(photo) for photo in session.exec(statement).all()]


@router.post("", response_model=PhotoRead, status_code=201)
async def upload_place_photo(
    place_id: str,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    session: Session = Depends(get_session),
) -> PhotoRead:
    ensure_public_place(place_id, session)
    stored_image = await store_uploaded_image(file, place_id)
    photo = Photo(
        place_id=place_id,
        original_path=stored_image.original_path,
        public_path=stored_image.public_path,
        thumb_path=stored_image.thumb_path,
        status="pending",
        caption=caption,
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo_to_read(photo)
