from sqlmodel import Session

from app.models.place import Place


def create_place(
    session: Session,
    *,
    lat: float = 51.11,
    lon: float = 17.03,
    slug: str = "public-place",
    status: str = "published",
    title: str = "Public",
    **overrides,
) -> Place:
    place = Place(city_id="wroclaw", slug=slug, title=title, lat=lat, lon=lon, status=status, **overrides)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place
