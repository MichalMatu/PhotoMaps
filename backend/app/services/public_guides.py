from sqlmodel import Session, select

from app.models.city import City
from app.models.guide import Guide, PlaceGuide
from app.models.place import Place


def public_guide_places(session: Session, guide_id: str) -> list[Place]:
    statement = (
        select(Place)
        .join(PlaceGuide, PlaceGuide.place_id == Place.id)
        .join(City, City.id == Place.city_id)
        .where(PlaceGuide.guide_id == guide_id)
        .where(Place.status == "published", City.status == "active")
        .order_by(PlaceGuide.sort_order, Place.title)
    )
    return list(session.exec(statement).all())


def public_guide_has_visible_places(session: Session, guide_id: str) -> bool:
    return public_guide_places(session, guide_id) != []


def public_guide_by_slug(session: Session, slug: str) -> tuple[Guide, list[Place]] | None:
    guide = session.exec(select(Guide).where(Guide.slug == slug).where(Guide.status == "published")).first()
    if guide is None:
        return None
    places = public_guide_places(session, guide.id)
    if not places:
        return None
    return guide, places


def list_public_sitemap_guides(session: Session) -> list[Guide]:
    statement = select(Guide).where(Guide.status == "published").order_by(Guide.updated_at.desc())
    return [guide for guide in session.exec(statement).all() if public_guide_has_visible_places(session, guide.id)]
