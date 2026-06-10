from app.models.category import Category
from app.models.place import Place
from app.schemas.memory import MemoryRead
from app.schemas.photo import PhotoRead
from app.schemas.place import PlaceMapRead, PlaceRead
from app.serializers.category import category_to_read
from app.services.ranking import place_score


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


def place_to_map_read(
    place: Place,
    category: Category | None,
    photos: list[PhotoRead],
    memories: list[MemoryRead],
) -> PlaceMapRead:
    cover_photo = next((photo for photo in photos if photo.id == place.cover_photo_id), photos[0] if photos else None)
    return PlaceMapRead(
        **place_to_read(place).model_dump(),
        category=category_to_read(category) if category else None,
        cover_photo=cover_photo,
        photos=photos,
        memories=memories,
    )
