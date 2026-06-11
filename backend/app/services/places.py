from fastapi import HTTPException
from sqlmodel import Session, select

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
    place = session.get(Place, place_id)
    if place is None or place.status != "published":
        raise HTTPException(status_code=404, detail="Place not found")
    return place


def sort_places_for_public_map(places: list[Place]) -> list[Place]:
    return sorted(places, key=lambda place: (place_score(place), place.created_at), reverse=True)
