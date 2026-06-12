from app.models.category import Category
from app.models.city import City
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.photo import PhotoRead
from app.schemas.place import PlaceMapPreviewItem, PlaceMapRead, PlaceRead
from app.serializers.category import category_to_read
from app.serializers.city import city_to_read
from app.services.ranking import place_score


def place_to_read(place: Place, category_ids: list[str]) -> PlaceRead:
    return PlaceRead(
        id=place.id,
        city_id=place.city_id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        local_comment=place.local_comment,
        category_ids=category_ids,
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


def photo_to_map_preview(photo: Photo) -> PlaceMapPreviewItem:
    return PlaceMapPreviewItem(
        id=photo.id,
        kind="photo",
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        role=photo.role,
        source=photo.source,
        caption=photo.caption,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )


def memory_to_map_preview(memory: Memory) -> PlaceMapPreviewItem:
    return PlaceMapPreviewItem(
        id=memory.id,
        kind="memory",
        place_id=memory.place_id,
        public_path=memory.public_path,
        thumb_path=memory.thumb_path,
        caption=memory.caption,
        created_at=memory.created_at,
        approved_at=memory.approved_at,
    )


def place_to_map_read(
    place: Place,
    city: City,
    categories: list[Category],
    category_ids: list[str],
    cover_photo: PhotoRead | None,
    preview_items: list[PlaceMapPreviewItem],
) -> PlaceMapRead:
    return PlaceMapRead(
        **place_to_read(place, category_ids).model_dump(),
        city=city_to_read(city),
        categories=[category_to_read(category) for category in categories],
        cover_photo=cover_photo,
        preview_items=preview_items,
    )
