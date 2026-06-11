from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.category import Category
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.memory import MemoryRead
from app.schemas.photo import PhotoRead
from app.schemas.place import PlaceMapRead, PlaceRead
from app.serializers.memory import memory_to_read
from app.serializers.photo import photo_to_read
from app.serializers.place import place_to_map_read, place_to_read
from app.services.places import sort_places_for_public_map

router = APIRouter(prefix="/api/places", tags=["places"])


@router.get("", response_model=list[PlaceRead])
def list_places(session: Session = Depends(get_session)) -> list[PlaceRead]:
    statement = select(Place).where(Place.status == "published")
    places = sort_places_for_public_map(list(session.exec(statement).all()))
    return [place_to_read(place) for place in places]


@router.get("/map", response_model=list[PlaceMapRead])
def list_map_places(session: Session = Depends(get_session)) -> list[PlaceMapRead]:
    statement = select(Place).where(Place.status == "published")
    places = sort_places_for_public_map(list(session.exec(statement).all()))
    if not places:
        return []

    place_ids = [place.id for place in places]
    category_ids = {place.category_id for place in places if place.category_id is not None}
    category_by_id: dict[str, Category] = {}
    if category_ids:
        categories = session.exec(select(Category).where(Category.id.in_(category_ids))).all()
        category_by_id = {category.id: category for category in categories}

    photos_by_place_id: dict[str, list[PhotoRead]] = {place_id: [] for place_id in place_ids}
    photos = session.exec(
        select(Photo)
        .where(Photo.place_id.in_(place_ids))
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc(), Photo.created_at.desc())
    ).all()
    for photo in photos:
        photos_by_place_id[photo.place_id].append(photo_to_read(photo))

    memories_by_place_id: dict[str, list[MemoryRead]] = {place_id: [] for place_id in place_ids}
    memories = session.exec(
        select(Memory)
        .where(Memory.place_id.in_(place_ids))
        .where(Memory.status == "approved")
        .order_by(Memory.approved_at.desc(), Memory.created_at.desc())
    ).all()
    for memory in memories:
        memories_by_place_id[memory.place_id].append(memory_to_read(memory))

    for place in places:
        if place.cover_photo_id is not None:
            photos_by_place_id[place.id].sort(key=lambda photo: photo.id != place.cover_photo_id)

    return [
        place_to_map_read(
            place,
            category_by_id.get(place.category_id) if place.category_id else None,
            photos_by_place_id[place.id],
            memories_by_place_id[place.id],
        )
        for place in places
    ]


@router.get("/{id_or_slug}", response_model=PlaceRead)
def get_place(id_or_slug: str, session: Session = Depends(get_session)) -> PlaceRead:
    statement = (
        select(Place).where((Place.id == id_or_slug) | (Place.slug == id_or_slug)).where(Place.status == "published")
    )
    place = session.exec(statement).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place_to_read(place)
