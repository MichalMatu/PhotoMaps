from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.place import Place
from app.schemas.place import PlaceRead
from app.services.ranking import place_score

router = APIRouter(prefix="/api/places", tags=["places"])


def place_to_read(place: Place) -> PlaceRead:
    return PlaceRead(
        id=place.id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        local_comment=place.local_comment,
        category_id=place.category_id,
        lat=place.lat,
        lon=place.lon,
        weight=place.weight,
        status=place.status,
        photo_count=place.photo_count,
        memory_count=place.memory_count,
        cover_photo_id=place.cover_photo_id,
        score=place_score(place),
        created_at=place.created_at,
        updated_at=place.updated_at,
    )


@router.get("", response_model=list[PlaceRead])
def list_places(session: Session = Depends(get_session)) -> list[PlaceRead]:
    statement = (
        select(Place)
        .where(Place.status == "published")
        .order_by(Place.weight.desc(), Place.created_at.desc())
    )
    return [place_to_read(place) for place in session.exec(statement).all()]


@router.get("/{id_or_slug}", response_model=PlaceRead)
def get_place(id_or_slug: str, session: Session = Depends(get_session)) -> PlaceRead:
    statement = (
        select(Place)
        .where((Place.id == id_or_slug) | (Place.slug == id_or_slug))
        .where(Place.status == "published")
    )
    place = session.exec(statement).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place_to_read(place)
