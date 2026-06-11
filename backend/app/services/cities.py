from fastapi import HTTPException
from sqlmodel import Session

from app.models.city import City


def ensure_active_city(session: Session, city_id: str) -> City:
    city = session.get(City, city_id)
    if city is None or city.status != "active":
        raise HTTPException(status_code=422, detail="City must be active")
    return city
