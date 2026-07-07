from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.photo import PhotoRead
from app.serializers.photo import photo_to_read
from app.services.places import ensure_public_place, list_public_place_photos

router = APIRouter(prefix="/api/places/{place_id}/photos", tags=["photos"])


@router.get("", response_model=list[PhotoRead])
def list_place_photos(place_id: str, session: Session = Depends(get_session)) -> list[PhotoRead]:
    place = ensure_public_place(place_id, session)
    photos = list_public_place_photos(session, place)
    return [photo_to_read(photo) for photo in photos]
