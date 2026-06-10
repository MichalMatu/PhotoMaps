from app.models.guide import Guide
from app.models.place import Place
from app.schemas.guide import GuideDetailRead, GuideRead
from app.serializers.place import place_to_read


def guide_to_read(guide: Guide) -> GuideRead:
    return GuideRead(
        id=guide.id,
        slug=guide.slug,
        title=guide.title,
        description=guide.description,
        status=guide.status,
        created_at=guide.created_at,
        updated_at=guide.updated_at,
    )


def guide_to_detail(guide: Guide, places: list[Place]) -> GuideDetailRead:
    return GuideDetailRead(**guide_to_read(guide).model_dump(), places=[place_to_read(place) for place in places])
