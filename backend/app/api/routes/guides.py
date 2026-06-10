from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.routes.places import place_to_read
from app.db.session import get_session
from app.models.guide import Guide, PlaceGuide
from app.models.place import Place
from app.schemas.guide import GuideDetailRead, GuideRead

router = APIRouter(prefix="/api/guides", tags=["guides"])


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


def public_guide_places(session: Session, guide_id: str) -> list[Place]:
    statement = (
        select(Place)
        .join(PlaceGuide, PlaceGuide.place_id == Place.id)
        .where(PlaceGuide.guide_id == guide_id)
        .where(Place.status == "published")
        .order_by(PlaceGuide.sort_order, Place.title)
    )
    return list(session.exec(statement).all())


@router.get("", response_model=list[GuideRead])
def list_guides(session: Session = Depends(get_session)) -> list[GuideRead]:
    statement = select(Guide).where(Guide.status == "published").order_by(Guide.updated_at.desc())
    return [guide_to_read(guide) for guide in session.exec(statement).all()]


@router.get("/{slug}", response_model=GuideDetailRead)
def get_guide(slug: str, session: Session = Depends(get_session)) -> GuideDetailRead:
    statement = select(Guide).where(Guide.slug == slug).where(Guide.status == "published")
    guide = session.exec(statement).first()
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    return guide_to_detail(guide, public_guide_places(session, guide.id))
