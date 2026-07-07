from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.guide import Guide
from app.schemas.guide import PublicGuideDetailRead, PublicGuideRead
from app.serializers.guide import guide_to_public_detail, guide_to_public_read
from app.services.guide_previews import approved_cover_photos_by_place
from app.services.public_guides import public_guide_by_slug, public_guide_places

router = APIRouter(prefix="/api/guides", tags=["guides"])


@router.get("", response_model=list[PublicGuideRead])
def list_guides(session: Session = Depends(get_session)) -> list[PublicGuideRead]:
    statement = select(Guide).where(Guide.status == "published").order_by(Guide.updated_at.desc())
    places_by_guide = {}
    guides = []
    for guide in session.exec(statement).all():
        places = public_guide_places(session, guide.id)
        if places:
            guides.append(guide)
            places_by_guide[guide.id] = places
    cover_photos_by_place = approved_cover_photos_by_place(
        session,
        [place for places in places_by_guide.values() for place in places],
    )
    return [guide_to_public_read(guide, places_by_guide[guide.id], cover_photos_by_place) for guide in guides]


@router.get("/{slug}", response_model=PublicGuideDetailRead)
def get_guide(slug: str, session: Session = Depends(get_session)) -> PublicGuideDetailRead:
    public_guide = public_guide_by_slug(session, slug)
    if public_guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    guide, places = public_guide
    return guide_to_public_detail(guide, places, approved_cover_photos_by_place(session, places))
