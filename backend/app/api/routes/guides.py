from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.guide import Guide, PlaceGuide
from app.models.place import Place
from app.schemas.guide import GuideDetailRead, GuideRead
from app.serializers.guide import guide_to_detail, guide_to_read
from app.services.guide_previews import approved_cover_photos_by_place

router = APIRouter(prefix="/api/guides", tags=["guides"])


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
    guides = list(session.exec(statement).all())
    places_by_guide = {guide.id: public_guide_places(session, guide.id) for guide in guides}
    cover_photos_by_place = approved_cover_photos_by_place(
        session,
        [place for places in places_by_guide.values() for place in places],
    )
    return [guide_to_read(guide, places_by_guide[guide.id], cover_photos_by_place) for guide in guides]


@router.get("/{slug}", response_model=GuideDetailRead)
def get_guide(slug: str, session: Session = Depends(get_session)) -> GuideDetailRead:
    statement = select(Guide).where(Guide.slug == slug).where(Guide.status == "published")
    guide = session.exec(statement).first()
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    places = public_guide_places(session, guide.id)
    return guide_to_detail(guide, places, approved_cover_photos_by_place(session, places))
