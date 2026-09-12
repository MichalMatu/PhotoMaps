from collections.abc import Sequence

from app.models.category import Category
from app.models.city import City
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.app_config import PlaceCustomFieldDefinition
from app.schemas.public_discovery import PublicPlaceDetailRead, PublicPlaceIndexRead
from app.serializers.category import category_to_read
from app.serializers.city import city_to_read
from app.serializers.photo import photo_to_detail_read
from app.services.app_config import public_place_custom_fields_for_definitions
from app.services.ranking import place_score


def place_page_path(place: Place) -> str:
    return f"/places/{place.slug}"


def place_public_api_path(place: Place) -> str:
    return f"/api/public/cities/{place.city_id}/places/{place.slug}"


def place_to_public_index_read(
    place: Place,
    city: City,
    categories: list[Category],
    category_ids: list[str],
    custom_field_definitions: Sequence[PlaceCustomFieldDefinition],
) -> PublicPlaceIndexRead:
    return PublicPlaceIndexRead(
        id=place.id,
        city_id=place.city_id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        category_ids=category_ids,
        categories=[category_to_read(category) for category in categories],
        city=city_to_read(city),
        lat=place.lat,
        lon=place.lon,
        weight=place.weight,
        custom_fields=public_place_custom_fields_for_definitions(place.custom_fields, custom_field_definitions),
        photo_count=place.photo_count,
        memory_count=place.memory_count,
        score=place_score(place),
        page_path=place_page_path(place),
        api_path=place_public_api_path(place),
        created_at=place.created_at,
        updated_at=place.updated_at,
    )


def place_to_public_detail_read(
    place: Place,
    city: City,
    categories: list[Category],
    category_ids: list[str],
    photos: list[Photo],
    custom_field_definitions: Sequence[PlaceCustomFieldDefinition],
) -> PublicPlaceDetailRead:
    public_photos = [photo_to_detail_read(photo) for photo in photos]
    cover_photo = next((photo for photo in public_photos if photo.id == place.cover_photo_id), None)
    return PublicPlaceDetailRead(
        **place_to_public_index_read(place, city, categories, category_ids, custom_field_definitions).model_dump(),
        article_blocks=place.article_blocks or [],
        photos=public_photos,
        cover_photo=cover_photo,
    )
