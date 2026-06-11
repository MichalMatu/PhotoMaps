from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.guide import Guide, PlaceGuide
from app.models.place import Place
from app.schemas.guide import GuideCreate, GuideDetailRead, GuidePlaceCreate, GuideRead, GuideUpdate
from app.serializers.guide import guide_to_detail, guide_to_read
from app.services.guides import ensure_guide_slug_available, ensure_guide_status
from app.services.place_taxonomy import category_ids_by_place_id

router = APIRouter(prefix="/api/admin/guides", tags=["admin guides"], dependencies=[Depends(require_admin_token)])


def admin_guide_places(session: Session, guide_id: str) -> list[Place]:
    statement = (
        select(Place)
        .join(PlaceGuide, PlaceGuide.place_id == Place.id)
        .where(PlaceGuide.guide_id == guide_id)
        .order_by(PlaceGuide.sort_order, Place.title)
    )
    return list(session.exec(statement).all())


@router.get("", response_model=list[GuideRead])
def list_admin_guides(session: Session = Depends(get_session)) -> list[GuideRead]:
    statement = select(Guide).order_by(Guide.updated_at.desc())
    return [guide_to_read(guide) for guide in session.exec(statement).all()]


@router.get("/{guide_id}", response_model=GuideDetailRead)
def get_admin_guide(guide_id: str, session: Session = Depends(get_session)) -> GuideDetailRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    places = admin_guide_places(session, guide.id)
    return guide_to_detail(guide, places, category_ids_by_place_id(session, [place.id for place in places]))


@router.post("", response_model=GuideRead, status_code=201)
def create_guide(payload: GuideCreate, session: Session = Depends(get_session)) -> GuideRead:
    ensure_guide_status(payload.status)
    ensure_guide_slug_available(session, payload.slug)
    guide = Guide.model_validate(payload)
    session.add(guide)
    session.commit()
    session.refresh(guide)
    return guide_to_read(guide)


@router.patch("/{guide_id}", response_model=GuideRead)
def update_guide(guide_id: str, payload: GuideUpdate, session: Session = Depends(get_session)) -> GuideRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        ensure_guide_status(data["status"])
    if "slug" in data and data["slug"] is not None:
        ensure_guide_slug_available(session, data["slug"], guide.id)

    for key, value in data.items():
        setattr(guide, key, value)
    guide.updated_at = datetime.now(UTC)
    session.add(guide)
    session.commit()
    session.refresh(guide)
    return guide_to_read(guide)


@router.post("/{guide_id}/places", response_model=GuideDetailRead)
def add_place_to_guide(
    guide_id: str,
    payload: GuidePlaceCreate,
    session: Session = Depends(get_session),
) -> GuideDetailRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    place = session.get(Place, payload.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    existing = session.get(PlaceGuide, (guide_id, payload.place_id))
    if existing is None:
        existing = PlaceGuide(guide_id=guide_id, place_id=payload.place_id)
    existing.sort_order = payload.sort_order
    guide.updated_at = datetime.now(UTC)
    session.add(existing)
    session.add(guide)
    session.commit()
    session.refresh(guide)
    places = admin_guide_places(session, guide.id)
    return guide_to_detail(guide, places, category_ids_by_place_id(session, [place.id for place in places]))


@router.delete("/{guide_id}/places/{place_id}", response_model=GuideDetailRead)
def remove_place_from_guide(
    guide_id: str,
    place_id: str,
    session: Session = Depends(get_session),
) -> GuideDetailRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    existing = session.get(PlaceGuide, (guide_id, place_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="Guide place not found")

    session.delete(existing)
    guide.updated_at = datetime.now(UTC)
    session.add(guide)
    session.commit()
    session.refresh(guide)
    places = admin_guide_places(session, guide.id)
    return guide_to_detail(guide, places, category_ids_by_place_id(session, [place.id for place in places]))
