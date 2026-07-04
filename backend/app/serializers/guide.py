from app.models.guide import Guide
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.guide import (
    GuideDetailRead,
    GuidePlacePreviewRead,
    GuideRead,
    GuideRoutePoint,
    PublicGuideDetailRead,
    PublicGuidePlacePreviewRead,
    PublicGuideRead,
)
from app.serializers.photo import photo_to_read

GUIDE_PREVIEW_PLACE_LIMIT = 4


def guide_place_to_preview(place: Place, cover_photo: Photo | None) -> GuidePlacePreviewRead:
    return GuidePlacePreviewRead(
        id=place.id,
        city_id=place.city_id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        lat=place.lat,
        lon=place.lon,
        local_comment=place.local_comment,
        status=place.status,
        photo_count=place.photo_count,
        memory_count=place.memory_count,
        cover_photo=photo_to_read(cover_photo) if cover_photo else None,
    )


def guide_place_to_public_preview(place: Place, cover_photo: Photo | None) -> PublicGuidePlacePreviewRead:
    return PublicGuidePlacePreviewRead(
        id=place.id,
        city_id=place.city_id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        lat=place.lat,
        lon=place.lon,
        photo_count=place.photo_count,
        memory_count=place.memory_count,
        cover_photo=photo_to_read(cover_photo) if cover_photo else None,
    )


def guide_cover_photo(places: list[Place], cover_photos_by_place: dict[str, Photo]) -> Photo | None:
    for place in places:
        cover_photo = cover_photos_by_place.get(place.id)
        if cover_photo:
            return cover_photo
    return None


def guide_route_points(guide: Guide) -> list[GuideRoutePoint]:
    return [GuideRoutePoint(**point) for point in guide.route_points or []]


def guide_to_read(
    guide: Guide,
    places: list[Place],
    cover_photos_by_place: dict[str, Photo],
    preview_limit: int = GUIDE_PREVIEW_PLACE_LIMIT,
) -> GuideRead:
    cover_photo = guide_cover_photo(places, cover_photos_by_place)
    return GuideRead(
        id=guide.id,
        slug=guide.slug,
        title=guide.title,
        description=guide.description,
        article_blocks=guide.article_blocks or [],
        status=guide.status,
        place_count=len(places),
        cover_photo=photo_to_read(cover_photo) if cover_photo else None,
        preview_places=[
            guide_place_to_preview(place, cover_photos_by_place.get(place.id)) for place in places[:preview_limit]
        ],
        route_points=guide_route_points(guide),
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


def guide_to_detail(guide: Guide, places: list[Place], cover_photos_by_place: dict[str, Photo]) -> GuideDetailRead:
    return GuideDetailRead(
        **guide_to_read(guide, places, cover_photos_by_place).model_dump(),
        places=[guide_place_to_preview(place, cover_photos_by_place.get(place.id)) for place in places],
    )


def guide_to_public_read(
    guide: Guide,
    places: list[Place],
    cover_photos_by_place: dict[str, Photo],
    preview_limit: int = GUIDE_PREVIEW_PLACE_LIMIT,
) -> PublicGuideRead:
    cover_photo = guide_cover_photo(places, cover_photos_by_place)
    return PublicGuideRead(
        id=guide.id,
        slug=guide.slug,
        title=guide.title,
        description=guide.description,
        article_blocks=guide.article_blocks or [],
        place_count=len(places),
        cover_photo=photo_to_read(cover_photo) if cover_photo else None,
        preview_places=[
            guide_place_to_public_preview(place, cover_photos_by_place.get(place.id))
            for place in places[:preview_limit]
        ],
        route_points=guide_route_points(guide),
    )


def guide_to_public_detail(
    guide: Guide, places: list[Place], cover_photos_by_place: dict[str, Photo]
) -> PublicGuideDetailRead:
    return PublicGuideDetailRead(
        **guide_to_public_read(guide, places, cover_photos_by_place).model_dump(),
        places=[guide_place_to_public_preview(place, cover_photos_by_place.get(place.id)) for place in places],
    )
