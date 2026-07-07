from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.city import City
from app.models.place import Place
from app.schemas.public_discovery import PublicPlaceDetailRead, PublicPlaceIndexRead
from app.serializers.public_discovery import place_to_public_detail_read, place_to_public_index_read
from app.services.app_config import get_place_custom_field_definitions
from app.services.place_taxonomy import categories_by_place_id, category_ids_by_place_id
from app.services.places import list_public_place_photos, public_places_statement


def active_cities_statement():
    return select(City).where(City.status == "active").order_by(City.sort_order, City.name)


def list_public_cities(session: Session) -> list[City]:
    return list(session.exec(active_cities_statement()).all())


def ensure_public_discovery_city(session: Session, city_id: str) -> City:
    city = session.get(City, city_id)
    if city is None or city.status != "active":
        raise HTTPException(status_code=404, detail="City not found")
    return city


def public_discovery_places_statement(city_id: str | None = None):
    statement = public_places_statement()
    if city_id is not None:
        statement = statement.where(Place.city_id == city_id)
    return statement.order_by(Place.title, Place.slug)


def list_public_sitemap_places(session: Session) -> list[Place]:
    return list(session.exec(public_discovery_places_statement()).all())


def list_public_city_places(session: Session, city_id: str) -> list[PublicPlaceIndexRead]:
    city = ensure_public_discovery_city(session, city_id)
    places = list(session.exec(public_discovery_places_statement(city.id)).all())
    return serialize_public_place_index(session, places, {city.id: city})


def get_public_city_place(session: Session, city_id: str, place_slug: str) -> PublicPlaceDetailRead:
    city = ensure_public_discovery_city(session, city_id)
    place = session.exec(public_discovery_places_statement(city.id).where(Place.slug == place_slug)).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    category_ids_by_place = category_ids_by_place_id(session, [place.id])
    categories_by_place = categories_by_place_id(session, [place.id])
    custom_field_definitions = get_place_custom_field_definitions(session)
    photos = list_public_place_photos(session, place)
    return place_to_public_detail_read(
        place,
        city,
        categories_by_place.get(place.id, []),
        category_ids_by_place.get(place.id, []),
        photos,
        custom_field_definitions,
    )


def serialize_public_place_index(
    session: Session,
    places: list[Place],
    known_cities: dict[str, City] | None = None,
) -> list[PublicPlaceIndexRead]:
    if not places:
        return []

    place_ids = [place.id for place in places]
    known_cities = known_cities or {}
    missing_city_ids = {place.city_id for place in places if place.city_id not in known_cities}
    cities_by_id = dict(known_cities)
    if missing_city_ids:
        cities_by_id.update(
            {city.id: city for city in session.exec(select(City).where(City.id.in_(missing_city_ids))).all()}
        )

    category_ids_by_place = category_ids_by_place_id(session, place_ids)
    categories_by_place = categories_by_place_id(session, place_ids)
    custom_field_definitions = get_place_custom_field_definitions(session)
    return [
        place_to_public_index_read(
            place,
            cities_by_id[place.city_id],
            categories_by_place.get(place.id, []),
            category_ids_by_place.get(place.id, []),
            custom_field_definitions,
        )
        for place in places
    ]
