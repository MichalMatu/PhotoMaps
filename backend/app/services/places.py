from datetime import UTC, datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.city import City
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.place import (
    PlaceAdminRead,
    PlaceCreate,
    PlaceMapPreviewItem,
    PlaceMapRead,
    PlaceUpdate,
)
from app.serializers.place import (
    memory_to_map_preview,
    photo_to_map_photo,
    photo_to_map_preview,
    place_to_admin_read,
    place_to_map_read,
)
from app.services.app_config import get_place_custom_field_definitions, normalize_place_custom_fields
from app.services.cities import ensure_active_city
from app.services.content_blocks import content_blocks_for_storage
from app.services.place_deletion import delete_place_permanently
from app.services.place_taxonomy import categories_by_place_id, category_ids_by_place_id, replace_place_categories
from app.services.ranking import place_score

PLACE_STATUSES = {"draft", "published", "archived"}
MAP_PREVIEW_ITEMS_PER_PLACE = 6


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


def ensure_public_map_city(session: Session, city_id: str) -> City:
    city = session.get(City, city_id)
    if city is None or city.status != "active":
        raise HTTPException(status_code=404, detail="City not found")
    return city


def ensure_cover_photo(session: Session, place_id: str, cover_photo_id: str | None) -> None:
    if cover_photo_id is None:
        return

    photo = session.get(Photo, cover_photo_id)
    if photo is None or photo.place_id != place_id:
        raise HTTPException(status_code=422, detail="Cover photo must belong to place")
    if photo.status != "approved":
        raise HTTPException(status_code=422, detail="Cover photo must be approved")


def normalize_custom_fields_for_api(custom_fields: dict | None, session: Session) -> dict:
    try:
        return normalize_place_custom_fields(custom_fields, definitions=get_place_custom_field_definitions(session))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def serialize_admin_place(session: Session, place: Place) -> PlaceAdminRead:
    return place_to_admin_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))


def list_admin_places(session: Session) -> list[PlaceAdminRead]:
    statement = select(Place).order_by(Place.created_at.desc())
    places = list(session.exec(statement).all())
    category_ids_by_place = category_ids_by_place_id(session, [place.id for place in places])
    return [place_to_admin_read(place, category_ids_by_place.get(place.id, [])) for place in places]


def create_admin_place(session: Session, payload: PlaceCreate) -> PlaceAdminRead:
    ensure_place_status(payload.status)
    ensure_slug_available(session, payload.slug)
    ensure_active_city(session, payload.city_id)
    data = payload.model_dump(exclude={"category_ids"})
    data["custom_fields"] = normalize_custom_fields_for_api(payload.custom_fields, session)
    data["article_blocks"] = content_blocks_for_storage(payload.article_blocks)
    place = Place.model_validate(data)
    session.add(place)
    session.flush()
    replace_place_categories(session, place.id, payload.category_ids)
    session.commit()
    session.refresh(place)
    return serialize_admin_place(session, place)


def update_admin_place(session: Session, place_id: str, payload: PlaceUpdate) -> PlaceAdminRead:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        ensure_place_status(data["status"])
    if "slug" in data and data["slug"] is not None:
        ensure_slug_available(session, data["slug"], place.id)
    if "city_id" in data and data["city_id"] is not None:
        ensure_active_city(session, data["city_id"])
    if "cover_photo_id" in data:
        ensure_cover_photo(session, place.id, data["cover_photo_id"])
    if "custom_fields" in data:
        data["custom_fields"] = normalize_custom_fields_for_api(data["custom_fields"], session)
    if "article_blocks" in data:
        data["article_blocks"] = content_blocks_for_storage(payload.article_blocks or [])

    category_ids = data.pop("category_ids", None)

    for key, value in data.items():
        setattr(place, key, value)
    if category_ids is not None:
        replace_place_categories(session, place.id, category_ids)
    place.updated_at = datetime.now(UTC)

    session.add(place)
    session.commit()
    session.refresh(place)
    return serialize_admin_place(session, place)


def delete_admin_place(session: Session, place_id: str, *, force: bool) -> PlaceAdminRead | None:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    if force:
        delete_place_permanently(place, session)
        return None

    place.status = "archived"
    place.updated_at = datetime.now(UTC)
    session.add(place)
    session.commit()
    session.refresh(place)
    return serialize_admin_place(session, place)


def approved_photos_by_place_id(session: Session, place_ids: list[str]) -> dict[str, list[Photo]]:
    photos_by_place_id: dict[str, list[Photo]] = {place_id: [] for place_id in place_ids}
    photos = session.exec(
        select(Photo)
        .where(Photo.place_id.in_(place_ids))
        .where(Photo.status == "approved")
        .order_by(Photo.approved_at.desc(), Photo.created_at.desc())
    ).all()
    for photo in photos:
        photos_by_place_id[photo.place_id].append(photo)
    return photos_by_place_id


def approved_memories_by_place_id(session: Session, place_ids: list[str]) -> dict[str, list[Memory]]:
    memories_by_place_id: dict[str, list[Memory]] = {place_id: [] for place_id in place_ids}
    memories = session.exec(
        select(Memory)
        .where(Memory.place_id.in_(place_ids))
        .where(Memory.status == "approved")
        .order_by(Memory.approved_at.desc(), Memory.created_at.desc())
    ).all()
    for memory in memories:
        memories_by_place_id[memory.place_id].append(memory)
    return memories_by_place_id


def map_preview_items_for_place(
    place: Place,
    photos_by_place_id: dict[str, list[Photo]],
    memories_by_place_id: dict[str, list[Memory]],
    limit: int = MAP_PREVIEW_ITEMS_PER_PLACE,
) -> list[PlaceMapPreviewItem]:
    photo_items = [photo_to_map_preview(photo) for photo in photos_by_place_id[place.id]]
    memory_items = [memory_to_map_preview(memory) for memory in memories_by_place_id[place.id]]
    selected_items = [*photo_items[:3], *memory_items[:3]]
    selected_keys = {(item.kind, item.id) for item in selected_items}
    remaining_items = [
        item for item in [*photo_items[3:], *memory_items[3:]] if (item.kind, item.id) not in selected_keys
    ]
    return [*selected_items, *remaining_items][:limit]


def list_public_map_places(session: Session, city_id: str) -> list[PlaceMapRead]:
    city = ensure_public_map_city(session, city_id)
    places = sort_places_for_public_map(
        list(session.exec(public_places_statement().where(Place.city_id == city.id)).all())
    )
    if not places:
        return []

    place_ids = [place.id for place in places]
    category_ids_by_place = category_ids_by_place_id(session, place_ids)
    categories_by_place = categories_by_place_id(session, place_ids)
    custom_field_definitions = get_place_custom_field_definitions(session)
    photos_by_place_id = approved_photos_by_place_id(session, place_ids)
    memories_by_place_id = approved_memories_by_place_id(session, place_ids)

    for place in places:
        if place.cover_photo_id is not None:
            photos_by_place_id[place.id].sort(key=lambda photo: photo.id != place.cover_photo_id)

    map_places: list[PlaceMapRead] = []
    for place in places:
        preview_items = map_preview_items_for_place(place, photos_by_place_id, memories_by_place_id)
        cover_photo = photo_to_map_photo(photos_by_place_id[place.id][0]) if photos_by_place_id[place.id] else None
        if cover_photo is None and not preview_items:
            continue
        map_places.append(
            place_to_map_read(
                place,
                city,
                categories_by_place.get(place.id, []),
                category_ids_by_place.get(place.id, []),
                cover_photo,
                preview_items,
                custom_field_definitions,
            )
        )
    return map_places
