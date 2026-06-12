from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.city import City
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.place import PlaceMapPreviewItem, PlaceMapRead, PlaceRead
from app.serializers.photo import photo_to_read
from app.serializers.place import memory_to_map_preview, photo_to_map_preview, place_to_map_read, place_to_read
from app.services.place_taxonomy import categories_by_place_id, category_ids_by_place_id
from app.services.places import public_places_statement, sort_places_for_public_map

router = APIRouter(prefix="/api/places", tags=["places"])

MAP_PREVIEW_ITEMS_PER_PLACE = 6


@router.get("", response_model=list[PlaceRead])
def list_places(session: Session = Depends(get_session)) -> list[PlaceRead]:
    places = sort_places_for_public_map(list(session.exec(public_places_statement()).all()))
    category_ids_by_place = category_ids_by_place_id(session, [place.id for place in places])
    return [place_to_read(place, category_ids_by_place.get(place.id, [])) for place in places]


@router.get("/map", response_model=list[PlaceMapRead])
def list_map_places(session: Session = Depends(get_session)) -> list[PlaceMapRead]:
    places = sort_places_for_public_map(list(session.exec(public_places_statement()).all()))
    if not places:
        return []

    place_ids = [place.id for place in places]
    city_ids = {place.city_id for place in places}
    cities = session.exec(select(City).where(City.id.in_(city_ids))).all()
    city_by_id = {city.id: city for city in cities}
    if len(city_by_id) != len(city_ids):
        raise HTTPException(status_code=500, detail="Map place references missing city")

    category_ids_by_place = category_ids_by_place_id(session, place_ids)
    categories_by_place = categories_by_place_id(session, place_ids)

    photos_by_place_id: dict[str, list[Photo]] = {place_id: [] for place_id in place_ids}
    photos = session.exec(
        select(Photo)
        .where(Photo.place_id.in_(place_ids))
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc(), Photo.created_at.desc())
    ).all()
    for photo in photos:
        photos_by_place_id[photo.place_id].append(photo)

    memories_by_place_id: dict[str, list[Memory]] = {place_id: [] for place_id in place_ids}
    memories = session.exec(
        select(Memory)
        .where(Memory.place_id.in_(place_ids))
        .where(Memory.status == "approved")
        .order_by(Memory.approved_at.desc(), Memory.created_at.desc())
    ).all()
    for memory in memories:
        memories_by_place_id[memory.place_id].append(memory)

    for place in places:
        if place.cover_photo_id is not None:
            photos_by_place_id[place.id].sort(key=lambda photo: photo.id != place.cover_photo_id)

    def preview_items_for_place(place: Place) -> list[PlaceMapPreviewItem]:
        photo_items = [photo_to_map_preview(photo) for photo in photos_by_place_id[place.id]]
        memory_items = [memory_to_map_preview(memory) for memory in memories_by_place_id[place.id]]
        selected_items = [*photo_items[:3], *memory_items[:3]]
        selected_keys = {(item.kind, item.id) for item in selected_items}
        remaining_items = [
            item for item in [*photo_items[3:], *memory_items[3:]] if (item.kind, item.id) not in selected_keys
        ]
        return [*selected_items, *remaining_items][:MAP_PREVIEW_ITEMS_PER_PLACE]

    return [
        place_to_map_read(
            place,
            city_by_id[place.city_id],
            categories_by_place.get(place.id, []),
            category_ids_by_place.get(place.id, []),
            photo_to_read(photos_by_place_id[place.id][0]) if photos_by_place_id[place.id] else None,
            preview_items_for_place(place),
        )
        for place in places
    ]


@router.get("/{id_or_slug}", response_model=PlaceRead)
def get_place(id_or_slug: str, session: Session = Depends(get_session)) -> PlaceRead:
    statement = public_places_statement().where((Place.id == id_or_slug) | (Place.slug == id_or_slug))
    place = session.exec(statement).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place_to_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))
