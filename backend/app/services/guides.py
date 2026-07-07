from datetime import UTC, datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.guide import Guide, PlaceGuide
from app.models.place import Place
from app.schemas.guide import (
    GuideCreate,
    GuideDetailRead,
    GuidePlaceCreate,
    GuidePlaceOrderUpdate,
    GuideRead,
    GuideRoutePoint,
    GuideUpdate,
)
from app.serializers.guide import guide_to_detail, guide_to_read
from app.services.content_blocks import content_blocks_for_storage
from app.services.guide_deletion import delete_guide_permanently
from app.services.guide_previews import approved_cover_photos_by_place

GUIDE_STATUSES = {"draft", "published", "archived"}
GUIDE_KINDS = {"route", "collection"}


def ensure_guide_status(status: str) -> None:
    if status not in GUIDE_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported guide status")


def ensure_guide_kind(kind: str) -> None:
    if kind not in GUIDE_KINDS:
        raise HTTPException(status_code=422, detail="Unsupported guide kind")


def ensure_guide_shape(kind: str, route_points: list[GuideRoutePoint] | list[dict]) -> None:
    ensure_guide_kind(kind)
    if kind == "collection" and route_points:
        raise HTTPException(status_code=422, detail="Collections cannot define route points")


def ensure_guide_slug_available(session: Session, slug: str, guide_id: str | None = None) -> None:
    statement = select(Guide).where(Guide.slug == slug)
    existing = session.exec(statement).first()
    if existing is not None and existing.id != guide_id:
        raise HTTPException(status_code=409, detail="Guide slug already exists")


def route_points_for_storage(route_points: list[GuideRoutePoint]) -> list[dict[str, float]]:
    return [point.model_dump() for point in route_points]


def ensure_guide_places_publishable(session: Session, guide_id: str) -> None:
    statement = (
        select(Place)
        .join(PlaceGuide, PlaceGuide.place_id == Place.id)
        .where(PlaceGuide.guide_id == guide_id)
        .where(Place.status != "published")
    )
    if session.exec(statement).first() is not None:
        raise HTTPException(status_code=409, detail="Published guide can only contain published places")


def admin_guide_places(session: Session, guide_id: str) -> list[Place]:
    statement = (
        select(Place)
        .join(PlaceGuide, PlaceGuide.place_id == Place.id)
        .where(PlaceGuide.guide_id == guide_id)
        .order_by(PlaceGuide.sort_order, Place.title)
    )
    return list(session.exec(statement).all())


def list_admin_guides(session: Session) -> list[GuideRead]:
    statement = select(Guide).order_by(Guide.updated_at.desc())
    guides = list(session.exec(statement).all())
    places_by_guide = {guide.id: admin_guide_places(session, guide.id) for guide in guides}
    cover_photos_by_place = approved_cover_photos_by_place(
        session,
        [place for places in places_by_guide.values() for place in places],
    )
    return [guide_to_read(guide, places_by_guide[guide.id], cover_photos_by_place) for guide in guides]


def get_admin_guide_detail(session: Session, guide_id: str) -> GuideDetailRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    places = admin_guide_places(session, guide.id)
    return guide_to_detail(guide, places, approved_cover_photos_by_place(session, places))


def create_admin_guide(session: Session, payload: GuideCreate) -> GuideRead:
    ensure_guide_shape(payload.kind, payload.route_points)
    ensure_guide_status(payload.status)
    ensure_guide_slug_available(session, payload.slug)
    data = payload.model_dump()
    data["route_points"] = route_points_for_storage(payload.route_points)
    data["article_blocks"] = content_blocks_for_storage(payload.article_blocks)
    guide = Guide.model_validate(data)
    session.add(guide)
    session.commit()
    session.refresh(guide)
    return guide_to_read(guide, [], {})


def update_admin_guide(session: Session, guide_id: str, payload: GuideUpdate) -> GuideRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")

    data = payload.model_dump(exclude_unset=True)
    next_kind = data.get("kind", guide.kind)
    next_route_points = payload.route_points if "route_points" in data else guide.route_points
    ensure_guide_shape(next_kind, next_route_points or [])
    if "status" in data and data["status"] is not None:
        ensure_guide_status(data["status"])
        if data["status"] == "published":
            ensure_guide_places_publishable(session, guide.id)
    if "slug" in data and data["slug"] is not None:
        ensure_guide_slug_available(session, data["slug"], guide.id)
    if "route_points" in data and data["route_points"] is not None:
        data["route_points"] = route_points_for_storage(payload.route_points or [])
    if "article_blocks" in data:
        data["article_blocks"] = content_blocks_for_storage(payload.article_blocks or [])

    for key, value in data.items():
        setattr(guide, key, value)
    guide.updated_at = datetime.now(UTC)
    session.add(guide)
    session.commit()
    session.refresh(guide)
    places = admin_guide_places(session, guide.id)
    return guide_to_read(guide, places, approved_cover_photos_by_place(session, places))


def delete_admin_guide(session: Session, guide_id: str) -> None:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")

    delete_guide_permanently(guide, session)


def add_admin_place_to_guide(session: Session, guide_id: str, payload: GuidePlaceCreate) -> GuideDetailRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")
    place = session.get(Place, payload.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    if place.status != "published":
        raise HTTPException(status_code=409, detail="Guide places must be published")

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
    return guide_to_detail(guide, places, approved_cover_photos_by_place(session, places))


def remove_admin_place_from_guide(session: Session, guide_id: str, place_id: str) -> GuideDetailRead:
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
    return guide_to_detail(guide, places, approved_cover_photos_by_place(session, places))


def reorder_admin_guide_places(session: Session, guide_id: str, payload: GuidePlaceOrderUpdate) -> GuideDetailRead:
    guide = session.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(status_code=404, detail="Guide not found")

    place_ids = [item.place_id for item in payload.places]
    if len(place_ids) != len(set(place_ids)):
        raise HTTPException(status_code=422, detail="Guide place order cannot contain duplicate places")

    sort_orders = [item.sort_order for item in payload.places]
    if len(sort_orders) != len(set(sort_orders)):
        raise HTTPException(status_code=422, detail="Guide place order cannot contain duplicate sort orders")

    assignments = list(session.exec(select(PlaceGuide).where(PlaceGuide.guide_id == guide_id)).all())
    assignment_by_place_id = {assignment.place_id: assignment for assignment in assignments}
    if set(place_ids) != set(assignment_by_place_id):
        raise HTTPException(status_code=422, detail="Guide place order must include exactly current guide places")

    for item in payload.places:
        assignment = assignment_by_place_id[item.place_id]
        assignment.sort_order = item.sort_order
        session.add(assignment)

    guide.updated_at = datetime.now(UTC)
    session.add(guide)
    session.commit()
    session.refresh(guide)
    places = admin_guide_places(session, guide.id)
    return guide_to_detail(guide, places, approved_cover_photos_by_place(session, places))
