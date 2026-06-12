from app.models.guide import Guide
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.guide import GuideDetailRead, GuidePlacePreviewRead, GuideRead
from app.serializers.photo import photo_to_read

GUIDE_PREVIEW_PLACE_LIMIT = 4


def guide_place_to_preview(place: Place, cover_photo: Photo | None) -> GuidePlacePreviewRead:
    return GuidePlacePreviewRead(
        id=place.id,
        slug=place.slug,
        title=place.title,
        description=place.description,
        local_comment=place.local_comment,
        status=place.status,
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
        status=guide.status,
        place_count=len(places),
        cover_photo=photo_to_read(cover_photo) if cover_photo else None,
        preview_places=[
            guide_place_to_preview(place, cover_photos_by_place.get(place.id)) for place in places[:preview_limit]
        ],
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


def guide_to_detail(guide: Guide, places: list[Place], cover_photos_by_place: dict[str, Photo]) -> GuideDetailRead:
    return GuideDetailRead(
        **guide_to_read(guide, places, cover_photos_by_place).model_dump(),
        places=[guide_place_to_preview(place, cover_photos_by_place.get(place.id)) for place in places],
    )
