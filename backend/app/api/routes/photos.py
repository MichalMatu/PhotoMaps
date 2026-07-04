from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.photo import Photo
from app.schemas.photo import PhotoRead
from app.serializers.photo import photo_to_read
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
