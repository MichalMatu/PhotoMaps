from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.city import City
from app.models.place import Place
from app.services.ranking import place_score

PLACE_STATUSES = {"draft", "published", "archived"}


def ensure_place_status(status: str) -> None:
    if status not in PLACE_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported place status")


def ensure_slug_available(session: Session, slug: str, place_id: str | None = None) -> None:
    statement = select(Place).where(Place.slug == slug)
    existing = session.exec(statement).first()
    if existing is not None and existing.id != place_id:
        raise HTTPException(status_code=409, detail="Slug already exists")


def ensure_public_place(place_id: str, session: Session) -> Place:
    place = session.exec(public_places_statement().where(Place.id == place_id)).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


def public_places_statement():
    return (
        select(Place).join(City, Place.city_id == City.id).where(Place.status == "published", City.status == "active")
    )


def sort_places_for_public_map(places: list[Place]) -> list[Place]:
    return sorted(places, key=lambda place: (place_score(place), place.created_at), reverse=True)
