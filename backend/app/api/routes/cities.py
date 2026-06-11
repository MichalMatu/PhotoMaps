from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.city import City
from app.schemas.city import CityRead
from app.serializers.city import city_to_read

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("", response_model=list[CityRead])
def list_cities(session: Session = Depends(get_session)) -> list[CityRead]:
    statement = select(City).where(City.status == "active").order_by(City.sort_order, City.name)
    return [city_to_read(city) for city in session.exec(statement).all()]
