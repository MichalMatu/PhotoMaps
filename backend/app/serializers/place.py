from collections.abc import Sequence

from app.models.category import Category
from app.models.city import City
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.app_config import PlaceCustomFieldDefinition
from app.schemas.place import (
    PlaceAdminRead,
    PlaceDetailRead,
    PlaceMapMemoryPreviewItem,
    PlaceMapPhotoPreviewItem,
    PlaceMapPhotoRead,
    PlaceMapPreviewItem,
    PlaceMapRead,
    PlaceRead,
)
from app.serializers.audio import audio_to_read
from app.serializers.category import category_to_read
from app.serializers.city import city_to_read
from app.services.app_config import public_place_custom_fields_for_definitions
from app.services.ranking import place_score


def place_to_read(
    place: Place,
    category_ids: list[str],
    custom_field_definitions: Sequence[PlaceCustomFieldDefinition],
) -> PlaceRead:
    return PlaceRead(
        **_place_read_data(
            place,
            category_ids,
            public_place_custom_fields_for_definitions(place.custom_fields, custom_field_definitions),
        )
    )


def place_to_admin_read(place: Place, category_ids: list[str]) -> PlaceAdminRead:
    return PlaceAdminRead(
        **_place_read_data(place, category_ids, place.custom_fields or {}),
        local_comment=place.local_comment,
        status=place.status,
        article_blocks=place.article_blocks or [],
    )


def place_to_detail_read(
    place: Place,
    category_ids: list[str],
    custom_field_definitions: Sequence[PlaceCustomFieldDefinition],
) -> PlaceDetailRead:
    return PlaceDetailRead(
        **_place_read_data(
            place,
            category_ids,
            public_place_custom_fields_for_definitions(place.custom_fields, custom_field_definitions),
        ),
        article_blocks=place.article_blocks or [],
    )


def _place_read_data(place: Place, category_ids: list[str], custom_fields: dict) -> dict:
    return PlaceRead(
        id=place.id,
        city_id=place.city_id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        category_ids=category_ids,
        lat=place.lat,
        lon=place.lon,
        weight=place.weight,
        custom_fields=custom_fields,
        photo_count=place.photo_count,
        memory_count=place.memory_count,
        cover_photo_id=place.cover_photo_id,
        score=place_score(place),
        created_at=place.created_at,
        updated_at=place.updated_at,
    ).model_dump()


def photo_to_map_photo(photo: Photo) -> PlaceMapPhotoRead:
    return PlaceMapPhotoRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        role=photo.role,
        source=photo.source,
        caption=photo.caption,
        description_blocks=photo.description_blocks or [],
        attribution_author=photo.attribution_author,
        attribution_source_url=photo.attribution_source_url,
        attribution_license=photo.attribution_license,
        attribution_license_url=photo.attribution_license_url,
        audio=audio_to_read(photo) if photo.status == "approved" else None,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )


def photo_to_map_preview(photo: Photo) -> PlaceMapPhotoPreviewItem:
    return PlaceMapPhotoPreviewItem(**photo_to_map_photo(photo).model_dump(), kind="photo")


def memory_to_map_preview(memory: Memory) -> PlaceMapMemoryPreviewItem:
    if memory.public_path is None or memory.thumb_path is None:
        raise ValueError("Public memory media is not published")
    return PlaceMapMemoryPreviewItem(
        id=memory.id,
        kind="memory",
        place_id=memory.place_id,
        public_path=memory.public_path,
        thumb_path=memory.thumb_path,
        caption=memory.caption,
        audio=audio_to_read(memory) if memory.status == "approved" else None,
        created_at=memory.created_at,
        approved_at=memory.approved_at,
    )


def place_to_map_read(
    place: Place,
    city: City,
    categories: list[Category],
    category_ids: list[str],
    cover_photo: PlaceMapPhotoRead | None,
    preview_items: list[PlaceMapPreviewItem],
    custom_field_definitions: Sequence[PlaceCustomFieldDefinition],
) -> PlaceMapRead:
    return PlaceMapRead(
        id=place.id,
        city_id=place.city_id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        category_ids=category_ids,
        lat=place.lat,
        lon=place.lon,
        weight=place.weight,
        custom_fields=public_place_custom_fields_for_definitions(place.custom_fields, custom_field_definitions),
        photo_count=place.photo_count,
        memory_count=place.memory_count,
        score=place_score(place),
        city=city_to_read(city),
        categories=[category_to_read(category) for category in categories],
        cover_photo=cover_photo,
        preview_items=preview_items,
    )
