from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.city import City
from app.models.place import Place
from app.schemas.city import CityCreate, CityUpdate

CITY_STATUSES = {"active", "archived"}


def ensure_active_city(session: Session, city_id: str) -> City:
    city = session.get(City, city_id)
    if city is None or city.status != "active":
        raise HTTPException(status_code=422, detail="City must be active")
    return city


def ensure_city_status(status: str) -> None:
    if status not in CITY_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported city status")


def ensure_city_id_available(session: Session, city_id: str) -> None:
    if session.get(City, city_id) is not None:
        raise HTTPException(status_code=409, detail="City already exists")


def city_is_used(session: Session, city_id: str) -> bool:
    statement = select(Place).where(Place.city_id == city_id).limit(1)
    return session.exec(statement).first() is not None


def list_admin_cities(session: Session) -> list[City]:
    statement = select(City).order_by(City.sort_order, City.name)
    return list(session.exec(statement).all())


def create_admin_city(session: Session, payload: CityCreate) -> City:
    ensure_city_status(payload.status)
    ensure_city_id_available(session, payload.id)

    city = City.model_validate(payload)
    session.add(city)
    session.commit()
    session.refresh(city)
    return city


def update_admin_city(session: Session, city_id: str, payload: CityUpdate) -> City:
    city = session.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        ensure_city_status(data["status"])

    for key, value in data.items():
        setattr(city, key, value)

    session.add(city)
    session.commit()
    session.refresh(city)
    return city


def delete_admin_city(session: Session, city_id: str, *, force: bool) -> City | None:
    city = session.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")

    if force:
        if city_is_used(session, city.id):
            raise HTTPException(status_code=409, detail="City is used by places")
        session.delete(city)
        session.commit()
        return None

    city.status = "archived"
    session.add(city)
    session.commit()
    session.refresh(city)
    return city
